/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, CheckCircle, ShieldAlert, Users, Compass, Zap, Smile } from 'lucide-react';
import { Meetup, Message, User } from '../types';
import { QUICK_CHAT_SUGGESTIONS, SIMULATED_CHAT_REPLIES } from '../data';

interface ActiveMeetupChatProps {
  meetup: Meetup;
  currentUser: User;
  chatMessages: Message[];
  onSendMessage: (text: string) => void;
  onUserCheckIn: () => void;
  isUserCheckedIn: boolean;
  onSimulatedReceiveMessage: (text: string, sender: User) => void;
  onCompleteMeetup?: (meetupId: string) => void;
  onCancelMeetup?: (meetupId: string, reason: string) => void;
}

export default function ActiveMeetupChat({
  meetup,
  currentUser,
  chatMessages,
  onSendMessage,
  onUserCheckIn,
  isUserCheckedIn,
  onSimulatedReceiveMessage,
  onCompleteMeetup,
  onCancelMeetup,
}: ActiveMeetupChatProps) {
  const [typedMsg, setTypedMsg] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages list grows
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Simulate responses when the user sends a message
  const triggerAutoSimulatedReply = (userSentText: string) => {
    const textLower = userSentText.toLowerCase();
    
    // Choose which mock user of this meetup responds (exclude current user)
    const candidates = meetup.participants.filter(p => p.id !== currentUser.id);
    if (candidates.length === 0) return;
    const responder = candidates[Math.floor(Math.random() * candidates.length)];

    let reply = '';
    
    if (textLower.includes('where') || textLower.includes('sitting') || textLower.includes('spot') || textLower.includes('table')) {
      reply = meetup.locationType === 'cafe'
        ? "I'm sitting at the corner round table near the coffee counter. Wearing a green baseball cap!"
        : "I'm sitting near the central park benches by the main fountain path.";
    } else if (textLower.includes('here') || textLower.includes('arrived') || textLower.includes('reached')) {
      reply = `Awesome, I see you! I'm waving right now in your direction. Find ${responder.avatarSeed}!`;
    } else if (textLower.includes('late') || textLower.includes('minute') || textLower.includes('delay')) {
      reply = "No worries at all, drive safely! We're chilling and waiting for you.";
    } else {
      // Pull general reply related to the tags or generic
      const presetReplies = SIMULATED_CHAT_REPLIES[meetup.locationType] || SIMULATED_CHAT_REPLIES.general;
      reply = presetReplies[Math.floor(Math.random() * presetReplies.length)];
    }

    // Delay simulated response for high-fidelity real-time feel
    setTimeout(() => {
      onSimulatedReceiveMessage(reply, responder);
    }, 1500);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedMsg.trim()) return;

    onSendMessage(typedMsg.trim());
    triggerAutoSimulatedReply(typedMsg.trim());
    setTypedMsg('');
  };

  const handleQuickTap = (msg: string) => {
    onSendMessage(msg);
    triggerAutoSimulatedReply(msg);
  };

  // Compute distance in meters and checked in numbers
  const distanceMeters = meetup.distanceKm * 1000;
  const canCheckIn = distanceMeters <= 200;
  const canChat = distanceMeters <= 500;
  const totalArrivedCount = meetup.checkedInUserIds.length;

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex flex-col min-h-[520px] text-slate-200">
      
      {/* 1. Header with Check-In action */}
      <div className="p-4 bg-white/5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest leading-none flex items-center gap-1.5">
                📍 Logistical Coordination Chat
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                Active Group: <span className="text-amber-300 font-semibold">{meetup.title}</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {meetup.startDateTime} to {meetup.endDateTime}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-1 rounded font-mono font-bold">
              {totalArrivedCount}/{meetup.participants.length} Arrived
            </span>
          </div>
        </div>

        {/* TERMINAL STATE NOTIFICATION BANNERS */}
        {(meetup.status === 'completed' || meetup.status === 'cancelled') && (
          <div className={`mt-3.5 border p-3 rounded-xl flex gap-2 text-xs text-left ${
            meetup.status === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
              : 'bg-stone-500/10 border-stone-500/25 text-slate-300'
          }`}>
            <span className="text-base select-none mt-0.5">{meetup.status === 'completed' ? '✅' : '⚫'}</span>
            <div>
              <p className="font-extrabold uppercase tracking-widest text-[9.5px] text-slate-200">
                {meetup.status === 'completed' ? 'SPARK CONCLUDED SUCCESSFULLY' : 'SPARK TERMINATED BY ORGANIZER'}
              </p>
              <p className="mt-1 font-sans text-slate-400 text-[11px] leading-relaxed select-text">
                {meetup.status === 'completed'
                  ? 'This Spark coordinate has finished. All physical check-in metrics and attendee coordination credentials have been archived on-chain!'
                  : `This Spark was cancelled. Reason recorded: "${meetup.cancelReason || 'Insufficent participant traction before starting threshold reached.'}"`}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* 2. Chat Log Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-[#1E140F]/30 min-h-[150px]">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 p-6 space-y-2">
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-400">
              💬
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-400">Coordinative Logs Empty</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] mt-1">
                Say hello, provide your desk description, or tap quick directions below!
              </p>
            </div>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isSystem = msg.isSystem;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="inline-block bg-white/5 border border-white/10 text-[9px] text-slate-400 font-mono px-2.5 py-1 rounded-full text-center tracking-wide leading-normal">
                    📢 {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Micro avatar */}
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 bg-white/5 border border-white/10 shadow-inner select-none pointer-events-none mt-1">
                  {msg.senderId === currentUser.id ? '👤' : meetup.participants.find(p => p.id === msg.senderId)?.avatarSeed || '👤'}
                </span>

                <div>
                  <div className={`flex items-center gap-1.5 mb-0.5 text-[10px] ${isMe ? 'justify-end' : ''}`}>
                    <span className="font-bold text-slate-300">{msg.senderName}</span>
                    <span className="text-[8px] text-slate-500 font-mono">{msg.timestamp}</span>
                  </div>

                  <div className={`rounded-xl px-3.5 py-2.5 text-xs inline-block font-sans ${
                    isMe
                      ? 'bg-amber-600 text-slate-100 rounded-tr-none'
                      : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/10'
                  }`}>
                    <p className="leading-relaxed break-words">{msg.text}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* 3. Quick logistical tap prompts */}
      <div className="bg-white/5 px-4 py-2 border-t border-white/5">
        <span className="text-[8.5px] text-slate-500 uppercase tracking-widest font-black block mb-1.5">
          👉 Fast Logistical Taps (No typing required)
        </span>
        {meetup.status !== 'completed' && meetup.status !== 'cancelled' ? (
          canChat ? (
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
              {QUICK_CHAT_SUGGESTIONS.map((suggestion, idx) => (
                <button
                  id={`quick-chat-${idx}`}
                  key={idx}
                  onClick={() => handleQuickTap(suggestion)}
                  className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer hover:text-amber-200 transition active:scale-95 shrink-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-amber-500 italic pb-0.5">Move within 500m to access chat.</p>
          )
        ) : (
          <p className="text-[10px] text-slate-500 italic pb-0.5">Fast logistical coordination has been locked for this inactive session.</p>
        )}
      </div>

      {/* 4. Text Input Block bar */}
      <form onSubmit={handleSend} className="p-3.5 bg-white/5 border-t border-white/10 flex gap-2">
        <div className="relative flex-1">
          <input
            id="chat-input-text"
            type="text"
            disabled={meetup.status === 'completed' || meetup.status === 'cancelled' || !canChat}
            placeholder={
              meetup.status === 'completed'
                ? "🔒 Archival: Spark Completed"
                : meetup.status === 'cancelled'
                ? "🔒 Archival: Spark Cancelled"
                : !canChat
                ? "🔒 Move closer to chat (500m)"
                : "Type sits details..."
            }
            value={typedMsg}
            onChange={(e) => setTypedMsg(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-slate-200 text-xs rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-450 text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Smile className="absolute right-3 top-3 w-4 h-4 text-slate-500 cursor-pointer hover:text-slate-300 transition" />
        </div>

        <button
          type="submit"
          id="chat-send-submit"
          disabled={meetup.status === 'completed' || meetup.status === 'cancelled' || !canChat}
          className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-100 p-2.5 rounded-xl cursor-pointer transition active:scale-95 animate-none disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* --- BOTTOM ACTION PANELS (Independent sections) --- */}
      <div className="flex flex-col gap-3 p-3 bg-slate-900/40">
        {/* ORGANIZER ACTION HUB - COMPLETE & CANCEL RANGE */}
        {meetup.creatorId === currentUser.id && meetup.status !== 'completed' && meetup.status !== 'cancelled' && (
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/20 rounded-xl">
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-2">
              <span className="text-[9.5px] text-indigo-300 uppercase tracking-wider font-extrabold block">
                👑 Organizer Control Desk
              </span>
              <span className="text-[8.5px] text-indigo-400 font-mono">Host authority active</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              
              {showCancelInput ? (
                <div className="flex-1 min-w-[200px] flex gap-1.5 items-center">
                  <input
                    id="spark-cancel-reason"
                    type="text"
                    placeholder="Enter reason..."
                    value={cancelReasonText}
                    onChange={(e) => setCancelReasonText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-rose-500/30 text-slate-100 text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <button
                    id="btn-confirm-cancel-spark"
                    type="button"
                    onClick={() => {
                      if (!cancelReasonText.trim()) {
                        alert("Please specify a real reason for cancelling so participants are notified!");
                        return;
                      }
                      onCancelMeetup?.(meetup.id, cancelReasonText.trim());
                      setShowCancelInput(false);
                      setCancelReasonText('');
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-slate-100 px-3 py-1.5 rounded-lg cursor-pointer text-[10px] font-bold transition active:scale-95"
                  >
                    Hold Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancelInput(false);
                      setCancelReasonText('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-200 px-1"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <button
                  id="btn-trigger-cancel"
                  onClick={() => setShowCancelInput(true)}
                  className="bg-white/5 border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 px-3 py-2 rounded-xl cursor-pointer transition active:scale-95 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  Cancel Spark ⚫
                </button>
              )}
            </div>
          </div>
        )}

        {/* CRITICAL: Accountable Check-In Panel (Only if Active, not completed or cancelled) */}
        {meetup.status !== 'completed' && meetup.status !== 'cancelled' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-inner">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left space-y-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">
                  Physical Attendance Verification
                </span>
                <p className="text-[11px] text-slate-300 font-sans">
                  {canCheckIn 
                    ? "Tap when you reach the spot!" 
                    : `Too far (${Math.round(distanceMeters)}m). Get within 200m!`}
                </p>
              </div>
              
              <div className="flex flex-col gap-2 shrink-0">
                {isUserCheckedIn ? (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">
                    <CheckCircle className="w-4 h-4" /> Checked In (+5 Trust)
                  </div>
                ) : (
                  <button
                    id="btn-confirm-arrived"
                    onClick={onUserCheckIn}
                    disabled={!canCheckIn}
                    className={`inline-flex items-center gap-1.5 font-extrabold px-4 py-2 rounded-xl cursor-pointer shadow-lg transition-all text-xs ${
                      canCheckIn 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 active:scale-95 shadow-emerald-500/10'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-current" /> 📍 I'm Here!
                  </button>
                )}
              </div>
            </div>

            {/* Show Check-In Progress list of other attendees */}
            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-3">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black shrink-0">
                Arrivals Radar:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {meetup.participants.map(p => {
                  const checkedIn = meetup.checkedInUserIds.includes(p.id);
                  return (
                    <span
                      key={p.id}
                      title={checkedIn ? "Arrived & Verified" : "Commuting"}
                      className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        checkedIn
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold'
                          : 'bg-white/5 text-slate-400 border border-white/5'
                      }`}
                    >
                      {p.avatarSeed} {p.name.split(' ')[0]} {checkedIn ? '✓' : '◷'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
