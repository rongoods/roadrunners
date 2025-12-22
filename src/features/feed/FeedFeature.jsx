import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, doc, setDoc } from 'firebase/firestore';
import { db, isMock } from '../../api/firebase';
import { MOCK_DATA } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import RunMap from './RunMap';

const appId = window.__app_id || 'demo-app';

export default function FeedFeature({ user, profile, onViewProfile }) {
    const [runs, setRuns] = useState([]);
    const [showLogForm, setShowLogForm] = useState(false);
    const [newRun, setNewRun] = useState({
        distance: '',
        duration: '',
        date: formatDate(new Date(), 'yyyy-MM-dd'),
        shoeId: '',
        route: [],
        activityType: 'RUN', // Default to RUN
        workoutDescription: ''
    });
    const [showTraceMap, setShowTraceMap] = useState(false);
    const [activeFilter, setActiveFilter] = useState(profile?.sportFocus || 'MIXED');

    useEffect(() => {
        if (profile?.sportFocus) {
            setActiveFilter(profile.sportFocus);
        }
    }, [profile?.sportFocus]);


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

        const isHybridType = newRun.activityType === 'WORKOUT' || newRun.activityType === 'HYROX';

        // Validation: Need at least a description or distance/duration for hybrid types
        if (isHybridType && !newRun.workoutDescription.trim() && !dist) {
            return alert("Please enter session details or stats.");
        }
        if (!isHybridType && (!dist || !dur)) {
            return alert("Please enter distance and duration.");
        }

        const pace = (dist && dur) ? (dur / dist).toFixed(2) : 0;

        const runData = {
            userId: user.uid,
            username: profile?.username || user.email?.split('@')[0] || 'Runner',
            distanceKm: dist || 0,
            durationMinutes: dur || 0,
            paceMinPerKm: parseFloat(pace),
            date: newRun.date,
            shoeId: newRun.shoeId || null,
            shoeName: profile?.shoeTracker?.find(s => s.id === newRun.shoeId)?.name || null,
            route: newRun.route || [],
            activityType: newRun.activityType,
            workoutDescription: newRun.workoutDescription || null,
            kudosCount: 0,
            timestamp: new Date()
        };

        if (isMock) {
            setRuns(prev => [{ id: Date.now().toString(), ...runData }, ...prev]);
            setShowLogForm(false);
            setShowTraceMap(false);
            setNewRun({ distance: '', duration: '', date: formatDate(new Date(), 'yyyy-MM-dd'), shoeId: '', route: [], activityType: 'RUN', workoutDescription: '' });
            return;
        }

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/runs`), runData);
            setShowLogForm(false);
            setShowTraceMap(false);
            setNewRun({ distance: '', duration: '', date: formatDate(new Date(), 'yyyy-MM-dd'), shoeId: '', route: [], activityType: 'RUN', workoutDescription: '' });
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
        <div className="p-0 space-y-8 pb-24">
            {/* Header Action */}
            <div className="flex justify-between items-end px-4 border-b-2 border-border-bright pb-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none transform -translate-x-0.5">
                    Activity<br />Feed
                </h1>
                <button
                    onClick={() => setShowLogForm(!showLogForm)}
                    className="bg-primary hover:bg-white text-black text-sm font-bold px-4 py-2 uppercase border-2 border-transparent hover:border-black transition-colors"
                >
                    {showLogForm ? 'CANCEL' : 'LOG ACTIVITY +'}
                </button>
            </div>

            {/* Filter Menu */}
            <div className="flex border-y-2 border-border-bright bg-background sticky top-8 z-30 overflow-x-auto no-scrollbar">
                {['RUNNING', 'HYROX', 'WORKOUT', 'MIXED'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={cn(
                            "flex-1 min-w-[100px] py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-r-2 last:border-r-0 border-border-bright",
                            activeFilter === filter
                                ? "bg-primary text-black"
                                : "hover:bg-white/5 text-secondary"
                        )}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {showLogForm && (
                <form onSubmit={handleLogRun} className="mx-4 bg-background border-2 border-border-bright p-4 space-y-4">
                    <h3 className="font-bold text-lg uppercase border-b border-border-bright pb-2">New Entry</h3>
                    {(newRun.activityType === 'WORKOUT' || newRun.activityType === 'HYROX') && (
                        <div className="border-2 border-primary p-3 bg-primary/5">
                            <label className="text-[10px] font-black uppercase text-primary mb-2 block tracking-widest">
                                {newRun.activityType === 'HYROX' ? 'HYROX STATIONS / DETAILS' : 'Workout Details / Manifest'}
                            </label>
                            <textarea
                                value={newRun.workoutDescription}
                                onChange={e => setNewRun({ ...newRun, workoutDescription: e.target.value })}
                                placeholder={newRun.activityType === 'HYROX' ? "E.G. 1000M ROW, 80M BURPEES, 100M LUNGES..." : "E.G. 5X5 BACK SQUATS, CORE CIRCUIT, KETTLEBELL FLOW..."}
                                className="w-full bg-background border border-primary p-2 text-xs text-text focus:border-white outline-none font-mono uppercase min-h-[80px]"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-secondary mb-1 block">
                                {(newRun.activityType === 'WORKOUT' || newRun.activityType === 'HYROX') ? 'Run / Interval (KM)' : 'Distance (KM)'}
                            </label>
                            <input
                                type="number" step="0.01"
                                value={newRun.distance}
                                onChange={e => setNewRun({ ...newRun, distance: e.target.value })}
                                className="w-full bg-background border-2 border-border-bright p-2 text-text focus:border-primary outline-none font-mono"
                                placeholder="OPTIONAL"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-secondary mb-1 block">
                                {(newRun.activityType === 'WORKOUT' || newRun.activityType === 'HYROX') ? 'Total Time (MIN)' : 'Duration (MIN)'}
                            </label>
                            <input
                                type="number" step="1"
                                value={newRun.duration}
                                onChange={e => setNewRun({ ...newRun, duration: e.target.value })}
                                className="w-full bg-background border-2 border-border-bright p-2 text-text focus:border-primary outline-none font-mono"
                                placeholder="OPTIONAL"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs uppercase text-secondary mb-1 block">Date</label>
                        <input
                            type="date" required
                            value={newRun.date}
                            onChange={e => setNewRun({ ...newRun, date: e.target.value })}
                            className="w-full bg-background border-2 border-border-bright p-2 text-text focus:border-primary outline-none font-mono uppercase"
                        />
                    </div>
                    {profile?.shoeTracker?.length > 0 && (
                        <div>
                            <label className="text-xs uppercase text-secondary mb-1 block">Gear</label>
                            <select
                                value={newRun.shoeId}
                                onChange={e => setNewRun({ ...newRun, shoeId: e.target.value })}
                                className="w-full"
                            >
                                <option value="">NO SHOES SELECTED</option>
                                {/* eslint-disable-next-line react/prop-types */}
                                {profile.shoeTracker.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-xs uppercase text-secondary mb-1 block">Activity Type</label>
                        <div className="flex gap-2">
                            {['RUN', 'HYROX', 'WORKOUT'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setNewRun({ ...newRun, activityType: type })}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold uppercase border-2 transition-colors",
                                        newRun.activityType === type
                                            ? "bg-primary text-black border-primary"
                                            : "bg-background text-text border-border-bright hover:bg-white/5"
                                    )}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => setShowTraceMap(!showTraceMap)}
                            className={cn(
                                "w-full text-xs font-bold uppercase py-2 border-2 transition-colors",
                                showTraceMap ? "bg-primary text-black border-primary" : "bg-background text-text border-border-bright hover:bg-white/5"
                            )}
                        >
                            {showTraceMap ? '[-] HIDE MAP' : '[+] TRACE ROUTE'}
                        </button>

                        {showTraceMap && (
                            <RunMap
                                route={newRun.route}
                                isInteractive={true}
                                onRouteUpdate={(route) => setNewRun({ ...newRun, route })}
                                height="250px"
                            />
                        )}
                    </div>

                    <button type="submit" className="w-full bg-text text-background border-2 border-text py-3 font-black uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary transition-colors">
                        CONFIRM ENTRY
                    </button>
                </form>
            )}

            <div className="space-y-0 border-t-2 border-border-bright">
                {runs.length === 0 ? (
                    <div className="p-8 text-center border-b-2 border-border-bright">
                        <p className="font-mono text-sm">NO SIGNAL DETECTED.</p>
                    </div>
                ) : (
                    runs
                        .filter(run => {
                            if (activeFilter === 'MIXED') return true;
                            if (activeFilter === 'RUNNING') return run.activityType === 'RUN';
                            if (activeFilter === 'HYROX') return run.activityType === 'HYROX';
                            if (activeFilter === 'WORKOUT') return run.activityType === 'WORKOUT';
                            return true;
                        })
                        .map(run => (
                            <div key={run.id} className="group border-b-2 border-border-bright p-4 hover:bg-text hover:text-background transition-colors relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div
                                        className="flex items-center gap-3 cursor-pointer"
                                        onClick={() => onViewProfile(run.userId)}
                                    >
                                        <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold group-hover:bg-primary group-hover:text-black">
                                            {run.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold uppercase tracking-tight text-lg leading-none group-hover:underline underline-offset-4">{run.username}</p>
                                            <p className="text-[10px] font-mono group-hover:text-background/70 opacity-70 uppercase">{formatDate(new Date(run.date), 'dd.MM.yyyy')}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {run.activityType && (
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 uppercase",
                                                run.activityType === 'HYROX' ? "bg-secondary text-background" : "bg-primary text-black"
                                            )}>
                                                {run.activityType}
                                            </span>
                                        )}
                                        {run.shoeName && (
                                            <span className="text-[10px] uppercase border border-current px-2 py-0.5 font-mono">
                                                {run.shoeName}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {run.workoutDescription && (
                                    <div className="mb-4 p-3 bg-white/5 border-l-4 border-primary font-mono text-sm uppercase tracking-tight leading-relaxed">
                                        {run.workoutDescription}
                                    </div>
                                )}

                                {(run.distanceKm > 0 || run.durationMinutes > 0) && (
                                    <div className="grid grid-cols-3 gap-0 border-2 border-current mb-4">
                                        <div className="p-2 border-r-2 border-current text-center">
                                            <p className="text-2xl font-mono font-bold leading-none">{run.distanceKm}</p>
                                            <p className="text-[9px] uppercase tracking-widest opacity-80">KM</p>
                                        </div>
                                        <div className="p-2 border-r-2 border-current text-center">
                                            <p className="text-2xl font-mono font-bold leading-none">{run.paceMinPerKm}</p>
                                            <p className="text-[9px] uppercase tracking-widest opacity-80">MIN/KM</p>
                                        </div>
                                        <div className="p-2 text-center">
                                            <p className="text-2xl font-mono font-bold leading-none">{run.durationMinutes}</p>
                                            <p className="text-[9px] uppercase tracking-widest opacity-80">MIN</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center px-1">
                                    <div className="text-[10px] font-mono opacity-50 uppercase">
                                        ID: {run.id.substring(0, 6)}
                                    </div>
                                    <button
                                        onClick={() => giveKudos(run)}
                                        className="font-bold uppercase text-xs tracking-wider hover:underline decoration-2 underline-offset-4"
                                    >
                                        [ KUDOS : {run.kudosCount || 0} ]
                                    </button>
                                </div>

                                {run.route && run.route.length > 0 && (
                                    <div className="mt-4">
                                        <RunMap
                                            route={run.route}
                                            isInteractive={false}
                                            height="150px"
                                            className="opacity-80 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all cursor-crosshair"
                                        />
                                        <p className="text-[8px] font-mono uppercase opacity-50 mt-1">Satellite Visualization: Trail Vector Protocol</p>
                                    </div>
                                )}
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
