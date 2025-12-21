import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, isMock } from '../../api/firebase';
import { MOCK_DATA } from '../../utils/constants';
import { cn } from '../../utils/cn';

const appId = window.__app_id || 'demo-app';

export default function ProfileFeature({ user, profile, onLogin, onLogout }) {
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
        <div className="p-0 space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-end justify-between px-4 border-b-2 border-border-bright pb-4">
                <div className="flex-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter leading-none transform -translate-x-0.5">
                        Runner<br />Manifest
                    </h1>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <div>
                        <div className="text-[10px] uppercase font-mono text-secondary mb-1">DESIGNATION</div>
                        <div className="text-sm font-bold uppercase border border-white px-2 py-1 bg-white text-black">
                            {localProfile?.username || user?.email?.split('@')[0] || 'GUEST'}
                        </div>
                    </div>
                    {user ? (
                        <button onClick={onLogout} className="text-[10px] text-primary hover:bg-primary hover:text-black border border-primary px-2 py-0.5 uppercase font-bold transition-colors">
                            Logout
                        </button>
                    ) : (
                        <button onClick={onLogin} className="text-[10px] text-primary hover:bg-primary hover:text-black border border-primary px-2 py-0.5 uppercase font-bold transition-colors">
                            Login w/ Google
                        </button>
                    )}
                </div>
            </div>

            {/* Music Section */}
            <div className="mx-4 border-2 border-border-bright p-4 flex flex-col gap-2 relative bg-background">
                <div className="absolute top-0 right-0 bg-text text-background text-[10px] font-bold px-1 uppercase">Audio Protocol</div>
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Current Anthem</h3>
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-primary animate-pulse w-full"></div>
                </div>
                <p className="text-lg font-mono text-text truncate uppercase border-b border-border-bright pb-1">
                    {localProfile?.musicAnthem || "SILENCE"}
                </p>
                <button
                    onClick={() => {
                        const newAnthem = prompt("Enter your running anthem (Song or Playlist URL):", localProfile?.musicAnthem || "");
                        if (newAnthem !== null) {
                            if (isMock) {
                                setLocalProfile(prev => ({ ...prev, musicAnthem: newAnthem }));
                            } else if (user) {
                                const ref = doc(db, `artifacts/${appId}/users/${user.uid}/profiles/${user.uid}`);
                                setDoc(ref, { musicAnthem: newAnthem }, { merge: true });
                                setLocalProfile(prev => ({ ...prev, musicAnthem: newAnthem }));
                            }
                        }
                    }}
                    className="text-[10px] uppercase font-mono text-primary text-left hover:underline"
                >
                    [ UPDATE AUDIO LINK ]
                </button>
            </div>

            <div className="grid grid-cols-2 gap-0 border-y-2 border-border-bright mx-4">
                <div className="p-4 border-r-2 border-border-bright text-center hover:bg-text hover:text-background transition-colors">
                    <p className="text-3xl font-black font-mono leading-none mb-1">{stats.totalKm}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest">TOTAL ACCUMULATION (KM)</p>
                </div>
                <div className="p-4 text-center hover:bg-text hover:text-background transition-colors">
                    <p className="text-3xl font-black font-mono leading-none mb-1">{stats.longest}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest">MAX SINGLE SESSION (KM)</p>
                </div>
            </div>

            <div className="space-y-4 px-4">
                <div className="flex justify-between items-center border-b border-border-bright pb-2">
                    <h2 className="text-xl font-bold uppercase tracking-tight">Equipment Tracking</h2>
                    <button onClick={() => setShowAddShoe(!showAddShoe)} className="text-primary text-[10px] uppercase font-bold border border-primary px-2 py-1 hover:bg-primary hover:text-black transition-colors">
                        {showAddShoe ? 'ABORT' : 'REGISTER GEAR +'}
                    </button>
                </div>

                {showAddShoe && (
                    <form onSubmit={handleAddShoe} className="border-2 border-border-bright p-4 space-y-3 bg-white/5">
                        <input value={newShoe.name} onChange={e => setNewShoe({ ...newShoe, name: e.target.value })} placeholder="MODEL DESIGNATION" required className="w-full bg-black border border-white/50 p-2 text-white outline-none font-mono uppercase text-xs" />
                        <div className="flex gap-2">
                            <input type="number" value={newShoe.startDist} onChange={e => setNewShoe({ ...newShoe, startDist: e.target.value })} placeholder="INIT" className="flex-1 bg-black border border-white/50 p-2 text-white outline-none font-mono uppercase text-xs" />
                            <input type="number" value={newShoe.targetDist} onChange={e => setNewShoe({ ...newShoe, targetDist: e.target.value })} placeholder="MAX" className="flex-1 bg-black border border-white/50 p-2 text-white outline-none font-mono uppercase text-xs" />
                        </div>
                        <button type="submit" className="w-full bg-white text-black font-bold uppercase text-xs py-2 hover:bg-primary transition-colors">CONFIRM REGISTRATION</button>
                    </form>
                )}

                {shoes.length === 0 ? (
                    <div className="text-center p-4 text-secondary text-xs uppercase border border-dashed border-border-bright">
                        NO GEAR REGISTERED.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {shoes.map(shoe => (
                            <div key={shoe.id} className="border border-border-bright p-3 hover:border-sidebar hover:bg-white/5 transition-colors">
                                <div className="flex justify-between mb-2 items-end">
                                    <span className="font-bold text-sm uppercase">{shoe.name}</span>
                                    <span className="text-[10px] font-mono opacity-70">{shoe.currentMileage} / {shoe.targetMileage} KM</span>
                                </div>
                                {/* Brutalist Progress Bar */}
                                <div className="h-2 w-full border border-border-bright p-[1px]">
                                    <div
                                        className={cn("h-full", shoe.percent > 90 ? "bg-red-500" : "bg-primary")}
                                        style={{ width: `${shoe.percent}%` }}
                                    ></div>
                                </div>
                                <div className="text-right mt-1">
                                    <span className="text-[9px] font-mono uppercase text-secondary">{shoe.percent.toFixed(0)}% LIFESPAN</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
