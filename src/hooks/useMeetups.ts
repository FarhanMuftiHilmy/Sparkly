import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth, testConnection, handleRedirectResult, handleFirestoreError, OperationType } from '../lib/firebase';
import { Meetup, NearbyDistrict, User, Message, LocationType, StartTimeType, MeetupStatus } from '../types';
import { SUPPORTED_DISTRICTS, MOCK_USERS, SIMULATED_CHAT_REPLIES } from '../data';
import {
  generateInitialMeetups,
  calculateDistance,
  isMeetupEndTimePassed,
  hasMeetupStartTimePassed,
} from '../utils';

export function useMeetups() {
  // 1. Core Profile & Geolocation States
  const [activeDistrict, setActiveDistrict] = useState<NearbyDistrict>(SUPPORTED_DISTRICTS[0]);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('spark_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {}
    return {
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
      upcomingCommitments: [],
    };
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: SUPPORTED_DISTRICTS[0].lat,
    lng: SUPPORTED_DISTRICTS[0].lng,
  });

  const [userTotalCheckIns, setUserTotalCheckIns] = useState<number>(2);
  const [userTrustScore, setUserTrustScore] = useState<number>(88);

  // 2. Meetup Listings State
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [selectedMeetupId, setSelectedMeetupId] = useState<string | null>('meetup_1');
  const [activeMeetupId, setActiveMeetupId] = useState<string | null>(null);
  const [waitlistedMeetups, setWaitlistedMeetups] = useState<string[]>([]);

  const [selectedMapCoords, setSelectedMapCoords] = useState<{
    lat: number;
    lng: number;
    addressName: string;
  } | null>(null);

  const [isCreateExpanded, setIsCreateExpanded] = useState<boolean>(false);

  // 3. Logistics Chat Storage State
  const [chatMessagesByMeetup, setChatMessagesByMeetup] = useState<Record<string, Message[]>>({});

  // 4. Interactive Feed Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<'all' | 'now' | '30m' | 'scheduled'>('all');

  const [simulatedTicks, setSimulatedTicks] = useState<number>(0);
  const [simulatedNotification, setSimulatedNotification] = useState<string | null>(null);

  const [mobileActiveTab, setMobileActiveTab] = useState<'map' | 'feed' | 'chat'>('map');
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  const autoCompletingIdsRef = useRef<Set<string>>(new Set());

  // A. Connection test & Redirect result handling
  useEffect(() => {
    testConnection();
    handleRedirectResult();
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
              upcomingCommitments: data.upcomingCommitments || [],
            });
            setUserTrustScore(data.trustScore);
            setUserTotalCheckIns(data.totalCheckIns ?? data.attendedCount ?? 3);

            setSimulatedNotification(`🚀 Joined Session! Welcome back, ${data.name || 'Explorer'}!`);
            setIsProfileModalOpen(true);
            setTimeout(() => setSimulatedNotification(null), 5000);
          } else {
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
              upcomingCommitments: [],
            };

            await setDoc(userDocRef, {
              ...newProfile,
              totalCheckIns: 3,
            });
            setCurrentUser(newProfile);

            setSimulatedNotification(`🚀 Account synchronized! Welcome, ${newProfile.name}!`);
            setIsProfileModalOpen(true);
            setTimeout(() => setSimulatedNotification(null), 5000);
          }
        } catch (err) {
          console.error('Error fetching/setting user profile:', err);
        }
      } else {
        setFirebaseUser(null);
        setIsProfileModalOpen(false);
        setIsCreateExpanded(false);
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
          upcomingCommitments: [],
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // C. Sync Realtime Meetups from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'meetups'),
      (snapshot) => {
        if (snapshot.empty) {
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
              console.error('Error seeding meetup:', error);
            }
          });
        } else {
          const list: Meetup[] = [];
          snapshot.forEach((snapshotDoc) => {
            const data = snapshotDoc.data();
            const rawLat = data.lat;
            const rawLng = data.lng;
            const dist = calculateDistance(userCoords.lat, userCoords.lng, rawLat, rawLng);

            const status = data.status || ((data.state === 'draft' ? 'spark' : data.state) as MeetupStatus);
            list.push({
              id: snapshotDoc.id,
              ...data,
              status,
              distanceKm: dist,
            } as Meetup);
          });
          list.sort((a, b) => a.distanceKm - b.distanceKm);
          setMeetups(list);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'meetups');
      }
    );

    return () => unsubscribe();
  }, [activeDistrict, userCoords]);

  // Dynamic commitment sync
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
  useEffect(() => {
    const processMeetupTransitions = async () => {
      // 1. Auto-Completion (EndTime passed)
      const endPassedMeetups = meetups.filter((m) => {
        const isNotFinal = m.status !== 'completed' && m.status !== 'cancelled';
        const endTimePassed = isMeetupEndTimePassed(m);
        const isAlreadyProcessing = autoCompletingIdsRef.current.has(m.id + '_complete');
        return isNotFinal && endTimePassed && !isAlreadyProcessing;
      });

      for (const m of endPassedMeetups) {
        autoCompletingIdsRef.current.add(m.id + '_complete');
        try {
          await updateDoc(doc(db, 'meetups', m.id), {
            status: 'completed',
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

      // 2. Auto-Active or Auto-Cancel on StartTime reached
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
            await updateDoc(doc(db, 'meetups', m.id), {
              status: 'active',
            });
            await appendSystemMessage(
              m.id,
              `🔴 Spark is officially confirmed and ACTIVE! The scheduled starting hour was reached with ${participantCount} committed members.`
            );
          } else {
            await updateDoc(doc(db, 'meetups', m.id), {
              status: 'cancelled',
              cancelReason: 'Cancelled automatically: insufficient participants before scheduled start time.',
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
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;
    const completedCreatedMeetups = meetups.filter(
      (m) => m.creatorId === currentUser.id && m.status === 'completed'
    );
    if (completedCreatedMeetups.length === 0) return;

    const storageKey = `spark_credited_meetups_${currentUser.id}`;
    let creditedSlice: string[] = [];
    try {
      creditedSlice = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      creditedSlice = [];
    }

    const uncredited = completedCreatedMeetups.filter((m) => !creditedSlice.includes(m.id));
    if (uncredited.length > 0) {
      const newCredited = [...creditedSlice, ...uncredited.map((m) => m.id)];
      localStorage.setItem(storageKey, JSON.stringify(newCredited));

      setCurrentUser((prev) => {
        const rewardCount = uncredited.length;
        const nextScore = (prev.reputationScore ?? 88) + rewardCount * 3;
        const nextHosted = (prev.hostedCount ?? 1) + rewardCount;
        const totalAttended = prev.attendedCount ?? 3;
        const totalConcluded = totalAttended + (prev.noShowCount ?? 0);
        const attendanceRate = totalConcluded > 0 ? (totalAttended / totalConcluded) * 100 : 100;
        const nextTrust = Math.min(Math.max(Math.round((attendanceRate + nextScore / 4) / 1.5), 10), 100);

        const updated = {
          ...prev,
          reputationScore: nextScore,
          hostedCount: nextHosted,
          trustScore: nextTrust,
        };

        if (firebaseUser) {
          setDoc(
            doc(db, 'users', firebaseUser.uid),
            {
              ...updated,
              id: firebaseUser.uid,
            },
            { merge: true }
          ).catch((err) => {
            console.error('Failed to auto-reward host on completion detection:', err);
          });
        }
        return updated;
      });

      setSimulatedNotification(
        `🎊 Earned Spark hosted rewards! +${uncredited.length * 3} Rep & Host credit for successfully completed Spark sessions!`
      );
      setTimeout(() => setSimulatedNotification(null), 5000);
    }
  }, [meetups, currentUser, firebaseUser]);

  // D. Sync Realtime Chat Messages for selected meetup
  useEffect(() => {
    if (!selectedMeetupId) return;

    const messagesCol = collection(db, 'meetups', selectedMeetupId, 'messages');
    const unsubscribe = onSnapshot(
      messagesCol,
      (snapshot) => {
        const list: Message[] = [];
        snapshot.forEach((snapshotDoc) => {
          list.push({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          } as Message);
        });
        list.sort((a, b) => a.id.localeCompare(b.id));

        setChatMessagesByMeetup((prev) => ({
          ...prev,
          [selectedMeetupId]: list,
        }));
      },
      (error) => {
        console.error('Error listening to chat messages:', error);
      }
    );

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

  // BACKGROUND ACTIVE SIMULATOR SYSTEM
  useEffect(() => {
    const interval = setInterval(async () => {
      setSimulatedTicks((t) => t + 1);

      const decision = Math.random();

      if (decision < 0.4) {
        const joinable = meetups.filter(
          (m) =>
            m.participants.length < m.limit &&
            m.id !== activeMeetupId &&
            m.status !== 'completed' &&
            m.status !== 'cancelled'
        );
        if (joinable.length === 0) return;

        const target = joinable[Math.floor(Math.random() * joinable.length)];
        const availableUsers = MOCK_USERS.filter(
          (u) => !target.participants.some((p) => p.id === u.id)
        );

        if (availableUsers.length > 0) {
          const newUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
          const updatedParticipants = [...target.participants, newUser];

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
              status: newStatus,
            });

            if (newStatus === 'active' && target.checkedInUserIds.length === 0) {
              await appendSystemMessage(target.id, `${newUser.name} checked in! "Ready to physically meet up now."`);
            }
          } catch (err) {
            console.error('Simulator background update error:', err);
          }
        }
      } else if (decision >= 0.4 && decision < 0.70) {
        const eligible = meetups.filter(
          (m) =>
            m.participants.length >= 2 &&
            m.checkedInUserIds.length < m.participants.length &&
            m.status !== 'completed' &&
            m.status !== 'cancelled'
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

          const chatReplies = SIMULATED_CHAT_REPLIES[target.locationType] || SIMULATED_CHAT_REPLIES.general;
          const reply = chatReplies[Math.floor(Math.random() * chatReplies.length)];

          try {
            await updateDoc(doc(db, 'meetups', target.id), {
              checkedInUserIds: updatedCheckins,
            });

            await appendChatMessage(target.id, arrivingUser.id, arrivingUser.name, reply);
          } catch (err) {
            console.error('Simulator background checkin error:', err);
          }
        }
      }
    }, 28000);

    return () => clearInterval(interval);
  }, [activeMeetupId, meetups, currentUser]);

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

  const handleJoinMeetup = useCallback(
    async (meetupId: string) => {
      if (activeMeetupId !== null && activeMeetupId !== meetupId) {
        alert('App Safety: You can only join/RSVP to max 1 active meetup at a time to secure real-world commitment.');
        return;
      }

      const meetup = meetups.find((m) => m.id === meetupId);
      if (!meetup) return;

      if (meetup.participants.length >= meetup.limit) return;
      if (meetup.participants.some((p) => p.id === currentUser.id)) return;

      const updatedParticipants = [...meetup.participants, currentUser];

      let newStatus = meetup.status;
      if (updatedParticipants.length >= 4) {
        newStatus = 'active';
      } else if (updatedParticipants.length >= 2) {
        newStatus = 'forming';
      }

      setActiveMeetupId(meetupId);
      setSelectedMeetupId(meetupId);

      try {
        await updateDoc(doc(db, 'meetups', meetupId), {
          participants: updatedParticipants,
          status: newStatus,
        });

        setTimeout(() => {
          appendSystemMessage(meetupId, `You secured your slot! Coordinate your physical desk position below.`);
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
    },
    [activeMeetupId, currentUser, meetups]
  );

  const handleLeaveMeetup = useCallback(
    async (meetupId: string) => {
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

      setActiveMeetupId(null);
      notifyLeftPenalty(wasCheckedIn);

      try {
        await updateDoc(doc(db, 'meetups', meetupId), {
          participants: updatedParticipants,
          checkedInUserIds: updatedCheckins,
          status: newStatus,
        });

        appendSystemMessage(meetupId, `${currentUser.name} cancelled commitment. Attendance score updated.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `meetups/${meetupId}`);
      }
    },
    [currentUser, meetups]
  );

  const notifyLeftPenalty = (wasCheckedIn: boolean) => {
    setUserTrustScore((prev) => {
      const penalty = wasCheckedIn ? 8 : 4;
      return Math.max(prev - penalty, 45);
    });

    setCurrentUser((prev) => {
      const nextScore = Math.max(0, (prev.reputationScore ?? 88) - 3);
      const nextNoShow = (prev.noShowCount ?? 0) + 1;
      const totalAttended = prev.attendedCount ?? 3;
      const nextTrust = Math.min(Math.max(Math.round(((totalAttended / (totalAttended + nextNoShow)) * 100 + nextScore / 4) / 1.5), 10), 100);

      const updated = {
        ...prev,
        reputationScore: nextScore,
        noShowCount: nextNoShow,
        trustScore: nextTrust,
      };

      if (firebaseUser) {
        setDoc(doc(db, 'users', firebaseUser.uid), {
          ...updated,
          totalCheckIns: totalAttended,
        }).catch((err) => console.error('Firestore cancel sync:', err));
      }
      return updated;
    });

    setSimulatedNotification(`⚠️ Left meetup. Score updated (-3 Reputation Score).`);
    setTimeout(() => setSimulatedNotification(null), 5000);
  };

  const handleToggleWaitlist = useCallback(
    (meetupId: string) => {
      setWaitlistedMeetups((prev) =>
        prev.includes(meetupId) ? prev.filter((id) => id !== meetupId) : [...prev, meetupId]
      );

      const activeWait = !waitlistedMeetups.includes(meetupId);
      setSimulatedNotification(
        activeWait ? '⭐ Secured Waitlist Spot! Low friction commitment logged.' : 'Removed from Waitlist spot.'
      );
      setTimeout(() => setSimulatedNotification(null), 4000);
    },
    [waitlistedMeetups]
  );

  const handleUpdateProfile = async (updated: User) => {
    const nextUser = { ...currentUser, ...updated };
    setCurrentUser(nextUser);
    setUserTrustScore(nextUser.trustScore);
    setUserTotalCheckIns(nextUser.attendedCount ?? 3);

    try {
      localStorage.setItem('spark_user_profile', JSON.stringify(nextUser));
    } catch (e) {}

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...nextUser,
          id: firebaseUser.uid,
          totalCheckIns: nextUser.attendedCount ?? 3,
        }, { merge: true });
        setSimulatedNotification('✨ Live Cloud Firestore Profile Synced successfully!');
        setTimeout(() => setSimulatedNotification(null), 4000);
      } catch (err) {
        console.error('Firestore sync error:', err);
      }
    } else {
      setSimulatedNotification('💾 Local Profile Saved (offline mode)!');
      setTimeout(() => setSimulatedNotification(null), 4000);
    }
  };

  const handleCompleteMeetup = async (meetupId: string) => {
    try {
      await updateDoc(doc(db, 'meetups', meetupId), {
        status: 'completed',
      });

      await appendSystemMessage(
        meetupId,
        `🏆 Spark successfully concluded by the organizer! Attendance and hosted credentials have been registered.`
      );

      setCurrentUser((prev) => {
        const nextScore = (prev.reputationScore ?? 88) + 3;
        const nextHosted = (prev.hostedCount ?? 1) + 1;
        const totalAttended = prev.attendedCount ?? 3;
        const totalConcluded = totalAttended + (prev.noShowCount ?? 0);
        const attendanceRate = totalConcluded > 0 ? (totalAttended / totalConcluded) * 100 : 100;
        const nextTrust = Math.min(Math.max(Math.round((attendanceRate + nextScore / 4) / 1.5), 10), 100);

        const updated = {
          ...prev,
          reputationScore: nextScore,
          hostedCount: nextHosted,
          trustScore: nextTrust,
        };

        if (firebaseUser) {
          setDoc(doc(db, 'users', firebaseUser.uid), {
            ...updated,
            totalCheckIns: totalAttended,
          }).catch((err) => console.error('Firestore complete sync:', err));
        }
        return updated;
      });

      setSimulatedNotification('🏆 Meetup Completed! Host received +3 Reputation Score!');
      setTimeout(() => setSimulatedNotification(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `meetups/${meetupId}`);
    }
  };

  const handleCancelMeetup = async (meetupId: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'meetups', meetupId), {
        status: 'cancelled',
        cancelReason: reason,
      });

      await appendSystemMessage(meetupId, `⚫ This Spark has been cancelled by the host. Reason filed: "${reason}"`);

      setSimulatedNotification(`⚫ Spark cancelled successfully: "${reason}"`);
      setTimeout(() => setSimulatedNotification(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `meetups/${meetupId}`);
    }
  };

  const handleUserCheckIn = async () => {
    if (!activeMeetupId) return;

    const m = meetups.find((meet) => meet.id === activeMeetupId);
    if (!m) return;

    if (m.checkedInUserIds.includes(currentUser.id)) return;

    const updatedCheckins = [...m.checkedInUserIds, currentUser.id];

    setUserTotalCheckIns((tot) => tot + 1);
    setUserTrustScore((prev) => Math.min(prev + 5, 100));

    setCurrentUser((prev) => {
      const nextScore = (prev.reputationScore ?? 88) + 5;
      const nextAttended = (prev.attendedCount ?? 3) + 1;
      const totalConcluded = nextAttended + (prev.noShowCount ?? 0);
      const attendanceRate = totalConcluded > 0 ? (nextAttended / totalConcluded) * 100 : 100;
      const nextTrust = Math.min(Math.max(Math.round((attendanceRate + nextScore / 4) / 1.5), 10), 100);

      const updated = {
        ...prev,
        reputationScore: nextScore,
        attendedCount: nextAttended,
        trustScore: nextTrust,
      };

      if (firebaseUser) {
        setDoc(doc(db, 'users', firebaseUser.uid), {
          ...updated,
          totalCheckIns: nextAttended,
        }).catch((err) => console.error(err));
      }
      return updated;
    });

    try {
      await updateDoc(doc(db, 'meetups', activeMeetupId), {
        checkedInUserIds: updatedCheckins,
      });

      appendSystemMessage(
        activeMeetupId,
        `📍 Verified Check-In: Your presence has been successfully recorded in the physical coordinate boundary.`
      );

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

      setSimulatedNotification('🏆 Check-in recorded! Reputation +5 & Attendance updated!');
      setTimeout(() => setSimulatedNotification(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `meetups/${activeMeetupId}`);
    }
  };

  const handleCreateMeetupAtCoordinates = (lat: number, lng: number, addressName: string) => {
    setSelectedMapCoords({
      lat,
      lng,
      addressName,
    });
  };

  const handleAddMeetup = async (data: {
    title: string;
    locationName: string;
    locationType: LocationType;
    startTimeType: StartTimeType;
    scheduledTime?: string;
    startTime?: string;
    endTime?: string;
    limit: number;
    vibeTags: string[];
    lat: number;
    lng: number;
  }) => {
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
      meetupQualityScore: 100,
    };

    setActiveMeetupId(newId);
    setSelectedMeetupId(newId);
    setSelectedMapCoords(null);

    try {
      await setDoc(doc(db, 'meetups', newId), newMeetup);

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

      setSimulatedNotification('🚀 New Spark Pin Dropped! Nearby users can spot you now.');
      setTimeout(() => setSimulatedNotification(null), 5000);

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
          } catch (err) {
            console.error('Error adding mock participant:', err);
          }
        }
      }, 4500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `meetups/${newId}`);
    }
  };

  const handleDistrictChange = (district: NearbyDistrict) => {
    setActiveDistrict(district);
    setUserCoords({ lat: district.lat, lng: district.lng });
  };

  return {
    activeDistrict,
    currentUser,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isMapFullscreen,
    setIsMapFullscreen,
    userCoords,
    userTrustScore,
    userTotalCheckIns,
    meetups,
    selectedMeetupId,
    setSelectedMeetupId,
    activeMeetupId,
    waitlistedMeetups,
    selectedMapCoords,
    setSelectedMapCoords,
    isCreateExpanded,
    setIsCreateExpanded,
    chatMessagesByMeetup,
    categoryFilter,
    setCategoryFilter,
    timeFilter,
    setTimeFilter,
    simulatedNotification,
    mobileActiveTab,
    setMobileActiveTab,
    firebaseUser,
    handleDistrictChange,
    handleJoinMeetup,
    handleLeaveMeetup,
    handleToggleWaitlist,
    handleUpdateProfile,
    handleCompleteMeetup,
    handleCancelMeetup,
    handleUserCheckIn,
    handleCreateMeetupAtCoordinates,
    handleAddMeetup,
    appendChatMessage,
    appendSystemMessage,
  };
}
