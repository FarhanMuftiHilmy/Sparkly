import React from 'react';
import {
  Compass,
  Zap,
  Map,
  Shield,
} from 'lucide-react';
import { NearbyDistrict, User } from '../types';
import { SUPPORTED_DISTRICTS } from '../data';
import { loginWithGoogle, logoutUser } from '../lib/firebase';

interface HeaderProps {
  activeDistrict: NearbyDistrict;
  onDistrictChange: (district: NearbyDistrict) => void;
  userTrustScore: number;
  isMapFullscreen: boolean;
  onToggleMapFullscreen: () => void;
  currentUser: User;
  firebaseUser: any;
  onOpenProfile: () => void;
}

export default function Header({
  activeDistrict,
  onDistrictChange,
  userTrustScore,
  isMapFullscreen,
  onToggleMapFullscreen,
  currentUser,
  firebaseUser,
  onOpenProfile,
}: HeaderProps) {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-4 py-3 text-slate-100 flex items-center justify-between">
      {/* Brand & District dropdown */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-950/40">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight text-slate-100 flex items-center space-x-1.5">
              <span>Spark</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Micro-Meetups
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Spontaneous, micro-group physical meetups nearby
            </p>
          </div>
        </div>

        {/* District Switcher */}
        <div className="hidden md:flex items-center space-x-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300">
          <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <select
            value={activeDistrict.id}
            onChange={(e) => {
              const d = SUPPORTED_DISTRICTS.find((dist) => dist.id === e.target.value);
              if (d) onDistrictChange(d);
            }}
            className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            {SUPPORTED_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                {d.name} ({d.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Trust score badge */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-slate-950/60 border border-slate-800 px-2.5 py-1 rounded-lg text-xs">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Trust Index:</span>
          <span className="font-semibold text-emerald-400">{userTrustScore}/100</span>
        </div>

        {/* Fullscreen Map Toggle */}
        <button
          onClick={onToggleMapFullscreen}
          className={`p-2 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-colors ${
            isMapFullscreen
              ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
          title="Toggle Fullscreen Map Mode"
        >
          <Map className="w-4 h-4" />
          <span className="hidden md:inline">
            {isMapFullscreen ? 'Split View' : 'Focus Map'}
          </span>
        </button>

        {/* Auth / Profile action */}
        {firebaseUser ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenProfile}
              className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 rounded-full pl-1 pr-3 py-1 transition-colors"
            >
              <div className={`w-7 h-7 rounded-full ${currentUser.avatarColor || 'bg-indigo-600 text-slate-100 border-indigo-400'} flex items-center justify-center text-xs font-bold border border-white/20`}>
                {currentUser.avatarSeed || '🦸‍♂️'}
              </div>
              <span className="text-xs font-medium text-slate-200 max-w-[90px] truncate hidden sm:inline">
                {currentUser.name}
              </span>
            </button>
            <button
              onClick={logoutUser}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => loginWithGoogle()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-indigo-950/50 transition-colors flex items-center space-x-1.5"
          >
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
