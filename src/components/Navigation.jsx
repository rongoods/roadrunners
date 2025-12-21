import React from 'react';
import { TABS } from '../utils/constants';
import { cn } from '../utils/cn';

export function Navigation({ activeTab, onTabChange }) {
    const tabs = [
        { id: TABS.FEED, label: 'FEED' },
        { id: TABS.GROUPS, label: 'GROUPS' },
        { id: TABS.PLAN, label: 'PLAN' },
        { id: TABS.PROFILE, label: 'PROFILE' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-border-bright h-14 flex items-center justify-between px-0">
            <div className="flex h-full w-full">
                {tabs.map((tab, idx) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex-1 h-full flex items-center justify-center font-bold text-sm tracking-wider transition-all duration-0",
                                isActive
                                    ? "bg-primary text-black"
                                    : "bg-background text-text hover:bg-white hover:text-black",
                                idx !== tabs.length - 1 && "border-r-2 border-border-bright"
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
