import { useState, useEffect } from 'react';

export function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        const root = document.documentElement;
        // Clean up previously added classes
        root.classList.remove('light-mode', 'blueprint-mode');
        
        if (theme === 'light') {
            root.classList.add('light-mode');
        } else if (theme === 'blueprint') {
            root.classList.add('blueprint-mode');
        }
        
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => {
            if (prev === 'dark') return 'light';
            if (prev === 'light') return 'blueprint';
            return 'dark';
        });
    };

    return { theme, toggleTheme };
}
