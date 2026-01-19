import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../utils/cn';
import DarkSpinner1 from '../../assets/spinner/dark_1.jpg';
import DarkSpinner2 from '../../assets/spinner/dark_2.jpg';
import DarkSpinner3 from '../../assets/spinner/dark_3.jpg';
import DarkSpinner4 from '../../assets/spinner/dark_4.jpg';
import DarkSpinner5 from '../../assets/spinner/dark_5.jpg';
import DarkSpinner6 from '../../assets/spinner/dark_6.jpg';
import DarkSpinner7 from '../../assets/spinner/dark_7.jpg';
import DarkSpinner8 from '../../assets/spinner/dark_8.jpg';
import DarkSpinner9 from '../../assets/spinner/dark_9.jpg';
import LightSpinner1 from '../../assets/spinner/light_1.jpg';
import LightSpinner2 from '../../assets/spinner/light_2.png';
import LightSpinner3 from '../../assets/spinner/light_3.jpg';
import LightSpinner4 from '../../assets/spinner/light_4.jpg';
import LightSpinner5 from '../../assets/spinner/light_5.jpg';
import LightSpinner6 from '../../assets/spinner/light_6.jpg';
import LightSpinner7 from '../../assets/spinner/light_7.jpg';
import LightSpinner8 from '../../assets/spinner/light_8.jpg';
import LightSpinner9 from '../../assets/spinner/light_9.jpg';
import LightSpinner10 from '../../assets/spinner/light_10.jpg';

const DARK_IMAGES = [
    DarkSpinner1, DarkSpinner2, DarkSpinner3, DarkSpinner4, DarkSpinner5,
    DarkSpinner6, DarkSpinner7, DarkSpinner8, DarkSpinner9
];
const LIGHT_IMAGES = [
    LightSpinner1, LightSpinner2, LightSpinner3, LightSpinner4, LightSpinner5,
    LightSpinner6, LightSpinner7, LightSpinner8, LightSpinner9, LightSpinner10
];

export default function Loader({ visible }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { theme } = useTheme();

    // Customize active images per theme
    // Light Mode: Use new colored roadrunner images
    // Dark Mode: Use original white outline images
    const activeImages = theme === 'light' ? LIGHT_IMAGES : DARK_IMAGES;

    useEffect(() => {
        if (!visible) return;

        const interval = setInterval(() => {
            setCurrentImageIndex(prev => {
                const nextIndex = Math.floor(Math.random() * activeImages.length);
                return nextIndex === prev ? (prev + 1) % activeImages.length : nextIndex;
            });
        }, 120);

        return () => clearInterval(interval);
    }, [visible, activeImages]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="relative">
                <div className="animate-spin-slow">
                    <img
                        src={activeImages[currentImageIndex] || activeImages[0]}
                        alt="Loading..."
                        className={cn(
                            "w-32 h-32 object-contain filter contrast-125 transition-all duration-300",
                            theme === 'dark' ? "mix-blend-screen" : "mix-blend-multiply"
                        )}
                    />
                </div>
                <p className="absolute -bottom-8 left-0 right-0 text-center text-xs font-black uppercase lg:text-sm animate-pulse tracking-widest text-primary">
                    LOADING...
                </p>
            </div>
        </div>
    );
}
