import React from 'react';
import { Meetup } from '../types';
import { formatDistance, formatDateTime } from '../utils';

interface MeetupCardProps {
  key?: string;
  meetup: Meetup;
  isSelected: boolean;
  isCommitted: boolean;
  onSelect: (meetupId: string) => void;
}

export default function MeetupCard({
  meetup,
  isSelected,
  isCommitted,
  onSelect,
}: MeetupCardProps) {
  let stateColor = 'bg-indigo-500';
  let stateLabel = 'Purple Spark';
  if (meetup.status === 'forming') {
    stateColor = 'bg-amber-400 animate-pulse';
    stateLabel = 'Forming';
  } else if (meetup.status === 'active') {
    stateColor = 'bg-rose-500';
    stateLabel = 'Active';
  }

  return (
    <div
      id={`meetup-item-${meetup.id}`}
      onClick={() => onSelect(meetup.id)}
      className={`group p-3 rounded-xl border transition cursor-pointer select-none text-left relative overflow-hidden ${
        isSelected
          ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/5'
          : 'bg-white/5 hover:bg-white/10 border-white/10'
      }`}
    >
      {/* Left color ribbon indicator */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 ${isSelected ? 'bg-amber-500' : ''}`}></div>

      <div className="flex justify-between items-start gap-2 pl-1">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-amber-400 font-bold font-mono">
              {formatDistance(meetup.distanceKm)}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {formatDateTime(meetup.startTime)}
            </span>
            {isCommitted && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 px-1.5 py-0.2 rounded uppercase">
                Your Commitment
              </span>
            )}
          </div>
          <h3 className="text-xs font-bold text-slate-100 mt-1 leading-snug group-hover:text-amber-300 transition-colors">
            {meetup.title}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate max-w-[200px]">
            📍 {meetup.locationName}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold text-slate-950 ${stateColor}`}>
            {stateLabel}
          </span>
          <div className="text-[10px] text-slate-400 font-mono mt-1 font-bold">
            {meetup.participants ? meetup.participants.length : 1}/{meetup.limit} Slots
          </div>
        </div>
      </div>

      {/* Participant avatar row */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5 pl-1">
        <div className="flex items-center -space-x-1.5">
          {meetup.participants && meetup.participants.map((p, i) => (
            <div
              key={p.id || i}
              className={`w-5 h-5 rounded-full ${p.avatarColor || 'bg-indigo-600 text-white'} border border-[#16100D] flex items-center justify-center text-[10px] font-bold`}
              title={p.name}
            >
              {p.avatarSeed || '👤'}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {meetup.vibeTags && meetup.vibeTags.slice(0, 2).map((tag, idx) => (
            <span key={idx} className="text-[9px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
