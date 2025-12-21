import React from 'react';
import { cn } from '../../utils/cn';

export function Input({ className, ...props }) {
    return (
        <input
            className={cn(
                "w-full bg-black border-2 border-white/50 p-2 text-text focus:border-primary outline-none font-mono uppercase rounded-none",
                className
            )}
            {...props}
        />
    );
}
