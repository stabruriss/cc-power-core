import React from 'react';

interface KeyAssetProps {
    className?: string;
    onClick?: () => void;
    isOn?: boolean;
}

export const KeyAsset: React.FC<KeyAssetProps> = ({ className, onClick, isOn = false }) => {
    return (
        <div
            className={`cursor-pointer group relative w-12 h-14 flex flex-col items-center justify-start z-10 transition-transform active:scale-[0.96] ${className}`}
            onClick={onClick}
        >
            {/* KEY HEAD (Dark Industrial Monolith) */}
            <div className="relative z-20 w-10 h-14">

                {/* Main Body: Matte Black/Dark Grey Metal */}
                <div className={`
            absolute inset-0 rounded-[2px] 
            bg-zinc-900
            border border-zinc-800
            shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]
            flex flex-col items-center overflow-hidden
            transition-colors duration-300
        `}>
                    {/* Grip Texture (Top Section) */}
                    <div className="w-full h-1/3 bg-zinc-950 flex flex-col justify-evenly py-1 px-2 border-b border-zinc-800">
                        <div className="w-full h-[1px] bg-zinc-800/50"></div>
                        <div className="w-full h-[1px] bg-zinc-800/50"></div>
                        <div className="w-full h-[1px] bg-zinc-800/50"></div>
                    </div>

                    {/* Core Section (Status Area) */}
                    <div className="flex-1 w-full flex flex-col items-center justify-center relative bg-gradient-to-b from-zinc-900 to-black">

                        {/* Status Window */}
                        <div className={`
                    w-1.5 h-8 rounded-full border border-black/80 bg-black/90
                    shadow-[inset_0_0_4px_rgba(0,0,0,1)]
                    flex flex-col items-center justify-end p-[1px]
                    transition-all duration-300
                `}>
                            {/* The "Rod" or "Filament" */}
                            <div className={`
                        w-full rounded-full transition-all duration-500 ease-out
                        ${isOn
                                    ? 'h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse'
                                    : 'h-1/4 bg-zinc-800'
                                }
                    `}></div>
                        </div>

                        {/* Technical Decal/Line */}
                        <div className="absolute bottom-2 left-1.5 text-[4px] text-zinc-600 font-mono rotate-90 tracking-tighter opacity-70">
                            IGN-SYS
                        </div>
                    </div>

                    {/* Bottom Cap */}
                    <div className="w-full h-1.5 bg-zinc-800 border-t border-black"></div>
                </div>

                {/* Specular Edge Highlight (Metal feel) */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20"></div>
                <div className="absolute inset-y-0 left-0 w-[1px] bg-white/5"></div>

            </div>

            {/* NO KEYCHAIN / TAG as requested ("Steady/Stable" look) */}

        </div>
    );
};
