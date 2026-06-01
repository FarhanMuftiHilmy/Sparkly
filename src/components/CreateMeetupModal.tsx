/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, Tag, Clock, Check, AlertTriangle, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StartTimeType, LocationType } from '../types';
import { PRESET_MEETUP_IDEAS } from '../data';

interface CreateMeetupModalProps {
  onAddMeetup: (data: {
    title: string;
    locationName: string;
    locationType: LocationType;
    startTimeType: StartTimeType;
    scheduledTime?: string;
    startTime?: string;
    endTime?: string;
    limit: number;
    vibeTags: string[];
    lat: number;
    lng: number;
  }) => void;
  selectedCoordinates: { lat: number; lng: number; addressName: string } | null;
  userCoords: { lat: number; lng: number };
  draftCount: number;
  reputationScore: number;
  onExpandedChange?: (expanded: boolean) => void;
}

export default function CreateMeetupModal({
  onAddMeetup,
  selectedCoordinates,
  userCoords,
  draftCount,
  reputationScore,
  onExpandedChange,
}: CreateMeetupModalProps) {
  const getReputationLimitDetails = (score: number) => {
    if (score < 20) return { title: 'Newcomer', maxSparks: 1 };
    if (score < 50) return { title: 'Reliable', maxSparks: 3 };
    if (score < 100) return { title: 'Trusted', maxSparks: 5 };
    if (score < 200) return { title: 'Highly Trusted', maxSparks: 10 };
    return { title: 'Community Pillar', maxSparks: 20 };
  };

  const { title: repLevel, maxSparks } = getReputationLimitDetails(reputationScore);

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (selectedCoordinates) {
      setIsExpanded(true);
    }
  }, [selectedCoordinates]);

  useEffect(() => {
    if (isExpanded) {
      onExpandedChange?.(true);
    } else {
      const timer = setTimeout(() => {
        onExpandedChange?.(false);
      }, 260); // slightly longer than 250ms close animation
      return () => clearTimeout(timer);
    }
  }, [isExpanded, onExpandedChange]);

  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('cafe');
  const [startTimeType, setStartTimeType] = useState<StartTimeType>('now');
  const getNowStringOffset = (offsetMs = 0) => {
    const d = new Date(Date.now() + offsetMs);
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  const parseLocalISOString = (localStr: string): Date | null => {
    if (!localStr) return null;
    try {
      const parts = localStr.split(/[-TH:]/);
      if (parts.length < 5) return new Date(localStr);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const hour = parseInt(parts[3], 10);
      const minute = parseInt(parts[4], 10);
      const second = parts[5] ? parseInt(parts[5], 10) : 0;
      
      const d = new Date(year, month, day, hour, minute, second);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const addOffsetToLocalString = (localStr: string, offsetMs: number) => {
    try {
      const d = parseLocalISOString(localStr);
      if (!d) return '';
      const updated = new Date(d.getTime() + offsetMs);
      const year = updated.getFullYear();
      const month = String(updated.getMonth() + 1).padStart(2, '0');
      const date = String(updated.getDate()).padStart(2, '0');
      const hours = String(updated.getHours()).padStart(2, '0');
      const minutes = String(updated.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${date}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const [startTime, setStartTime] = useState(getNowStringOffset(0));
  const [endTime, setEndTime] = useState(getNowStringOffset(2 * 60 * 60 * 1000));

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setStartTimeType('scheduled');
    setErrorText(null);
    
    const startMs = parseLocalISOString(newStart)?.getTime();
    if (!startMs || isNaN(startMs)) return;

    // Get previous duration, default to 2 hours
    const prevStartMs = parseLocalISOString(startTime)?.getTime();
    const prevEndMs = parseLocalISOString(endTime)?.getTime();
    let durationMs = 2 * 60 * 60 * 1000;
    if (prevStartMs && prevEndMs && prevEndMs > prevStartMs) {
      durationMs = prevEndMs - prevStartMs;
    }

    // Clamp duration to max 24 hours
    const maxDurationMs = 24 * 60 * 60 * 1000;
    if (durationMs > maxDurationMs) {
      durationMs = maxDurationMs;
    } else if (durationMs < 60 * 1000) {
      durationMs = 2 * 60 * 60 * 1000;
    }
    
    const suggestedEnd = addOffsetToLocalString(newStart, durationMs);
    setEndTime(suggestedEnd);
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    setStartTimeType('scheduled');
    setErrorText(null);
    
    const startMs = parseLocalISOString(startTime)?.getTime();
    const endMs = parseLocalISOString(newEnd)?.getTime();
    if (!startMs || !endMs || isNaN(startMs) || isNaN(endMs)) return;
    
    const maxDurationMs = 24 * 60 * 60 * 1000;
    
    if (endMs <= startMs) {
      // Set to start plus 2 hours
      const suggestedEnd = addOffsetToLocalString(startTime, 2 * 60 * 60 * 1000);
      setEndTime(suggestedEnd);
    } else if (endMs - startMs > maxDurationMs) {
      const cappedEnd = addOffsetToLocalString(startTime, maxDurationMs);
      setEndTime(cappedEnd);
    }
  };

  const formatFriendlyDateTime = (localStr: string) => {
    if (!localStr) return '';
    try {
      const d = parseLocalISOString(localStr);
      if (!d || isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) + ' ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '';
    }
  };

  const getDurationString = () => {
    const startMs = parseLocalISOString(startTime)?.getTime();
    const endMs = parseLocalISOString(endTime)?.getTime();
    if (!startMs || !endMs || isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return '';
    const diffMs = endMs - startMs;
    const hours = Math.floor(diffMs / (3600 * 1000));
    const minutes = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  };
  const [limit, setLimit] = useState(5); // Default and max is 5
  const [customTagInput, setCustomTagInput] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>(['Coffee', 'Chill']);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Sync double-click coordinate picks
  useEffect(() => {
    if (selectedCoordinates) {
      setLocationName(selectedCoordinates.addressName);
      // Auto-assign suitable location types based on contextual title words
      const lowerAddr = selectedCoordinates.addressName.toLowerCase();
      if (lowerAddr.includes('cafe') || lowerAddr.includes('kopi')) {
        setLocationType('cafe');
      } else if (lowerAddr.includes('park') || lowerAddr.includes('alun')) {
        setLocationType('park');
      } else if (lowerAddr.includes('cowork') || lowerAddr.includes('office')) {
        setLocationType('coworking');
      } else if (lowerAddr.includes('sport') || lowerAddr.includes('arena') || lowerAddr.includes('gym')) {
        setLocationType('gym');
      }
    }
  }, [selectedCoordinates]);

  // Handle Timing Urgency selection syncing start/end times automatically
  const handleStartTimeTypeChange = (val: StartTimeType) => {
    setStartTimeType(val);
    if (val === 'now') {
      const startStr = getNowStringOffset(0);
      setStartTime(startStr);
      setEndTime(getNowStringOffset(2 * 60 * 60 * 1000));
    } else if (val === '30m') {
      const startStr = getNowStringOffset(30 * 60 * 1000);
      setStartTime(startStr);
      setEndTime(getNowStringOffset(150 * 60 * 1000)); // 2.5 hours from now
    }
  };

  // Handle Preset quick choice selector
  const handleApplyPreset = (preset: typeof PRESET_MEETUP_IDEAS[0]) => {
    setTitle(preset.title);
    setLocationName(preset.locationName);
    setLocationType(preset.locationType);
    const pType = preset.startTimeType;
    setStartTimeType(pType);
    if (pType === 'now') {
      setStartTime(getNowStringOffset(0));
      setEndTime(getNowStringOffset(2 * 60 * 60 * 1000));
    } else if (pType === '30m') {
      setStartTime(getNowStringOffset(30 * 60 * 1000));
      setEndTime(getNowStringOffset(150 * 60 * 1000));
    } else {
      const hoursAndMins = (preset as any).scheduledTime || '19:30';
      const [h, m] = hoursAndMins.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      const tzoffset = d.getTimezoneOffset() * 60000;
      const startStr = new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
      const endStr = new Date(d.getTime() + 2 * 60 * 60 * 1000 - tzoffset).toISOString().slice(0, 16);
      setStartTime(startStr);
      setEndTime(endStr);
    }
    setLimit(preset.limit);
    setVibeTags([...preset.vibeTags]);
    setErrorText(null);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = customTagInput.trim().replace(/,/g, '');
      if (trimmed && !vibeTags.includes(trimmed)) {
        setVibeTags([...vibeTags, trimmed]);
        setCustomTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setVibeTags(vibeTags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!title.trim()) {
      setErrorText('Please enter a descriptive meetup title.');
      return;
    }
    if (!locationName.trim()) {
      setErrorText('Please specify a location name or drop a pin on the map.');
      return;
    }

    if (limit <= 1 || limit > 5) {
      setErrorText('Small groups only! Allowed size is strictly between 2 to 5 people.');
      return;
    }

    // Check active spark policy based on dynamic reputation level limits
    if (draftCount >= maxSparks) {
      setErrorText(`Failed to create spark: As a ${repLevel}, you have reached your max active Spark limit of ${maxSparks}. Complete or cancel one of your active Sparks first!`);
      return;
    }

    if (!startTime || !endTime) {
      setErrorText('Please specify both start time and end time.');
      return;
    }

    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();

    if (endMs <= startMs) {
      setErrorText('End time must be securely set after the start time!');
      return;
    }

    const durationMs = endMs - startMs;
    const maxDurationMs = 24 * 60 * 60 * 1000; // 24 hours
    if (durationMs > maxDurationMs) {
      setErrorText('Maximum allowed duration for a Spark is 24 hours! (Between start and end time)');
      return;
    }

    // Target coordinates
    const lat = selectedCoordinates?.lat ?? userCoords.lat; // Fallback to user location
    const lng = selectedCoordinates?.lng ?? userCoords.lng;

    onAddMeetup({
      title: title.trim(),
      locationName: locationName.trim(),
      locationType,
      startTimeType,
      scheduledTime: startTime.substring(11), // "HH:MM"
      startTime,
      endTime,
      limit,
      vibeTags: vibeTags.length > 0 ? vibeTags : ['Chill', 'Local Hub'],
      lat,
      lng,
    });

    // Reset some states
    setTitle('');
    setCustomTagInput('');
    setErrorText(null);
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-slate-200 shadow-xl transition-all duration-300">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 group-hover:text-amber-400 transition-colors">
            <span className="text-amber-400">➕</span> Organizer Sparks Hub
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400 transition-colors group-hover:text-amber-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 transition-colors group-hover:text-amber-400" />
            )}
          </h3>
          <p className="text-[11px] text-slate-400">
            Active Sparks: <span className="text-slate-200 font-bold font-mono">{draftCount} / {maxSparks}</span> <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded ml-1 font-mono uppercase font-black tracking-wide">{repLevel}</span>
          </p>
        </div>
        <span className="text-[10px] bg-white/10 text-slate-300 font-mono px-2 py-1 rounded border border-white/10 shrink-0 select-text">
          {selectedCoordinates ? '📍 GPS Position Loaded' : '🎯 Standard Center'}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/10 pt-4"
          >
            {/* Preset Suggestions Row */}
      <div className="mb-4">
        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">
          Apply a Pre-designed Spark Idea
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_MEETUP_IDEAS.map((preset, idx) => (
            <button
              type="button"
              id={`preset-idea-${idx}`}
              key={idx}
              onClick={() => handleApplyPreset(preset)}
              className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 text-slate-300 font-medium px-2.5 py-1.5 rounded-lg transition active:scale-95"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        
        {/* Title Input Grid */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
            Spark Title
          </label>
          <div className="relative">
            <input
              id="meetup-form-title"
              type="text"
              placeholder="e.g. Study session / Football game / Evening walk"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorText(null);
               }}
              maxLength={40}
              className="w-full bg-white/5 border border-white/10 text-slate-100 rounded-xl px-3.5 py-2 pl-9 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-400"
            />
            <Cpu className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Location pick message or input */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  📍 Meetup Venue Name
                </span>
                <input
                  id="meetup-form-location"
                  type="text"
                  placeholder="e.g. Kopi Kenangan, Sudirman"
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    setErrorText(null);
                  }}
                  className="w-full bg-white/5 border border-white/10 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 mt-1 placeholder-slate-450"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <label className="text-[9px] text-slate-500 font-semibold uppercase block mb-1">
                    Venue Category
                  </label>
                  <select
                    id="meetup-form-venue"
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value as LocationType)}
                    className="w-full bg-white/5 border border-white/10 text-slate-100 rounded px-2 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="cafe" className="bg-slate-900 text-slate-100">☕ Café</option>
                    <option value="park" className="bg-slate-900 text-slate-100">🌳 Park</option>
                    <option value="gym" className="bg-slate-900 text-slate-100">🏋️ Gym / Sports</option>
                    <option value="coworking" className="bg-slate-900 text-slate-100">💻 Coworking</option>
                    <option value="library" className="bg-slate-900 text-slate-100">📚 Library</option>
                    <option value="restaurant" className="bg-slate-900 text-slate-100">🍕 Restaurant</option>
                    <option value="other" className="bg-slate-900 text-slate-100">📍 Other Hub</option>
                  </select>
                </div>
                
                <div className="flex items-end text-[9px] text-slate-400 font-sans leading-tight pl-2">
                  {selectedCoordinates ? (
                    <span className="text-emerald-400/90">
                      Coordinate customized on dropped pin! ({selectedCoordinates.lat.toFixed(4)}, {selectedCoordinates.lng.toFixed(4)})
                    </span>
                  ) : (
                    <span>Double-click any spot on the map to place custom GPS spark pins perfectly!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Start Time Type & Schedule range */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              ⏰ Urgency Preset (Quick Select)
            </label>
            <select
              id="meetup-form-time"
              value={startTimeType}
              onChange={(e) => handleStartTimeTypeChange(e.target.value as StartTimeType)}
              className="w-full bg-white/5 border border-white/10 text-slate-100 rounded-xl px-3 py-2 focus:outline-none cursor-pointer focus:ring-1 focus:ring-amber-500"
            >
              <option value="now" className="bg-slate-900 text-slate-100">⚡ Right Now! (Starts immediately)</option>
              <option value="30m" className="bg-slate-900 text-slate-100">⏳ In 30 Minutes</option>
              <option value="scheduled" className="bg-slate-900 text-slate-100">📅 Scheduled Custom Range</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
            <div>
              <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
                📅 Scheduled Start Time
              </label>
              <input
                id="meetup-form-starttime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 text-[11px] font-mono cursor-pointer"
              />
              <div className="mt-1.5 text-[10.5px] font-mono text-amber-300 font-medium px-2 py-1 bg-stone-900/80 border border-white/5 rounded-lg flex items-start gap-1">
                <span className="shrink-0">🗓️</span>
                <span className="break-words max-w-full">{formatFriendlyDateTime(startTime) || 'No start time set'}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
                🏁 Scheduled End Time
              </label>
              <input
                id="meetup-form-endtime"
                type="datetime-local"
                value={endTime}
                min={startTime}
                max={addOffsetToLocalString(startTime, 24 * 60 * 60 * 1000)}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 text-[11px] font-mono cursor-pointer"
              />
              <div className="mt-1.5 text-[10.5px] font-mono text-amber-300 font-medium px-2 py-1 bg-stone-900/80 border border-white/5 rounded-lg flex items-start gap-1">
                <span className="shrink-0">🏁</span>
                <span className="break-words max-w-full">{formatFriendlyDateTime(endTime) || 'No end time set'}</span>
              </div>
            </div>

            <div className="col-span-2 mt-1 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[9px] text-slate-450 uppercase tracking-widest font-black block">Active Duration</span>
                <span className="font-mono text-amber-400 font-bold text-[11.5px]">{getDurationString() ? `⏱️ ${getDurationString()}` : 'No duration calculated'}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-450 uppercase tracking-widest font-black block">Duration Limit</span>
                <span className="font-sans text-stone-300 font-medium text-[10.5px]">Max 24 hours allowed</span>
              </div>
            </div>

            <div className="col-span-2 text-[9.5px] text-slate-400 font-sans leading-relaxed pt-1 flex items-start gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Maximum allowed Spark duration is <strong>24 hours</strong>. The Spark automatically transitions to <strong>Completed</strong> once its scheduled end-time passes, archiving live logs & check-ins.
              </span>
            </div>
          </div>
        </div>

        {/* Max Attendees Limit Policy */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              👥 Group Limit (Max 5)
            </label>
            <span className="text-[10px] text-amber-400 font-mono font-medium">Auto-locked max ratio</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              id="meetup-form-limit"
              type="range"
              min="2"
              max="5"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="flex-1 opacity-80 cursor-pointer accent-amber-500 h-1.5 bg-white/10 rounded-lg"
            />
            <span className="font-mono font-black text-rose-400 text-sm">{limit} people</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-sans">
            Important Rule: Keep offline groups tiny (max 5) to foster real conversation and reduce booking friction!
          </p>
        </div>

        {/* Tags Row */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
            🏷️ Vibe Tags
          </label>
          <div className="flex flex-wrap gap-1 mb-1.5 min-h-[25px]">
            {vibeTags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-full font-sans border border-amber-500/20"
              >
                #{tag}
                <button
                  type="button"
                  id={`remove-tag-${tag}`}
                  onClick={() => handleRemoveTag(tag)}
                  className="font-black text-[9px] hover:text-rose-400 font-mono cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              id="meetup-form-taginput"
              type="text"
              placeholder="Add tag (e.g. Coffee, React, Chess) + Enter"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full bg-white/5 border border-white/10 text-xs text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none placeholder-slate-450"
            />
          </div>
        </div>

        {/* Errant Alerts */}
        {errorText && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex gap-1.5 items-start text-rose-350 text-[11px] animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p>{errorText}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          id="meetup-form-submit"
          className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-100 font-bold font-sans tracking-wide py-2.5 rounded-xl cursor-pointer shadow-lg hover:shadow-amber-500/15 active:scale-95 transition-all text-xs border border-amber-500/20"
        >
          🚀 Create Live Spark Pin
        </button>
      </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
