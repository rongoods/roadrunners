import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, isMock } from '../api/firebase';
import { MOCK_USER } from '../utils/constants';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isMock) {
            setUser(MOCK_USER);
            setLoading(false);
            return;
        }

        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        if (isMock) {
            alert("This feature is only available with a valid Firebase config.");
            return;
        }
        if (!auth) return;
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const logout = async () => {
        if (isMock) {
            alert("Mock logout not implemented.");
            return;
        }
        if (!auth) return;
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return { user, loading, signInWithGoogle, logout };
}
