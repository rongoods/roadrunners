import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// Modular Imports
import { Navigation } from './components/Navigation';
import FeedFeature from './features/feed/FeedFeature';
import GroupsFeature from './features/groups/GroupsFeature';
import PlanFeature from './features/training/PlanFeature';
import ProfileFeature from './features/user/ProfileFeature';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useTheme } from './hooks/useTheme'; // New Import
import { TABS } from './utils/constants';

// Styles
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.FEED);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewedUserId, setViewedUserId] = useState(null);
  const { user, signInWithGoogle, logout } = useAuth();
  const { profile, updateProfile } = useProfile(user);
  const { theme, toggleTheme } = useTheme(); // Hook usage

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleViewProfile = (userId) => {
    setViewedUserId(userId);
    setActiveTab(TABS.PROFILE);
  };

  const handleTabChange = (tab) => {
    if (tab === TABS.PROFILE) {
      setViewedUserId(null); // Reset when going to own profile via nav
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-background text-text font-mono selection:bg-primary selection:text-black overflow-x-hidden">
      {/* Scanlines Overlay - Preserved from original */}
      <div className="scanlines pointer-events-none fixed inset-0 z-[100]" />
      <div className="bg-grid-pattern fixed inset-0 pointer-events-none opacity-20 z-[1]" />

      <main className="relative min-h-screen w-full max-w-lg mx-auto border-x-2 border-border-bright bg-background z-10 pt-12 pb-20">
        {/* Header Status Bar - Moved to absolute top since nav is gone */}
        <div className="fixed top-0 left-0 right-0 max-w-lg mx-auto bg-background border-b-2 border-border-bright p-1 flex justify-between items-center z-40 px-2 h-8">
          <span className="text-[10px] uppercase font-mono text-primary animate-pulse">NEVER STOP</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono text-text">{format(currentTime, 'HH:mm:ss')} // </span>
            <button
              onClick={toggleTheme}
              className="text-[10px] uppercase font-bold px-1 border border-primary text-primary hover:bg-primary hover:text-black transition-colors"
            >
              [{theme === 'dark' ? 'LIGHT' : 'DARK'}]
            </button>
          </div>
        </div>

        <div className="mt-0 px-0">
          {/* Main Content Area */}
          {activeTab === TABS.FEED && <FeedFeature user={user} profile={profile} onViewProfile={handleViewProfile} />}
          {activeTab === TABS.GROUPS && <GroupsFeature user={user} profile={profile} />}
          {activeTab === TABS.PLAN && <PlanFeature user={user} profile={profile} onUpdateProfile={updateProfile} />}
          {activeTab === TABS.PROFILE && (
            <ProfileFeature
              user={user}
              profile={profile}
              onUpdateProfile={updateProfile}
              onLogin={signInWithGoogle}
              onLogout={logout}
              viewedUserId={viewedUserId}
              onBack={() => setViewedUserId(null)}
            />
          )}
        </div>

        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
      </main>
    </div>
  );
}
