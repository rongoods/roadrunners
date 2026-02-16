import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut } from 'firebase/auth';
import { auth, isMock } from '../api/firebase';
import { MOCK_USER } from '../utils/constants';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isMock) {
            // Check if there's a stored mock session
            const storedMockUser = localStorage.getItem('mock_user');
            if (storedMockUser) {
                setUser(JSON.parse(storedMockUser));
            }
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
            setUser(MOCK_USER);
            localStorage.setItem('mock_user', JSON.stringify(MOCK_USER));
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

    const signInWithApple = async () => {
        if (isMock) {
            const appleMockUser = { ...MOCK_USER, displayName: 'Apple User', email: 'apple@example.com' };
            setUser(appleMockUser);
            localStorage.setItem('mock_user', JSON.stringify(appleMockUser));
            return;
        }
        if (!auth) return;
        try {
            const provider = new OAuthProvider('apple.com');
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Apple login failed", error);
        }
    };

    const logout = async () => {
        if (isMock) {
            setUser(null);
            localStorage.removeItem('mock_user');
            return;
        }
        if (!auth) return;
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return { user, loading, signInWithGoogle, signInWithApple, logout };
}
