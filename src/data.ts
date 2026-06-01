/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Location, NearbyDistrict } from './types';

export const SUPPORTED_DISTRICTS: NearbyDistrict[] = [
  {
    id: 'jakarta_central',
    name: 'Alun-alun & Kopi Kenangan Hub',
    city: 'Jakarta, ID',
    centerAddress: 'Jl. M.H. Thamrin No.1',
    lat: -6.1754,
    lng: 106.8272,
    zoomScale: 1.0,
  },
  {
    id: 'ny_dt',
    name: 'Washington Square Park Loop',
    city: 'New York, US',
    centerAddress: '5 Ave & Block 4',
    lat: 40.7308,
    lng: -73.9973,
    zoomScale: 1.0,
  },
  {
    id: 'london_soho',
    name: 'Soho Square Commons',
    city: 'London, UK',
    centerAddress: 'Frith St & Square Rd',
    lat: 51.5145,
    lng: -0.1303,
    zoomScale: 1.0,
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'user_sarah',
    name: 'Sarah Rahman',
    avatarSeed: '🙋‍♀️',
    avatarColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    trustScore: 98,
    isOnline: true,
    roleTag: 'Student / Reader'
  },
  {
    id: 'user_budi',
    name: 'Budi Santoso',
    avatarSeed: '🙋‍♂️',
    avatarColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    trustScore: 95,
    isOnline: true,
    roleTag: 'Coffee Enthusiast'
  },
  {
    id: 'user_clarissa',
    name: 'Clarissa Wu',
    avatarSeed: '👩‍💻',
    avatarColor: 'bg-pink-100 text-pink-800 border-pink-300',
    trustScore: 100,
    isOnline: true,
    roleTag: 'Node.js Dev'
  },
  {
    id: 'user_rian',
    name: 'Rian Pratama',
    avatarSeed: '🏃‍♂️',
    avatarColor: 'bg-amber-100 text-amber-800 border-amber-300',
    trustScore: 88,
    isOnline: true,
    roleTag: 'Morning Jogger'
  },
  {
    id: 'user_koko',
    name: 'Koko Ardi',
    avatarSeed: '🧢',
    avatarColor: 'bg-rose-100 text-rose-800 border-rose-300',
    trustScore: 72,
    isOnline: false,
    roleTag: 'Casual Footballer'
  },
  {
    id: 'user_lina',
    name: 'Lina Wijaya',
    avatarSeed: '🎒',
    avatarColor: 'bg-teal-100 text-teal-800 border-teal-300',
    trustScore: 94,
    isOnline: true,
    roleTag: 'Figma Designer'
  }
];

export const QUICK_CHAT_SUGGESTIONS = [
  "I'm arriving now!",
  "Where are you sitting?",
  "I'm at the main entrance.",
  "I'm wearing a black shirt.",
  "Just ordered a drink, sitting by the window.",
  "Running 2 mins late, sorry!",
];

export const PRESET_MEETUP_IDEAS = [
  {
    title: "Study at Kopi Kenangan",
    category: "Study",
    vibeTags: ["Concentration", "Coffee", "Quiet Board"],
    locationName: "Kopi Kenangan, Grand Indonesia",
    locationType: "cafe" as const,
    startTimeType: "now" as const,
    limit: 5,
    initialParticipantsCount: 3,
  },
  {
    title: "Evening walk at Alun-alun",
    category: "Walk",
    vibeTags: ["Fresh Air", "Casual Talk", "Walk-out"],
    locationName: "Alun-alun Central Plaza",
    locationType: "park" as const,
    startTimeType: "now" as const,
    limit: 5,
    initialParticipantsCount: 2,
  },
  {
    title: "Next.js Coding Session",
    category: "Coding",
    vibeTags: ["Indie Hacker", "Tech Talk", "Laptop"],
    locationName: "WeWork Coworking Suite 4",
    locationType: "coworking" as const,
    startTimeType: "now" as const,
    limit: 5,
    initialParticipantsCount: 1,
  },
  {
    title: "Table Tennis 2v2",
    category: "Sports",
    vibeTags: ["Ping Pong", "High Energy", "Competitive"],
    locationName: "Arena Sport Hall Table 3",
    locationType: "gym" as const,
    startTimeType: "now" as const,
    limit: 5,
    initialParticipantsCount: 4,
  }
];

// Contextual simulated responses for standard meetups when user joins
export const SIMULATED_CHAT_REPLIES: Record<string, string[]> = {
  general: [
    "Hey! Welcome to the group. We are gathering now.",
    "Hey there! Glad you could join. I am walking over.",
    "Awesome, we are almost full. Let's meet up shortly!",
    "Hey, I'm already here! Wearing a grey backpack.",
    "Nice! I will be there in about 10 minutes."
  ],
  study: [
    "Hey guys! I brought my laptop. I'm sitting near the power outlets.",
    "Perfect! I have a few exam questions we can crack together.",
    "Awesome. Just ordered my usual cold brew. Meet you in the back room."
  ],
  walk: [
    "Hey, let's meet by the large fountain!",
    "Great weather for a walk today! I'm already wearing my running shoes.",
    "Awesome. Walk-and-talk starts in 10 mins. Feel free to catch up!"
  ],
  coding: [
    "Welcome! What stack are you hacking on today? I'm polishing a React project.",
    "Nice. Table by the window has good extension cables.",
    "Hey! Will be there shortly, just need to finish this last compiler check."
  ],
  sports: [
    "We have the rackets ready! Just need one more player.",
    "Hey guys! Grab some water, it's going to be a heavy session.",
    "Let's meet straight at the courts!"
  ]
};
