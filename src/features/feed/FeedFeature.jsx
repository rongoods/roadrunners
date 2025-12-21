import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, doc, setDoc } from 'firebase/firestore';
import { db, isMock } from '../../api/firebase';
import { MOCK_DATA } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

const appId = window.__app_id || 'demo-app';

export default function FeedFeature({ user, profile }) {
    const [runs, setRuns] = useState([]);
    const [showLogForm, setShowLogForm] = useState(false);
    const [newRun, setNewRun] = useState({ distance: '', duration: '', date: formatDate(new Date(), 'yyyy-MM-dd'), shoeId: '' });

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
            setNewRun({ distance: '', duration: '', date: formatDate(new Date(), 'yyyy-MM-dd'), shoeId: '' });
            return;
        }

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/runs`), runData);
            setShowLogForm(false);
            setNewRun({ distance: '', duration: '', date: formatDate(new Date(), 'yyyy-MM-dd'), shoeId: '' });
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
                    {showLogForm ? 'CANCEL' : 'LOG RUN +'}
                </button>
            </div>

            {showLogForm && (
                <form onSubmit={handleLogRun} className="mx-4 bg-black border-2 border-border-bright p-4 space-y-4">
                    <h3 className="font-bold text-lg uppercase border-b border-white/20 pb-2">New Entry</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase text-secondary mb-1 block">Distance (km)</label>
                            <input
                                type="number" step="0.01" required
                                value={newRun.distance}
                                onChange={e => setNewRun({ ...newRun, distance: e.target.value })}
                                className="w-full bg-black border-2 border-white/50 p-2 text-white focus:border-primary outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-secondary mb-1 block">Duration (min)</label>
                            <input
                                type="number" step="1" required
                                value={newRun.duration}
                                onChange={e => setNewRun({ ...newRun, duration: e.target.value })}
                                className="w-full bg-black border-2 border-white/50 p-2 text-white focus:border-primary outline-none font-mono"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs uppercase text-secondary mb-1 block">Date</label>
                        <input
                            type="date" required
                            value={newRun.date}
                            onChange={e => setNewRun({ ...newRun, date: e.target.value })}
                            className="w-full bg-black border-2 border-white/50 p-2 text-white focus:border-primary outline-none font-mono uppercase"
                        />
                    </div>
                    {profile?.shoeTracker?.length > 0 && (
                        <div>
                            <label className="text-xs uppercase text-secondary mb-1 block">Gear</label>
                            <select
                                value={newRun.shoeId}
                                onChange={e => setNewRun({ ...newRun, shoeId: e.target.value })}
                                className="w-full bg-black border-2 border-white/50 p-2 text-white focus:border-primary outline-none font-mono uppercase"
                            >
                                <option value="">NO SHOES SELECTED</option>
                                {/* eslint-disable-next-line react/prop-types */}
                                {profile.shoeTracker.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button type="submit" className="w-full bg-white text-black border-2 border-white py-3 font-black uppercase tracking-widest hover:bg-primary hover:border-primary transition-colors">
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
                    runs.map(run => (
                        <div key={run.id} className="group border-b-2 border-border-bright p-4 hover:bg-text hover:text-background transition-colors relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold">
                                        {run.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold uppercase tracking-tight text-lg leading-none">{run.username}</p>
                                        <p className="text-[10px] font-mono group-hover:text-black/70 opacity-70 uppercase">{formatDate(new Date(run.date), 'dd.MM.yyyy')}</p>
                                    </div>
                                </div>
                                {run.shoeName && (
                                    <span className="text-[10px] uppercase border border-current px-2 py-0.5 font-mono">
                                        {run.shoeName}
                                    </span>
                                )}
                            </div>

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
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
