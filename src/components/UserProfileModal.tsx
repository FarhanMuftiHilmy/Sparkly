/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Award, Shield, Check, Plus, Heart, Calendar, 
  MapPin, User as UserIcon, Clock, AlertTriangle, Sparkles, Zap
} from 'lucide-react';
import { User, Meetup } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateProfile: (updated: User) => void;
  upcomingMeetups: Meetup[];
  onSelectMeetup: (id: string) => void;
}

// Preset avatars (emojis)
const PRESET_EMOJIS = [
  { emoji: '⚽', label: 'Sports' },
  { emoji: '💻', label: 'Tech' },
  { emoji: '🚀', label: 'Entrepreneur / ambitious' },
  { emoji: '👟', label: 'Running / fitness' },
  { emoji: '🎨', label: 'Creative' },
  { emoji: '🧠', label: 'Intellectual' },
  { emoji: '🌱', label: 'Growth-minded / chill' },
  { emoji: '☕', label: 'Coffee lover' },
  { emoji: '🌟', label: 'Positive / outgoing' },
  { emoji: '🦄', label: 'Unique / quirky' },
  { emoji: '🎧', label: 'Music lover' },
  { emoji: '🍕', label: 'Foodie' },
  { emoji: '🦊', label: 'Curious / adventurous' },
  { emoji: '🦁', label: 'Confident / leader' },
];

// Preset avatar custom styling themes
const AVATAR_THEMES = [
  { name: 'Indigo Aura', class: 'bg-indigo-600 text-slate-100 border-indigo-400' },
  { name: 'Emerald Spark', class: 'bg-emerald-600 text-emerald-50 border-emerald-400' },
  { name: 'Amber Glow', class: 'bg-amber-500 text-slate-900 border-amber-350' },
  { name: 'Crimson Power', class: 'bg-rose-600 text-rose-50 border-rose-400' },
  { name: 'Sunset Vibe', class: 'bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-100 border-orange-400' },
  { name: 'Deep Space', class: 'bg-slate-800 text-slate-200 border-slate-600' }
];

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  upcomingMeetups,
  onSelectMeetup
}: UserProfileModalProps) {
  
  // Local editable fields
  const [name, setName] = useState(currentUser.name || '');
  const [bio, setBio] = useState(currentUser.bio || 'Co-coordinating small moments together.');
  const [roleTag, setRoleTag] = useState(currentUser.roleTag || 'Explorer');
  const [avatarSeed, setAvatarSeed] = useState(currentUser.avatarSeed || '🦸‍♂️');
  const [avatarColor, setAvatarColor] = useState(currentUser.avatarColor || 'bg-indigo-600 text-slate-100 border-indigo-400');
  
  const [reputationScore, setReputationScore] = useState(currentUser.reputationScore ?? 88);
  const [attendedCount, setAttendedCount] = useState(currentUser.attendedCount ?? 2);
  const [hostedCount, setHostedCount] = useState(currentUser.hostedCount ?? 1);
  const [noShowCount, setNoShowCount] = useState(currentUser.noShowCount ?? 0);
  
  const [interests, setInterests] = useState<string[]>(currentUser.interests || ['Coding', 'Coffee', 'Design']);
  const [newInterest, setNewInterest] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if currentUser changes
  React.useEffect(() => {
    setName(currentUser.name || '');
    setBio(currentUser.bio || 'Co-coordinating small moments together.');
    setRoleTag(currentUser.roleTag || 'Explorer');
    setAvatarSeed(currentUser.avatarSeed || '🦸‍♂️');
    setAvatarColor(currentUser.avatarColor || 'bg-indigo-600 text-slate-100 border-indigo-400');
    setReputationScore(currentUser.reputationScore ?? 88);
    setAttendedCount(currentUser.attendedCount ?? 2);
    setHostedCount(currentUser.hostedCount ?? 1);
    setNoShowCount(currentUser.noShowCount ?? 0);
    setInterests(currentUser.interests || ['Coding', 'Coffee', 'Design']);
  }, [currentUser]);

  if (!isOpen) return null;

  // Determine reputation level based on score
  const getReputationLevel = (score: number) => {
    if (score < 20) return { title: 'Newcomer', color: 'text-slate-300 border-slate-500/20 bg-slate-500/10' };
    if (score < 50) return { title: 'Reliable', color: 'text-blue-300 border-blue-500/20 bg-blue-500/10' };
    if (score < 100) return { title: 'Trusted', color: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' };
    if (score < 200) return { title: 'Highly Trusted', color: 'text-amber-300 border-amber-500/20 bg-amber-550/10' };
    return { title: 'Community Pillar', color: 'text-orange-200 border-orange-500/30 bg-gradient-to-r from-orange-500/20 to-red-500/20' };
  };

  const repDetails = getReputationLevel(reputationScore);

  // Compute attendance rate: (attendedCount / (attendedCount + noShowCount)) * 100
  const totalConcluded = attendedCount + noShowCount;
  const attendanceRate = totalConcluded > 0 
    ? Math.round((attendedCount / totalConcluded) * 100) 
    : 100;

  // Save profile edits back to major context
  const handleSave = () => {
    const updatedUser: User = {
      ...currentUser,
      name,
      bio,
      roleTag,
      avatarSeed,
      avatarColor,
      reputationScore,
      attendedCount,
      hostedCount,
      noShowCount,
      interests,
      trustScore: Math.min(Math.max(Math.round((attendanceRate + (reputationScore / 4)) / 1.5), 10), 100) // sync accountability percentage
    };
    onUpdateProfile(updatedUser);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Tag helper
  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (tag: string) => {
    setInterests(interests.filter(i => i !== tag));
  };

  // Simulator helper trigger keys
  const triggerSimAction = (type: 'attend' | 'host' | 'late_cancel' | 'no_show') => {
    switch (type) {
      case 'attend':
        setReputationScore(prev => prev + 5);
        setAttendedCount(prev => prev + 1);
        break;
      case 'host':
        setReputationScore(prev => prev + 3);
        setHostedCount(prev => prev + 1);
        break;
      case 'late_cancel':
        setReputationScore(prev => Math.max(0, prev - 3));
        setNoShowCount(prev => prev + 1); // cancellation counts as a disruption
        break;
      case 'no_show':
        setReputationScore(prev => Math.max(0, prev - 10));
        setNoShowCount(prev => prev + 1);
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-start justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-4xl bg-gradient-to-b from-[#1C120C] to-[#140D09] border border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row"
      >
        {/* Left Side: Avatar Customization & Core Stats */}
        <div className="w-full md:w-2/5 p-4 md:p-6 border-b md:border-b-0 md:border-r border-white/5 flex flex-col items-center justify-between bg-black/25">
          <div className="w-full flex flex-col items-center">
            {/* Header / Title */}
            <div className="flex items-center gap-1.5 self-start mb-6">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">Explorer Passport</span>
            </div>

            {/* Profile Avatar Box */}
            <div className={`w-28 h-28 rounded-2xl ${avatarColor} border-2 flex items-center justify-center text-5xl shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 mb-4`}>
              {avatarSeed}
            </div>

            {/* Role Tag */}
            <div className="mt-2 w-full">
              <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Role Tag</label>
              <input
                type="text"
                value={roleTag}
                onChange={(e) => setRoleTag(e.target.value)}
                placeholder="e.g. Enthusiast"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/70"
              />
            </div>

            {/* Avatar Seed Presets Picker */}
            <div className="w-full mt-6">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-2">Configure Personality Emoji</label>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {PRESET_EMOJIS.map(item => (
                  <button
                    key={item.emoji}
                    title={item.label}
                    onClick={() => setAvatarSeed(item.emoji)}
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-sm cursor-pointer border transition-all ${
                      avatarSeed === item.emoji 
                        ? 'bg-amber-500/25 border-amber-400 text-white scale-110' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70'
                    }`}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar Color Theme Selection */}
            <div className="w-full mt-5">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-2">Select Shield Theme</label>
              <div className="grid grid-cols-2 gap-1.5">
                {AVATAR_THEMES.map(theme => (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => setAvatarColor(theme.class)}
                    className={`px-2 py-1 text-[9px] font-semibold border rounded-lg cursor-pointer text-left flex items-center gap-1 transition-all ${
                      avatarColor === theme.class
                        ? 'bg-white/10 border-amber-500 text-white'
                        : 'bg-black/20 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${theme.class} border border-white/15`} />
                    <span className="truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full mt-6 pt-5 border-t border-white/5 text-center text-[10px] text-zinc-500 font-sans">
            Device Local Security Key Verified
          </div>
        </div>

        {/* Right Side: Account Details, Interests, Commitments & Simulator */}
        <div className="w-full md:w-3/5 p-4 md:p-6 flex flex-col justify-between h-auto">
          <div>
            {/* Header bar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider font-sans">
                  Verified Profile Radar <span className="text-amber-400">({reputationScore} Rep)</span>
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white cursor-pointer transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Section */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[9px] text-zinc-400 font-black uppercase tracking-wider block mb-1.5">Coordinating Call Code Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Farhan Hilmy"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/70"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-[9px] text-zinc-400 font-black uppercase tracking-wider block mb-1.5">Public Explorer Bio / Status</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell nearby users about your hobbies, stack, or what kind of sparks you vibe with."
                  rows={2}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/70 resize-none"
                />
              </div>

              {/* Dynamic Metrics Row */}
              <div>
                <label className="text-[9px] text-zinc-400 font-black uppercase tracking-wider block mb-2">Reputation Logistics Scoreboard</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center flex flex-col justify-between">
                    <span className="text-[9px] text-zinc-400 block font-bold leading-none uppercase">Reputation Level</span>
                    <span className={`text-[10px] font-black block mt-2 py-1 px-1.5 rounded uppercase leading-none ${repDetails.color}`}>
                      ⭐ {repDetails.title}
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-400 block font-bold leading-none uppercase">Reputation Score</span>
                    <span className="text-lg font-mono font-black text-amber-400 block mt-1.5">{reputationScore}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-400 block font-bold leading-none uppercase">Attendance Rate</span>
                    <span className="text-lg font-mono font-black text-slate-100 block mt-1.5">{attendanceRate}%</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-400 block font-bold leading-none uppercase">Total Attended Meetups</span>
                    <span className="text-lg font-mono font-black text-emerald-400 block mt-1.5">✓ {attendedCount}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-400 block font-bold leading-none uppercase">Total Hosted Meetups</span>
                    <span className="text-lg font-mono font-black text-indigo-400 block mt-1.5">★ {hostedCount}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] text-zinc-400 block font-bold leading-none uppercase">Total No-Shows</span>
                    <span className="text-lg font-mono font-black text-rose-400 block mt-1.5">⚠ {noShowCount}</span>
                  </div>
                </div>
              </div>

              {/* Editable Interests / Tags */}
              <div>
                <label className="text-[9px] text-zinc-400 font-black uppercase tracking-wider block mb-2">Interests & Vibe Focuses (Tags)</label>
                <form onSubmit={handleAddInterest} className="flex gap-1.5 mb-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="New interest tag..."
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500/70"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/35 text-amber-300 rounded-lg text-[11px] font-bold cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-sans text-[10px] font-medium"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(tag)}
                        className="text-zinc-500 hover:text-rose-400 focus:outline-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {interests.length === 0 && (
                    <span className="text-[10px] text-zinc-500 italic">No interests specified yet. Add one above!</span>
                  )}
                </div>
              </div>

              {/* Upcoming commitments */}
              <div>
                <label className="text-[9px] text-zinc-400 font-black uppercase tracking-wider block mb-1.5 flex justify-between">
                  <span>Upcoming Commitments ({upcomingMeetups.length})</span>
                  <span className="text-zinc-500 select-none">Click to focus</span>
                </label>
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {upcomingMeetups.map(meetup => {
                    const isCreator = meetup.creatorId === currentUser.id;
                    return (
                      <div
                        key={meetup.id}
                        onClick={() => {
                          onSelectMeetup(meetup.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2 bg-white/5 border border-white/5 hover:border-amber-500/30 hover:bg-white/10 rounded-lg text-[11px] cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs shrink-0">{meetup.locationType === 'cafe' ? '☕' : meetup.locationType === 'park' ? '🌳' : '📍'}</span>
                          <span className="text-slate-200 font-bold max-w-[130px] sm:max-w-xs truncate">{meetup.title}</span>
                          {isCreator && (
                            <span className="text-[8px] bg-indigo-500/10 text-indigo-300 border border-indigo-400/20 px-1 py-0.2 rounded font-mono font-black scale-90">HOST</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 font-mono text-[9px]">{meetup.locationName}</span>
                          <span className={`text-[8.5px] font-mono px-1 py-0.2 rounded uppercase ${
                            meetup.status === 'active' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {meetup.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {upcomingMeetups.length === 0 && (
                    <div className="text-center py-4 bg-white/3 border border-white/5 rounded-xl text-[10px] text-zinc-500 italic">
                      Zero active commitments. Drop a spark pin on the map to start co-coordinating!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {saveSuccess && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0 }} 
                    className="text-xs text-emerald-400 font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Passport synced successfully!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 cursor-pointer transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-[#140D09] shadow-lg shadow-amber-500/25 cursor-pointer transition-all active:scale-95"
              >
                Sync & Save
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
