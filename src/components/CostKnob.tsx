import React from 'react';

interface CostKnobProps {
    currentCost: number;
    isOn: boolean;
    limit: number | null;
    limitRemaining: number | null;
    onClick?: () => void;
}

export const CostKnob: React.FC<CostKnobProps> = ({ isOn, limit, limitRemaining, onClick }) => {
    // Determine Display Value
    let displayValue = 'OFF';
    let isUnlimited = false;

    // Show Limit if we have data (Key Validated), regardless of Ignition State
    // "OFF" only shows if we have NO key info at all
    const hasData = limit !== null || limitRemaining !== null;

    if (hasData) {
        if (limit === null && limitRemaining === null) {
            // Truly unknown if both are null, but API says limit:null is unlimited.
            // However, usually one field has data.
            // If we have data, we trust it.
            // OpenRouter: limit=null -> Unlimited.
            displayValue = 'UNLIMITED';
            isUnlimited = true;
        } else if (limit === null) {
            displayValue = 'UNLIMITED';
            isUnlimited = true;
        } else {
            const remaining = Math.max(0, limitRemaining ?? 0);
            displayValue = `$${remaining.toFixed(2)}`;
        }
    } else if (isOn) {
        displayValue = 'UNKNOWN KEY';
    }

    // Determine Ring Color based on Budget Health (if limit exists)
    let ringColor = '#ef4444'; // Red default (OFF or Low)

    // Ring Light Logic:
    // If ON: Show status colors.
    // If OFF but Has Data: Show Dimmed Status or just Red?
    // User wants to see AVAILABLE limit. 
    // We will show the ring color for the limit health, but maybe dimmed if OFF.

    if (hasData) {
        if (isUnlimited) {
            ringColor = '#22c55e'; // Green for unlimited
        } else if (limit && limit > 0) {
            const percentage = (Math.max(0, limitRemaining ?? 0) / limit);
            if (percentage > 0.5) ringColor = '#22c55e'; // Green
            else if (percentage > 0.1) ringColor = '#eab308'; // Yellow
            else ringColor = '#ef4444'; // Red
        }
    }

    return (
        <div
            onClick={onClick}
            className="w-20 h-20 rounded-full relative cursor-pointer group select-none active:scale-95 transition-transform duration-200"
            title="Budget Monitor"
        >
            {/* 1. Base Dark Shadow/Well */}
            <div className="absolute inset-0 rounded-full bg-black/40 shadow-[inset_0_4px_8px_rgba(0,0,0,0.8)]" />

            {/* 2. Main Metallic Knob Body */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 drop-shadow-2xl">
                <defs>
                    <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e4e4e7" />
                        <stop offset="45%" stopColor="#a1a1aa" />
                        <stop offset="55%" stopColor="#71717a" />
                        <stop offset="100%" stopColor="#3f3f46" />
                    </linearGradient>
                    <linearGradient id="gearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#52525b" />
                        <stop offset="100%" stopColor="#27272a" />
                    </linearGradient>
                </defs>

                {/* Outer Gear Teeth Ring */}
                <circle cx="50" cy="50" r="46" fill="url(#gearGrad)" stroke="#18181b" strokeWidth="1" />
                <g transform="translate(50,50)">
                    {[...Array(12)].map((_, i) => (
                        <rect key={i} x="-6" y="-48" width="12" height="10" fill="#3f3f46" rx="2" transform={`rotate(${i * 30})`} stroke="#000" strokeWidth="0.5" />
                    ))}
                </g>

                {/* Inner Metallic Face */}
                <circle cx="50" cy="50" r="40" fill="url(#metalGrad)" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.5" />
                <circle cx="50" cy="50" r="32" fill="none" stroke="#000" strokeWidth="0.5" opacity="0.1" />
            </svg>

            {/* 3. Text & Data Display (Overlay) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 z-10 pointer-events-none">
                <div className={`font-mono font-bold leading-none tracking-tighter text-shadow-sm transition-all duration-300
                    ${!isOn ? 'text-zinc-800 text-[10px] opacity-80' : // Darker for Standby
                        isUnlimited ? 'text-[9px] text-green-700' :
                            'text-zinc-800 text-[13px]'}`}
                >
                    {displayValue}
                </div>
                {isOn && (
                    <div className="text-[5px] text-zinc-600 font-bold tracking-widest mt-0.5 uppercase opacity-70">
                        {isUnlimited ? 'NO LIMIT' : 'REMAINING'}
                    </div>
                )}
            </div>

            {/* 4. Activity Indicator (LED) */}
            <div
                className="absolute top-0 right-0 w-2 h-2 rounded-full transition-all duration-300 border border-black/20"
                style={{
                    backgroundColor: ringColor,
                    opacity: isOn ? 1 : 0.3,
                    boxShadow: isOn ? `0 0 8px 2px ${ringColor}` : 'inset 0 1px 2px rgba(0,0,0,0.5)'
                }}
            />
        </div>
    );
};
