/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Navigation, Info, Search, MapPin, Zap, Maximize2, Minimize2, Layers } from 'lucide-react';
import L from 'leaflet';
import { Meetup, NearbyDistrict, User } from '../types';
import { formatDistance } from '../utils';

interface MapControlProps {
  meetups: Meetup[];
  activeDistrict: NearbyDistrict;
  selectedMeetupId: string | null;
  onSelectMeetup: (meetupId: string | null) => void;
  onCreateMeetupAtCoordinates: (lat: number, lng: number, addressName: string) => void;
  userCoords: { lat: number; lng: number };
  activeMeetupTimerFilter: 'all' | 'now' | '30m' | 'scheduled';
  currentUser: User;
  onUpdateUserCoords?: (lat: number, lng: number) => void;
  isFullscreen?: boolean;
  onFullscreenToggle?: (val: boolean) => void;
}

interface SuggestionItem {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  type: 'meetup' | 'preset' | 'nominatim';
}

const MAP_THEMES = [
  { id: 'dark' as const, name: 'Dark Matter', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
  { id: 'light' as const, name: 'Positron Light', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
  { id: 'voyager' as const, name: 'Voyager Trails', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
  { id: 'standard' as const, name: 'Standard Roads', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }
];

export default function MapControl({
  meetups,
  activeDistrict,
  selectedMeetupId,
  onSelectMeetup,
  onCreateMeetupAtCoordinates,
  userCoords,
  activeMeetupTimerFilter,
  onUpdateUserCoords,
  isFullscreen: propIsFullscreen,
  onFullscreenToggle,
}: MapControlProps) {
  const onCreateMeetupRef = useRef(onCreateMeetupAtCoordinates);
  onCreateMeetupRef.current = onCreateMeetupAtCoordinates;

  const onUpdateUserCoordsRef = useRef(onUpdateUserCoords);
  onUpdateUserCoordsRef.current = onUpdateUserCoords;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    markers: L.LayerGroup | null;
    circles: L.LayerGroup | null;
  }>({ markers: null, circles: null });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchNotification, setSearchNotification] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hoverLatLng, setHoverLatLng] = useState<L.LatLng | null>(null);
  const [zoomLevel, setZoomLevel] = useState(14);
  const [tempMarkerPos, setTempMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const isFullscreen = propIsFullscreen !== undefined ? propIsFullscreen : localFullscreen;

  const [activeTheme, setActiveTheme] = useState<'dark' | 'light' | 'voyager' | 'standard'>('dark');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const hasInitializedToUserLocation = useRef(false);

  // Initialize Map to user coordinates once available
  useEffect(() => {
    if (!hasInitializedToUserLocation.current && mapRef.current && 
        (userCoords.lat !== activeDistrict.lat || userCoords.lng !== activeDistrict.lng)) {
      mapRef.current.setView([userCoords.lat, userCoords.lng], 15, {
        animate: true,
        duration: 0.8
      });
      hasInitializedToUserLocation.current = true;
    }
  }, [userCoords, activeDistrict]);

  const toggleFullscreen = () => {
    const nextVal = !isFullscreen;
    if (onFullscreenToggle) {
      onFullscreenToggle(nextVal);
    } else {
      setLocalFullscreen(nextVal);
    }
  };

  // Invalidate size on fullscreen toggle so leaflet redraws itself fully
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 150);
    }
  }, [isFullscreen]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setSearchNotification("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setSearchNotification("Connecting to GPS Signal...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocating(false);
        setSearchNotification(`GPS Signal Locked: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        
        if (onUpdateUserCoords) {
          onUpdateUserCoords(latitude, longitude);
        }

        mapRef.current?.setView([latitude, longitude], 15, {
          animate: true,
          duration: 1.0
        });

        setTempMarkerPos(null);
      },
      (error) => {
        setIsLocating(false);
        console.error("Geolocation error:", error);
        setSearchNotification(`GPS Error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet Map Instance
    const map = L.map(mapContainerRef.current, {
      center: [activeDistrict.lat, activeDistrict.lng],
      zoom: 14,
      zoomControl: false,
      doubleClickZoom: false, // Override double-click zooming so we can handle pins on double click
    });

    // Sleek premium leaflet map layers with support for customizable theme selection
    const initialTheme = MAP_THEMES.find((t) => t.id === 'dark') || MAP_THEMES[0];
    const tileL = L.tileLayer(initialTheme.url, {
      attribution: initialTheme.attribution,
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    tileLayerRef.current = tileL;

    // Setup map groups
    const circlesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    layersRef.current = {
      markers: markersLayer,
      circles: circlesLayer
    };

    // Track real zoom updates
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    // Map hover coordinates tracking
    map.on('mousemove', (e) => {
      setHoverLatLng(e.latlng);
    });

    // Double-click handler to drop a spark pin
    map.on('dblclick', (e) => {
      const { lat, lng } = e.latlng;
      const addressName = `District Block near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      
      setTempMarkerPos({ lat, lng });
      onCreateMeetupRef.current(lat, lng, addressName);
      //only use this for test
      //if (onUpdateUserCoordsRef.current) {
       // onUpdateUserCoordsRef.current(lat, lng);
      //}
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // Center map when activeDistrict center changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([activeDistrict.lat, activeDistrict.lng], 14, {
        animate: true,
        duration: 0.8
      });
      // Clear previous search placemarker when switching districts
      setTempMarkerPos(null);
    }
  }, [activeDistrict]);

  // Handle clicking empty spaces on the map to deselect selected meetup and return to Radar Scanning
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // If user clicked empty map space (not on any marker)
      onSelectMeetup(null);
      setTempMarkerPos(null);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [onSelectMeetup]);

  // Center or pop up on selectedMeetupId changes from sidebar trigger
  useEffect(() => {
    if (selectedMeetupId && mapRef.current) {
      const selectedMeetup = meetups.find((m) => m.id === selectedMeetupId);
      if (selectedMeetup) {
        mapRef.current.setView([selectedMeetup.lat, selectedMeetup.lng], 15, {
          animate: true,
          duration: 0.5
        });
      }
    }
  }, [selectedMeetupId]);

  // Sync the map tile layer when activeTheme changes
  useEffect(() => {
    if (tileLayerRef.current) {
      const selectedTheme = MAP_THEMES.find((t) => t.id === activeTheme);
      if (selectedTheme) {
        tileLayerRef.current.setUrl(selectedTheme.url);
      }
    }
  }, [activeTheme]);

  // Redraw map markers & geo fences on dynamic state updates
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = layersRef.current.markers;
    const circlesGroup = layersRef.current.circles;

    if (!map || !markersGroup || !circlesGroup) return;

    // 1. Clear previous drawings
    markersGroup.clearLayers();
    circlesGroup.clearLayers();

    // 2. Draw user current location glowing marker
    const userHtml = `
      <div class="relative flex items-center justify-center">
        <!-- Glow halo -->
        <div class="w-8 h-8 absolute rounded-full bg-sky-500/25 animate-ping opacity-70"></div>
        <!-- Outer circle -->
        <div class="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/80 flex items-center justify-center shadow-lg shadow-sky-500/10">
          <div class="w-2.5 h-2.5 rounded-full bg-sky-450 border border-white/50"></div>
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userHtml,
      className: 'custom-user-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
      .bindPopup(`
        <div class="p-2 font-sans text-stone-100 text-xs text-center">
          <span class="text-[9px] font-mono uppercase tracking-wider text-sky-400 font-bold block mb-1">GPS VERIFIED SIGNAL</span>
          <b class="text-stone-200">✨ You are here</b>
          <p class="text-[10px] text-stone-400 mt-1 leading-normal">
            Secure offline coordinates system within Jaksel perimeter.
          </p>
        </div>
      `, { className: 'custom-leaflet-popup', closeButton: false })
      .addTo(markersGroup);

    // 3. Draw reachable boundary fences around userCoords matching the filters
    if (activeMeetupTimerFilter === 'now') {
      L.circle([userCoords.lat, userCoords.lng], {
        radius: 1700, // 1.7km
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.04,
        weight: 1.5,
        dashArray: '5, 5'
      }).addTo(circlesGroup);
    } else if (activeMeetupTimerFilter === '30m') {
      L.circle([userCoords.lat, userCoords.lng], {
        radius: 3500, // 3.5km
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.02,
        weight: 1.5,
        dashArray: '8, 4'
      }).addTo(circlesGroup);
    }

    // 3b. Draw geofence radius circles around the selected meetup (if one is selected and is active/forming)
    if (selectedMeetupId) {
      const selectedMeetup = meetups.find(m => m.id === selectedMeetupId);
      if (selectedMeetup) {
        // Chat Lock Radius (500m)
        L.circle([selectedMeetup.lat, selectedMeetup.lng], {
          radius: 500,
          color: '#c084fc', // Light purple
          fillColor: '#a855f7', // Purple
          fillOpacity: 0.05,
          weight: 1.2,
          dashArray: '6, 4'
        })
        .bindTooltip('<span class="font-mono text-[9px] text-purple-300">💬 Chat Access Zone (500m Limit)</span>', { 
          permanent: false, 
          direction: 'top', 
          className: 'custom-map-tooltip' 
        })
        .addTo(circlesGroup);

        // Check-In Radius (200m)
        L.circle([selectedMeetup.lat, selectedMeetup.lng], {
          radius: 200,
          color: '#fbbf24', // Light amber/gold
          fillColor: '#f59e0b', // Amber/Gold
          fillOpacity: 0.1,
          weight: 1.8,
          dashArray: '2, 3'
        })
        .bindTooltip('<span class="font-mono text-[9px] text-amber-300">📍 Check-In Zone (200m Limit)</span>', { 
          permanent: false, 
          direction: 'bottom', 
          className: 'custom-map-tooltip' 
        })
        .addTo(circlesGroup);
      }
    }

    // 4. Plot Meetup pins (Grouped to resolve spatial overlapping with elegant dispersion offsets)
    const filteredMeetups = meetups.filter((m) => {
      if (m.status === 'completed' || m.status === 'cancelled') return false;
      if (activeMeetupTimerFilter === 'all') return true;
      return m.startTimeType === activeMeetupTimerFilter;
    });

    // Group meetups by rounded coordinates to detect exact overlapping locations
    const positionGroups: Record<string, typeof filteredMeetups> = {};
    filteredMeetups.forEach((meet) => {
      const coordKey = `${meet.lat.toFixed(5)},${meet.lng.toFixed(5)}`;
      if (!positionGroups[coordKey]) {
        positionGroups[coordKey] = [];
      }
      positionGroups[coordKey].push(meet);
    });

    Object.values(positionGroups).forEach((group) => {
      group.forEach((meet, index) => {
        const isSelected = selectedMeetupId === meet.id;
        
        // Select status styles
        let colorHex = '#a855f7'; // Purple - Spark
        let stateLabel = 'SPARK';
        let badgeClass = 'bg-purple-500/15 text-purple-300 border border-purple-500/20';
        
        if (meet.status === 'spark') {
          colorHex = '#a855f7'; // Purple - Spark
          stateLabel = 'SPARK';
          badgeClass = 'bg-purple-500/15 text-purple-300 border border-purple-500/20';
        } else if (meet.status === 'forming') {
          colorHex = '#f59e0b'; // Amber - Gathering
          stateLabel = 'FORMING';
          badgeClass = 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
        } else if (meet.status === 'active') {
          colorHex = '#ef4444'; // Red - Active
          stateLabel = 'ACTIVE';
          badgeClass = 'bg-rose-500/15 text-rose-300 border border-rose-500/20';
        } else if (meet.status === 'completed') {
          colorHex = '#10b981'; // Green - Completed
          stateLabel = 'COMPLETED';
          badgeClass = 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20';
        } else {
          colorHex = '#64748b'; // Slate - Cancelled
          stateLabel = 'CANCELLED';
          badgeClass = 'bg-slate-500/15 text-slate-300 border border-slate-500/20';
        }

        const isPulseable = meet.status !== 'completed' && meet.status !== 'cancelled' && meet.status !== 'active';
        const glowEffect = isSelected ? 'shadow-[0_0_20px_rgba(245,158,11,0.7)] scale-110 z-[1000]' : 'opacity-90';

        const pinContent = meet.status === 'cancelled' ? '✕' : meet.status === 'completed' ? '✓' : meet.participants.length.toString();

        const meetupHtml = `
          <div class="relative flex items-center justify-center ${glowEffect}">
            <!-- Spark pulse ring for non-full items -->
            ${isPulseable ? `<div class="absolute w-8 h-8 rounded-full bg-[${colorHex}]/25 animate-ping opacity-40"></div>` : ''}
            <div class="w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? 'border-amber-400 bg-stone-900' : 'border-stone-950'} shadow-xl transition cursor-pointer" style="background-color: ${isSelected ? 'transparent' : colorHex};">
              <span class="${isSelected ? 'text-amber-400' : 'text-stone-950'} text-[9px] font-mono font-black">${pinContent}</span>
            </div>
            ${isSelected ? `
              <div class="absolute bottom-7 left-1/2 -translate-x-1/2 bg-[#1C1512] text-stone-100 border border-amber-500/40 font-mono text-[9.5px] px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50">
                ${meet.title}
              </div>
            ` : ''}
          </div>
        `;

        const meetupIcon = L.divIcon({
          html: meetupHtml,
          className: 'custom-meetup-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        // Compute circular dispersion micro-offset (around 15 meters) if meetups overlap
        let finalLat = meet.lat;
        let finalLng = meet.lng;
        if (group.length > 1) {
          const angle = (index * 2 * Math.PI) / group.length;
          const radius = 0.00015; // standard dispersion radius
          finalLat = meet.lat + Math.cos(angle) * radius;
          finalLng = meet.lng + Math.sin(angle) * radius;
        }

        const marker = L.marker([finalLat, finalLng], { icon: meetupIcon }).addTo(markersGroup);

        // Handle simple click on pin to highlight active layer sidebar
        marker.on('click', (e) => {
          onSelectMeetup(meet.id);
          if (e && e.originalEvent) {
            e.originalEvent.stopPropagation();
          }
        });

        // Customized popup contents matching current details
        marker.bindPopup(`
          <div class="bg-stone-950 p-3 rounded-lg text-stone-200 text-xs min-w-[200px] font-sans">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[8.5px] font-mono font-black px-1.5 py-0.5 rounded ${badgeClass}">${stateLabel}</span>
              <span class="text-[8px] font-mono text-stone-400">${formatDistance(meet.distanceKm)} close</span>
            </div>
            <h4 class="font-bold text-stone-100 text-xs mt-2 border-b border-white/5 pb-1">${meet.title}</h4>
            <p class="text-[10px] text-stone-400 mt-1 flex items-start gap-1">
              <span>📍</span> <span>${meet.locationName}</span>
            </p>
            <p class="text-[9px] text-stone-500 italic mt-0.5 pl-3.5">${meet.locationAddress}</p>
            
            <div class="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
              <span class="text-[9px] text-stone-400 font-mono">Capacity: ${meet.participants.length}/${meet.limit}</span>
              <button class="text-[9px] bg-amber-600 hover:bg-amber-500 text-stone-100 px-2 py-1 rounded font-bold font-mono transition inline-block cursor-pointer select-none trigger-sidebar-view" data-meet-id="${meet.id}">
                OPEN SIGNAL
              </button>
            </div>
          </div>
        `, {
          className: 'custom-leaflet-popup',
          closeButton: false,
          maxWidth: 240
        });

        marker.on('popupopen', (e) => {
          const popupElement = e.popup.getElement();
          if (popupElement) {
            const btn = popupElement.querySelector('.trigger-sidebar-view');
            if (btn) {
              btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                onSelectMeetup(meet.id);
                map.closePopup();
              });
            }
          }
        });
      });
    });

    // 5. Draw temporary dragged/clicked placement marker if active
    if (tempMarkerPos) {
      const tempHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full border border-dashed border-amber-400 animate-pulse flex items-center justify-center">
            <div class="w-3 h-3 rounded-full bg-amber-500"></div>
          </div>
          <div class="absolute bottom-6 bg-[#120D0A] text-amber-200 border border-amber-500/30 text-[8px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap shadow-md uppercase tracking-wide">
            Tap Pin Form Below
          </div>
        </div>
      `;

      const tempIcon = L.divIcon({
        html: tempHtml,
        className: 'custom-temp-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([tempMarkerPos.lat, tempMarkerPos.lng], { icon: tempIcon }).addTo(markersGroup);
    }
  }, [meetups, selectedMeetupId, activeMeetupTimerFilter, userCoords, tempMarkerPos]);

  // Dynamically compute suggestions as user types the search query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const query = searchQuery.toLowerCase();

    // 1. Gather Matching Local Meetups
    const matchingMeetups: SuggestionItem[] = meetups
      .filter(m => 
        m.status !== 'completed' && m.status !== 'cancelled' &&
        (m.title.toLowerCase().includes(query) ||
        m.locationName.toLowerCase().includes(query) ||
        m.locationAddress.toLowerCase().includes(query))
      )
      .slice(0, 3)
      .map(m => ({
        id: `meetup-${m.id}`,
        name: m.title,
        address: `Spark: ${m.locationName}`,
        lat: m.lat,
        lng: m.lng,
        type: 'meetup'
      }));

    // 2. Custom local presets of INTEREST relative to the current activeDistrict
    const localPresets: { name: string; latOffset: number; lngOffset: number; address: string }[] = [];
    if (activeDistrict.id === 'jakarta_central') {
      localPresets.push(
        { name: 'Kopi Kenangan Cafe Area', latOffset: 0.00180, lngOffset: -0.00210, address: 'Jl. M.H. Thamrin' },
        { name: 'Alun-alun Green Lawn Area', latOffset: -0.00250, lngOffset: 0.00310, address: 'National Monument Park' },
        { name: 'Go-Work Coworking Suite Area', latOffset: -0.00320, lngOffset: -0.00340, address: 'Plaza Indonesia Center' },
        { name: 'Arena Sports Gym Spot', latOffset: 0.00390, lngOffset: 0.00180, address: 'Merdeka Sports Court' }
      );
    } else if (activeDistrict.id === 'ny_dt') {
      localPresets.push(
        { name: 'Washington Square Park Arch Loop', latOffset: 0, lngOffset: 0, address: '5 Ave & Block 4' },
        { name: 'Joe Coffee Shop Soho', latOffset: -0.0018, lngOffset: -0.0021, address: 'Waverly Pl, Greenwich Village' },
        { name: 'Equinox Gym West Village', latOffset: 0.0039, lngOffset: 0.0018, address: 'Greenwich Ave' },
        { name: 'WeWork Broadway Coworking', latOffset: -0.0032, lngOffset: -0.0034, address: 'Broadway, NYC' }
      );
    } else {
      localPresets.push(
        { name: 'Soho Square Commons Garden', latOffset: 0, lngOffset: 0, address: 'Frith St & Square Rd' },
        { name: 'Bar Italia Espresso Hub', latOffset: -0.0018, lngOffset: -0.0021, address: 'Frith St, Soho' },
        { name: 'YMCA Fitness Plaza Endell', latOffset: 0.0015, lngOffset: 0.0018, address: 'Endell St, Holborn' },
        { name: 'Soho House Workspace', latOffset: -0.0032, lngOffset: -0.0034, address: 'Dean St, London' }
      );
    }

    const matchingPresets: SuggestionItem[] = localPresets
      .filter(p => p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query))
      .map((p, idx) => ({
        id: `preset-${idx}`,
        name: p.name,
        address: `${p.address} (${activeDistrict.city})`,
        lat: activeDistrict.lat + p.latOffset,
        lng: activeDistrict.lng + p.lngOffset,
        type: 'preset'
      }));

    // Initially group instant matching elements
    setSuggestions([...matchingMeetups, ...matchingPresets]);

    // 3. Debounce Live Nominatim lookup near active district coordinate center
    const timeoutId = setTimeout(async () => {
      try {
        const bbox = `${activeDistrict.lng - 0.5},${activeDistrict.lat - 0.5},${activeDistrict.lng + 0.5},${activeDistrict.lat + 0.5}`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&viewbox=${bbox}`;
        
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'SparkMeetupsHub/1.0',
            'Accept-Language': 'id,en',
          }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          const apiSuggestions: SuggestionItem[] = data.map((item, idx) => ({
            id: `api-${idx}-${item.place_id || item.osm_id}`,
            name: item.display_name.split(',')[0],
            address: item.display_name.split(',').slice(1, 4).join(',').trim(),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: 'nominatim'
          }));

          setSuggestions(prev => {
            const existingNames = new Set(prev.map(p => p.name.toLowerCase()));
            const uniqueApi = apiSuggestions.filter(a => !existingNames.has(a.name.toLowerCase()));
            return [...prev, ...uniqueApi].slice(0, 6);
          });
        }
      } catch (err) {
        console.warn('Autocomplete suggestions search lookup failed:', err);
      }
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeDistrict, meetups]);

  const handleSelectSuggestion = (s: SuggestionItem) => {
    setSearchQuery(s.name);
    setTempMarkerPos({ lat: s.lat, lng: s.lng });
    // use this only for test
    // if (onUpdateUserCoordsRef.current) {
    //   onUpdateUserCoordsRef.current(s.lat, s.lng);
    // }
    mapRef.current?.setView([s.lat, s.lng], 15, {
      animate: true,
      duration: 1.0,
    });
    setSearchNotification(`Located Selected Spot: ${s.name}`);
    setTimeout(() => setSearchNotification(null), 4000);
    onCreateMeetupAtCoordinates(s.lat, s.lng, s.address ? `${s.name}, ${s.address}` : s.name);
    setShowSuggestions(false);
  };

  // Zoom events triggering external button mapping handles
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    mapRef.current?.setView([userCoords.lat, userCoords.lng], 14, {
      animate: true,
      duration: 0.8
    });
    setTempMarkerPos(null);
  };

  // Geo search locator matching with real address geocoding fallback
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase();

    // 1. Check local meetups
    const foundMeetup = meetups.find(
      (m) =>
        m.status !== 'completed' && m.status !== 'cancelled' &&
        (m.title.toLowerCase().includes(query) ||
        m.locationName.toLowerCase().includes(query) ||
        m.locationAddress.toLowerCase().includes(query))
    );

    if (foundMeetup) {
      onSelectMeetup(foundMeetup.id);
      mapRef.current?.setView([foundMeetup.lat, foundMeetup.lng], 15, {
        animate: true,
        duration: 0.8
      });
      setSearchNotification(`Found existing Spark: ${foundMeetup.title}`);
      setTimeout(() => setSearchNotification(null), 4000);
      return;
    }

    // 2. Query Nominatim API
    setIsSearching(true);
    setSearchNotification("Searching coordinate databases...");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'SparkMeetupsHub/1.0',
            'Accept-Language': 'id,en',
          },
        }
      );
      clearTimeout(timeoutId);

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const displayName = item.display_name.split(',')[0] + ', ' + (item.display_name.split(',')[1] || '').trim();

        setTempMarkerPos({ lat, lng });
        // use this only for test
        // if (onUpdateUserCoordsRef.current) {
        //   onUpdateUserCoordsRef.current(lat, lng);
        // }
        mapRef.current?.setView([lat, lng], 15, {
          animate: true,
          duration: 1.0,
        });

        setSearchNotification(`Location found: ${displayName}`);
        onCreateMeetupAtCoordinates(lat, lng, displayName);
      } else {
        throw new Error("No results found");
      }
    } catch (err) {
      console.warn("Geocoding failed, falling back to category simulation if applicable:", err);
      
      let searchLat = activeDistrict.lat;
      let searchLng = activeDistrict.lng;
      let name = '';

      if (query.includes('kopi') || query.includes('coffee') || query.includes('cafe')) {
        searchLat += 0.00180; searchLng -= 0.00210; name = 'Kopi Kenangan Cafe Area';
      } else if (query.includes('park') || query.includes('alun') || query.includes('lawn')) {
        searchLat -= 0.00250; searchLng += 0.00310; name = 'Alun-alun Green Lawn Area';
      } else if (query.includes('gym') || query.includes('sport') || query.includes('arena')) {
        searchLat += 0.00390; searchLng += 0.00180; name = 'Arena Sports Field Complex';
      } else if (query.includes('work') || query.includes('code') || query.includes('office')) {
        searchLat -= 0.00320; searchLng -= 0.00340; name = 'Go-Work Coworking Suite Area';
      } else {
        // Unknown place - notify and cancel instead of putting down a fake pin offset randomly
        setSearchNotification(`❌ Location not found: "${searchQuery}". Please try another search or double click the map!`);
        setTimeout(() => setSearchNotification(null), 5000);
        return;
      }

      setTempMarkerPos({ lat: searchLat, lng: searchLng });
      // use this only for test
      // if (onUpdateUserCoordsRef.current) {
      //   onUpdateUserCoordsRef.current(searchLat, searchLng);
      // }
      mapRef.current?.setView([searchLat, searchLng], 15, { animate: true });

      setSearchNotification(`Located simulated spot: ${name}`);
      onCreateMeetupAtCoordinates(searchLat, searchLng, name);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={`relative transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-0 w-screen h-screen z-[9999] rounded-none border-none' 
        : 'relative w-full h-[540px] md:h-full min-h-[460px] rounded-2xl border border-white/10'
    } bg-[#120D0A] overflow-hidden select-none animate-none`}>
      
      {/* Real Map Canvas Container HTML Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0 pointer-events-auto"></div>

      {/* Top Search bar overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1002] flex gap-2 pointer-events-none">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex max-w-sm pointer-events-auto">
          <div className="relative w-full">
            <input
              type="text"
              placeholder={isSearching ? "Geocoding coordinate search query..." : "Search local blocks, cafes, or parks..."}
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 220)}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1E140F]/85 backdrop-blur-md border border-white/10 text-xs text-slate-100 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-400 font-sans shadow-lg focus:border-amber-500 hover:bg-[#1C1512] transition"
            />
            <Search className={`absolute left-3 top-3 w-3.5 h-3.5 text-slate-400 ${isSearching ? 'animate-spin text-amber-500' : ''}`} />

            {/* Suggestions drop down list */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#170F0B]/98 border border-white/15 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-[1050] flex flex-col divide-y divide-white/5">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-3 py-2.5 hover:bg-amber-500/10 transition-colors flex flex-col gap-0.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-xs font-bold text-slate-100 truncate">{s.name}</span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-black tracking-wider uppercase shrink-0 ${
                        s.type === 'meetup' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' :
                        s.type === 'preset' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' :
                        'bg-emerald-550/15 text-emerald-300 border border-emerald-500/20'
                      }`}>
                        {s.type === 'meetup' ? 'Spark' : s.type === 'preset' ? 'Preset' : 'Global GPS'}
                      </span>
                    </div>
                    {s.address && (
                      <span className="text-[10px] text-stone-400 truncate pl-0.5">{s.address}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-xl shadow-lg active:scale-95 transition cursor-pointer select-none ${
            isLocating
              ? 'bg-amber-500/25 border-amber-500/40 text-amber-300 animate-pulse'
              : 'bg-[#1E140F]/85 backdrop-blur-md border-white/10 text-slate-200 hover:bg-[#281B14] hover:text-white hover:border-amber-500/50'
          }`}
          title="Center on your exact GPS coordinates"
        >
          <Navigation className={`w-3.5 h-3.5 rotate-45 shrink-0 ${isLocating ? 'text-amber-300' : 'text-amber-400'}`} />
          <span>{isLocating ? 'Fixing GPS...' : 'My Location'}</span>
        </button>

        {/* Quick hint badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-[#1E140F]/85 backdrop-blur rounded-xl border border-white/5 text-[11px] text-slate-350 shadow-md">
          <Info className="w-3.5 h-3.5 text-amber-500" />
          <span>Double-click map to drop spark pin</span>
        </div>
      </div>

      {/* Notifications banner */}
      {searchNotification && (
        <div 
          onClick={() => setSearchNotification(null)}
          className="absolute top-20 left-4 z-[1020] max-w-sm px-4 py-3 bg-[#120D0A] border-2 border-amber-500 text-stone-150 rounded-xl text-xs flex items-center gap-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] hover:border-amber-400 transition cursor-pointer pointer-events-auto animate-pulse"
          title="Dismiss advisory signal"
        >
          <MapPin className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
          <div>
            <span className="font-bold text-slate-100">{searchNotification}</span>
            <span className="block text-[9px] text-amber-350 font-mono mt-0.5">Click banner to dismiss notification</span>
          </div>
        </div>
      )}

      {/* Geographic Coordinates HUD Overlay */}

      {/* Interactive Map Legends overlay */}
      <div className="absolute bottom-4 right-4 z-10 bg-[#1E140F]/90 backdrop-blur border border-white/10 rounded-xl p-3 shadow-lg pointer-events-auto flex flex-col gap-2 max-w-[175px] text-[10px] text-stone-200">
        <p className="font-bold uppercase tracking-wider text-[9px] text-stone-400 border-b border-white/5 pb-1.5 flex items-center justify-between">
          <span>Map Signal Key</span>
          <Zap className="w-3 text-amber-400 animate-pulse" />
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 relative flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-stone-900"></div>
          </div>
          <span className="font-sans text-stone-300">Spark (Draft, 1 cap)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 relative flex items-center justify-center animate-pulse">
            <div className="w-1 h-1 bg-stone-950 rounded-full"></div>
          </div>
          <span className="font-sans text-stone-300 font-medium">Forming (2-3 cap)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 relative flex items-center justify-center">
            <div className="w-1 h-1 bg-stone-950 rounded-full"></div>
          </div>
          <span className="font-sans text-stone-300 font-semibold">Active & Filled</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 pt-1 border-t border-white/5 text-[9px] text-stone-450">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0 shadow-lg flex items-center justify-center">
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          <span className="font-sans">You (Current Area)</span>
        </div>
      </div>

      {/* Floating Control Buttons */}
      <div className="absolute top-4 right-4 z-[1001] flex flex-col gap-1.5 pointer-events-auto items-end">
        {/* Map Style Theme Selector */}
        <div className="relative">
          <button
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            title="Switch Map Theme Style"
            className={`w-8 h-8 rounded-lg bg-[#1E140F]/85 backdrop-blur-md border flex items-center justify-center transition shadow-lg active:scale-95 cursor-pointer hover:bg-[#281B14] ${
              showThemeSelector ? 'border-amber-400 text-amber-300' : 'border-white/10 text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
          
          {showThemeSelector && (
            <div className="absolute right-10 top-0 bg-[#1E140F]/95 backdrop-blur-lg border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5 min-w-[130px] z-[1002]">
              <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-stone-400 px-2 py-1 border-b border-white/5 mb-1 select-none">
                Map Theme
              </p>
              {MAP_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setActiveTheme(theme.id);
                    setShowThemeSelector(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-semibold transition flex items-center justify-between cursor-pointer ${
                    activeTheme === theme.id
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                      : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>{theme.name}</span>
                  {activeTheme === theme.id && <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse"></div>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 rounded-lg bg-[#1E140F]/85 backdrop-blur-md hover:bg-[#281B14] text-slate-300 border border-white/10 flex items-center justify-center transition shadow-lg active:scale-95 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 rounded-lg bg-[#1E140F]/85 backdrop-blur-md hover:bg-[#281B14] text-slate-300 border border-white/10 flex items-center justify-center transition shadow-lg active:scale-95 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleRecenter}
          title="Recenter Coordinate Grid"
          className="w-8 h-8 rounded-lg bg-[#1E140F]/85 backdrop-blur-md hover:bg-[#281B14] text-slate-300 border border-white/10 flex items-center justify-center transition shadow-lg active:scale-95 cursor-pointer"
        >
          <Navigation className="w-4 h-4 rotate-45 text-amber-400" />
        </button>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Minimize Viewport" : "Maximize Viewport"}
          className="w-8 h-8 rounded-lg bg-[#1E140F]/85 backdrop-blur-md hover:bg-[#281B14] text-slate-300 border border-white/10 flex items-center justify-center transition shadow-lg active:scale-95 cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-rose-450 animate-pulse" /> : <Maximize2 className="w-4 h-4 text-emerald-450" />}
        </button>
      </div>
    </div>
  );
}
