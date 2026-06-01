/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MeetupStatus = 'spark' | 'forming' | 'active' | 'completed' | 'cancelled';

export type StartTimeType = 'now' | '30m' | 'scheduled';

export type LocationType = 'cafe' | 'park' | 'gym' | 'coworking' | 'library' | 'restaurant' | 'other';

export interface Location {
  id: string;
  name: string;
  address: string;
  type: LocationType;
  lat: number;  // Map Y offset (or actual lat)
  lng: number;  // Map X offset (or actual lng)
  vibeTags: string[];
}

export interface NearbyDistrict {
  id: string;
  name: string;
  city: string;
  centerAddress: string;
  lat: number;
  lng: number;
  zoomScale: number;
}

export interface User {
  id: string;
  name: string;
  avatarSeed: string; // Emoji or custom seed
  avatarColor: string; // CSS color class
  trustScore: number;  // 0 to 100 percentage
  isOnline: boolean;
  roleTag?: string;    // e.g. "Student", "Developer", "Runner"
  bio?: string;
  reputationScore?: number;
  attendedCount?: number;
  hostedCount?: number;
  noShowCount?: number;
  interests?: string[];
  upcomingCommitments?: string[];
  totalCheckIns?: number;
}

export interface Meetup {
  id: string;
  title: string;
  creatorId: string;
  status: MeetupStatus;
  state: string;           // Added state
  startTimeType: StartTimeType;
  scheduledTime?: string; // string representation of scheduled time e.g., "18:00"
  startTime?: string;     // ISO-8601 formatted start date-time
  endTime?: string;       // ISO-8601 formatted end date-time
  scheduledStartDateTime?: string; // Added field
  scheduledEndDateTime?: string;   // Added field
  cancelReason?: string;  // Reason stored if spark is cancelled
  limit: number;          // Hard capped at max 5
  participants: User[];   // Includes creator
  checkedInUserIds: string[]; // List of user IDs who checked-in
  locationName: string;
  locationAddress: string;
  locationType: LocationType;
  lat: number;
  lng: number;
  distanceKm: number;     // Dynamically computed relative to user
  vibeTags: string[];
  createdAt: string;
  meetupQualityScore: number; // Simulated percentage of success
}

export interface Message {
  id: string;
  meetupId: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: string;
  isSystem?: boolean; // system notification or trust update
}

export interface UserProfileState {
  currentUser: User;
  activeMeetupId: string | null; // Max 1 active committed meetup to prevent double booking
  createdMeetupIds: string[];
  joinedMeetupIds: string[];
}
