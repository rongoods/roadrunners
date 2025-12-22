import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, isMock } from '../../api/firebase';

const appId = window.__app_id || 'demo-app';

export default function PlanFeature({ user, profile, onUpdateProfile }) {
    const [formData, setFormData] = useState({ age: '', weightKg: '', trainingGoal: 'General Fitness' });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData({
                age: profile.age || '',
                weightKg: profile.weightKg || '',
                trainingGoal: profile.trainingGoal || 'General Fitness'
            });
        } else {
            setIsEditing(true);
        }
    }, [profile]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        await onUpdateProfile({
            age: formData.age,
            weightKg: formData.weightKg,
            trainingGoal: formData.trainingGoal
        });

        setIsEditing(false);
    };

    const getPlan = (goal, sportFocus = 'RUNNING') => {
        if (sportFocus === 'WORKOUT') {
            switch (goal) {
                case 'Short Distance': // Power / HIIT focus
                    return [
                        { day: 'MON', type: 'UPPER BODY', desc: 'Explosive Push/Pull + 15min HIIT' },
                        { day: 'TUE', type: 'CORE', desc: 'Weighted Plank + Russian Twists + Leg Raises' },
                        { day: 'WED', type: 'LOWER BODY', desc: 'Box Jumps + Goblet Squats + Plyo' },
                        { day: 'THU', type: 'REST', desc: 'Total Recovery' },
                        { day: 'FRI', type: 'BARS', desc: 'Pull-ups + Dips + Hang Practice' },
                        { day: 'SAT', type: 'FULL BODY', desc: 'Kettlebell Complex: Clean/Press/Swing' },
                        { day: 'SUN', type: 'REST', desc: 'Total Rest' },
                    ];
                case 'Long Distance': // Hypertrophy / Volume focus
                    return [
                        { day: 'MON', type: 'UPPER BODY', desc: 'Bench Press + Rows + Accessories (4x12)' },
                        { day: 'TUE', type: 'LOWER BODY', desc: 'Deadlifts + Squats + Lunges (4x10)' },
                        { day: 'WED', type: 'REST', desc: 'Rest / Light Mobility' },
                        { day: 'THU', type: 'UPPER BODY', desc: 'Overhead Press + Lat Pulls + Arms' },
                        { day: 'FRI', type: 'CORE/LEGS', desc: 'Weighted Core + Calves + Hamstrings' },
                        { day: 'SAT', type: 'VOLUME', desc: 'Mixed Weights: Full Body Burnout' },
                        { day: 'SUN', type: 'REST', desc: 'Total Rest' },
                    ];
                default: // General Fitness
                    return [
                        { day: 'MON', type: 'FREE WEIGHTS', desc: 'Dumbbell Full Body Circuit' },
                        { day: 'TUE', type: 'CORE', desc: '15min Dedicated Core Protocol' },
                        { day: 'WED', type: 'REST', desc: 'Rest Day' },
                        { day: 'THU', type: 'KETTLEBELLS', desc: 'Swings + TGU + Snatches' },
                        { day: 'FRI', type: 'UPPER BODY', desc: 'Pushups + Pullups + Bodyweight' },
                        { day: 'SAT', type: 'ACTIVE', desc: 'Outdoor Activity or Yoga' },
                        { day: 'SUN', type: 'REST', desc: 'Rest Day' },
                    ];
            }
        }

        if (sportFocus === 'HYROX') {
            switch (goal) {
                case 'Short Distance':
                    return [
                        { day: 'MON', type: 'STRENGTH', desc: 'Heavy Sled Push/Pull + 400m Runs' },
                        { day: 'TUE', type: 'ENDURANCE', desc: 'EMOM 40: Row/Ski/Run Rotation' },
                        { day: 'WED', type: 'SKILLS', desc: 'Burpee Broad Jumps + Wall Balls' },
                        { day: 'THU', type: 'STRENGTH', desc: 'Farmers Carry + Lunges + Sandbag' },
                        { day: 'FRI', type: 'RECOVERY', desc: 'Mobility + Zone 2 Row' },
                        { day: 'SAT', type: 'SIMULATION', desc: 'Hyrox Simulation: 4 Rounds @ 50%' },
                        { day: 'SUN', type: 'REST', desc: 'Total Rest' },
                    ];
                case 'Long Distance':
                    return [
                        { day: 'MON', type: 'STRENGTH', desc: 'Lower Body Power + Interval Row' },
                        { day: 'TUE', type: 'CAPACITY', desc: '90min Mixed Cardio (Run/Ski/Row)' },
                        { day: 'WED', type: 'HYBRID', desc: 'Strength + 5km Tempo Run' },
                        { day: 'THU', type: 'STRENGTH', desc: 'Upper Body Pull + Wall Ball Vol.' },
                        { day: 'FRI', type: 'EASY', desc: 'Recovery Run: 8km' },
                        { day: 'SAT', type: 'SIMULATION', desc: 'Full Hyrox Sim: 8km + 8 Stations' },
                        { day: 'SUN', type: 'REST', desc: 'Total Rest' },
                    ];
                default:
                    return [
                        { day: 'MON', type: 'FULL BODY', desc: 'Functional Strength Circuit' },
                        { day: 'TUE', type: 'RUN', desc: 'Intervals: 4x800m' },
                        { day: 'WED', type: 'REST', desc: 'Rest Day' },
                        { day: 'THU', type: 'STRENGTH', desc: 'Kettlebell Work + Sleds' },
                        { day: 'FRI', type: 'ENDURANCE', desc: '45min Row/Ski' },
                        { day: 'SAT', type: 'ACTIVE', desc: 'Outdoor Run or Group Class' },
                        { day: 'SUN', type: 'REST', desc: 'Rest Day' },
                    ];
            }
        }

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
            default:
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

    if (!profile?.trainingGoal || isEditing) {
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
                        <select value={formData.trainingGoal} onChange={e => setFormData({ ...formData, trainingGoal: e.target.value })} className="w-full">
                            <option value="General Fitness">General Fitness</option>
                            <option value="Short Distance">Short Distance / Sprint</option>
                            <option value="Long Distance">Long Distance / Pro</option>
                            <option value="Competitive">Competitive Elite</option>
                        </select>
                    </div>

                    <button type="submit" className="w-full bg-text text-background border-2 border-text py-3 font-black uppercase hover:bg-primary hover:text-black hover:border-primary transition-colors tracking-widest">
                        {isEditing && profile?.trainingGoal ? 'OVERWRITE LOGIC' : 'COMPILE PLAN'}
                    </button>
                    {isEditing && profile?.trainingGoal && (
                        <button type="button" onClick={() => setIsEditing(false)} className="w-full text-xs font-mono uppercase pt-2 text-text hover:text-primary">ABORT EDIT</button>
                    )}
                </form>
            </div>
        );
    }

    const plan = getPlan(profile.trainingGoal, profile.sportFocus);

    return (
        <div className="p-0 space-y-8 pb-24">
            <div className="flex justify-between items-end px-4 border-b-2 border-border-bright pb-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none transform -translate-x-0.5">
                    Weekly<br />Protocol
                </h1>
                <button onClick={() => setIsEditing(true)} className="text-xs font-bold uppercase bg-text text-background border-2 border-text px-2 py-1 hover:bg-background hover:text-text transition-colors">
                    Edit Logic
                </button>
            </div>

            <div className="border-t-2 border-border-bright">
                <div className="flex justify-between items-center bg-background p-2 border-b-2 border-border-bright">
                    <h2 className="font-bold text-lg uppercase">
                        {(profile.sportFocus || 'RUNNING')} // {profile.trainingGoal.toUpperCase()}
                    </h2>
                    <span className="text-[10px] bg-primary text-black font-bold px-2 py-0.5 uppercase">Cycle: Alpha-1</span>
                </div>
                <div className="grid grid-cols-1">
                    {plan.map((day, i) => {
                        return (
                            <div key={i} className="flex group border-b border-border-bright hover:bg-text hover:text-background transition-colors min-h-[60px]">
                                <div className="w-12 bg-white/10 group-hover:bg-background/10 flex items-center justify-center border-r border-border-bright">
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
