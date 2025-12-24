import React from 'react';

interface CostKnobProps {
    onClick: () => void;
    isOpen: boolean;
}

export const CostKnob: React.FC<CostKnobProps> = ({ onClick, isOpen }) => {
    return (
        <div
            onClick={onClick}
            className="w-20 h-20 rounded-full relative cursor-pointer group select-none active:scale-95 transition-transform duration-200"
            title="Wealth Protocol"
        >
            {/* 1. Base Dark Shadow/Well */}
            <div className="absolute inset-0 rounded-full bg-black/40 shadow-[inset_0_4px_8px_rgba(0,0,0,0.8)]" />

            {/* 2. Main Metallic Knob Body */}
            {/* Uses SVG for complex gradients and gear definition */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 drop-shadow-2xl">
                <defs>
                    {/* Metallic Gradient for Face */}
                    <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e4e4e7" /> {/* Zinc-200 */}
                        <stop offset="45%" stopColor="#a1a1aa" /> {/* Zinc-400 */}
                        <stop offset="55%" stopColor="#71717a" /> {/* Zinc-500 */}
                        <stop offset="100%" stopColor="#3f3f46" /> {/* Zinc-700 */}
                    </linearGradient>

                    {/* Darker Metal for Gear Teeth */}
                    <linearGradient id="gearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#52525b" />
                        <stop offset="100%" stopColor="#27272a" />
                    </linearGradient>

                    {/* Amber Glow for Active State */}
                    <filter id="amberGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                        <feColorMatrix in="blur" type="matrix" values="
                            0 0 0 0 1
                            0 0 0 0 0.7
                            0 0 0 0 0
                            0 0 0 1 0" />
                        <feBlend in="SourceGraphic" mode="normal" />
                    </filter>
                </defs>

                {/* Outer Gear Teeth Ring */}
                {/* Created by a thick dashed stroke or multiple rects rotated. Let's use a path for reliability. */}
                {/* A circle with stroke-dasharray can simulate teeth, but they are square. */}
                <circle
                    cx="50" cy="50" r="46"
                    fill="url(#gearGrad)"
                    stroke="#18181b"
                    strokeWidth="1"
                />

                {/* Simulated Teeth using a thick dashed stroke on a slightly smaller circle? 
                    Actually, let's just make the main face slightly smaller to reveal 'teeth' if we textured the background.
                    But drawing actual teeth is better. 
                    Let's draw 12 teeth.
                */}
                <g transform="translate(50,50)">
                    {[...Array(12)].map((_, i) => (
                        <rect
                            key={i}
                            x="-6" y="-48" width="12" height="10"
                            fill="#3f3f46"
                            rx="2"
                            transform={`rotate(${i * 30})`}
                            stroke="#000" strokeWidth="0.5"
                        />
                    ))}
                </g>

                {/* Inner Metallic Face */}
                <circle
                    cx="50" cy="50" r="40"
                    fill="url(#metalGrad)"
                    stroke="#fff"
                    strokeWidth="0.5"
                    strokeOpacity="0.5"
                    filter={isOpen ? "url(#amberGlow)" : ""}
                />

                {/* Concentric Brushed Ring Effects (Opacity Lines) */}
                <circle cx="50" cy="50" r="32" fill="none" stroke="#000" strokeWidth="0.5" opacity="0.1" />
                <circle cx="50" cy="50" r="25" fill="none" stroke="#000" strokeWidth="0.5" opacity="0.1" />

                {/* The "$" Symbol - Engraved Look */}
                {/* We use a text element, then mask or stroke it to look engraved */}
                <text
                    x="50" y="62"
                    textAnchor="middle"
                    fontSize="36"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="#27272a" /* Dark Zinc */
                    stroke="rgba(255,255,255,0.4)" /* Highlight edge for engraving 3D effect */
                    strokeWidth="1"
                    className="select-none"
                    style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5), -1px -1px 1px rgba(0,0,0,0.5)' }}
                >
                    $
                </text>

                {/* Top Shine/Reflection */}
                <ellipse cx="50" cy="25" rx="20" ry="10" fill="white" opacity="0.15" />
            </svg>

            {/* Activity Indicator (LED) */}
            <div className={`absolute top-0 right-0 w-2 h-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-amber-500 shadow-[0_0_8px_2px_rgba(245,158,11,0.6)]' : 'bg-zinc-800 shadow-inner'}`}></div>
        </div>
    );
};
