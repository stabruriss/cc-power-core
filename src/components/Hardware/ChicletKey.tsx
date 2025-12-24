import React from 'react';

interface ChicletKeyProps {
    label: string;
    subLabel?: string;
    onClick?: () => void;
    variant?: 'default' | 'orange' | 'blue' | 'black';
    active?: boolean;
    className?: string;
    icon?: React.ReactNode;
}

export const ChicletKey: React.FC<ChicletKeyProps> = ({
    label,
    subLabel,
    onClick,
    variant = 'default',
    active = false,
    className = '',
    icon
}) => {
    const getColors = () => {
        switch (variant) {
            case 'orange': return 'bg-te-orange hover:bg-te-orange-dark text-white shadow-te-orange-dark';
            case 'blue': return 'bg-te-blue hover:bg-sky-700 text-white shadow-sky-900';
            case 'black': return 'bg-te-black hover:bg-zinc-800 text-white shadow-black';
            default: return 'bg-te-offwhite hover:bg-white text-te-black shadow-gray-400';
        }
    };

    return (
        <button
            onClick={onClick}
            className={`
        relative group flex flex-col items-center justify-center
        h-14 w-full rounded-md
        transition-all duration-75 ease-out
        border-b-4 active:border-b-0 active:translate-y-1
        ${active ? 'border-b-0 translate-y-1 brightness-90' : getColors().split(' ')[3] ? `border-${getColors().split(' ')[3].replace('shadow-', '')}` : 'border-gray-400'}
        ${getColors()}
        ${className}
      `}
        >
            {icon ? (
                <div className="mb-1">{icon}</div>
            ) : (
                <span className="font-bold font-mono text-xs tracking-wider uppercase">{label}</span>
            )}
            {subLabel && (
                <span className="absolute bottom-1 text-[8px] opacity-60 font-sans">{subLabel}</span>
            )}
        </button>
    );
};
