import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, doc, setDoc } from 'firebase/firestore';
import { db, isMock } from '../../api/firebase';
import { MOCK_DATA } from '../../utils/constants';
import { cn } from '../../utils/cn';

const appId = window.__app_id || 'demo-app';

export default function GroupsFeature({ user, profile }) {
    const [groups, setGroups] = useState([]);
    const [subTab, setSubTab] = useState('GROUPS'); // 'GROUPS' or 'CHALLENGES'
    const [activeGroup, setActiveGroup] = useState(null);
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [challenges, setChallenges] = useState([]); // User's joined challenges
    const [challengeLeaderboard, setChallengeLeaderboard] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupData, setNewGroupData] = useState({
        groupName: '',
        raceLength: '5k',
        pace: '',
        longRunDay: 'Saturday',
        runTerrain: 'Road',
        raceTerrain: 'Road',
        shoeBrand: '',
        startTime: '',
        sportType: 'RUNNING', // Default for groups
        workoutCategory: '' // Optional category for WORKOUT type
    });

    const CHALLENGES_DATA = [
        { id: '5k', title: '5K', dist: 5.0 },
        { id: '10k', title: '10K', dist: 10.0 },
        { id: '15k', title: '15K', dist: 15.0 },
        { id: '25k', title: '25K', dist: 25.0 },
        { id: '50k', title: '50K', dist: 50.0 },
        { id: '75k', title: '75K', dist: 75.0 },
        { id: '100k', title: '100K', dist: 100.0 },
        { id: 'half-marathon', title: 'HALF MARATHON', dist: 21.1 },
        { id: 'marathon', title: 'MARATHON', dist: 42.2 },
    ];

    // Filter States
    const [filters, setFilters] = useState({
        raceLength: '',
        runTerrain: '',
        longRunDay: '',
        shoeBrand: '',
        timeOfDay: '' // 'morning', 'afternoon', 'evening'
    });
    const [showFilters, setShowFilters] = useState(false);

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

    // Challenge Sync
    useEffect(() => {
        if (!user || isMock) return;
        const unsubscribe = onSnapshot(collection(db, `artifacts/${appId}/public/data/challenges`), (snapshot) => {
            const allChallenges = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setChallenges(allChallenges.filter(c => c.participants?.includes(user.uid)));
        });
        return () => unsubscribe();
    }, [user]);

    // Challenge Leaderboard Generation
    useEffect(() => {
        if (!activeChallenge || isMock) return;

        // Fetch all participants
        const participants = activeChallenge.participants || [];
        if (participants.length === 0) {
            setChallengeLeaderboard([]);
            return;
        }

        // Fetch runs for these participants
        const unsubscribe = onSnapshot(collection(db, `artifacts/${appId}/public/data/runs`), (snapshot) => {
            const allRuns = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const threshold = activeChallenge.dist || 0;

            const board = participants.map(pId => {
                const userRuns = allRuns.filter(r => r.userId === pId && r.distanceKm >= threshold);
                if (userRuns.length === 0) return null;

                // Find best pace (lowest min/km)
                const bestRun = userRuns.sort((a, b) => a.paceMinPerKm - b.paceMinPerKm)[0];
                return {
                    userId: pId,
                    username: bestRun.username,
                    pace: bestRun.paceMinPerKm,
                    dist: bestRun.distanceKm
                };
            }).filter(Boolean).sort((a, b) => a.pace - b.pace);

            setChallengeLeaderboard(board);
        });

        return () => unsubscribe();
    }, [activeChallenge]);

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
        if (!user || !newGroupData.groupName.trim()) return;

        const groupPayload = {
            ...newGroupData,
            members: [user.uid],
            leaderboard: []
        };

        if (isMock) {
            const newGroup = {
                id: Date.now().toString(),
                ...groupPayload
            };
            setGroups(prev => [...prev, newGroup]);
            setShowCreateGroup(false);
            setNewGroupData({ groupName: '', raceLength: '5k', pace: '', longRunDay: 'Saturday', runTerrain: 'Road', raceTerrain: 'Road', shoeBrand: '', startTime: '' });
            return;
        }

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/groups`), groupPayload);
            setShowCreateGroup(false);
            setNewGroupData({ groupName: '', raceLength: '5k', pace: '', longRunDay: 'Saturday', runTerrain: 'Road', raceTerrain: 'Road', shoeBrand: '', startTime: '' });
        } catch (err) {
            console.error(err);
            alert("Error creating group");
        }
    };

    // Filter Logic
    const filteredGroups = groups.filter(g => {
        if (filters.raceLength && g.raceLength !== filters.raceLength) return false;
        if (filters.runTerrain && g.runTerrain !== filters.runTerrain) return false;
        if (filters.longRunDay && g.longRunDay !== filters.longRunDay) return false;
        if (filters.shoeBrand && g.shoeBrand && !g.shoeBrand.toLowerCase().includes(filters.shoeBrand.toLowerCase())) return false;

        if (filters.timeOfDay && g.startTime) {
            const hour = parseInt(g.startTime.split(':')[0], 10);
            if (isNaN(hour)) return true; // Keep if invalid time
            if (filters.timeOfDay === 'morning' && hour >= 12) return false; // Morning: < 12:00
            if (filters.timeOfDay === 'afternoon' && (hour < 12 || hour >= 17)) return false; // Afternoon: 12:00-16:59
            if (filters.timeOfDay === 'evening' && hour < 17) return false; // Evening: 17:00+
        }

        if (profile?.sportFocus && profile.sportFocus !== 'MIXED') {
            if (profile.sportFocus === 'RUNNING' && g.sportType === 'HYROX') return false;
            if (profile.sportFocus === 'HYROX' && g.sportType === 'RUNNING') return false;
        }

        return true;
    });

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

    const handleJoinChallenge = async (challengeConfig) => {
        if (!user || isMock) return;
        try {
            const challengeDocRef = doc(db, `artifacts/${appId}/public/data/challenges`, challengeConfig.id);
            const current = challenges.find(c => c.id === challengeConfig.id);
            const participants = current ? [...new Set([...current.participants, user.uid])] : [user.uid];

            await setDoc(challengeDocRef, {
                ...challengeConfig,
                participants
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleLeaveChallenge = async (challengeId) => {
        if (!user || isMock) return;
        try {
            const challengeDocRef = doc(db, `artifacts/${appId}/public/data/challenges`, challengeId);
            const current = challenges.find(c => c.id === challengeId);
            if (!current) return;

            await setDoc(challengeDocRef, {
                ...current,
                participants: current.participants.filter(p => p !== user.uid)
            });
        } catch (err) {
            console.error(err);
        }
    };

    if (activeGroup) {
        return (
            <div className="flex flex-col h-[calc(100vh-80px)]">
                {/* Active Group Header */}
                <div className="p-4 border-b-2 border-border-bright flex items-center gap-4 bg-background sticky top-0 z-10">
                    <button onClick={() => setActiveGroup(null)} className="text-sm font-bold uppercase bg-text text-background px-2 py-1 border-2 border-text hover:bg-background hover:text-text transition-colors">
                        [← BACK TO INDEX]
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{activeGroup.groupName}</h2>
                        <p className="text-[10px] font-mono uppercase">{activeGroup.members?.length || 0} MEMBERS // ONLINE</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-0 space-y-0">
                    {/* Leaderboard Section */}
                    <div className="bg-background border-b-2 border-border-bright p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-border-bright pb-1">
                            Weekly Leaderboard
                        </h3>
                        <div className="border border-border-bright">
                            {activeGroup.leaderboard && activeGroup.leaderboard.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border-bright bg-white/5">
                                            <th className="p-2 text-[10px] uppercase font-mono">Rank</th>
                                            <th className="p-2 text-[10px] uppercase font-mono">Runner</th>
                                            <th className="p-2 text-[10px] uppercase font-mono text-right">DIST (KM)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeGroup.leaderboard.map((entry, i) => (
                                            <tr key={i} className="border-b border-white/10 hover:bg-white/5 font-mono text-xs">
                                                <td className="p-2">{i + 1}</td>
                                                <td className="p-2 font-bold">{entry.username}</td>
                                                <td className="p-2 text-right">{entry.distance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="p-4 text-xs font-mono uppercase text-secondary">No data available.</p>
                            )}
                        </div>
                    </div>

                    {/* Chat Section */}
                    <div className="p-4 space-y-2 pb-20">
                        <div className="text-[10px] text-secondary uppercase font-mono mb-4 text-center">--- BEGIN TRANSMISSION ---</div>
                        {messages.map(msg => (
                            <div key={msg.id} className={cn("flex flex-col mb-2", msg.userId === user?.uid ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "max-w-[85%] border px-3 py-2 text-sm",
                                    msg.userId === user?.uid
                                        ? "bg-primary text-black border-primary font-bold"
                                        : "bg-background text-text border-border-bright"
                                )}>
                                    {msg.userId !== user?.uid && <p className="text-[9px] uppercase font-mono mb-1 opacity-70 underline">{msg.username}</p>}
                                    <p className="font-mono leading-tight">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSendMessage} className="p-2 border-t-2 border-border-bright bg-background flex gap-2 fixed bottom-14 left-0 right-0 max-w-lg mx-auto z-20">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="ENTER TRANSMISSION..."
                        className="flex-1 bg-background border border-border-bright px-4 py-3 text-sm focus:border-primary outline-none text-text font-mono uppercase"
                    />
                    <button type="submit" className="bg-text px-4 py-2 text-background font-bold uppercase border-2 border-text hover:bg-background hover:text-text transition-colors text-xs">
                        SEND TRANSMISSION
                    </button>
                </form>
            </div>
        );
    }

    if (activeChallenge) {
        return (
            <div className="flex flex-col h-[calc(100vh-80px)]">
                <div className="p-4 border-b-2 border-border-bright flex items-center gap-4 bg-background sticky top-0 z-10">
                    <button onClick={() => setActiveChallenge(null)} className="text-sm font-bold uppercase bg-text text-background px-2 py-1 border-2 border-text hover:bg-background hover:text-text transition-colors">
                        [← BACK TO CHALLENGES]
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{activeChallenge.title} CHALLENGE</h2>
                        <p className="text-[10px] font-mono uppercase">{activeChallenge.participants?.length || 0} PARTICIPANTS</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-border-bright pb-1 flex justify-between">
                        <span>All-Time Leaderboard</span>
                        <span className="text-primary text-[10px]">Min. Dist: {activeChallenge.dist}KM</span>
                    </h3>
                    <div className="border border-border-bright bg-white/5">
                        {challengeLeaderboard.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border-bright bg-black/20 font-mono text-[10px] uppercase">
                                        <th className="p-2">Rank</th>
                                        <th className="p-2">Athlete</th>
                                        <th className="p-2 text-right">Best Pace</th>
                                        <th className="p-2 text-right">Dist (KM)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {challengeLeaderboard.map((entry, idx) => (
                                        <tr key={idx} className={cn("border-b border-white/5 hover:bg-white/10 transition-colors", entry.userId === user?.uid && "bg-primary/20")}>
                                            <td className="p-2 font-mono text-sm">{idx + 1}</td>
                                            <td className="p-2 font-bold text-sm uppercase">{entry.username}</td>
                                            <td className="p-2 text-right font-mono text-sm">{entry.pace} MIN/KM</td>
                                            <td className="p-2 text-right font-mono text-sm">{entry.dist}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center opacity-50 font-mono uppercase text-xs">
                                No qualifying entries found for this distance.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-0 pb-24">
            <div className="flex justify-between items-end px-4 border-b-2 border-border-bright pb-4">
                <div className="flex flex-col">
                    <div className="flex gap-2 mb-2">
                        <button
                            onClick={() => setSubTab('GROUPS')}
                            className={cn("text-[10px] font-black uppercase px-2 py-0.5 border transition-colors", subTab === 'GROUPS' ? "bg-primary text-black border-primary" : "bg-background text-text border-border-bright hover:bg-white/5")}
                        >
                            GROUPS
                        </button>
                        <button
                            onClick={() => setSubTab('CHALLENGES')}
                            className={cn("text-[10px] font-black uppercase px-2 py-0.5 border transition-colors", subTab === 'CHALLENGES' ? "bg-primary text-black border-primary" : "bg-background text-text border-border-bright hover:bg-white/5")}
                        >
                            CHALLENGES
                        </button>
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter leading-none transform -translate-x-0.5">
                        {subTab === 'GROUPS' ? 'Groups' : 'Challenges'}<br />Index
                    </h1>
                </div>
                {subTab === 'GROUPS' && (
                    <button
                        onClick={() => setShowCreateGroup(!showCreateGroup)}
                        className="bg-text text-background text-sm font-bold px-4 py-2 uppercase border-2 border-text hover:bg-background hover:text-text transition-colors"
                    >
                        {showCreateGroup ? 'ABORT' : 'CREATE +'}
                    </button>
                )}
            </div>

            {subTab === 'GROUPS' ? (
                <>
                    {/* Filter Bar */}
                    <div className="px-4 flex flex-wrap gap-2 mt-4">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn("text-xs font-bold uppercase px-3 py-1 border-2 transition-colors", showFilters ? "bg-primary text-black border-primary" : "bg-text text-background border-text hover:bg-background hover:text-text")}
                        >
                            {showFilters ? '[-] HIDE FILTERS' : '[+] FILTERS'}
                        </button>
                        {Object.values(filters).some(Boolean) && (
                            <button onClick={() => setFilters({ raceLength: '', runTerrain: '', longRunDay: '', shoeBrand: '', timeOfDay: '' })} className="text-xs font-mono uppercase text-red-500 border border-red-500 px-2 hover:bg-red-500 hover:text-black">
                                RESET ALL
                            </button>
                        )}
                    </div>

                    {showFilters && (
                        <div className="mx-4 p-4 border-2 border-border-bright space-y-3 bg-background mt-4">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: 'raceLength', options: ['5k', '10k', 'Half Marathon', 'Marathon', 'Ultra'], label: 'DISTANCE' },
                                    { key: 'runTerrain', options: ['Road', 'Trail', 'Track', 'Mixed'], label: 'TERRAIN' },
                                    { key: 'longRunDay', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], label: 'DAY' },
                                    { key: 'timeOfDay', options: ['morning', 'afternoon', 'evening'], label: 'TIME' }
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="text-[10px] uppercase text-secondary block mb-1">{f.label}</label>
                                        <select
                                            value={filters[f.key]} onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                                            className="w-full"
                                        >
                                            <option value="">ANY</option>
                                            {f.options.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                ))}
                                <div className="col-span-2">
                                    <label className="text-[10px] uppercase text-secondary block mb-1">BRAND</label>
                                    <input
                                        placeholder="SEARCH BRAND..."
                                        value={filters.shoeBrand} onChange={e => setFilters({ ...filters, shoeBrand: e.target.value })}
                                        className="w-full bg-background border border-border-bright p-2 text-xs text-text outline-none font-mono uppercase placeholder:text-secondary focus:border-primary"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {showCreateGroup && (
                        <form onSubmit={handleCreateGroup} className="mx-4 p-4 border-2 border-primary space-y-4 bg-background relative mt-4">
                            <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-bold px-1 uppercase">New Group</div>
                            <div>
                                <label className="text-[10px] uppercase text-secondary block mb-1">GROUP DESIGNATION</label>
                                <input
                                    value={newGroupData.groupName}
                                    onChange={e => setNewGroupData({ ...newGroupData, groupName: e.target.value })}
                                    className="w-full bg-background border-2 border-border-bright p-2 text-text focus:border-primary outline-none font-bold uppercase"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase text-secondary block mb-1">Target Dist</label>
                                    <select
                                        value={newGroupData.raceLength} onChange={e => setNewGroupData({ ...newGroupData, raceLength: e.target.value })}
                                        className="w-full"
                                    >
                                        {['5k', '10k', 'Half Marathon', 'Marathon', 'Ultra'].map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-secondary block mb-1">Typical Pace</label>
                                    <input
                                        value={newGroupData.pace}
                                        onChange={e => setNewGroupData({ ...newGroupData, pace: e.target.value })}
                                        className="w-full bg-background border border-border-bright p-2 text-xs text-text font-mono uppercase"
                                        placeholder="MIN/KM"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] uppercase text-secondary block mb-1">Sport Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['RUNNING', 'HYROX', 'WORKOUT'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setNewGroupData({ ...newGroupData, sportType: type })}
                                                className={cn(
                                                    "flex-1 min-w-[30%] py-2 text-[10px] font-bold uppercase border-2 transition-colors",
                                                    newGroupData.sportType === type
                                                        ? "bg-primary text-black border-primary"
                                                        : "bg-background text-text border-border-bright hover:bg-white/5"
                                                )}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {newGroupData.sportType === 'WORKOUT' && (
                                    <div className="col-span-2">
                                        <label className="text-[10px] uppercase text-secondary block mb-1">Workout Category</label>
                                        <select
                                            value={newGroupData.workoutCategory}
                                            onChange={e => setNewGroupData({ ...newGroupData, workoutCategory: e.target.value })}
                                            className="w-full"
                                            required
                                        >
                                            <option value="">SELECT SPECIALIZATION...</option>
                                            <option value="GENERAL">GENERAL</option>
                                            <option value="FREE WEIGHTS">FREE WEIGHTS</option>
                                            <option value="KETTLEBELLS">KETTLEBELLS</option>
                                            <option value="BARS">BARS</option>
                                            <option value="CORE">CORE</option>
                                            <option value="UPPER BODY">UPPER BODY</option>
                                            <option value="LOWER BODY">LOWER BODY</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            <button type="submit" className="w-full bg-text text-background border-2 border-text py-2 font-black uppercase hover:bg-background hover:text-text transition-colors">
                                INITIALIZE GROUP
                            </button>
                        </form>
                    )}

                    <div className="grid grid-cols-1 gap-0 border-t-2 border-border-bright mt-8">
                        {filteredGroups.length === 0 ? (
                            <div className="p-8 text-center border-b-2 border-border-bright">
                                <p className="font-mono text-sm uppercase">NO RECORDS FOUND.</p>
                            </div>
                        ) : (
                            filteredGroups.map(group => (
                                <div
                                    key={group.id}
                                    onClick={() => setActiveGroup(group)}
                                    className="group border-b-2 border-border-bright p-4 hover:bg-text hover:text-background transition-colors cursor-pointer relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-black text-xl uppercase tracking-tight">{group.groupName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] font-mono border border-current inline-block px-1">
                                                    ID: {group.id} // MEM: {group.members?.length || 0}
                                                </p>
                                                {group.sportType && (
                                                    <span className={cn(
                                                        "text-[8px] font-bold px-1 uppercase",
                                                        group.sportType === 'HYROX' ? "bg-secondary text-background" :
                                                            group.sportType === 'WORKOUT' ? "bg-text text-background" : "bg-primary text-black"
                                                    )}>
                                                        {group.sportType} {group.workoutCategory && `// ${group.workoutCategory}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs uppercase bg-black text-white px-2 py-1">
                                            ACCESS &rarr;
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-[9px] font-mono uppercase mt-2 opacity-70 group-hover:opacity-100">
                                        {group.raceLength && <span>[{group.raceLength}]</span>}
                                        {group.pace && <span>[PACING: {group.pace}]</span>}
                                        {group.runTerrain && <span>[{group.runTerrain}]</span>}
                                        {group.startTime && <span>[@{group.startTime}]</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 divide-y-2 divide-border-bright border-t-2 border-border-bright mt-8">
                    {CHALLENGES_DATA.map(challengeConfig => {
                        const challengeData = challenges.find(c => c.id === challengeConfig.id);
                        const isJoined = !!challengeData;

                        return (
                            <div key={challengeConfig.id} className="p-4 flex justify-between items-center group hover:bg-white/5 transition-colors">
                                <div>
                                    <h3 className="font-black text-2xl uppercase tracking-tighter leading-tight italic group-hover:text-primary transition-colors">
                                        {challengeConfig.title}
                                    </h3>
                                    <p className="text-[10px] font-mono uppercase opacity-50">
                                        {challengeData?.participants?.length || 0} ATHLETES COMPETING // MIN DIST: {challengeConfig.dist}KM
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => isJoined ? handleLeaveChallenge(challengeConfig.id) : handleJoinChallenge(challengeConfig)}
                                        className={cn(
                                            "text-[10px] font-bold px-3 py-2 border-2 uppercase transition-all",
                                            isJoined ? "border-red-500 text-red-500 hover:bg-red-500 hover:text-black" : "border-primary text-primary hover:bg-primary hover:text-black"
                                        )}
                                    >
                                        {isJoined ? 'QUIT' : 'JOIN'}
                                    </button>
                                    <button
                                        onClick={() => setActiveChallenge(challengeData || { ...challengeConfig, participants: [] })}
                                        className="text-[10px] font-bold px-3 py-2 bg-text text-background border-2 border-text hover:bg-background hover:text-text transition-colors uppercase"
                                    >
                                        BOARD &rarr;
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
