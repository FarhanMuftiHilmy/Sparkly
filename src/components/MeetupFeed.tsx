import React from 'react';
import { NearbyDistrict, Meetup } from '../types';
import { SUPPORTED_DISTRICTS } from '../data';
import { calculateDistance } from '../utils';
import MeetupCard from './MeetupCard';

interface MeetupFeedProps {
  activeDistrict: NearbyDistrict;
  onDistrictChange: (district: NearbyDistrict) => void;
  userCoords: { lat: number; lng: number };
  timeFilter: 'all' | 'now' | '30m' | 'scheduled';
  setTimeFilter: (tf: 'all' | 'now' | '30m' | 'scheduled') => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  filteredMeetups: Meetup[];
  selectedMeetupId: string | null;
  activeMeetupId: string | null;
  onSelectMeetup: (id: string) => void;
  mobileActiveTab: 'map' | 'feed' | 'chat';
}

export default function MeetupFeed({
  activeDistrict,
  onDistrictChange,
  userCoords,
  timeFilter,
  setTimeFilter,
  categoryFilter,
  setCategoryFilter,
  filteredMeetups,
  selectedMeetupId,
  activeMeetupId,
  onSelectMeetup,
  mobileActiveTab,
}: MeetupFeedProps) {
  return (
    <section className={`lg:col-span-4 space-y-4 flex flex-col h-full ${mobileActiveTab === 'feed' ? 'block' : 'hidden lg:flex'}`}>
      {/* "Quick Areas" Dropdown Panel */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center z-10">
        <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-2 text-center">
          📍 Quick Areas
        </label>
        <div className="relative group">
          <select
            id="district-select"
            value={
              calculateDistance(userCoords.lat, userCoords.lng, activeDistrict.lat, activeDistrict.lng) <= 80
                ? activeDistrict.id
                : 'custom'
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'custom') return;
              const selected = SUPPORTED_DISTRICTS.find((d) => d.id === val);
              if (selected) onDistrictChange(selected);
            }}
            className="w-full bg-[#1E140F]/85 backdrop-blur border border-white/10 text-slate-100 rounded-xl px-3 py-2.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer hover:bg-[#281B14] transition-colors"
          >
            {SUPPORTED_DISTRICTS.map((dst) => {
              const cityName = dst.city.split(',')[0];
              return (
                <option key={dst.id} value={dst.id} className="text-left bg-[#1E140F] text-slate-100">
                  📍 {cityName}
                </option>
              );
            })}
            <option value="custom" className="text-left bg-[#1E140F] text-amber-400">
              📍 Custom (Outside Area)
            </option>
          </select>
        </div>
      </div>

      {/* Interactive Filtering Row Panel */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3.5 z-10">
        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
          🧭 Tactical Radius Filtering (Geo + Urgency Match)
        </span>

        {/* Urgency Time Selector buttons: NOW, 30m, Later */}
        <div className="grid grid-cols-4 gap-1 select-none">
          <button
            id="filter-time-all"
            onClick={() => setTimeFilter('all')}
            className={`py-1.5 rounded-lg text-[10px] font-mono leading-none tracking-tight font-black transition cursor-pointer ${
              timeFilter === 'all'
                ? 'bg-amber-600 text-slate-100 border border-amber-500'
                : 'bg-white/5 backdrop-blur hover:bg-white/10 text-slate-350 border border-white/5'
            }`}
          >
            Show All
          </button>

          <button
            id="filter-time-now"
            onClick={() => setTimeFilter('now')}
            title="Only show meetups starting right now within 1.5km"
            className={`py-1.5 rounded-lg text-[10px] font-mono leading-none tracking-tight font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              timeFilter === 'now'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-white/5 backdrop-blur hover:bg-white/10 text-amber-400/90 border border-white/5'
            }`}
          >
            <span>⚡ NOW</span>
            <span className="text-[8px] opacity-75">(&lt;1.5km)</span>
          </button>

          <button
            id="filter-time-30m"
            onClick={() => setTimeFilter('30m')}
            title="Show meetups in 30 minutes within 4km radius"
            className={`py-1.5 rounded-lg text-[10px] font-mono leading-none tracking-tight font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              timeFilter === '30m'
                ? 'bg-amber-600 text-slate-100 font-bold border border-amber-500'
                : 'bg-white/5 backdrop-blur hover:bg-white/10 text-amber-300 border border-white/5'
            }`}
          >
            <span>⏳ 30 Min</span>
            <span className="text-[8px] opacity-75">(&lt;4km)</span>
          </button>

          <button
            id="filter-time-scheduled"
            onClick={() => setTimeFilter('scheduled')}
            title="Show scheduled meetups up to 10km away"
            className={`py-1.5 rounded-lg text-[10px] font-mono leading-none tracking-tight font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              timeFilter === 'scheduled'
                ? 'bg-[#1E140F]/80 text-amber-200 border border-white/10'
                : 'bg-white/5 backdrop-blur hover:bg-white/10 text-slate-400 border border-white/5'
            }`}
          >
            <span>📅 Later</span>
            <span className="text-[8px] opacity-75">(&lt;10km)</span>
          </button>
        </div>

        {/* Quick preset categories tags selection */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar select-none text-[10px]">
          {['All', 'Study', 'Walk', 'Coding', 'Sports', 'Cafe'].map((cat) => (
            <button
              id={`filter-cat-${cat}`}
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer border border-white/5 ${
                categoryFilter === cat
                  ? 'bg-white text-slate-950 font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
              }`}
            >
              #{cat}
            </button>
          ))}
        </div>
      </div>

      {/* Available meetups near you list */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex-1 flex flex-col min-h-[300px] overflow-hidden z-10">
        <div className="flex items-center justify-between mb-3 shrink-0 border-b border-white/5 pb-2">
          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
            📍 Nearby Sparks Found ({filteredMeetups.length})
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Sorted by proximity</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[320px] md:max-h-[360px]">
          {filteredMeetups.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-white/10 bg-white/5 rounded-xl text-slate-400 text-xs">
              <p className="font-semibold">No Reachable Sparks Found</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal max-w-[190px] mx-auto">
                Try changing your timing filter or geographical center coordinates above to scan wider!
              </p>
            </div>
          ) : (
            filteredMeetups.map((meet) => (
              <MeetupCard
                key={meet.id}
                meetup={meet}
                isSelected={selectedMeetupId === meet.id}
                isCommitted={activeMeetupId === meet.id}
                onSelect={onSelectMeetup}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
