import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { getAuth, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
  Activity,
  Users,
  Calendar,
  User,
  Send,
  Plus,
  Trophy,
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Firebase Setup & Mock Mode ---
const firebaseConfig = window.__firebase_config || {};
const initialAuthToken = window.__initial_auth_token;
const appId = window.__app_id || 'demo-app';

let db = null;
let auth = null;
let isMock = false;

try {
  if (Object.keys(firebaseConfig).length > 0) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    if (initialAuthToken) {
      signInWithCustomToken(auth, initialAuthToken).catch(console.error);
    }
  } else {
    isMock = true;
    console.warn("Firebase config missing. Using MOCK MODE.");
  }
} catch (e) {
  console.error("Firebase init error:", e);
  isMock = true;
}

// --- Mock Data ---
const MOCK_USER = { uid: 'mock-user-123', email: 'guest@roadrunners.app', displayName: 'Guest Runner' };

const MOCK_DATA = {
  runs: [
    { id: 'r1', userId: 'u2', username: 'Sarah Run', distanceKm: 5.2, durationMinutes: 28, paceMinPerKm: 5.38, date: '2024-05-20', kudosCount: 12, shoeName: 'Pegasus 40' },
    { id: 'r2', userId: 'u3', username: 'Mike Track', distanceKm: 10.0, durationMinutes: 45, paceMinPerKm: 4.50, date: '2024-05-19', kudosCount: 8, shoeName: null },
    { id: 'r3', userId: 'mock-user-123', username: 'Guest Runner', distanceKm: 3.1, durationMinutes: 18, paceMinPerKm: 5.80, date: '2024-05-18', kudosCount: 3, shoeName: 'Ghost 15' },
  ],
  groups: [
    {
      id: 'g1', groupName: 'Morning Milers', members: ['mock-user-123', 'u2', 'u3'], leaderboard: [
        { username: 'Sarah Run', distance: 25.4 },
        { username: 'Guest Runner', distance: 15.2 },
        { username: 'Mike Track', distance: 10.0 }
      ]
    },
    { id: 'g2', groupName: 'Marathon Training', members: ['u2'], leaderboard: [] }
  ],
  messages: [
    { id: 'm1', userId: 'u2', username: 'Sarah Run', text: 'Great run everyone!', timestamp: new Date(Date.now() - 86400000) },
    { id: 'm2', userId: 'mock-user-123', username: 'Guest Runner', text: 'Thanks! Felt good today.', timestamp: new Date() }
  ],
  profile: {
    userId: 'mock-user-123',
    username: 'Guest Runner',
    age: 28,
    weightKg: 70,
    trainingGoal: 'General Fitness',
    shoeTracker: [
      { id: 's1', name: 'Ghost 15', startMileage: 50, targetMileage: 800 }
    ]
  }
};

// --- Constants ---
const TABS = {
  FEED: 'feed',
  GROUPS: 'groups',
  PLAN: 'plan',
  PROFILE: 'profile'
};

// --- Components ---

function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: TABS.FEED, icon: Activity, label: 'Feed' },
    { id: TABS.GROUPS, icon: Users, label: 'Groups' },
    { id: TABS.PLAN, icon: Calendar, label: 'Plan' },
    { id: TABS.PROFILE, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/10 safe-area-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors",
                isActive ? "text-primary" : "text-secondary hover:text-white"
              )}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function FeedView({ user, profile }) {
  const [runs, setRuns] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [newRun, setNewRun] = useState({ distance: '', duration: '', date: format(new Date(), 'yyyy-MM-dd'), shoeId: '' });

  useEffect(() => {
    if (isMock) {
      setRuns(MOCK_DATA.runs);
      return;
    }
    if (!db) return;
    const q = query(collection(db, `artifacts/${appId}/public/data/runs`), orderBy('date', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRuns(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleLogRun = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please sign in.");

    const dist = parseFloat(newRun.distance);
    const dur = parseFloat(newRun.duration);
    if (!dist || !dur) return;
    const pace = (dur / dist).toFixed(2);

    const runData = {
      userId: user.uid,
      username: profile?.username || user.email?.split('@')[0] || 'Runner',
      distanceKm: dist,
      durationMinutes: dur,
      paceMinPerKm: parseFloat(pace),
      date: newRun.date,
      shoeId: newRun.shoeId || null,
      shoeName: profile?.shoeTracker?.find(s => s.id === newRun.shoeId)?.name || null,
      kudosCount: 0,
      timestamp: new Date()
    };

    if (isMock) {
      setRuns(prev => [{ id: Date.now().toString(), ...runData }, ...prev]);
      setShowLogForm(false);
      setNewRun({ distance: '', duration: '', date: format(new Date(), 'yyyy-MM-dd'), shoeId: '' });
      return;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/runs`), runData);
      setShowLogForm(false);
      setNewRun({ distance: '', duration: '', date: format(new Date(), 'yyyy-MM-dd'), shoeId: '' });
    } catch (err) {
      console.error("Error adding run: ", err);
      alert("Failed to post run. Check permissions.");
    }
  };

  const giveKudos = async (run) => {
    if (!user) return;
    if (isMock) {
      setRuns(prev => prev.map(r => r.id === run.id ? { ...r, kudosCount: (r.kudosCount || 0) + 1 } : r));
      return;
    }
    const ref = doc(db, `artifacts/${appId}/public/data/runs`, run.id);
    await setDoc(ref, { kudosCount: (run.kudosCount || 0) + 1 }, { merge: true });
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="bg-primary text-white p-2 rounded-full shadow-lg hover:bg-white/20 transition-colors"
        >
          {showLogForm ? <Activity size={24} className="rotate-45" /> : <Plus size={24} />}
        </button>
      </div>

      {showLogForm && (
        <form onSubmit={handleLogRun} className="bg-surface p-4 rounded-xl border border-white/10 space-y-4">
          <h3 className="font-semibold text-lg">Log a Run</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-secondary">Distance (km)</label>
              <input
                type="number" step="0.01" required
                value={newRun.distance}
                onChange={e => setNewRun({ ...newRun, distance: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-md p-2 text-white focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-secondary">Duration (min)</label>
              <input
                type="number" step="1" required
                value={newRun.duration}
                onChange={e => setNewRun({ ...newRun, duration: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-md p-2 text-white focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-secondary">Date</label>
            <input
              type="date" required
              value={newRun.date}
              onChange={e => setNewRun({ ...newRun, date: e.target.value })}
              className="w-full bg-background border border-white/10 rounded-md p-2 text-white focus:border-primary outline-none"
            />
          </div>
          {profile?.shoeTracker?.length > 0 && (
            <div>
              <label className="text-xs text-secondary">Shoes</label>
              <select
                value={newRun.shoeId}
                onChange={e => setNewRun({ ...newRun, shoeId: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-md p-2 text-white focus:border-primary outline-none"
              >
                <option value="">Select Shoes</option>
                {profile.shoeTracker.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-md font-medium hover:opacity-90">
            Post Run
          </button>
        </form>
      )}

      <div className="space-y-4">
        {runs.length === 0 ? (
          <div className="bg-surface p-8 rounded-xl border border-white/5 text-center">
            <p className="text-secondary">No runs yet. Be the first!</p>
          </div>
        ) : (
          runs.map(run => (
            <div key={run.id} className="bg-surface p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <User size={16} className="text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{run.username}</p>
                    <p className="text-xs text-secondary">{format(new Date(run.date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                {run.shoeName && (
                  <span className="text-xs text-secondary px-2 py-1 bg-white/5 rounded-full">
                    👟 {run.shoeName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">{run.distanceKm}</p>
                  <p className="text-[10px] text-secondary uppercase tracking-wider">km</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{run.paceMinPerKm}</p>
                  <p className="text-[10px] text-secondary uppercase tracking-wider">min/km</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{run.durationMinutes}</p>
                  <p className="text-[10px] text-secondary uppercase tracking-wider">min</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => giveKudos(run)}
                  className="flex items-center gap-1.5 text-secondary hover:text-primary transition-colors text-sm"
                >
                  <Trophy size={16} />
                  <span>Kudos</span>
                  <span className="font-mono bg-white/10 px-1.5 rounded text-white text-xs">{run.kudosCount || 0}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GroupsView({ user, profile }) {
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (!user) return;
    if (isMock) {
      setGroups(MOCK_DATA.groups);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, `artifacts/${appId}/public/data/groups`), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const myGroups = all.filter(g => g.members?.includes(user.uid));
      setGroups(myGroups);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeGroup) return;
    if (isMock) {
      setMessages(MOCK_DATA.messages);
      return;
    }
    const q = query(
      collection(db, `artifacts/${appId}/public/data/groups/${activeGroup.id}/messages`),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [activeGroup]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    if (isMock) {
      const newGroup = {
        id: Date.now().toString(),
        groupName: newGroupName,
        members: [user.uid],
        leaderboard: []
      };
      setGroups(prev => [...prev, newGroup]);
      setShowCreateGroup(false);
      setNewGroupName('');
      return;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/groups`), {
        groupName: newGroupName,
        members: [user.uid],
        leaderboard: []
      });
      setShowCreateGroup(false);
      setNewGroupName('');
    } catch (err) {
      console.error(err);
      alert("Error creating group");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!user || !activeGroup || !newMessage.trim()) return;

    if (isMock) {
      const msg = {
        id: Date.now().toString(),
        userId: user.uid,
        username: profile?.username || user.email?.split('@')[0],
        text: newMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      return;
    }

    await addDoc(collection(db, `artifacts/${appId}/public/data/groups/${activeGroup.id}/messages`), {
      userId: user.uid,
      username: profile?.username || user.email?.split('@')[0],
      text: newMessage,
      timestamp: new Date()
    });
    setNewMessage('');
  };

  if (activeGroup) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-surface/50 backdrop-blur-md sticky top-0 z-10">
          <button onClick={() => setActiveGroup(null)} className="text-secondary hover:text-white">
            ← Back
          </button>
          <h2 className="text-lg font-bold text-white flex-1">{activeGroup.groupName}</h2>
          <Users size={16} className="text-primary" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Leaderboard Section */}
          <div className="bg-surface p-4 rounded-xl border border-white/5 space-y-2">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
              <Trophy size={12} /> Weekly Leaderboard
            </h3>
            {activeGroup.leaderboard && activeGroup.leaderboard.length > 0 ? (
              activeGroup.leaderboard.map((entry, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white">{i + 1}. {entry.username}</span>
                  <span className="text-primary font-bold">{entry.distance}km</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-secondary italic">No entries yet this week.</p>
            )}
          </div>

          {/* Chat Section */}
          <div className="space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className={cn("flex flex-col", msg.userId === user?.uid ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                  msg.userId === user?.uid ? "bg-primary text-white" : "bg-white/10 text-white"
                )}>
                  {msg.userId !== user?.uid && <p className="text-[10px] opacity-50 mb-0.5">{msg.username}</p>}
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-background flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-surface border border-white/10 rounded-full px-4 py-2 text-sm focus:border-primary outline-none text-white"
          />
          <button type="submit" className="bg-primary p-2 rounded-full text-white hover:opacity-90">
            <Send size={18} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Groups</h1>
        <button
          onClick={() => setShowCreateGroup(!showCreateGroup)}
          className="text-primary text-sm font-medium hover:underline"
        >
          {showCreateGroup ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {showCreateGroup && (
        <form onSubmit={handleCreateGroup} className="bg-surface p-4 rounded-xl border border-white/10 flex gap-2">
          <input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            className="flex-1 bg-background border border-white/10 rounded-md p-2 text-white focus:border-primary outline-none"
            placeholder="Group Name"
            required
          />
          <button type="submit" className="bg-primary px-4 py-2 rounded-md text-white font-medium">Create</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {groups.length === 0 ? (
          <div className="bg-surface p-8 rounded-xl border border-white/5 text-center">
            <p className="text-secondary">You haven't joined any groups yet.</p>
            <p className="text-secondary text-xs mt-2">Create one to get started!</p>
          </div>
        ) : (
          groups.map(group => (
            <div
              key={group.id}
              onClick={() => setActiveGroup(group)}
              className="bg-surface p-4 rounded-xl border border-white/5 hover:border-primary/50 transition-colors cursor-pointer flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold text-white">{group.groupName}</h3>
                <p className="text-xs text-secondary">{group.members?.length || 0} Members</p>
              </div>
              <Users size={20} className="text-secondary" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PlanView({ user, profile }) {
  const [formData, setFormData] = useState({ age: '', weightKg: '', trainingGoal: 'General Fitness' });
  const [isEditing, setIsEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile); // Local state override for mock mode

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (localProfile) {
      setFormData({
        age: localProfile.age || '',
        weightKg: localProfile.weightKg || '',
        trainingGoal: localProfile.trainingGoal || 'General Fitness'
      });
    } else {
      setIsEditing(true);
    }
  }, [localProfile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (isMock) {
      setLocalProfile(prev => ({
        ...prev,
        age: formData.age,
        weightKg: formData.weightKg,
        trainingGoal: formData.trainingGoal,
        shoeTracker: prev?.shoeTracker || []
      }));
      setIsEditing(false);
      return;
    }

    try {
      const ref = doc(db, `artifacts/${appId}/users/${user.uid}/profiles/${user.uid}`);
      await setDoc(ref, {
        userId: user.uid,
        username: profile?.username || user.email?.split('@')[0],
        age: formData.age,
        weightKg: formData.weightKg,
        trainingGoal: formData.trainingGoal,
        shoeTracker: profile?.shoeTracker || []
      }, { merge: true });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile");
    }
  };

  const getPlan = (goal) => {
    switch (goal) {
      case 'Short Distance':
        return [
          { day: 'Mon', type: 'Speed', desc: 'Intervals: 8x400m @ 5k pace', icon: Activity },
          { day: 'Tue', type: 'Easy', desc: 'Easy Run: 5-8km', icon: User },
          { day: 'Wed', type: 'Strength', desc: 'Lower Body Strength', icon: Activity },
          { day: 'Thu', type: 'Speed', desc: 'Tempo Run: 20min @ 10k pace', icon: Activity },
          { day: 'Fri', type: 'Recovery', desc: 'Active Recovery / Yoga', icon: User },
          { day: 'Sat', type: 'Easy', desc: 'Long Easy Run: 10km', icon: User },
          { day: 'Sun', type: 'Rest', desc: 'Total Rest', icon: Calendar },
        ];
      case 'Long Distance':
        return [
          { day: 'Mon', type: 'Easy', desc: 'Easy Run: 8km', icon: User },
          { day: 'Tue', type: 'Speed', desc: 'Intervals: 4x1km @ 5k pace', icon: Activity },
          { day: 'Wed', type: 'Strength', desc: 'Core & Stability', icon: Activity },
          { day: 'Thu', type: 'Tempo', desc: 'Tempo Run: 40min steady', icon: Activity },
          { day: 'Fri', type: 'Recovery', desc: 'Easy 5km or Cross train', icon: User },
          { day: 'Sat', type: 'Long', desc: 'Long Run: 15-20km', icon: MapPin },
          { day: 'Sun', type: 'Rest', desc: 'Total Rest', icon: Calendar },
        ];
      case 'Competitive':
        return [
          { day: 'Mon', type: 'Speed', desc: 'Track: 12x400m', icon: Activity },
          { day: 'Tue', type: 'Easy', desc: 'Recovery Run: 10km', icon: User },
          { day: 'Wed', type: 'Threshold', desc: 'Threshold: 3x10min', icon: Activity },
          { day: 'Thu', type: 'Easy', desc: 'Easy Run: 12km', icon: User },
          { day: 'Fri', type: 'Easy', desc: 'Shakeout: 6km', icon: User },
          { day: 'Sat', type: 'Long', desc: 'Long Run: 25km+', icon: MapPin },
          { day: 'Sun', type: 'Rest', desc: 'Total Rest', icon: Calendar },
        ];
      default: // General Fitness
        return [
          { day: 'Mon', type: 'Easy', desc: 'Run/Walk: 30min', icon: User },
          { day: 'Tue', type: 'Rest', desc: 'Rest Day', icon: Calendar },
          { day: 'Wed', type: 'Strength', desc: 'Full Body Circuit', icon: Activity },
          { day: 'Thu', type: 'Easy', desc: 'Easy Run: 5km', icon: User },
          { day: 'Fri', type: 'Activity', desc: 'Cross Training (Bike/Swim)', icon: Activity },
          { day: 'Sat', type: 'Long', desc: 'Hike or Long Walk', icon: MapPin },
          { day: 'Sun', type: 'Rest', desc: 'Rest Day', icon: Calendar },
        ];
    }
  };

  if (!localProfile?.trainingGoal || isEditing) {
    return (
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-2xl font-bold text-white">Setup Plan</h1>
        <form onSubmit={handleUpdateProfile} className="bg-surface p-4 rounded-xl border border-white/10 space-y-4">
          <h2 className="text-lg font-semibold text-white">Customize your Training</h2>
          <p className="text-sm text-secondary">Tell us about yourself to generate a weekly schedule.</p>

          <div>
            <label className="text-xs text-secondary">Age</label>
            <input value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} type="number" required className="w-full bg-background border border-white/10 rounded-md p-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-secondary">Weight (kg)</label>
            <input value={formData.weightKg} onChange={e => setFormData({ ...formData, weightKg: e.target.value })} type="number" required className="w-full bg-background border border-white/10 rounded-md p-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-secondary">Goal</label>
            <select value={formData.trainingGoal} onChange={e => setFormData({ ...formData, trainingGoal: e.target.value })} className="w-full bg-background border border-white/10 rounded-md p-2 text-white">
              <option value="General Fitness">General Fitness</option>
              <option value="Short Distance">Short Distance (5k/10k)</option>
              <option value="Long Distance">Long Distance (Half/Full)</option>
              <option value="Competitive">Competitive</option>
            </select>
          </div>

          <button type="submit" className="w-full bg-primary text-white py-2 rounded-md font-medium">
            {isEditing && localProfile?.trainingGoal ? 'Update Plan' : 'Generate Plan'}
          </button>
          {isEditing && localProfile?.trainingGoal && (
            <button type="button" onClick={() => setIsEditing(false)} className="w-full text-secondary text-sm pt-2 hover:text-white">Cancel</button>
          )}
        </form>
      </div>
    );
  }

  const plan = getPlan(localProfile.trainingGoal);

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Weekly Plan</h1>
        <button onClick={() => setIsEditing(true)} className="text-primary text-sm font-medium">Edit Goal</button>
      </div>

      <div className="bg-surface p-4 rounded-xl border border-white/5 space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <h2 className="font-bold text-lg text-white">{localProfile.trainingGoal}</h2>
          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Week 1</span>
        </div>
        <div className="space-y-3">
          {plan.map((day, i) => {
            const Icon = day.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <div className="text-xs font-bold text-white">{day.day}</div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white text-sm">{day.type}</h4>
                  <p className="text-xs text-secondary">{day.desc}</p>
                </div>
                <Icon size={16} className="text-secondary" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProfileView({ user, profile }) {
  const [myRuns, setMyRuns] = useState([]);
  const [showAddShoe, setShowAddShoe] = useState(false);
  const [newShoe, setNewShoe] = useState({ name: '', startDist: 0, targetDist: 800 });
  const [localProfile, setLocalProfile] = useState(profile);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    if (isMock) {
      setMyRuns(MOCK_DATA.runs.filter(r => r.userId === user.uid));
      return;
    }
    const q = query(collection(db, `artifacts/${appId}/public/data/runs`), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyRuns(snapshot.docs.map(d => d.data()));
    });
    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    const totalKm = myRuns.reduce((acc, run) => acc + (run.distanceKm || 0), 0);
    const longest = myRuns.reduce((max, run) => Math.max(max, run.distanceKm || 0), 0);
    return { totalKm: totalKm.toFixed(1), longest: longest.toFixed(1) };
  }, [myRuns]);

  const shoes = useMemo(() => {
    if (!localProfile?.shoeTracker) return [];
    return localProfile.shoeTracker.map(shoe => {
      const runDistHelper = myRuns.filter(r => r.shoeId === shoe.id).reduce((acc, r) => acc + (r.distanceKm || 0), 0);
      const total = (parseFloat(shoe.startMileage || 0) + runDistHelper).toFixed(1);
      const percent = Math.min(100, (total / (shoe.targetMileage || 800)) * 100);
      return { ...shoe, currentMileage: total, percent };
    });
  }, [localProfile, myRuns]);

  const handleAddShoe = async (e) => {
    e.preventDefault();
    if (!user) return;
    const shoeId = Date.now().toString();
    const shoeToAdd = {
      id: shoeId,
      name: newShoe.name,
      startMileage: parseFloat(newShoe.startDist),
      targetMileage: parseFloat(newShoe.targetDist)
    };

    if (isMock) {
      setLocalProfile(prev => ({ ...prev, shoeTracker: [...(prev?.shoeTracker || []), shoeToAdd] }));
      setShowAddShoe(false);
      setNewShoe({ name: '', startDist: 0, targetDist: 800 });
      return;
    }

    try {
      const ref = doc(db, `artifacts/${appId}/users/${user.uid}/profiles/${user.uid}`);
      await setDoc(ref, {
        shoeTracker: [...(profile?.shoeTracker || []), shoeToAdd]
      }, { merge: true });
      setShowAddShoe(false);
      setNewShoe({ name: '', startDist: 0, targetDist: 800 });
    } catch (err) {
      console.error(err);
      alert("Error adding shoe");
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border-2 border-primary">
          <User size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{localProfile?.username || user?.email?.split('@')[0] || 'Runner'}</h1>
          <p className="text-secondary text-sm">{localProfile?.trainingGoal || 'No Goal Set'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-white/5 text-center">
          <TrendingUp size={24} className="text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{stats.totalKm}</p>
          <p className="text-xs text-secondary uppercase">Total km</p>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-white/5 text-center">
          <Trophy size={24} className="text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{stats.longest}</p>
          <p className="text-xs text-secondary uppercase">Longest Run</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Shoe Tracker</h2>
          <button onClick={() => setShowAddShoe(!showAddShoe)} className="text-primary text-sm font-medium">
            {showAddShoe ? 'Cancel' : '+ Add Shoe'}
          </button>
        </div>

        {showAddShoe && (
          <form onSubmit={handleAddShoe} className="bg-surface p-4 rounded-xl border border-white/10 space-y-3">
            <input value={newShoe.name} onChange={e => setNewShoe({ ...newShoe, name: e.target.value })} placeholder="Shoe Name" required className="w-full bg-background border border-white/10 rounded-md p-2 text-white" />
            <div className="flex gap-2">
              <input type="number" value={newShoe.startDist} onChange={e => setNewShoe({ ...newShoe, startDist: e.target.value })} placeholder="Start km" className="flex-1 bg-background border border-white/10 rounded-md p-2 text-white" />
              <input type="number" value={newShoe.targetDist} onChange={e => setNewShoe({ ...newShoe, targetDist: e.target.value })} placeholder="Max km" className="flex-1 bg-background border border-white/10 rounded-md p-2 text-white" />
            </div>
            <button type="submit" className="w-full bg-primary text-white py-2 rounded-md font-medium">Add Shoe</button>
          </form>
        )}

        {shoes.length === 0 ? (
          <div className="text-center p-4 text-secondary text-sm bg-white/5 rounded-xl">
            No shoes tracked. Add a pair!
          </div>
        ) : (
          <div className="space-y-3">
            {shoes.map(shoe => (
              <div key={shoe.id} className="bg-surface p-4 rounded-xl border border-white/5">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-white">{shoe.name}</span>
                  <span className="text-sm text-secondary">{shoe.currentMileage} / {shoe.targetMileage} km</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-500", shoe.percent > 90 ? "bg-red-500" : "bg-primary")}
                    style={{ width: `${shoe.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.FEED);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (isMock) {
      setUser(MOCK_USER);
      setProfile(MOCK_DATA.profile);
      return;
    }
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isMock) {
      setProfile(MOCK_DATA.profile);
      return;
    }
    if (!user || !db) {
      setProfile(null);
      return;
    }
    const profileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profiles/${user.uid}`);
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        setProfile(null); // Profile doesn't exist yet
      }
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      <main className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-background border-x border-white/5">

        {isMock && (
          <div className="bg-orange-500/20 text-orange-400 text-xs p-1 text-center font-bold">
            TEST MODE: Using Local Mock Data
          </div>
        )}

        {activeTab === TABS.FEED && <FeedView user={user} profile={profile} />}
        {activeTab === TABS.GROUPS && <GroupsView user={user} profile={profile} />}
        {activeTab === TABS.PLAN && <PlanView user={user} profile={profile} />}
        {activeTab === TABS.PROFILE && <ProfileView user={user} profile={profile} />}

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </main>
    </div>
  );
}
