import React from 'react';
import { cn } from '../../utils/cn';

export function Button({ children, className, variant = 'primary', ...props }) {
    const variants = {
        primary: "bg-white text-black border-2 border-white hover:bg-primary hover:border-primary",
        secondary: "bg-black text-white border-2 border-white/30 hover:border-white",
        outline: "bg-transparent text-white border-2 border-white hover:bg-white hover:text-black",
        ghost: "bg-transparent text-white hover:bg-white/10"
    };

    return (
        <button
            className={cn(
                "font-bold uppercase tracking-widest px-4 py-2 transition-colors duration-0",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
