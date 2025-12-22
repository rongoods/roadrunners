import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isMock } from '../api/firebase';
import { MOCK_DATA } from '../utils/constants';

const appId = window.__app_id || 'demo-app';

export function useProfile(user) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            // Default Guest Profile
            setProfile({
                username: 'GUEST',
                age: '',
                weightKg: '',
                trainingGoal: 'General Fitness',
                sportFocus: 'MIXED',
                shoeTracker: []
            });
            setLoading(false);
            return;
        }

        if (isMock) {
            setProfile(MOCK_DATA.profile);
            setLoading(false);
            return;
        }

        if (!db) {
            setLoading(false);
            return;
        }

        const profileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profiles/${user.uid}`);
        const unsubscribe = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
                setProfile(docSnap.data());
            } else {
                setProfile({
                    username: user.email?.split('@')[0] || 'RUNNER',
                    age: '',
                    weightKg: '',
                    trainingGoal: 'General Fitness',
                    sportFocus: 'MIXED',
                    shoeTracker: []
                });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const updateProfile = useCallback(async (updates) => {
        // Optimistic / Local Update
        setProfile(prev => ({ ...prev, ...updates }));

        if (user && !isMock && db) {
            try {
                const profileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profiles/${user.uid}`);
                await setDoc(profileRef, updates, { merge: true });
            } catch (err) {
                console.error("Failed to update profile in Firestore:", err);
            }
        }
    }, [user]);

    return { profile, loading, updateProfile };
}
