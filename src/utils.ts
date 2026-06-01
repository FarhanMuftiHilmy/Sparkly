/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Meetup, MeetupStatus, User, LocationType, StartTimeType } from './types';
import { MOCK_USERS } from './data';

/**
 * Format date time
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return 'TBD';
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculates the Haversine distance in kilometers between two points
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(2));
}

/**
 * Converts local SVG coordinates (dx, dy) to Lat/Lng offsets
 * dx and dy are off-center offsets from -300 to +300 on our interactive map canvas
 */
export function gridToLatLng(
  centerLat: number,
  centerLng: number,
  dx: number,
  dy: number
): { lat: number; lng: number } {
  // 1 grid pixel = 0.000025 latitude degrees (approx 2.7m)
  // 1 grid pixel = 0.000035 longitude degrees
  const lat = centerLat - dy * 0.000025; // Invert SVG y-axis
  const lng = centerLng + dx * 0.000035;
  return { lat, lng };
}

/**
 * Converts Lat/Lng coordinates back to local SVG grid coordinates (x, y) relative to center
 */
export function latLngToGrid(
  centerLat: number,
  centerLng: number,
  lat: number,
  lng: number
): { x: number; y: number } {
  const dy = -(lat - centerLat) / 0.000025; // Re-invert
  const dx = (lng - centerLng) / 0.000035;
  return { x: dx, y: dy };
}

/**
 * Generates initial realistic mock meetups around a district center
 */
export function generateInitialMeetups(
  centerLat: number,
  centerLng: number,
  userLat: number,
  userLng: number
): Meetup[] {
  // Let's create specific meetups based on the user request:
  // 1. "Study at Kopi Kenangan" (3/5, Forming, 0.4km away, NOW)
  // 2. "Evening walk at Alun-alun" (2/5, Forming, 1.1km away, NOW)
  // 3. "Coding session" (1/5, Draft, 1.8km away, In 30m)
  // 4. "Football Game" (4/5, Active - lock, 2.5km away, Scheduled)
  // 5. "Gym Workout Session" (5/5, Active - Full, 1.2km away, NOW)

  const meetupsSeedData = [
    {
      id: 'meetup_1',
      title: 'Study at Kopi Kenangan',
      locationName: 'Kopi Kenangan Cafe, Block B',
      locationAddress: 'Floor 1, Shop Section A',
      locationType: 'cafe' as LocationType,
      startTimeType: 'now' as StartTimeType,
      limit: 5,
      participantsCount: 3,
      vibeTags: ['Java Dev', 'Coffee', 'Exams Study'],
      dx: -60, // approx -110m, -130m from center
      dy: 80,
      creatorIndex: 1, // Budi Santoso
    },
    {
      id: 'meetup_2',
      title: 'Evening walk at Alun-alun',
      locationName: 'Alun-alun Green Lawn Area',
      locationAddress: 'Near the Fountain Plaza',
      locationType: 'park' as LocationType,
      startTimeType: '30m' as StartTimeType,
      limit: 5,
      participantsCount: 2,
      vibeTags: ['Fresh Air', 'Park Walk', 'Casual chat'],
      dx: 180,
      dy: -120,
      creatorIndex: 0, // Sarah Rahman
    },
    {
      id: 'meetup_3',
      title: 'Solo Coding session Sprint',
      locationName: 'Go-Work Coworking Suite 7',
      locationAddress: 'Lobby Desk 18',
      locationType: 'coworking' as LocationType,
      startTimeType: '30m' as StartTimeType,
      limit: 5,
      participantsCount: 1, // Draft / Open
      vibeTags: ['React 19', 'Tailwind', 'Hackers welcome'],
      dx: -220,
      dy: -150,
      creatorIndex: 2, // Clarissa Wu
    },
    {
      id: 'meetup_4',
      title: 'Quick Futsal Match 3v3',
      locationName: 'Arena Sports Center Court C',
      locationAddress: 'Sudirman Boulevard No. 12',
      locationType: 'gym' as LocationType,
      startTimeType: 'scheduled' as StartTimeType,
      scheduledTime: '19:30',
      limit: 5,
      participantsCount: 4, // Active/forming transition
      vibeTags: ['Football', 'Heavy Cardio', 'Bibs Provided'],
      dx: 80,
      dy: 210,
      creatorIndex: 4, // Koko Ardi
    },
    {
      id: 'meetup_5',
      title: 'Morning Jogging Circle',
      locationName: 'Sutera Lake Jogging Track',
      locationAddress: 'Main Entrance Archway',
      locationType: 'park' as LocationType,
      startTimeType: 'now' as StartTimeType,
      limit: 5,
      participantsCount: 5, // Fully locked / Waitlist
      vibeTags: ['Runner Pace', 'Cardio', 'Social Club'],
      dx: -150,
      dy: -60,
      creatorIndex: 3, // Rian Pratama
    },
  ];

  return meetupsSeedData.map((sed) => {
    // Determine coordinates
    const coords = gridToLatLng(centerLat, centerLng, sed.dx, sed.dy);
    const dist = calculateDistance(userLat, userLng, coords.lat, coords.lng);

    // Build participant list
    const participants: User[] = [MOCK_USERS[sed.creatorIndex]];
    
    // Add other random participants from MOCK_USERS (excluding creator itself)
    let added = 0;
    const remainingUsers = MOCK_USERS.filter((_, idx) => idx !== sed.creatorIndex);
    
    while (participants.length < sed.participantsCount && added < remainingUsers.length) {
      participants.push(remainingUsers[added]);
      added++;
    }

    // Determine status based on participant count
    let status: MeetupStatus = 'spark';
    if (sed.participantsCount === 1) {
      status = 'spark';
    } else if (sed.participantsCount >= 2 && sed.participantsCount <= 3) {
      status = 'forming';
    } else if (sed.participantsCount >= 4) {
      status = 'active';
    }

    // Simulated check-ins (e.g. 1 checked in for early ones, 4 checked in for gym session)
    const checkedInUserIds: string[] = [];
    if (sed.participantsCount >= 4 && Math.random() > 0.3) {
      // Creator is checked in
      checkedInUserIds.push(participants[0].id);
      if (Math.random() > 0.4 && participants.length > 1) {
        checkedInUserIds.push(participants[1].id);
      }
    }

    // Seed completion scores
    const qualityScore = Math.floor(Math.random() * 20) + 80; // 80% to 100%

    // Assign mock start and end times for initial meetups
    let startTimeIso = '';
    let endTimeIso = '';
    const origin = new Date(Date.now() - 3600000 * 2); // 2 hours ago
    if (sed.startTimeType === 'now') {
      startTimeIso = origin.toISOString().slice(0, 16);
      // Give them generous end times to let them be open for action initially
      endTimeIso = new Date(Date.now() + 3600000 * 3).toISOString().slice(0, 16);
    } else if (sed.startTimeType === '30m') {
      const st = new Date(Date.now() + 30 * 60 * 1000);
      startTimeIso = st.toISOString().slice(0, 16);
      endTimeIso = new Date(st.getTime() + 120 * 60 * 1000).toISOString().slice(0, 16);
    } else {
      const st = new Date();
      st.setHours(19, 30, 0, 0);
      startTimeIso = st.toISOString().slice(0, 16);
      endTimeIso = new Date(st.getTime() + 120 * 60 * 1000).toISOString().slice(0, 16);
    }

    return {
      id: sed.id,
      title: sed.title,
      creatorId: participants[0].id,
      status,
      state: 'forming',
      startTimeType: sed.startTimeType,
      scheduledTime: sed.scheduledTime || '',
      startTime: startTimeIso,
      endTime: endTimeIso,
      limit: sed.limit,
      participants,
      checkedInUserIds,
      locationName: sed.locationName,
      locationAddress: sed.locationAddress,
      locationType: sed.locationType,
      lat: coords.lat,
      lng: coords.lng,
      distanceKm: dist,
      vibeTags: sed.vibeTags,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      meetupQualityScore: qualityScore,
    };
  });
}

/**
 * Format distance value nicely
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)} km`;
}

/**
 * Filter meetups dynamically based on Distance & Urgency rules:
 * - If NOW: 1.5 km maximum
 * - If In 30m / 1-2 hours: 3.5 km
 * - If Scheduled: up to 10 km
 */
export function isMeetupReachable(meetup: Meetup, distance: number): boolean {
  if (meetup.startTimeType === 'now') {
    return distance <= 2.2; // Urban realistic NOW limits
  } else if (meetup.startTimeType === '30m') {
    return distance <= 4.5; // Walkable/rideable limit
  } else {
    return distance <= 10.0; // Scheduled can be up to 10km away
  }
}

/**
 * Checks whether the meetup's start time has passed based on its creation time and start time type.
 */
export function hasMeetupStartTimePassed(meetup: Meetup): boolean {
  if (meetup.startTime) {
    const startMs = new Date(meetup.startTime).getTime();
    if (!isNaN(startMs)) {
      return Date.now() >= startMs;
    }
  }
  const createdTime = new Date(meetup.createdAt).getTime();
  const now = Date.now();
  if (meetup.startTimeType === 'now') {
    return true; // Starts immediately, so the start time has passed.
  }
  if (meetup.startTimeType === '30m') {
    const startTime = createdTime + 30 * 60 * 1000;
    return now >= startTime;
  }
  if (meetup.startTimeType === 'scheduled') {
    if (!meetup.scheduledTime) return true;
    const [hoursStr, minutesStr] = meetup.scheduledTime.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return true;
    
    // Create target date representing scheduled time on the day of createdAt
    const startDate = new Date(meetup.createdAt);
    startDate.setHours(hours, minutes, 0, 0);
    return now >= startDate.getTime();
  }
  return false;
}

/**
 * Checks whether the meetup's end time has passed.
 */
export function isMeetupEndTimePassed(meetup: Meetup): boolean {
  if (meetup.endTime) {
    const endMs = new Date(meetup.endTime).getTime();
    if (!isNaN(endMs)) {
      return Date.now() >= endMs;
    }
  }
  // Fallback: if no custom end time (e.g. initial seeded meetups), assume 2 hours from start time
  const createdTime = new Date(meetup.createdAt).getTime();
  let startMs = createdTime;
  if (meetup.startTimeType === '30m') {
    startMs = createdTime + 30 * 60 * 1000;
  } else if (meetup.startTimeType === 'scheduled' && meetup.scheduledTime) {
    const [hoursStr, minutesStr] = meetup.scheduledTime.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const startDate = new Date(meetup.createdAt);
      startDate.setHours(hours, minutes, 0, 0);
      startMs = startDate.getTime();
    }
  }
  return Date.now() >= (startMs + 2 * 60 * 60 * 1000); // end is start + 2h
}
