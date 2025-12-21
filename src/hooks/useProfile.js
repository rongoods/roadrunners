import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isMock } from '../api/firebase';
import { MOCK_DATA } from '../utils/constants';

const appId = window.__app_id || 'demo-app';

export function useProfile(user) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setProfile(null);
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
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { profile, loading };
}
