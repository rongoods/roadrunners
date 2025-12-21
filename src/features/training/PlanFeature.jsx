import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, isMock } from '../../api/firebase';

const appId = window.__app_id || 'demo-app';

export default function PlanFeature({ user, profile }) {
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
                    { day: 'MON', type: 'SPEED', desc: 'Intervals: 8x400m @ 5k pace' },
                    { day: 'TUE', type: 'EASY', desc: 'Easy Run: 5-8km' },
                    { day: 'WED', type: 'STRENGTH', desc: 'Lower Body Strength' },
                    { day: 'THU', type: 'SPEED', desc: 'Tempo Run: 20min @ 10k pace' },
                    { day: 'FRI', type: 'RECOVERY', desc: 'Active Recovery / Yoga' },
                    { day: 'SAT', type: 'EASY', desc: 'Long Easy Run: 10km' },
                    { day: 'SUN', type: 'REST', desc: 'Total Rest' },
                ];
            case 'Long Distance':
                return [
                    { day: 'MON', type: 'EASY', desc: 'Easy Run: 8km' },
                    { day: 'TUE', type: 'SPEED', desc: 'Intervals: 4x1km @ 5k pace' },
                    { day: 'WED', type: 'STRENGTH', desc: 'Core & Stability' },
                    { day: 'THU', type: 'TEMPO', desc: 'Tempo Run: 40min steady' },
                    { day: 'FRI', type: 'RECOVERY', desc: 'Easy 5km or Cross train' },
                    { day: 'SAT', type: 'LONG', desc: 'Long Run: 15-20km' },
                    { day: 'SUN', type: 'REST', desc: 'Total Rest' },
                ];
            case 'Competitive':
                return [
                    { day: 'MON', type: 'SPEED', desc: 'Track: 12x400m' },
                    { day: 'TUE', type: 'EASY', desc: 'Recovery Run: 10km' },
                    { day: 'WED', type: 'THRESHOLD', desc: 'Threshold: 3x10min' },
                    { day: 'THU', type: 'EASY', desc: 'Easy Run: 12km' },
                    { day: 'FRI', type: 'EASY', desc: 'Shakeout: 6km' },
                    { day: 'SAT', type: 'LONG', desc: 'Long Run: 25km+' },
                    { day: 'SUN', type: 'REST', desc: 'Total Rest' },
                ];
            default: // General Fitness
                return [
                    { day: 'MON', type: 'EASY', desc: 'Run/Walk: 30min' },
                    { day: 'TUE', type: 'REST', desc: 'Rest Day' },
                    { day: 'WED', type: 'STRENGTH', desc: 'Full Body Circuit' },
                    { day: 'THU', type: 'EASY', desc: 'Easy Run: 5km' },
                    { day: 'FRI', type: 'ACTIVITY', desc: 'Cross Training (Bike/Swim)' },
                    { day: 'SAT', type: 'LONG', desc: 'Hike or Long Walk' },
                    { day: 'SUN', type: 'REST', desc: 'Rest Day' },
                ];
        }
    };

    if (!localProfile?.trainingGoal || isEditing) {
        return (
            <div className="p-0 space-y-8 pb-24">
                <div className="px-4 border-b-2 border-border-bright pb-4">
                    <h1 className="text-4xl font-black uppercase tracking-tighter leading-none transform -translate-x-0.5">
                        Protocol<br />Setup
                    </h1>
                </div>

                <form onSubmit={handleUpdateProfile} className="mx-4 bg-background border-2 border-border-bright p-4 space-y-4">
                    <h2 className="font-bold uppercase tracking-wider text-xl mb-4">Initialize Parameters</h2>
                    <p className="font-mono text-[10px] uppercase text-secondary mb-4 border-l-2 border-primary pl-2">Input biometrics to generate training logic.</p>

                    <div>
                        <label className="text-[10px] uppercase text-secondary block mb-1">Age</label>
                        <input value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} type="number" required className="w-full bg-background border border-border-bright p-2 text-text outline-none font-mono uppercase focus:border-primary" />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-secondary block mb-1">Weight (kg)</label>
                        <input value={formData.weightKg} onChange={e => setFormData({ ...formData, weightKg: e.target.value })} type="number" required className="w-full bg-background border border-border-bright p-2 text-text outline-none font-mono uppercase focus:border-primary" />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-secondary block mb-1">Objective</label>
                        <select value={formData.trainingGoal} onChange={e => setFormData({ ...formData, trainingGoal: e.target.value })} className="w-full bg-background border border-border-bright p-2 text-text outline-none font-mono uppercase focus:border-primary">
                            <option value="General Fitness">General Fitness</option>
                            <option value="Short Distance">Short Distance (5k/10k)</option>
                            <option value="Long Distance">Long Distance (Half/Full)</option>
                            <option value="Competitive">Competitive</option>
                        </select>
                    </div>

                    <button type="submit" className="w-full bg-text text-background border-2 border-text py-3 font-black uppercase hover:bg-primary hover:text-black hover:border-primary transition-colors tracking-widest">
                        {isEditing && localProfile?.trainingGoal ? 'OVERWRITE LOGIC' : 'COMPILE PLAN'}
                    </button>
                    {isEditing && localProfile?.trainingGoal && (
                        <button type="button" onClick={() => setIsEditing(false)} className="w-full text-xs font-mono uppercase pt-2 text-text hover:text-primary">ABORT EDIT</button>
                    )}
                </form>
            </div>
        );
    }

    const plan = getPlan(localProfile.trainingGoal);

    return (
        <div className="p-0 space-y-8 pb-24">
            <div className="flex justify-between items-end px-4 border-b-2 border-border-bright pb-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none transform -translate-x-0.5">
                    Weekly<br />Protocol
                </h1>
                <button onClick={() => setIsEditing(true)} className="text-xs font-bold uppercase border border-white px-2 py-1 hover:bg-white hover:text-black">
                    Edit Logic
                </button>
            </div>

            <div className="border-t-2 border-border-bright">
                <div className="flex justify-between items-center bg-black p-2 border-b-2 border-white/20">
                    <h2 className="font-bold text-lg uppercase">{localProfile.trainingGoal.toUpperCase()}</h2>
                    <span className="text-[10px] bg-primary text-black font-bold px-2 py-0.5 uppercase">Cycle: Alpha-1</span>
                </div>
                <div className="grid grid-cols-1">
                    {plan.map((day, i) => {
                        return (
                            <div key={i} className="flex group border-b border-white/20 hover:bg-text hover:text-background transition-colors min-h-[60px]">
                                <div className="w-12 bg-white/10 group-hover:bg-background/10 flex items-center justify-center border-r border-white/20">
                                    <div className="text-xs font-black -rotate-90">{day.day}</div>
                                </div>
                                <div className="flex-1 p-3 flex flex-col justify-center">
                                    <div className="flex justify-between mb-1">
                                        <h4 className="font-bold text-sm uppercase tracking-wide group-hover:text-background">{day.type}</h4>
                                        <div className="w-2 h-2 bg-primary rounded-none opacity-0 group-hover:opacity-100"></div>
                                    </div>
                                    <p className="text-[10px] font-mono uppercase opacity-70 group-hover:opacity-100">{day.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
