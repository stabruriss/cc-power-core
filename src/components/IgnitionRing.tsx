import React from 'react';

interface IgnitionRingProps {
    state: 'NO_KEY' | 'OFF' | 'ON';
}

export const IgnitionRing: React.FC<IgnitionRingProps> = ({ state }) => {
    // Configuration
    const radius = 38; // Radius for text path
    const cx = 50;
    const cy = 50;

    // Helper to determine color based on state
    const getColor = (targetState: 'NO_KEY' | 'OFF' | 'ON') => {
        if (state === targetState) {
            if (state === 'NO_KEY') return '#fb923c'; // orange-400
            if (state === 'OFF') return '#fafafa'; // zinc-50
            if (state === 'ON') return '#4ade80'; // green-400 (using green for active ON usually, user had blue but logic says green for active)
            // User's original code had ON as text-te-blue (text-blue-500 approx). Let's stick to blue if that's the theme.
            if (state === 'ON') return '#60a5fa'; // blue-400
        }
        return '#52525b'; // zinc-600 (inactive)
    };

    const getOpacity = (targetState: 'NO_KEY' | 'OFF' | 'ON') => {
        // return state === targetState ? 1 : 0.6;
        return 1;
    };

    const getFontWeight = (targetState: 'NO_KEY' | 'OFF' | 'ON') => {
        return state === targetState ? 'bold' : 'normal';
    };

    // Angle Offsets (Match rotation logic)
    // NO_KEY: -50deg
    // OFF: 0deg
    // ON: 50deg

    return (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            {/* 
         We make the SVG larger than the container (Scale 1.4) to ensure labels fit 
         outside the 96px (w-24) knob area without being clipped if container is overflow-hidden (it shouldn't be).
         Actually, w-24 is 96px. If radius is 38% -> 76% width. That fits inside.
         Let's try fitting inside 100% first.
      */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">

                {/* Decorative Outer Ring (Dark -> Premium Gray) */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="#52525b" strokeWidth="1" opacity="0.3" />

                {/* Active Ring Segment (Dynamic based on state?) */}
                {/* Let's draw a partial arc or ticks */}
                <path d="M 50 4 A 46 46 0 0 1 50 4" stroke="#71717a" strokeWidth="1.5" strokeDasharray="1 3" opacity="0.4" />

                {/* Labels - Rotated around center */}

                {/* NO KEY (-50 deg) */}
                {/* We rotate the GROUP so text is upright-ish or radial? 
            User's CSS: `rotate-[-50deg]`. So radial.
        */}

                {/* NO KEY */}
                <g transform={`rotate(-50, 50, 50)`}>
                    <text
                        x="50" y="12"
                        textAnchor="middle"
                        fontSize="6"
                        fontFamily="monospace"
                        fontWeight={getFontWeight('NO_KEY')}
                        fill={getColor('NO_KEY')}
                        opacity={getOpacity('NO_KEY')}
                        letterSpacing="0.5"
                    // Rotate text back 90 degrees if we want it perpendicular to radius? 
                    // Currently aligned with radius line pointing UP. 
                    // At -50 deg (Top Left), y=12 is properly "above".
                    >
                        NO KEY
                    </text>

                    {/* Tick Mark */}
                    <line x1="50" y1="20" x2="50" y2="24" stroke={getColor('NO_KEY')} strokeWidth="1" />
                </g>

                {/* OFF (0 deg) */}
                <g transform={`rotate(0, 50, 50)`}>
                    <text
                        x="50" y="12"
                        textAnchor="middle"
                        fontSize="6"
                        fontFamily="monospace"
                        fontWeight={getFontWeight('OFF')}
                        fill={getColor('OFF')}
                        opacity={getOpacity('OFF')}
                        letterSpacing="0.5"
                    >
                        OFF
                    </text>
                    <line x1="50" y1="20" x2="50" y2="24" stroke={getColor('OFF')} strokeWidth="1" />
                </g>

                {/* ON (50 deg) */}
                <g transform={`rotate(50, 50, 50)`}>
                    <text
                        x="50" y="12"
                        textAnchor="middle"
                        fontSize="6"
                        fontFamily="monospace"
                        fontWeight={getFontWeight('ON')}
                        fill={getColor('ON')}
                        opacity={getOpacity('ON')}
                        letterSpacing="0.5"
                    >
                        ON
                    </text>

                    {/* Tick Mark */}
                    <line x1="50" y1="20" x2="50" y2="24" stroke={getColor('ON')} strokeWidth="1" />
                </g>

                {/* Decorative Inner Ring (Track -> Premium Gray) */}
                {/* Changed from #18181b (Zinc-900) to #3f3f46 (Zinc-700) */}
                <circle cx="50" cy="50" r="28" fill="none" stroke="#3f3f46" strokeWidth="6" opacity="0.8" />

            </svg>
        </div>
    );
};
