import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, isMock } from '../../api/firebase';
import { useLoading } from '../../context/LoadingContext';
import { MOCK_DATA } from '../../utils/constants';
import { cn } from '../../utils/cn';
import { subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import { formatDate } from '../../utils/formatters';
import { getDefaultLogo } from '../../utils/defaultLogos';

const appId = window.__app_id || 'demo-app';

export default function ProfileFeature({ user, profile, onUpdateProfile, onLoginGoogle, onLoginApple, onLogout, viewedUserId, onBack }) {
    const [displayedRuns, setDisplayedRuns] = useState([]);
    const [displayedProfile, setDisplayedProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddShoe, setShowAddShoe] = useState(false);
    const [newShoe, setNewShoe] = useState({ name: '', startDist: 0, targetDist: 800 });
    const [historyFilter, setHistoryFilter] = useState('ALL'); // 'DAILY', 'WEEKLY', 'MONTHLY', 'ALL'
    const { startLoading, stopLoading } = useLoading();
    const fileInputRef = useRef(null);

    const isOwnProfile = !viewedUserId || (user && viewedUserId === user.uid);
    const effectiveUserId = viewedUserId || user?.uid;

    // Fetch Profile
    useEffect(() => {
        if (!effectiveUserId) {
            setDisplayedProfile(null);
            setLoading(false);
            return;
        }

        if (isMock) {
            // For mock, if it's "not me", just use some mock data
            if (isOwnProfile) {
                setDisplayedProfile(profile || MOCK_DATA.profile);
            } else {
                // Return a fixed mock profile for "someone else"
                setDisplayedProfile({
                    userId: viewedUserId,
                    username: MOCK_DATA.runs.find(r => r.userId === viewedUserId)?.username || 'Other Runner',
                    trainingGoal: 'Competitive',
                    musicAnthem: 'POWER - KANYE WEST',
                    shoeTracker: [],
                    photoURL: null
                });
            }
            setLoading(false);
            return;
        }

        const profileRef = doc(db, `artifacts/${appId}/users/${effectiveUserId}/profiles/${effectiveUserId}`);

        startLoading();
        const unsubscribe = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
                setDisplayedProfile(docSnap.data());
            } else {
                setDisplayedProfile(null);
            }
            setLoading(false);
            stopLoading();
        }, (err) => {
            console.error(err);
            setLoading(false);
            stopLoading();
        });
        return () => unsubscribe();
    }, [effectiveUserId, profile, isOwnProfile, viewedUserId]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;

        if (isMock) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                onUpdateProfile({ photoURL: base64String });
                setDisplayedProfile(prev => ({ ...prev, photoURL: base64String }));
            };
            reader.readAsDataURL(file);
            return;
        }

        if (!storage) return;

        try {
            startLoading();
            const storageRef = ref(storage, `artifacts/${appId}/users/${user.uid}/profile_pic`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                null,
                (error) => {
                    console.error("Upload failed:", error);
                    stopLoading();
                    alert("Upload failed. Storage might not be configured.");
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await onUpdateProfile({ photoURL: downloadURL });
                    setDisplayedProfile(prev => ({ ...prev, photoURL: downloadURL }));
                    stopLoading();
                }
            );
        } catch (err) {
            console.error(err);
            stopLoading();
        }
    };

    // Fetch Runs
    useEffect(() => {
        if (!effectiveUserId) {
            setDisplayedRuns([]);
            return;
        }
        if (isMock) {
            setDisplayedRuns(MOCK_DATA.runs.filter(r => r.userId === effectiveUserId));
            return;
        }
        const q = query(collection(db, `artifacts/${appId}/public/data/runs`), where('userId', '==', effectiveUserId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setDisplayedRuns(snapshot.docs.map(d => d.data()));
        });
        return () => unsubscribe();
    }, [effectiveUserId]);

    const stats = useMemo(() => {
        const totalKm = displayedRuns.reduce((acc, run) => acc + (run.distanceKm || 0), 0);
        const longest = displayedRuns.reduce((max, run) => Math.max(max, run.distanceKm || 0), 0);
        return { totalKm: totalKm.toFixed(1), longest: longest.toFixed(1) };
    }, [displayedRuns]);

    const shoes = useMemo(() => {
        if (!displayedProfile?.shoeTracker) return [];
        return displayedProfile.shoeTracker.map(shoe => {
            const runDistHelper = displayedRuns.filter(r => r.shoeId === shoe.id).reduce((acc, r) => acc + (r.distanceKm || 0), 0);
            const total = (parseFloat(shoe.startMileage || 0) + runDistHelper).toFixed(1);
            const percent = Math.min(100, (total / (shoe.targetMileage || 800)) * 100);
            return { ...shoe, currentMileage: total, percent };
        });
    }, [displayedProfile, displayedRuns]);

    const filteredHistory = useMemo(() => {
        const now = new Date();
        return displayedRuns
            .filter(run => {
                const runDate = new Date(run.date);
                if (historyFilter === 'DAILY') return isAfter(runDate, subDays(now, 1));
                if (historyFilter === 'WEEKLY') return isAfter(runDate, subWeeks(now, 1));
                if (historyFilter === 'MONTHLY') return isAfter(runDate, subMonths(now, 1));
                return true;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [displayedRuns, historyFilter]);

    const handleAddShoe = async (e) => {
        e.preventDefault();
        if (!user || !isOwnProfile) return;
        const shoeId = Date.now().toString();
        const shoeToAdd = {
            id: shoeId,
            name: newShoe.name,
            startMileage: parseFloat(newShoe.startDist),
            targetMileage: parseFloat(newShoe.targetDist)
        };

        if (isMock) {
            setDisplayedProfile(prev => ({ ...prev, shoeTracker: [...(prev?.shoeTracker || []), shoeToAdd] }));
            setShowAddShoe(false);
            setNewRun({ name: '', startDist: 0, targetDist: 800 });
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

    if (loading) return (
        <div className="p-8 text-center text-primary animate-pulse font-mono uppercase tracking-widest">
            Synchronizing...
        </div>
    );

    return (
        <div className="p-0 space-y-6 pb-24 relative">
            {!isOwnProfile && (
                <div className="px-4 pt-4">
                    <button
                        onClick={onBack}
                        className="text-xs font-bold uppercase bg-text text-background border-2 border-text px-2 py-1 hover:bg-background hover:text-text transition-colors w-full"
                    >
                        ← BACK TO MY PROFILE
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-end justify-between px-4 border-b-2 border-border-bright pb-4">
                <div className="flex-1 flex gap-4 items-end">
                    {/* Profile Picture */}
                    <div
                        className={cn(
                            "relative group w-20 h-20 border-2 border-border-bright bg-white/5 flex items-center justify-center transition-colors hover:border-sidebar",
                            isOwnProfile && "cursor-pointer"
                        )}
                        onClick={() => isOwnProfile && fileInputRef.current?.click()}
                    >
                        {displayedProfile?.photoURL ? (
                            <img src={displayedProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <img src={getDefaultLogo(effectiveUserId)} alt="Profile" className="w-full h-full object-cover opacity-80" />
                        )}
                        {isOwnProfile && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-[10px] text-white font-bold uppercase tracking-widest">UPLOAD</span>
                            </div>
                        )}
                        {isOwnProfile && (
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        )}
                    </div>

                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none transform -translate-x-0.5">
                            {isOwnProfile ? 'Runner' : 'Public'}<br />Manifest
                        </h1>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <div>
                        <div className="text-[10px] uppercase font-mono text-secondary mb-1">DESIGNATION</div>
                        <div className="text-sm font-bold uppercase border border-white px-2 py-1 bg-white text-black">
                            {displayedProfile?.username || (isOwnProfile ? (user?.email?.split('@')[0] || 'GUEST') : 'UNKNOWN')}
                        </div>
                    </div>

                    <div className="mt-2">
                        <div className="text-[10px] uppercase font-mono text-secondary mb-1">SPORT FOCUS</div>
                        {isOwnProfile ? (
                            <select
                                value={displayedProfile?.sportFocus || 'MIXED'}
                                onChange={(e) => onUpdateProfile({ sportFocus: e.target.value })}
                                className="text-[10px] font-bold uppercase border border-border-bright bg-background text-text px-1 py-0.5 outline-none hover:border-primary transition-colors"
                            >
                                <option value="RUNNING">RUNNING focus</option>
                                <option value="HYROX">HYROX focus</option>
                                <option value="WORKOUT">WORKOUT focus</option>
                                <option value="MIXED">MIXED (ALL)</option>
                            </select>
                        ) : (
                            <div className="text-[10px] font-bold uppercase text-primary">
                                {displayedProfile?.sportFocus || 'MIXED'}
                            </div>
                        )}
                    </div>

                    {isOwnProfile && (
                        user ? (
                            <button onClick={onLogout} className="text-[10px] text-primary hover:bg-primary hover:text-black border border-primary px-2 py-0.5 uppercase font-bold transition-colors">
                                Logout
                            </button>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <button onClick={onLoginGoogle} className="text-[10px] text-primary hover:bg-primary hover:text-black border border-primary px-2 py-0.5 uppercase font-bold transition-colors">
                                    Login w/ Google
                                </button>
                                <button onClick={onLoginApple} className="text-[10px] text-primary hover:bg-primary hover:text-black border border-primary px-2 py-0.5 uppercase font-bold transition-colors">
                                    Login w/ Apple
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Music Section - HIDDEN */}
            {/* <div className="mx-4 border-2 border-border-bright p-4 flex flex-col gap-2 relative bg-background">
                <div className="absolute top-0 right-0 bg-text text-background text-[10px] font-bold px-1 uppercase">Audio Protocol</div>
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Current Anthem</h3>
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-primary animate-pulse w-full"></div>
                </div>
                <p className="text-lg font-mono text-text truncate uppercase border-b border-border-bright pb-1">
                    {displayedProfile?.musicAnthem || "SILENCE"}
                </p>
                {isOwnProfile && (
                    <button
                        onClick={() => {
                            const newAnthem = prompt("Enter your running anthem (Song or Playlist URL):", displayedProfile?.musicAnthem || "");
                            if (newAnthem !== null) {
                                if (isMock) {
                                    setDisplayedProfile(prev => ({ ...prev, musicAnthem: newAnthem }));
                                } else if (user) {
                                    const ref = doc(db, `artifacts/${appId}/users/${user.uid}/profiles/${user.uid}`);
                                    setDoc(ref, { musicAnthem: newAnthem }, { merge: true });
                                    setDisplayedProfile(prev => ({ ...prev, musicAnthem: newAnthem }));
                                }
                            }
                        }}
                        className="text-[10px] uppercase font-mono text-primary text-left hover:underline"
                    >
                        [ UPDATE AUDIO LINK ]
                    </button>
                )}
            </div> */}

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
                    {isOwnProfile && (
                        <button onClick={() => setShowAddShoe(!showAddShoe)} className="text-primary text-[10px] uppercase font-bold border border-primary px-2 py-1 hover:bg-primary hover:text-black transition-colors">
                            {showAddShoe ? 'ABORT' : 'REGISTER GEAR +'}
                        </button>
                    )}
                </div>

                {showAddShoe && isOwnProfile && (
                    <form onSubmit={handleAddShoe} className="border-2 border-border-bright p-4 space-y-3 bg-background">
                        <input value={newShoe.name} onChange={e => setNewShoe({ ...newShoe, name: e.target.value })} placeholder="MODEL DESIGNATION" required className="w-full bg-background border border-border-bright p-2 text-text outline-none font-mono uppercase text-xs" />
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] uppercase text-secondary block mb-1">Init KM</label>
                                <select
                                    value={newShoe.startDist}
                                    onChange={e => setNewShoe({ ...newShoe, startDist: e.target.value })}
                                    className="w-full"
                                >
                                    {Array.from({ length: 25 }, (_, i) => i * 50).map(val => (
                                        <option key={val} value={val}>{val} KM</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] uppercase text-secondary block mb-1">Max KM</label>
                                <select
                                    value={newShoe.targetDist}
                                    onChange={e => setNewShoe({ ...newShoe, targetDist: e.target.value })}
                                    className="w-full"
                                >
                                    {Array.from({ length: 25 }, (_, i) => i * 50).map(val => (
                                        <option key={val} value={val}>{val} KM</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-text text-background font-bold uppercase text-xs py-2 hover:bg-primary hover:text-black transition-colors">CONFIRM REGISTRATION</button>
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

            {/* Workout History */}
            <div className="space-y-4 px-4 pb-12">
                <div className="flex justify-between items-center border-b border-border-bright pb-2">
                    <h2 className="text-xl font-bold uppercase tracking-tight">Workout History</h2>
                    <div className="flex gap-1">
                        {['DAILY', 'WEEKLY', 'MONTHLY', 'ALL'].map(f => (
                            <button
                                key={f}
                                onClick={() => setHistoryFilter(f)}
                                className={cn(
                                    "text-[9px] font-bold px-2 py-1 border transition-colors",
                                    historyFilter === f ? "bg-primary text-black border-primary" : "border-border-bright text-secondary hover:bg-white/5"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredHistory.length === 0 ? (
                    <div className="text-center p-8 text-secondary text-xs uppercase border border-dashed border-border-bright font-mono">
                        NO ACTIVITY LOGGED FOR THIS PERIOD.
                    </div>
                ) : (
                    <div className="space-y-0 border-x border-t border-border-bright">
                        {filteredHistory.map(run => (
                            <div key={run.id || run.timestamp} className="border-b border-border-bright p-3 grid grid-cols-4 gap-2 items-center hover:bg-white/5 transition-colors">
                                <div className="col-span-1">
                                    <p className="text-[10px] font-mono opacity-60 leading-none">{formatDate(run.date, 'dd.MM.yy')}</p>
                                    <p className="text-[8px] font-black text-primary uppercase mt-1 tracking-widest">{run.activityType || 'RUN'}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold font-mono">{run.distanceKm}KM</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold font-mono">{run.paceMinPerKm}</p>
                                    <p className="text-[7px] uppercase opacity-50">MIN/KM</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold font-mono">{run.durationMinutes}M</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
