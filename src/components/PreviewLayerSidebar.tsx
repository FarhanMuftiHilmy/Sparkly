/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, MapPin, Tag, Shield, Calendar, AlertCircle, ArrowRight, Zap, CheckCircle2, Lock } from 'lucide-react';
import { Meetup, User } from '../types';
import { formatDistance, formatDateTime } from '../utils';

interface PreviewLayerSidebarProps {
  meetup: Meetup;
  onJoinMeetup: (meetupId: string) => void;
  onLeaveMeetup: (meetupId: string) => void;
  currentUser: User;
  isJoinedCurrentUser: boolean;
  activeMeetupId: string | null;
  onToggleWaitlist: (meetupId: string) => void;
  waitlistedIds: string[];
  onCancelMeetup?: (meetupId: string, reason: string) => void;
}

export default function PreviewLayerSidebar({
  meetup,
  onJoinMeetup,
  onLeaveMeetup,
  currentUser,
  isJoinedCurrentUser,
  activeMeetupId,
  onToggleWaitlist,
  waitlistedIds,
  onCancelMeetup,
}: PreviewLayerSidebarProps) {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReasonText, setCancelReasonText] = useState('');

  const isFull = meetup.participants.length >= meetup.limit;
  const isWaitlisted = waitlistedIds.includes(meetup.id);
  
  const isHost = meetup.creatorId === currentUser.id;

  // Custom double commitment block checking
  const hasOverlappingCommitment = !isHost && activeMeetupId !== null && activeMeetupId !== meetup.id;

  // Render context-based simulated micro-profile attributes to give deep human signal
  const getMicroSignals = () => {
    switch (meetup.id) {
      case 'meetup_1':
        return {
          roles: '2 are engineering students, 1 freelance UX designer',
          vibes: 'Punctual coffee drinkers. Open textbooks, review ready.',
          history: '98% host completion score • Meets weekly'
        };
      case 'meetup_2':
        return {
          roles: '1 morning jogger, 1 creative writer',
          vibes: 'Casual outdoor stroll fans. Comfortable sneakers atmosphere.',
          history: 'All participants checked-in successfully in previous session'
        };
      case 'meetup_3':
        return {
          roles: 'Clarissa (SaaS builder / full-stack mentor)',
          vibes: 'Silent focus with small project check-ins. Extension cord available.',
          history: 'Fast-growing meetup signal'
        };
      case 'meetup_4':
        return {
          roles: '3 high-cardio sports hobbyists, 1 casual weekend player',
          vibes: 'Competitive match but friendly! Bibs & ball provided.',
          history: '100% attendance rate in last 4 game cycles'
        };
      case 'meetup_5':
        return {
          roles: '4 running club veterans, 1 beginner jogger',
          vibes: '5:30 min/km target pace. Coffee together after finishing.',
          history: 'Highly active group, zero last-minute cancellations reported'
        };
      default:
        return {
          roles: '1 developer, 1 local explorer',
          vibes: 'Open to fresh coordinates, friendly meetup structure.',
          history: 'Safe community vetted • 95% trust index'
        };
    }
  };

  const signals = getMicroSignals();
  
  // Style for tags
  const getVenueEmoji = (type: string) => {
    switch (type) {
      case 'cafe': return '☕ Cafe';
      case 'park': return '🌳 Park Area';
      case 'gym': return '🏋️ Sports Hall / Gym';
      case 'coworking': return '💻 Coworking Area';
      case 'library': return '📚 Library Site';
      case 'restaurant': return '🍕 Food Corner';
      default: return '📍 Local Hub';
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl text-slate-200">
      
      {/* Visual Header card */}
      <div className="p-5 border-b border-white/10 bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2">
          <p className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-widest leading-none">
            {getVenueEmoji(meetup.locationType)} • {formatDistance(meetup.distanceKm)} nearby
          </p>
          <span className={`text-[9px] font-mono tracking-wider font-semibold uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${
            meetup.status === 'spark' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
            meetup.status === 'forming' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse' :
            meetup.status === 'active' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
            meetup.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
            'bg-slate-500/15 text-slate-300 border-slate-500/30'
          }`}>
            {meetup.status === 'spark' ? '🟣 Spark' :
             meetup.status === 'forming' ? '🟡 Forming' :
             meetup.status === 'active' ? '🔴 Active' :
             meetup.status === 'completed' ? '✅ Completed' :
             '⚫ Cancelled'}
          </span>
        </div>
        
        <h3 id="preview-meetup-title" className="text-base font-extrabold text-slate-100 tracking-tight leading-snug">
          {meetup.title}
        </h3>
        
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-2">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-sans line-clamp-1">{meetup.locationName}</span>
        </p>
      </div>

      {/* Meetup Information Signals */}
      <div className="p-5 space-y-4">
        
        {/* Statistics Ratio Bar */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" /> Space Reserved
            </span>
            <span className="font-mono font-bold text-slate-200">
              {meetup.participants.length} / {meetup.limit} ({isFull ? 'FULLY COMMUTED' : 'Slots Open'})
            </span>
          </div>
          
          <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isFull ? 'bg-rose-500' :
                meetup.status === 'forming' ? 'bg-amber-400' :
                'bg-amber-500'
              }`}
              style={{ width: `${(meetup.participants.length / meetup.limit) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* PREVIEW LAYER LOGIC LAYER: Safe Micro-Profile Signals */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block border-b border-white/5 pb-1.5">
            👥 Nearby Micro-Profile Signals (Safe Preview)
          </span>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div>
              <p className="text-[10px] text-slate-400 font-medium font-mono">Members Roles</p>
              <p className="text-slate-200 font-sans mt-0.5 font-medium">{signals.roles}</p>
            </div>
            
            <div>
              <p className="text-[10px] text-slate-400 font-medium font-mono">Expected Conversation Vibe</p>
              <p className="text-slate-300 font-sans mt-0.5">{signals.vibes}</p>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 font-medium font-mono">Reputation & Activity Signals</p>
              <p className="text-amber-300 font-sans mt-0.5 flex items-center gap-1 font-medium text-[11px]">
                <Shield className="w-3 text-amber-400" /> {signals.history}
              </p>
            </div>
          </div>
        </div>

        {/* Timing Urgency */}
        <div className="border-t border-b border-white/10 py-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium select-none">Planned Timing:</span>
            <span className="font-mono font-bold text-slate-200 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {meetup.startTimeType === 'now' ? 'RIGHT NOW! (Join prompt)' :
               meetup.startTimeType === '30m' ? 'In 30 Minutes' :
               `${formatDateTime(meetup.scheduledStartDateTime)} - ${formatDateTime(meetup.scheduledEndDateTime)}`}
            </span>
          </div>
        </div>

        {/* Participant list with avatars */}
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">
            Joined Attendees ({meetup.participants.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {meetup.participants.map((p, idx) => (
              <div
                key={p.id}
                id={`preview-attendee-${idx}`}
                className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs"
              >
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white/10">
                  {p.avatarSeed}
                </span>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-200">
                      {p.id === currentUser.id ? 'You' : p.name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono font-black">
                      {p.trustScore}%
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-none">{p.roleTag || 'Attendee'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strict Guardrails Block alerts */}
        {hasOverlappingCommitment && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-300 text-[11px] leading-relaxed flex gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[9px] text-rose-400">RSVP BLOCK ACTIVE</p>
              <p className="mt-1">
                You are registered on another active meetup.
                To maintain real-world accountability, the system restricts you to <strong>max 1 active commitment at a time</strong>.
              </p>
              <p className="text-slate-400 font-sans mt-1">Leave your current active meetup to join this one.</p>
            </div>
          </div>
        )}

        {/* Join button triggers & state machine toggle */}
        <div className="pt-2">
          {meetup.status === 'completed' ? (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl flex gap-2 text-emerald-300 text-[11px]">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold uppercase tracking-wider text-[9px] text-slate-200">🏆 SPARK CONCLUDED SUCCESSFULLY</p>
                <p className="mt-1 text-slate-450 leading-relaxed">
                  This Spark coordinate has finished. All physical check-in metrics and attendee coordination credentials have been archived!
                </p>
              </div>
            </div>
          ) : meetup.status === 'cancelled' ? (
            <div className="bg-stone-500/10 border border-stone-500/25 p-3.5 rounded-xl flex gap-2 text-slate-300 text-[11px]">
              <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold uppercase tracking-wider text-[9px] text-rose-400">⚫ SPARK TERMINATED</p>
                <p className="mt-1 text-slate-450 leading-relaxed">
                  This Spark was cancelled. Reason recorded: <span className="text-slate-300 font-sans">"{meetup.cancelReason || 'Cancelled automatically: insufficient participants before scheduled start time.'}"</span>
                </p>
              </div>
            </div>
          ) : isHost ? (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex gap-2 text-amber-300 text-[11px]">
                <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wider text-[9px] text-amber-400">YOU ARE THE ORGANIZER & HOST</p>
                  <p className="mt-1 text-slate-300">
                    You created this Spark. Physical check-in and attendee coordination logistics are open in your right-hand panel. Secure your coordinate spot by arriving at the scene!
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                <span className="text-[9px] text-slate-450 uppercase tracking-widest font-black block">👑 Organizer Host Desk</span>
                {showCancel ? (
                  <div className="space-y-2 pt-1">
                    <input
                      id="host-prev-cancel-reason"
                      type="text"
                      placeholder="Why are you cancelling? (required)"
                      value={cancelReasonText}
                      onChange={(e) => setCancelReasonText(e.target.value)}
                      className="w-full bg-slate-950 border border-rose-500/35 text-slate-100 text-[11px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                    />
                    <div className="flex gap-2">
                      <button
                        id="btn-confirm-cancel-preview"
                        type="button"
                        onClick={() => {
                          if (!cancelReasonText.trim()) {
                            alert("Please specify a real reason for cancelling so participants are notified!");
                            return;
                          }
                          onCancelMeetup?.(meetup.id, cancelReasonText.trim());
                          setShowCancel(false);
                          setCancelReasonText('');
                        }}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-slate-100 py-1.5 rounded-lg cursor-pointer text-[10px] font-bold transition active:scale-95 text-center uppercase tracking-wider"
                      >
                        Confirm Cancellation
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCancel(false);
                          setCancelReasonText('');
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg cursor-pointer text-[10px] transition font-bold uppercase tracking-wider"
                      >
                        Keep Spark
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    id="btn-sidebar-trigger-cancel"
                    type="button"
                    onClick={() => setShowCancel(true)}
                    className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 py-2 rounded-xl cursor-pointer transition active:scale-95 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    ⚫ Cancel Spark Meetup
                  </button>
                )}
              </div>
            </div>
          ) : isJoinedCurrentUser ? (
            <div className="space-y-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex gap-2 text-emerald-300 text-[11px] mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">YOUR SLOT IS SAFELY RESERVED!</p>
                  <p className="mt-0.5 text-slate-300">The coordinate logistics chat is unlocked in the right-hand panel. Coordinate below and march over!</p>
                </div>
              </div>
              <button
                id="btn-leave-meetup"
                onClick={() => onLeaveMeetup(meetup.id)}
                className="w-full bg-white/5 border border-rose-500/35 text-rose-400 hover:bg-rose-500/10 font-bold py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 text-xs text-center uppercase tracking-wider"
              >
                🔴 LEAVE RESERVED SLOT (Lowers score)
              </button>
            </div>
          ) : hasOverlappingCommitment ? (
            <button
              disabled
              id="btn-join-disabled"
              className="w-full bg-white/3 text-slate-500 font-bold py-3 rounded-xl cursor-not-allowed text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/5"
            >
              <Lock className="w-4 h-4" /> RSVP Overlap Locked
            </button>
          ) : isFull ? (
            /* WAITLIST MECHANIC FOR SCARCITY COMMITMENT INCREASES */
            <div className="space-y-2">
              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-amber-300 text-[10.5px] leading-relaxed">
                🚨 This meetup is fully occupied! A waitlist spot increments commitment level. You are notified instantly if a slot opens.
              </div>
              <button
                id="btn-waitlist"
                onClick={() => onToggleWaitlist(meetup.id)}
                className={`w-full py-2.5 rounded-xl cursor-pointer font-bold font-sans tracking-wide active:scale-95 transition text-xs ${
                  isWaitlisted
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                    : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-100'
                }`}
              >
                {isWaitlisted ? '🌟 LEAVE WAITLIST SPOT' : '➕ SECURE WAITLIST SPOT'}
              </button>
            </div>
          ) : (
            <button
              id="btn-join-meetup"
              onClick={() => onJoinMeetup(meetup.id)}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-100 font-bold font-sans tracking-wide py-3 rounded-xl cursor-pointer shadow-lg hover:shadow-amber-500/15 active:scale-95 transition-all text-xs uppercase flex items-center justify-center gap-1.5"
            >
              🚀 COMMIT & SECURE SLOT <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
