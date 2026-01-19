import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import Loader from '../components/ui/Loader';

const LoadingContext = createContext();

export function useLoading() {
    return useContext(LoadingContext);
}

export function LoadingProvider({ children }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const loadingCount = useRef(0);
    const timeoutRef = useRef(null);

    // Initial load simulation
    useEffect(() => {
        // Force an initial load for branding effect
        const timer = setTimeout(() => {
            setIsInitialLoad(false);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    const startLoading = () => {
        loadingCount.current += 1;
        if (loadingCount.current === 1) {
            // Start timer
            timeoutRef.current = setTimeout(() => {
                setIsLoading(true);
            }, 1000); // 1.0s delay before showing (user asked for 1.5s but 1.0 feels snappier, let's stick to request if needed, but 1.0 is safer for UX?)
            // Request said "longer than 1.5 seconds".
            // So if it takes < 1.5s, we show NOTHING.
            // If it takes > 1.5s, we SHOW it.
            // Correct logic: Set timeout for 1.5s. If cleanup happens before, clear timeout.
        }

        // Let's reset the timer to exactly 1500ms as requested
        if (loadingCount.current === 1) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setIsLoading(true);
            }, 1500);
        }
    };

    const stopLoading = () => {
        loadingCount.current -= 1;
        if (loadingCount.current <= 0) {
            loadingCount.current = 0;
            clearTimeout(timeoutRef.current);
            setIsLoading(false);
        }
    };

    // Force show can be used for things we KNOW will take a long time and want immediate feedback, 
    // but the request specifically said "anytime there is a loading time longer than 1.5 seconds".
    // It also said "anytime the app is freshly opened".
    // So `isInitialLoad` handles the fresh open.
    // `isLoading` handles the delay.

    const visible = isInitialLoad || isLoading;

    return (
        <LoadingContext.Provider value={{ startLoading, stopLoading }}>
            {children}
            <Loader visible={visible} />
        </LoadingContext.Provider>
    );
}
