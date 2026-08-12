import React from 'react';
import { Compass, Map, Users, Filter } from 'lucide-react';
import { useMeetups } from './hooks/useMeetups';
import Header from './components/Header';
import NotificationBanner from './components/NotificationBanner';
import MeetupFeed from './components/MeetupFeed';
import MapControl from './components/MapControl';
import ActiveMeetupChat from './components/ActiveMeetupChat';
import PreviewLayerSidebar from './components/PreviewLayerSidebar';
import CreateMeetupModal from './components/CreateMeetupModal';
import UserProfileModal from './components/UserProfileModal';
import { calculateDistance } from './utils';

export default function App() {
  const {
    activeDistrict,
    currentUser,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isMapFullscreen,
    setIsMapFullscreen,
    userCoords,
    userTrustScore,
    meetups,
    selectedMeetupId,
    setSelectedMeetupId,
    activeMeetupId,
    waitlistedMeetups,
    selectedMapCoords,
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
  } = useMeetups();

  // Filter meetups based on tactical radius and urgency
  const filteredMeetups = meetups.filter((meetup) => {
    if (meetup.status === 'completed' || meetup.status === 'cancelled') return false;

    if (categoryFilter !== 'All') {
      const matchCat =
        meetup.locationType === categoryFilter.toLowerCase() ||
        meetup.vibeTags.some((t) => t.toLowerCase().includes(categoryFilter.toLowerCase())) ||
        meetup.title.toLowerCase().includes(categoryFilter.toLowerCase());
      if (!matchCat) return false;
    }

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
  const currentUserActiveSparksCount = meetups.filter(
    (m) => m.creatorId === currentUser.id && m.status !== 'completed' && m.status !== 'cancelled'
  ).length;

  return (
    <div className="min-h-screen bg-[#120D0A] text-stone-100 flex flex-col font-sans transition-all relative overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="absolute top-[-5%] left-[-10%] w-[45%] h-[45%] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[45%] h-[45%] bg-orange-600/5 rounded-full blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute top-[35%] right-[20%] w-[30%] h-[30%] bg-amber-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Floating Alert Notification */}
      <NotificationBanner notification={simulatedNotification} />

      {/* Primary Header Navigation Bar */}
      <Header
        activeDistrict={activeDistrict}
        onDistrictChange={handleDistrictChange}
        userTrustScore={userTrustScore}
        isMapFullscreen={isMapFullscreen}
        onToggleMapFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
        currentUser={currentUser}
        firebaseUser={firebaseUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Mobile Tab Control Switcher */}
      <div className="lg:hidden grid grid-cols-3 border-b border-stone-800 bg-[#16100D] py-1 sticky top-[61px] z-30 text-xs font-mono text-slate-400">
        <button
          onClick={() => setMobileActiveTab('map')}
          className={`py-2 text-center flex flex-col items-center gap-1 border-b-2 transition ${
            mobileActiveTab === 'map' ? 'border-amber-500 text-slate-100 font-bold' : 'border-transparent text-slate-400'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>1. Map</span>
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
          <span>3. Details</span>
          {activeMeetupId && (
            <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
          )}
        </button>
      </div>

      {/* Workspace Grid Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        {/* COLUMN 1: Search, Filter, & Meetup Feed */}
        <MeetupFeed
          activeDistrict={activeDistrict}
          onDistrictChange={handleDistrictChange}
          userCoords={userCoords}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          filteredMeetups={filteredMeetups}
          selectedMeetupId={selectedMeetupId}
          activeMeetupId={activeMeetupId}
          onSelectMeetup={(id) => {
            setSelectedMeetupId(id);
            setMobileActiveTab('feed');
          }}
          mobileActiveTab={mobileActiveTab}
        />

        {/* COLUMN 2: Map Canvas */}
        <section
          className={
            isMapFullscreen
              ? 'fixed inset-0 z-[99999] w-screen h-screen m-0 p-0 overflow-hidden bg-[#120D0A]'
              : `lg:col-span-5 h-[480px] lg:h-full flex flex-col select-none ${
                  mobileActiveTab === 'map' ? 'block' : 'hidden lg:flex'
                }`
          }
        >
          <div
            className={
              isMapFullscreen
                ? 'w-full h-full border-none rounded-none overflow-hidden'
                : 'flex-1 flex flex-col h-full bg-white/5 rounded-2xl overflow-hidden shadow-inner border border-white/10 z-10'
            }
          >
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
                // Handled in custom hook
              }}
            />
          </div>
        </section>

        {/* COLUMN 3: Preview Sidebar / Active Chat + Create Spark Drawer */}
        <section
          className={`lg:col-span-3 space-y-4 flex flex-col h-full ${
            mobileActiveTab === 'chat' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {selectedMeetup && activeMeetupId === selectedMeetup.id ? (
            <div className="flex-1">
              <ActiveMeetupChat
                meetup={selectedMeetup}
                currentUser={currentUser}
                chatMessages={chatMessagesByMeetup[selectedMeetup.id] || []}
                onSendMessage={(text) =>
                  appendChatMessage(selectedMeetup.id, currentUser.id, currentUser.name, text)
                }
                onUserCheckIn={handleUserCheckIn}
                isUserCheckedIn={selectedMeetup.checkedInUserIds.includes(currentUser.id)}
                onSimulatedReceiveMessage={(text, sender) =>
                  appendChatMessage(selectedMeetup.id, sender.id, sender.name, text)
                }
                onCompleteMeetup={handleCompleteMeetup}
                onCancelMeetup={handleCancelMeetup}
              />
            </div>
          ) : selectedMeetup && !isCreateExpanded ? (
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

          {/* Create Spark Form Drawer */}
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

      {/* Footer Bar */}
      <footer className="mt-auto px-4 py-3 md:px-8 bg-white/5 backdrop-blur border-t border-white/10 text-[10px] text-slate-400 flex flex-col md:flex-row justify-between items-center gap-3 z-10">
        <p className="font-mono uppercase tracking-wider text-[9px] text-slate-300">
          System verifier • GPS accurate within 25m • Tiny groups physical pledge system active
        </p>
        <p className="font-sans text-slate-400">
          Built according to trust and reliability offline parameters. © 2026.
        </p>
      </footer>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
        upcomingMeetups={meetups.filter(
          (m) =>
            m.participants.some((p) => p.id === currentUser.id) &&
            m.status !== 'completed' &&
            m.status !== 'cancelled'
        )}
        sparkHistory={meetups.filter(
          (m) =>
            m.participants.some((p) => p.id === currentUser.id) &&
            (m.status === 'completed' || m.status === 'cancelled')
        )}
        onSelectMeetup={(id) => {
          setSelectedMeetupId(id);
          setMobileActiveTab('chat');
        }}
      />
    </div>
  );
}
