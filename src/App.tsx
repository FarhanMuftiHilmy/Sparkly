/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Map,
  Plus,
  Compass,
  Zap,
  Tag,
  Users,
  Shield,
  HelpCircle,
  Clock,
  Filter,
  CheckCircle,
  AlertCircle,
  Settings,
  Flame,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Firebase core & database client APIs
import { collection, onSnapshot, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth, loginWithGoogle, logoutUser, testConnection, handleFirestoreError, OperationType } from './lib/firebase';

import { Meetup, NearbyDistrict, User, Message, LocationType, StartTimeType, MeetupStatus } from './types';
import { MOCK_USERS, SUPPORTED_DISTRICTS, SIMULATED_CHAT_REPLIES } from './data';
import { generateInitialMeetups, calculateDistance, formatDistance, isMeetupReachable, hasMeetupStartTimePassed, isMeetupEndTimePassed } from './utils';

import MapControl from './components/MapControl';
import CreateMeetupModal from './components/CreateMeetupModal';
import PreviewLayerSidebar from './components/PreviewLayerSidebar';
import ActiveMeetupChat from './components/ActiveMeetupChat';
import UserProfileModal from './components/UserProfileModal';

export default function App() {
  // 1. Core Profile & Geolocation States
  const [activeDistrict, setActiveDistrict] = useState<NearbyDistrict>(SUPPORTED_DISTRICTS[0]);
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user_current',
    name: 'Farhan Hilmy',
    avatarSeed: '🦸‍♂️',
    avatarColor: 'bg-indigo-600 text-slate-100 border-indigo-400',
    trustScore: 88, // Normal starting point for new users
    isOnline: true,
    roleTag: 'App Founder (You)',
    bio: 'Co-coordinating small moments together with high physical precision.',
    reputationScore: 88,
    attendedCount: 3,
    hostedCount: 1,
    noShowCount: 0,
    interests: ['Coding', 'Coffee', 'Design', 'Running'],
    upcomingCommitments: []
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: SUPPORTED_DISTRICTS[0].lat,
    lng: SUPPORTED_DISTRICTS[0].lng,
  });

  // Track total successful real-world check-ins
  const [userTotalCheckIns, setUserTotalCheckIns] = useState<number>(2);
  const [userTrustScore, setUserTrustScore] = useState<number>(88);

  // 2. Meetup Listings State
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [selectedMeetupId, setSelectedMeetupId] = useState<string | null>('meetup_1');
  const [activeMeetupId, setActiveMeetupId] = useState<string | null>(null);
  const [waitlistedMeetups, setWaitlistedMeetups] = useState<string[]>([]);

  // Double click map picker pre-selection State
  const [selectedMapCoords, setSelectedMapCoords] = useState<{
    lat: number;
    lng: number;
    addressName: string;
  } | null>(null);

  // Track expansion of CreateMeetupModal to conditionally hide PreviewLayerSidebar
  const [isCreateExpanded, setIsCreateExpanded] = useState<boolean>(false);

  // 3. Logistics Chat Storage State
  const [chatMessagesByMeetup, setChatMessagesByMeetup] = useState<Record<string, Message[]>>({});

  // 4. Interactive Feed Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<'all' | 'now' | '30m' | 'scheduled'>('all');

  // Interactive Live simulation counts
  const [simulatedTicks, setSimulatedTicks] = useState<number>(0);
  const [simulatedNotification, setSimulatedNotification] = useState<string | null>(null);

  // Mobile View Tabs ("map" | "feed" | "chat")
  const [mobileActiveTab, setMobileActiveTab] = useState<'map' | 'feed' | 'chat'>('map');

  // Firebase Auth Integration State
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  // Track in-flight auto-completion update operations to prevent duplicate/race updates
  const autoCompletingIdsRef = useRef<Set<string>>(new Set());

  // A. Initial connection test
  useEffect(() => {
    testConnection();
  }, []);

  // B. Firebase Auth State Listener & Profile sync
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setFirebaseUser(user);
        
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as User;
            const sanitizedAvatarSeed = data.avatarSeed === '🦁' ? '🦸‍♂️' : (data.avatarSeed || '🦸‍♂️');
            setCurrentUser({
              ...data,
              avatarSeed: sanitizedAvatarSeed,
              bio: data.bio || 'Co-coordinating small moments together.',
              reputationScore: data.reputationScore ?? 88,
              attendedCount: data.attendedCount ?? 3,
              hostedCount: data.hostedCount ?? 1,
              noShowCount: data.noShowCount ?? 0,
              interests: data.interests || ['Coding', 'Coffee', 'Design'],
              upcomingCommitments: data.upcomingCommitments || []
            });
            setUserTrustScore(data.trustScore);
            setUserTotalCheckIns(data.totalCheckIns ?? data.attendedCount ?? 3);
            
            setSimulatedNotification(`🚀 Joined Session! Welcome back, ${data.name || 'Explorer'}!`);
            setIsProfileModalOpen(true); // Open profile on login to show that sign-in had an immediate custom effect!
            setTimeout(() => setSimulatedNotification(null), 5000);
          } else {
            // New user account! Create default extended profile
            const newProfile: User = {
              id: user.uid,
              name: user.displayName || 'Farhan Hilmy',
              avatarSeed: '🦸‍♂️',
              avatarColor: 'bg-indigo-600 text-slate-100 border-indigo-400',
              trustScore: 88,
              isOnline: true,
              roleTag: 'Verified Explorer',
              bio: 'Co-coordinating small moments together with high physical precision.',
              reputationScore: 88,
              attendedCount: 3,
              hostedCount: 1,
              noShowCount: 0,
              interests: ['Coding', 'Coffee', 'Design', 'Running'],
              upcomingCommitments: []
            };
            
            await setDoc(userDocRef, {
              ...newProfile,
              totalCheckIns: 3
            });
            setCurrentUser(newProfile);
            
            setSimulatedNotification(`🚀 Account synchronized! Welcome, ${newProfile.name}!`);
            setIsProfileModalOpen(true); // onboarding popup
            setTimeout(() => setSimulatedNotification(null), 5000);
          }
        } catch (err) {
          console.error('Error fetching/setting user profile:', err);
        }
      } else {
        setFirebaseUser(null);
        setIsProfileModalOpen(false);
        setIsCreateExpanded(false);
        // Reset to local initial user profile representation
        setCurrentUser({
          id: 'user_current',
          name: 'Farhan Hilmy',
          avatarSeed: '🦸‍♂️',
          avatarColor: 'bg-indigo-600 text-slate-100 border-indigo-400',
          trustScore: 88,
          isOnline: true,
          roleTag: 'App Founder (You)',
          bio: 'Co-coordinating small moments together with high physical precision.',
          reputationScore: 88,
          attendedCount: 3,
          hostedCount: 1,
          noShowCount: 0,
          interests: ['Coding', 'Coffee', 'Design', 'Running'],
          upcomingCommitments: []
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // C. Sync Realtime Meetups from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'meetups'), (snapshot) => {
      if (snapshot.empty) {
        // Seed database if empty
        const initialList = generateInitialMeetups(
          activeDistrict.lat,
          activeDistrict.lng,
          userCoords.lat,
          userCoords.lng
        );
        initialList.forEach(async (m) => {
          try {
            await setDoc(doc(db, 'meetups', m.id), m);
          } catch (error) {
            console.error("Error seeding meetup:", error);
          }
        });
      } else {
        const list: Meetup[] = [];
        snapshot.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          // Compute distance dynamically
          const rawLat = data.lat;
          const rawLng = data.lng;
          const dist = calculateDistance(userCoords.lat, userCoords.lng, rawLat, rawLng);
          
          const status = data.status || (data.state === 'draft' ? 'spark' : data.state) as MeetupStatus;
          list.push({
            id: snapshotDoc.id,
            ...data,
            status,
            distanceKm: dist,
          } as Meetup);
        });
        // Sort meetups by distance
        list.sort((a, b) => a.distanceKm - b.distanceKm);
        setMeetups(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meetups');
    });

    return () => unsubscribe();
  }, [activeDistrict, userCoords]);

  // Dynamic commitment sync: keeps activeMeetupId in-sync with live joined groups
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;
    
    const activeComm = meetups.find(
      (m) =>
        m.status !== 'completed' &&
        m.status !== 'cancelled' &&
        m.participants.some((p) => p.id === currentUser.id)
    );
    
    if (activeComm) {
      if (activeMeetupId !== activeComm.id) {
        setActiveMeetupId(activeComm.id);
      }
    } else {
      if (activeMeetupId !== null) {
        setActiveMeetupId(null);
      }
    }
  }, [meetups, currentUser, activeMeetupId]);

  // --- AUTOMATIC COMPLETION & TRANSITION ENGINE ---
  // Periodically and reactively check all meetups to transition them to 'completed' or 'active' or 'cancelled'
  useEffect(() => {
    const processMeetupTransitions = async () => {
      // 1. Process Auto-Completion (EndTime passed)
      const endPassedMeetups = meetups.filter((m) => {
        const isNotFinal = m.status !== 'completed' && m.status !== 'cancelled';
        const endTimePassed = isMeetupEndTimePassed(m);
        const isAlreadyProcessing = autoCompletingIdsRef.current.has(m.id + '_complete');
        return isNotFinal && endTimePassed && !isAlreadyProcessing;
      });

      for (const m of endPassedMeetups) {
        autoCompletingIdsRef.current.add(m.id + '_complete');
        try {
          console.log(`Auto-completing meetup (EndTime passed) "${m.title}" (${m.id})`);
          await updateDoc(doc(db, 'meetups', m.id), {
            status: 'completed'
          });
          await appendSystemMessage(
            m.id,
            `🏆 Spark has been automatically completed as its scheduled end-time (${m.endTime ? m.endTime.substring(11) : 'preset range'}) has elapsed.`
          );
        } catch (error) {
          console.error(`Error auto-completing ${m.id}:`, error);
          autoCompletingIdsRef.current.delete(m.id + '_complete');
        }
      }

      // 2. Process Auto-Active or Auto-Cancel on StartTime reached
      const startPassedMeetups = meetups.filter((m) => {
        const isPending = m.status === 'spark' || m.status === 'forming';
        const startTimePassed = hasMeetupStartTimePassed(m);
        const isAlreadyProcessing = autoCompletingIdsRef.current.has(m.id + '_start');
        return isPending && startTimePassed && !isAlreadyProcessing;
      });

      for (const m of startPassedMeetups) {
        autoCompletingIdsRef.current.add(m.id + '_start');
        try {
          const participantCount = m.participants ? m.participants.length : 0;
          if (participantCount >= 2) {
            // Promote to Active
            console.log(`Auto-activating meetup "${m.title}" (${m.id}) with ${participantCount} participants`);
             await updateDoc(doc(db, 'meetups', m.id), {
              status: 'active'
            });
            await appendSystemMessage(
              m.id,
              `🔴 Spark is officially confirmed and ACTIVE! The scheduled starting hour was reached with ${participantCount} committed members.`
            );
          } else {
            // Auto-cancel due to insufficient traction
            console.log(`Auto-cancelling meetup (lack of traction) "${m.title}" (${m.id})`);
             await updateDoc(doc(db, 'meetups', m.id), {
              status: 'cancelled',
              cancelReason: 'Cancelled automatically: insufficient participants before scheduled start time.'
            });
            await appendSystemMessage(
              m.id,
              `⚫ Spark automatically cancelled: Starting time was reached with insufficient coordination traction (only 1 explorer secured).`
            );
          }
        } catch (error) {
          console.error(`Error transitioning start threshold for ${m.id}:`, error);
          autoCompletingIdsRef.current.delete(m.id + '_start');
        }
      }
    };

    processMeetupTransitions();

    const timer = setInterval(() => {
      processMeetupTransitions();
    }, 5000);

    return () => clearInterval(timer);
  }, [meetups]);

  // --- DYNAMIC HOST REWARD LOADER ---
  // Reward details are synchronized when the creator is logged in and observes completed creations
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;
    const completedCreatedMeetups = meetups.filter(
      (m) => m.creatorId === currentUser.id && m.status === 'completed'
    );
    if (completedCreatedMeetups.length === 0) return;

    // Load already credited meetup IDs from localStorage
    const storageKey = `spark_credited_meetups_${currentUser.id}`;
    let creditedSlice: string[] = [];
    try {
      creditedSlice = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      creditedSlice = [];
    }

    const uncredited = completedCreatedMeetups.filter((m) => !creditedSlice.includes(m.id));
    if (uncredited.length > 0) {
      // Credit them now!
      const newCredited = [...creditedSlice, ...uncredited.map((m) => m.id)];
      localStorage.setItem(storageKey, JSON.stringify(newCredited));

      setCurrentUser((prev) => {
        const rewardCount = uncredited.length;
        const nextScore = (prev.reputationScore ?? 88) + (rewardCount * 3);
        const nextHosted = (prev.hostedCount ?? 1) + rewardCount;
        const totalAttended = prev.attendedCount ?? 3;
        const totalConcluded = totalAttended + (prev.noShowCount ?? 0);
        const attendanceRate = totalConcluded > 0 ? (totalAttended / totalConcluded) * 100 : 100;
        const nextTrust = Math.min(Math.max(Math.round((attendanceRate + (nextScore / 4)) / 1.5), 10), 100);

        const updated = {
          ...prev,
          reputationScore: nextScore,
          hostedCount: nextHosted,
          trustScore: nextTrust,
        };

        if (firebaseUser) {
          setDoc(doc(db, 'users', firebaseUser.uid), {
            ...updated,
            id: firebaseUser.uid
          }, { merge: true }).catch(err => {
            console.error("Failed to auto-reward host on completion detection:", err);
          });
        }
        return updated;
      });
      
      setSimulatedNotification(`🎊 Earned Spark hosted rewards! +${uncredited.length * 3} Rep & Host credit for successfully completed Spark sessions!`);
      setTimeout(() => setSimulatedNotification(null), 5000);
    }
  }, [meetups, currentUser, firebaseUser]);

  // D. Sync Realtime Chat Messages for selected meetup
  useEffect(() => {
    if (!selectedMeetupId) return;

    const messagesCol = collection(db, 'meetups', selectedMeetupId, 'messages');
    const unsubscribe = onSnapshot(messagesCol, (snapshot) => {
      const list: Message[] = [];
      snapshot.forEach((snapshotDoc) => {
        list.push({
          id: snapshotDoc.id,
          ...snapshotDoc.data()
        } as Message);
      });
      // Sort messages chronologically by timestamp/id
      list.sort((a,b) => a.id.localeCompare(b.id));

      setChatMessagesByMeetup((prev) => ({
        ...prev,
        [selectedMeetupId]: list
      }));
    }, (error) => {
      console.error("Error listening to chat messages:", error);
    });

    return () => unsubscribe();
  }, [selectedMeetupId]);

  // Handle HTML5 Geolocation Synchronizer
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords({ lat, lng });
          
          // Recompute distance of all active meetups in the current state relative to actual user
          setMeetups((prevList) =>
            prevList.map((meetup) => ({
              ...meetup,
              distanceKm: calculateDistance(lat, lng, meetup.lat, meetup.lng),
            }))
          );
        },
        (error) => {
          console.log('Using simulated fallback district center positions: ', error.message);
        }
      );
    }
  }, []);

  // 5. BACKGROUND ACTIVE SIMULATOR SYSTEM
  // Periodically triggers joins, check-ins, or small chat notifications to make the MVP feel truly alive
  useEffect(() => {
    const interval = setInterval(async () => {
      setSimulatedTicks((t) => t + 1);

      // Procedural simulator behavior
      const decision = Math.random();

      // Case A: A mock user joins an un-full meetup
      if (decision < 0.4) {
        const joinable = meetups.filter((m) => m.participants.length < m.limit && m.id !== activeMeetupId && m.status !== 'completed' && m.status !== 'cancelled');
        if (joinable.length === 0) return;

        const target = joinable[Math.floor(Math.random() * joinable.length)];
        const availableUsers = MOCK_USERS.filter(
          (u) => !target.participants.some((p) => p.id === u.id)
        );

        if (availableUsers.length > 0) {
          const newUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
          const updatedParticipants = [...target.participants, newUser];
          
          // Adjust status based on number of participants
          let newStatus = target.status;
          if (updatedParticipants.length >= 4) {
            newStatus = 'active';
          } else if (updatedParticipants.length >= 2) {
            newStatus = 'forming';
          }

          setSimulatedNotification(`👥 ${newUser.name} registered slot on "${target.title}"!`);
          setTimeout(() => setSimulatedNotification(null), 4000);

          try {
            await updateDoc(doc(db, 'meetups', target.id), {
              participants: updatedParticipants,
              status: newStatus
            });

            // Add simulated arrival chat log if transitioning to Active
            if (newStatus === 'active' && target.checkedInUserIds.length === 0) {
              await appendSystemMessage(target.id, `${newUser.name} checked in! "Ready to physically meet up now."`);
            }
          } catch (err) {
            console.error("Simulator background update error:", err);
          }
        }
      }

      // Case B: A mock user checked-in to active meetup
      else if (decision >= 0.4 && decision < 0.70) {
        const eligible = meetups.filter(
          (m) => m.participants.length >= 2 && m.checkedInUserIds.length < m.participants.length && m.status !== 'completed' && m.status !== 'cancelled'
        );
        if (eligible.length === 0) return;

        const target = eligible[Math.floor(Math.random() * eligible.length)];
        const unarrived = target.participants.filter(
          (p) => !target.checkedInUserIds.includes(p.id) && p.id !== currentUser.id
        );

        if (unarrived.length > 0) {
          const arrivingUser = unarrived[Math.floor(Math.random() * unarrived.length)];
          const updatedCheckins = [...target.checkedInUserIds, arrivingUser.id];

          setSimulatedNotification(`📍 ${arrivingUser.name} checked in at ${target.locationName}!`);
          setTimeout(() => setSimulatedNotification(null), 4000);

          // Append arrivals coordination text
          const chatReplies = SIMULATED_CHAT_REPLIES[target.locationType] || SIMULATED_CHAT_REPLIES.general;
          const reply = chatReplies[Math.floor(Math.random() * chatReplies.length)];

          try {
            await updateDoc(doc(db, 'meetups', target.id), {
              checkedInUserIds: updatedCheckins
            });

            await appendChatMessage(
              target.id,
              arrivingUser.id,
              arrivingUser.name,
              reply
            );
          } catch (err) {
            console.error("Simulator background checkin error:", err);
          }
        }
      }
    }, 28000); // Trigger every 28 seconds

    return () => clearInterval(interval);
  }, [activeMeetupId, meetups, currentUser]);

  // Utility to append chat logs cleanly
  const appendChatMessage = async (meetupId: string, senderId: string, senderName: string, text: string) => {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: Message = {
      id: msgId,
      meetupId,
      senderId,
      senderName,
      senderColor: senderId === currentUser.id ? 'text-indigo-400' : 'text-slate-350',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      await setDoc(doc(db, 'meetups', meetupId, 'messages', msgId), newMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `meetups/${meetupId}/messages/${msgId}`);
    }
  };

  const appendSystemMessage = async (meetupId: string, text: string) => {
    const msgId = `sys_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const systemMsg: Message = {
      id: msgId,
      meetupId,
      senderId: 'system',
      senderName: 'System Verifier',
      senderColor: 'text-rose-400',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    };

    try {
      await setDoc(doc(db, 'meetups', meetupId, 'messages', msgId), systemMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `meetups/${meetupId}/messages/${msgId}`);
    }
  };

  // 6. ACTION HANDLERS: Join, Leave, Check-In, Create, Search

  // Join Meetup Action (enforcing limit 1 commitment window)
  const handleJoinMeetup = useCallback(async (meetupId: string) => {
    // 1. Guard against overlapping commitments
    if (activeMeetupId !== null && activeMeetupId !== meetupId) {
      alert("App Safety: You can only join/RSVP to max 1 active meetup at a time to secure real-world commitment.");
      return;
    }

    const meetup = meetups.find((m) => m.id === meetupId);
    if (!meetup) return;

    if (meetup.participants.length >= meetup.limit) return;
    if (meetup.participants.some((p) => p.id === currentUser.id)) return;

    const updatedParticipants = [...meetup.participants, currentUser];
    
    // Re-calculate status mapping
    let newStatus = meetup.status;
    if (updatedParticipants.length >= 4) {
      newStatus = 'active';
    } else if (updatedParticipants.length >= 2) {
      newStatus = 'forming';
    }

    // Active commitment triggers
    setActiveMeetupId(meetupId);
    setSelectedMeetupId(meetupId);

    try {
      await updateDoc(doc(db, 'meetups', meetupId), {
        participants: updatedParticipants,
        status: newStatus,
      });

      // Log coordinate updates in chat
      setTimeout(() => {
        appendSystemMessage(meetupId, `You secured your slot! Coordinate your physical desk position below.`);
        // Trigger randomized welcoming host text
        const host = updatedParticipants[0];
        if (host.id !== currentUser.id) {
          setTimeout(() => {
            appendChatMessage(
              meetupId,
              host.id,
              host.name,
              `Hey ${currentUser.name}! Glad you joined. We are looking forward to meeting you soon! 👋`
            );
          }, 1200);
        }
      }, 300);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `meetups/${meetupId}`);
    }
  }, [activeMeetupId, currentUser, meetups]);

  // Leave Meetup Action (lowers commitment score if canceled last minute)
  const handleLeaveMeetup = useCallback(async (meetupId: string) => {
    const m = meetups.find((m) => m.id === meetupId);
    if (!m) return;

    const exists = m.participants.some((p) => p.id === currentUser.id);
    if (!exists) return;

    const updatedParticipants = m.participants.filter((p) => p.id !== currentUser.id);
    const wasCheckedIn = m.checkedInUserIds.includes(currentUser.id);
    const updatedCheckins = m.checkedInUserIds.filter((cid) => cid !== currentUser.id);

    let newStatus = m.status;
    if (updatedParticipants.length >= 4) {
      newStatus = 'active';
    } else if (updatedParticipants.length >= 2) {
      newStatus = 'forming';
    } else if (updatedParticipants.length <= 1) {
      newStatus = 'spark';
    }

    // Leave commitment cleanup
    setActiveMeetupId(null);

    // Apply cancellation feedback to trust index
    notifyLeftPenalty(wasCheckedIn);

    try {
      await updateDoc(doc(db, 'meetups', meetupId), {
        participants: updatedParticipants,
        checkedInUserIds: updatedCheckins,
        status: newStatus,
      });

      // Push departure announcement to chat room
      appendSystemMessage(meetupId, `${currentUser.name} cancelled commitment. Attendance score updated.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `meetups/${meetupId}`);
    }
  }, [currentUser, meetups]);

  // Handle Cancellation punishment rating
  const notifyLeftPenalty = (wasCheckedIn: boolean) => {
    setUserTrustScore((prev) => {
      const penalty = wasCheckedIn ? 8 : 4;
      const next = Math.max(prev - penalty, 45);
      return next;
    });

    setCurrentUser((prev) => {
      const nextScore = Math.max(0, (prev.reputationScore ?? 88) - 3);
      const nextNoShow = (prev.noShowCount ?? 0) + 1;
      const totalAttended = prev.attendedCount ?? 3;
      const nextTrust = Math.min(Math.max(Math.round(((totalAttended / (totalAttended + nextNoShow)) * 100 + (nextScore / 4)) / 1.5), 10), 100);
      
      const updated = {
        ...prev,
        reputationScore: nextScore,
        noShowCount: nextNoShow,
        trustScore: nextTrust,
      };

      if (firebaseUser) {
        setDoc(doc(db, 'users', firebaseUser.uid), {
          ...updated,
          totalCheckIns: totalAttended
        }).catch(err => console.error("Firestore cancel sync:", err));
      }
      return updated;
    });

    setSimulatedNotification(`⚠️ Left meetup. Score updated (-3 Reputation Score).`);
    setTimeout(() => setSimulatedNotification(null), 5000);
  };

  // Waitlist helper
  const handleToggleWaitlist = useCallback((meetupId: string) => {
    setWaitlistedMeetups((prev) =>
      prev.includes(meetupId)
        ? prev.filter((id) => id !== meetupId)
        : [...prev, meetupId]
    );

    const activeWait = !waitlistedMeetups.includes(meetupId);
    setSimulatedNotification(
      activeWait
        ? "⭐ Secured Waitlist Spot! Low friction commitment logged."
        : "Removed from Waitlist spot."
    );
    setTimeout(() => setSimulatedNotification(null), 4000);
  }, [waitlistedMeetups]);

  // Profile Custom Update handler
  const handleUpdateProfile = async (updated: User) => {
    console.log("Updating profile:", updated);
    setCurrentUser((prev) => ({ ...prev, ...updated }));
    setUserTrustScore(updated.trustScore);
    setUserTotalCheckIns(updated.attendedCount ?? 3);

    if (firebaseUser) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          name: updated.name,
          bio: updated.bio,
          avatarSeed: updated.avatarSeed,
          avatarColor: updated.avatarColor,
          reputationScore: updated.reputationScore,
          roleTag: updated.roleTag,
          interests: updated.interests,
          totalCheckIns: updated.attendedCount ?? 3,
          attendedCount: updated.attendedCount,
          hostedCount: updated.hostedCount,
          noShowCount: updated.noShowCount
        });
        setSimulatedNotification("✨ Live Cloud Firestore Profile Synced successfully!");
        setTimeout(() => setSimulatedNotification(null), 4000);
      } catch (err) {
        console.error("Firestore sync error:", err);
      }
    } else {
      setSimulatedNotification("💾 Local Profile Saved (offline mode)!");
      setTimeout(() => setSimulatedNotification(null), 4000);
    }
  };

  // Meetup Conclude/Success Creator handler
  const handleCompleteMeetup = async (meetupId: string) => {
    try {
      await updateDoc(doc(db, 'meetups', meetupId), {
        status: 'completed'
      });

      await appendSystemMessage(meetupId, `🏆 Spark successfully concluded by the organizer! Attendance and hosted credentials have been registered.`);
      
      // Reward host: Host gets +3 Reputation Score, and hostedCount incremented by 1!
      setCurrentUser((prev) => {
        const nextScore = (prev.reputationScore ?? 88) + 3;
        const nextHosted = (prev.hostedCount ?? 1) + 1;
        const totalAttended = prev.attendedCount ?? 3;
        const totalConcluded = totalAttended + (prev.noShowCount ?? 0);
        const attendanceRate = totalConcluded > 0 ? (totalAttended / totalConcluded) * 100 : 100;
        const nextTrust = Math.min(Math.max(Math.round((attendanceRate + (nextScore / 4)) / 1.5), 10), 100);

        const updated = {
          ...prev,
          reputationScore: nextScore,
          hostedCount: nextHosted,
          trustScore: nextTrust,
        };
        
        if (firebaseUser) {
          setDoc(doc(db, 'users', firebaseUser.uid), {
            ...updated,
            totalCheckIns: totalAttended
          }).catch(err => console.error("Firestore complete sync:", err));
        }
        return updated;
      });

      setSimulatedNotification("🏆 Meetup Completed! Host received +3 Reputation Score (hosted count incremented)!");
      setTimeout(() => setSimulatedNotification(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `meetups/${meetupId}`);
    }
  };

  // Meetup Cancel Host action
  const handleCancelMeetup = async (meetupId: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'meetups', meetupId), {
        status: 'cancelled',
        cancelReason: reason
      });

      await appendSystemMessage(meetupId, `⚫ This Spark has been cancelled by the host. Reason filed: "${reason}"`);

      setSimulatedNotification(`⚫ Spark cancelled successfully: "${reason}"`);
      setTimeout(() => setSimulatedNotification(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `meetups/${meetupId}`);
    }
  };

  // Critical Physical Check-In Button
  const handleUserCheckIn = async () => {
    if (!activeMeetupId) return;

    const m = meetups.find((meet) => meet.id === activeMeetupId);
    if (!m) return;

    if (m.checkedInUserIds.includes(currentUser.id)) return;

    const updatedCheckins = [...m.checkedInUserIds, currentUser.id];

    // Trigger rewards: Attend meetup adds +5 Reputation Score!
    setUserTotalCheckIns((tot) => tot + 1);
    setUserTrustScore((prev) => Math.min(prev + 5, 100)); // Boost trust

    setCurrentUser((prev) => {
      const nextScore = (prev.reputationScore ?? 88) + 5;
      const nextAttended = (prev.attendedCount ?? 3) + 1;
      const totalConcluded = nextAttended + (prev.noShowCount ?? 0);
      const attendanceRate = totalConcluded > 0 ? (nextAttended / totalConcluded) * 100 : 100;
      const nextTrust = Math.min(Math.max(Math.round((attendanceRate + (nextScore / 4)) / 1.5), 10), 100);

      const updated = {
        ...prev,
        reputationScore: nextScore,
        attendedCount: nextAttended,
        trustScore: nextTrust,
      };

      if (firebaseUser) {
        setDoc(doc(db, 'users', firebaseUser.uid), {
          ...updated,
          totalCheckIns: nextAttended
        }).catch(err => console.error(err));
      }
      return updated;
    });

    try {
      await updateDoc(doc(db, 'meetups', activeMeetupId), {
        checkedInUserIds: updatedCheckins,
      });

      appendSystemMessage(
        activeMeetupId,
        `📍 Verified Check-In: Your presence has been successfully recorded in the physical coordinate boundary. Trust rating increased!`
      );

      // Trigger simulated check-in reaction from another user
      const otherAttendees = m.participants.filter((p) => p.id !== currentUser.id);
      if (otherAttendees.length > 0) {
        const responder = otherAttendees[0];
        setTimeout(() => {
          appendChatMessage(
            activeMeetupId,
            responder.id,
            responder.name,
            `Nice! I see you, ${currentUser.name}. Waving at you right now from here! 👋`
          );
        }, 1200);
      }

      setSimulatedNotification("🏆 Check-in recorded! Reputation +5 & Attendance updated!");
      setTimeout(() => setSimulatedNotification(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `meetups/${activeMeetupId}`);
    }
  };

  // Drop custom pin coordinates callback inside form pre-fill
  const handleCreateMeetupAtCoordinates = (lat: number, lng: number, addressName: string) => {
    // if (!firebaseUser) {
    //   setSimulatedNotification("⚠️ Sign In required to drop a Spark pin!");
    //   setTimeout(() => setSimulatedNotification(null), 4000);
    //   return;
    // }
    setSelectedMapCoords({
      lat,
      lng,
      addressName,
    });
    // Shift focus on map pick
  };

  // Create Meetup Spark Trigger
  const handleAddMeetup = async (data: {
    title: string;
    locationName: string;
    locationType: LocationType;
    startTimeType: StartTimeType;
    scheduledTime?: string;
    limit: number;
    vibeTags: string[];
    lat: number;
    lng: number;
  }) => {
    // Compute distance
    const dist = calculateDistance(userCoords.lat, userCoords.lng, data.lat, data.lng);

    const newId = `meetup_custom_${Date.now()}`;
    const newMeetup: Meetup = {
      id: newId,
      title: data.title,
      creatorId: currentUser.id,
      status: 'spark',
      state: 'draft',
      startTimeType: data.startTimeType,
      scheduledTime: data.scheduledTime || '',
      startTime: data.startTime,
      endTime: data.endTime,
      scheduledStartDateTime: data.startTime,
      scheduledEndDateTime: data.endTime,
      limit: data.limit,
      participants: [currentUser],
      checkedInUserIds: [],
      locationName: data.locationName,
      locationAddress: 'Local District Block Area',
      locationType: data.locationType,
      lat: data.lat,
      lng: data.lng,
      distanceKm: dist,
      vibeTags: data.vibeTags,
      createdAt: new Date().toISOString(),
      meetupQualityScore: 100, // Starts pristine
    };

    setActiveMeetupId(newId);
    setSelectedMeetupId(newId);
    setSelectedMapCoords(null);

    try {
      await setDoc(doc(db, 'meetups', newId), newMeetup);

      // Initialize messages registry
      const msgId = `msg_c_init_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const initMsg: Message = {
        id: msgId,
        meetupId: newId,
        senderId: 'system',
        senderName: 'System',
        senderColor: 'text-indigo-400',
        text: `Spark created successfully! You are the coordinator of "${data.title}". Waiting for nearby explorers to spot you on the radar.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      };

      await setDoc(doc(db, 'meetups', newId, 'messages', msgId), initMsg);

      setSimulatedNotification("🚀 New Spark Pin Dropped! Nearby users can spot you now.");
      setTimeout(() => setSimulatedNotification(null), 5000);

      // POWER MVP MECHANIC: A mock explorer spots your spark and joins in 4.5 seconds!
      setTimeout(async () => {
        const joineers = MOCK_USERS.filter((u) => u.isOnline);
        if (joineers.length > 0) {
          const jUser = joineers[Math.floor(Math.random() * joineers.length)];
          const updated = [currentUser, jUser];

          try {
            await updateDoc(doc(db, 'meetups', newId), {
              participants: updated,
              status: 'forming',
              state: 'forming',
            });

            setSimulatedNotification(`🎉 ${jUser.name} spotted your spark and registered!`);
            setTimeout(() => setSimulatedNotification(null), 5000);

            appendSystemMessage(newId, `${jUser.name} booked a reserved group slot.`);
            
            setTimeout(() => {
              appendChatMessage(
                newId,
                jUser.id,
                jUser.name,
                `Hey Farhan! I was searching for ${data.title} nearby! I'm already heading over to ${data.locationName}. Where are you sitting?`
              );
            }, 1100);
          } catch (e) {
            console.error("Simulator joining failed:", e);
          }
        }
      }, 4500);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `meetups/${newId}`);
    }
  };

  // Handle District Center Coordinate Switch updates
  const handleDistrictChange = (district: NearbyDistrict) => {
    setActiveDistrict(district);
    // use this only for test
    // setUserCoords({ lat: district.lat, lng: district.lng });
    setSelectedMapCoords(null);
    setSelectedMeetupId(null);
  };

  // Filter listings based on interactive filters (Distance & Timing Rules!)
  const filteredMeetups = meetups.filter((meetup) => {
    // Category vibe filter
    if (categoryFilter !== 'All') {
      const matchCat = meetup.locationType === categoryFilter.toLowerCase() ||
        meetup.vibeTags.some((t) => t.toLowerCase().includes(categoryFilter.toLowerCase())) ||
        meetup.title.toLowerCase().includes(categoryFilter.toLowerCase());
      if (!matchCat) return false;
    }

    // Urgency distance constraints (The Geo+Behavior Design Policy):
    // If NOW: radius strictly limited <= 2.2km
    // If In 30m: radius strictly limited <= 4.5km
    // If Scheduled: radius up to 10.0km
    if (timeFilter === 'now') {
      if (meetup.startTimeType !== 'now' || meetup.distanceKm > 2.2) return false;
    } else if (timeFilter === '30m') {
      if (meetup.startTimeType !== '30m' || meetup.distanceKm > 4.5) return false;
    } else if (timeFilter === 'scheduled') {
      if (meetup.startTimeType !== 'scheduled' || meetup.distanceKm > 10.0) return false;
    }

    return true;
  });

  const selectedMeetup = meetups.find((m) => m.id === selectedMeetupId);
  const activeMeetup = meetups.find((m) => m.id === activeMeetupId);
  const currentUserActiveSparksCount = meetups.filter(
    (m) => m.creatorId === currentUser.id && m.status !== 'completed' && m.status !== 'cancelled'
  ).length;

  return (
    <div className="min-h-screen bg-[#120D0A] text-stone-100 flex flex-col font-sans transition-all relative overflow-hidden">
      
      {/* Immersive Background Blur Blobs for Warm Gold & Terracotta Cozy Atmosphere */}
      <div className="absolute top-[-5%] left-[-10%] w-[45%] h-[45%] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[45%] h-[45%] bg-orange-600/5 rounded-full blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute top-[35%] right-[20%] w-[30%] h-[30%] bg-amber-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Floating alert banner for simulations */}
      <AnimatePresence>
        {simulatedNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-xl border border-white/15 text-slate-100 px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-2xl text-xs max-w-sm"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <span className="font-medium font-sans">{simulatedNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Header Navbar */}
      <header className="px-4 py-4 md:px-8 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Compass className="w-5 h-5 text-slate-100" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>Open Meetups</span>
              <span className="text-[10px] bg-white/5 border border-white/10 text-slate-300 font-mono tracking-tight px-1.5 py-0.5 rounded uppercase font-semibold">
                MVP Stable
              </span>
            </h1>
            <p className="text-[10px] text-slate-300 font-sans tracking-wide">
              Where can I meet people nearby right now? Co-coordinate in small groups (max 5)
            </p>
          </div>
        </div>

        {/* Accountability level header details & Firebase Google Auth Widget */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {firebaseUser ? (
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-bold block text-slate-300 leading-none">
                  {firebaseUser.displayName || 'Authorized Explorer'}
                </span>
                <span className="text-[9px] text-zinc-500 font-semibold block mt-0.5 leading-none">
                  {firebaseUser.email}
                </span>
              </div>
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'Avatar'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-white/20 aspect-square object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold leading-none select-none">
                  👤
                </div>
              )}
              <button
                onClick={logoutUser}
                className="text-[10px] bg-red-950/40 hover:bg-red-900/35 border border-red-900/40 hover:border-red-800/40 text-red-300 px-2 py-1 rounded-lg transition-all font-mono font-medium tracking-wide uppercase"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/25 hover:bg-white/5 active:scale-[0.98] transition-all flex items-center gap-2 font-mono text-[10px] text-white/90 uppercase tracking-widest font-bold"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google Login
            </button>
          )}

          {firebaseUser && (
            <button
              id="btn-open-user-profile"
              onClick={() => setIsProfileModalOpen(true)}
              className="bg-[#1C120C] hover:bg-[#2A1D14] border border-white/10 px-4 py-2.5 md:px-3 md:py-1.5 rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-amber-500/30 active:scale-98 transition-all shrink-0"
              title="Configure profile and view reputation details"
            >
              <div className="text-right hidden sm:block">
                <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider leading-none truncate max-w-[80px]">
                  {currentUser.name}
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-400 block mt-1 leading-none">
                  ⭐ {currentUser.reputationScore ?? 88} ({userTrustScore}%)
                </span>
              </div>
              <div className={`w-7 h-7 rounded-lg ${currentUser.avatarColor || 'bg-indigo-600 text-white'} border border-white/10 flex items-center justify-center text-sm select-none`}>
                {currentUser.avatarSeed || '👤'}
              </div>
            </button>
          )}
        </div>
      </header>

      {/* MOBILE BOTTOM TABS COMPONENT PANEL */}
      <div className="md:hidden grid grid-cols-3 border-b border-stone-800 bg-[#16100D] py-1 sticky top-[69px] z-30 text-xs font-mono text-slate-400">
        <button
          onClick={() => setMobileActiveTab('map')}
          className={`py-2 text-center flex flex-col items-center gap-1 border-b-2 transition ${
            mobileActiveTab === 'map' ? 'border-amber-500 text-slate-100 font-bold' : 'border-transparent text-slate-400'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>1. Map Canvas</span>
        </button>
        <button
          onClick={() => setMobileActiveTab('feed')}
          className={`py-2 text-center flex flex-col items-center gap-1 border-b-2 transition ${
            mobileActiveTab === 'feed' ? 'border-amber-500 text-slate-100 font-bold' : 'border-transparent text-slate-400'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>2. Browse</span>
        </button>
        <button
          onClick={() => setMobileActiveTab('chat')}
          className={`py-2 text-center flex flex-col items-center gap-1 border-b-2 transition relative ${
            mobileActiveTab === 'chat' ? 'border-amber-500 text-slate-100 font-bold' : 'border-transparent text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Create</span>
          {activeMeetupId && (
            <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
          )}
        </button>
      </div>

      {/* PRIMARY CENTRAL GRID WORKSPACE FRAME */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-hidden">
        
        {/* ================= COLUMN 1 (4 cols): User Dashboard + Available meetups list ================= */}
        <section className={`md:col-span-4 space-y-4 flex flex-col h-full ${mobileActiveTab === 'feed' ? 'block' : 'hidden md:flex'}`}>
          
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
                  if (selected) handleDistrictChange(selected);
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

            {/* Urgency Time Selector buttons: NOW (1.5km), 30m, Later */}
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

          {/* Available meetups near you block */}
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
                filteredMeetups.map((meet) => {
                  const isSelected = selectedMeetupId === meet.id;
                  const isCommitted = activeMeetupId === meet.id;
                  
                  // Color codes
                  let stateColor = 'bg-indigo-500';
                  let stateLabel = 'Purple Spark';
                  if (meet.status === 'forming') {
                    stateColor = 'bg-amber-400 animate-pulse';
                    stateLabel = 'Forming';
                  } else if (meet.status === 'active') {
                    stateColor = 'bg-rose-500';
                    stateLabel = 'Active';
                  }

                  return (
                    <div
                      key={meet.id}
                      id={`meetup-item-${meet.id}`}
                      onClick={() => {
                        setSelectedMeetupId(meet.id);
                        setMobileActiveTab('feed'); // retain index on click
                      }}
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
                              {formatDistance(meet.distanceKm)}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-slate-400">{meet.locationName.split(',')[0]}</span>
                          </div>
                          
                          <h4 className="font-bold text-xs text-slate-200 group-hover:text-slate-100 transition mt-0.5 tracking-tight leading-snug line-clamp-1">
                            {meet.title}
                          </h4>
                        </div>

                        {/* Spark indicators ratio */}
                        <div className="shrink-0 flex flex-col items-end gap-1 font-mono">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded leading-none text-slate-900 font-bold ${
                            meet.status === 'spark' ? 'bg-amber-300' :
                            meet.status === 'forming' ? 'bg-amber-400' :
                            'bg-rose-400'
                          }`}>
                            {meet.participants.length}/{meet.limit}
                          </span>
                        </div>
                      </div>

                      {/* Bottom details */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 pl-1">
                        <div className="flex gap-1">
                          {meet.vibeTags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-[8.5px] text-slate-400">#{tag}</span>
                          ))}
                        </div>

                        {isCommitted && (
                          <span className="text-[8px] bg-emerald-950/80 px-1 rounded text-emerald-400 font-bold animate-pulse font-mono tracking-wider border border-emerald-500/20">
                            ● ACTIVE COMMIT
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick helper message */}
            <div className="mt-3 text-[10px] text-slate-350 leading-normal bg-white/5 p-2.5 rounded-lg border border-white/5">
              💡 <strong>Safety Preview Signal Layer</strong> is active. You won't be exposed to group DMs until you commit to join. No risk of early spam.
            </div>
          </div>
        </section>

        {/* ================= COLUMN 2 (5 cols): The Map Viewport Panel ================= */}
        <section className={isMapFullscreen ? 'fixed inset-0 z-[99999] w-screen h-screen m-0 p-0 overflow-hidden bg-[#120D0A]' : `md:col-span-5 h-[480px] md:h-full flex flex-col select-none ${mobileActiveTab === 'map' ? 'block' : 'hidden md:flex'}`}>
          <div className={isMapFullscreen ? 'w-full h-full border-none rounded-none overflow-hidden' : 'flex-1 flex flex-col h-full bg-white/5 rounded-2xl overflow-hidden shadow-inner border border-white/10 z-10'}>
            <MapControl
              meetups={meetups}
              activeDistrict={activeDistrict}
              selectedMeetupId={selectedMeetupId}
              onSelectMeetup={setSelectedMeetupId}
              onCreateMeetupAtCoordinates={handleCreateMeetupAtCoordinates}
              userCoords={userCoords}
              activeMeetupTimerFilter={timeFilter}
              currentUser={currentUser}
              isFullscreen={isMapFullscreen}
              onFullscreenToggle={setIsMapFullscreen}
              onUpdateUserCoords={(lat, lng) => {
                setUserCoords({ lat, lng });
                setMeetups((prevList) =>
                  prevList.map((meetup) => ({
                    ...meetup,
                    distanceKm: calculateDistance(lat, lng, meetup.lat, meetup.lng),
                  }))
                );
              }}
            />
          </div>
        </section>

        {/* ================= COLUMN 3 (3 cols): Preview Sidebar OR Active Coordination Chat ================= */}
        <section className={`md:col-span-3 space-y-4 flex flex-col h-full ${mobileActiveTab === 'chat' ? 'block' : 'hidden md:flex'}`}>
          
          {/* If the current selected meetup is also the user's active/joined meetup, display chat coordination room */}
          {selectedMeetup && activeMeetupId === selectedMeetup.id ? (
            <div className="flex-1">
              <ActiveMeetupChat
                meetup={selectedMeetup}
                currentUser={currentUser}
                chatMessages={chatMessagesByMeetup[selectedMeetup.id] || []}
                onSendMessage={(text) => appendChatMessage(selectedMeetup.id, currentUser.id, currentUser.name, text)}
                onUserCheckIn={handleUserCheckIn}
                isUserCheckedIn={selectedMeetup.checkedInUserIds.includes(currentUser.id)}
                onSimulatedReceiveMessage={(text, sender) => appendChatMessage(selectedMeetup.id, sender.id, sender.name, text)}
                onCompleteMeetup={handleCompleteMeetup}
                onCancelMeetup={handleCancelMeetup}
              />
            </div>
          ) : selectedMeetup && !isCreateExpanded ? (
            /* Otherwise, display the Pre-Join Preview Signal panel to decide whether to register or not */
            <div className="flex-1">
              <PreviewLayerSidebar
                meetup={selectedMeetup}
                onJoinMeetup={handleJoinMeetup}
                onLeaveMeetup={handleLeaveMeetup}
                currentUser={currentUser}
                isJoinedCurrentUser={selectedMeetup.participants.some((p) => p.id === currentUser.id)}
                activeMeetupId={activeMeetupId}
                onToggleWaitlist={handleToggleWaitlist}
                waitlistedIds={waitlistedMeetups}
                onCancelMeetup={handleCancelMeetup}
              />
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 text-center flex flex-col items-center justify-center text-slate-300 min-h-[140px] z-10">
              <Compass className="w-8 h-8 text-slate-400 animate-pulse mb-2" />
              <h4 className="font-bold text-xs text-slate-200">
                {isCreateExpanded ? 'Creating New Spark...' : 'Radar Scanning'}
              </h4>
              <p className="text-[10px] text-slate-400 max-w-[220px] mt-1 mx-auto leading-normal">
                {isCreateExpanded 
                  ? 'Organizer Sparks Hub is expanded. Fill in details below to publish your Spark pin!'
                  : 'Click a meetup pin on the map or select from the index to view preview details.'}
              </p>
            </div>
          )}

          {/* Dynamic CREATE FORM at bottom sidebar */}
          {firebaseUser && (
            <div className="shrink-0">
              <CreateMeetupModal
                onAddMeetup={handleAddMeetup}
                selectedCoordinates={selectedMapCoords}
                userCoords={userCoords}
                draftCount={currentUserActiveSparksCount}
                reputationScore={currentUser.reputationScore ?? 88}
                onExpandedChange={setIsCreateExpanded}
              />
            </div>
          )}
        </section>

      </main>

      {/* FOOTER METRICS SYSTEM AND CREDIBILITY SIGNATURES */}
      <footer className="mt-auto px-4 py-3 md:px-8 bg-white/5 backdrop-blur border-t border-white/10 text-[10px] text-slate-400 flex flex-col md:flex-row justify-between items-center gap-3 z-10">
        <p className="font-mono uppercase tracking-wider text-[9px] text-slate-300">
          System verifier • GPS accurate within 25m • Tiny groups physical pledge system active
        </p>
        <p className="font-sans text-slate-400">
          Built according to trust and reliability offline parameters. © 2026.
        </p>
      </footer>

      {/* Verified User Profile Modal Overlay */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
        upcomingMeetups={meetups.filter(m => m.participants.some(p => p.id === currentUser.id) && m.status !== 'completed' && m.status !== 'cancelled')}
        onSelectMeetup={(id) => {
          setSelectedMeetupId(id);
          setMobileActiveTab('chat');
        }}
      />
    </div>
  );
}
