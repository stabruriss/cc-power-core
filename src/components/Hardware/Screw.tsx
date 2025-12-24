import React from 'react';

export const Screw: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`w-3 h-3 rounded-full bg-zinc-400 border border-zinc-500 flex items-center justify-center shadow-inner ${className}`}>
        {/* Flathead screw slot */}
        <div className="w-full h-[1px] bg-zinc-600 rotate-45 transform"></div>
    </div>
);
