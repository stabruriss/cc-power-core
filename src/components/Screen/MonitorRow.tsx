import React, { useRef, useEffect, useState } from 'react';
import { EnvVarDefinition } from '../../types';
import { Edit2, Check, X, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface MonitorRowProps {
    def: EnvVarDefinition;
    value: string;
    onEdit?: () => void;
    // Edit Mode Props
    isEditing?: boolean;
    editValue?: string;
    onEditValueChange?: (val: string) => void;
    onSave?: (val?: string) => void;
    onCancel?: () => void;
    options?: string[];
    displayOverride?: string;
}

export const MonitorRow: React.FC<MonitorRowProps> = ({
    def,
    value,
    onEdit,
    isEditing,
    editValue,
    onEditValueChange,
    onSave,
    onCancel,
    options,
    displayOverride
}) => {
    const displayValue = displayOverride || (!value ? '<EMPTY>' : (def.isSecret ? '••••••••••••••••' : value));
    const inputRef = useRef<HTMLInputElement>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    // Calculate dropdown position when editing
    useEffect(() => {
        if (isEditing && inputContainerRef.current) {
            const rect = inputContainerRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 2,
                left: rect.left,
                width: rect.width
            });
        } else {
            setDropdownPos(null);
        }
    }, [isEditing, editValue]);

    const filteredOptions = options?.filter(opt =>
        !editValue || opt.toLowerCase().includes(editValue.toLowerCase())
    ) || [];

    const [activeIndex, setActiveIndex] = useState<number>(-1);

    // Reset active index when edit value changes (filtering changes)
    useEffect(() => {
        setActiveIndex(-1);
    }, [editValue]);

    // Scroll active item into view
    const listRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const activeItem = listRef.current.children[activeIndex] as HTMLElement;
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    // Inline Edit Mode
    if (isEditing && onEditValueChange && onSave && onCancel) {
        return (
            <div className="relative py-2 px-2 border-b border-zinc-800 bg-[#151515] -mx-1 px-3 z-20 shadow-lg border-l-2 border-l-te-orange transition-all duration-200">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] font-sans font-bold text-te-orange tracking-wide uppercase">
                        Editing {def.label.split('_').pop()}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-0.5 px-1.5 bg-te-blue hover:bg-blue-600 text-white rounded-[1px] shadow-sm flex items-center gap-1">
                            <Check size={8} /> <span className="text-[8px] font-bold">SET</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="p-0.5 px-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-[1px] shadow-sm flex items-center gap-1">
                            <X size={8} />
                        </button>
                    </div>
                </div>

                {/* Input Area */}
                <div ref={inputContainerRef} className="relative mb-1">
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => onEditValueChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (activeIndex >= 0 && filteredOptions[activeIndex]) {
                                    // Pass explicit value
                                    onSave(filteredOptions[activeIndex]);
                                } else {
                                    onSave();
                                }
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                onCancel();
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setActiveIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
                            }
                            if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActiveIndex(prev => Math.max(prev - 1, 0));
                            }
                        }}
                        className="w-full bg-black border border-zinc-700 text-[10px] font-mono text-te-offwhite p-1.5 pr-6 outline-none focus:border-te-orange placeholder-zinc-700 shadow-inner"
                        placeholder="SELECT OR TYPE..."
                    />
                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />

                    {/* Options List - Portal to body to avoid overflow clipping */}
                    {options && options.length > 0 && dropdownPos && createPortal(
                        <div
                            ref={listRef}
                            style={{
                                position: 'fixed',
                                top: dropdownPos.top,
                                left: dropdownPos.left,
                                width: dropdownPos.width,
                                zIndex: 9999
                            }}
                            className="flex flex-col gap-[1px] bg-[#0a0a0a] border border-zinc-800 max-h-48 overflow-y-auto screen-scroll shadow-hard-sm"
                        >
                            {filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => (
                                <div
                                    key={opt}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Directly save the clicked option
                                        onSave(opt);
                                    }}
                                    className={`
                                px-2 py-1.5 text-[9px] font-mono cursor-pointer flex items-center gap-2 transition-colors border-b border-zinc-900 last:border-0
                                ${editValue === opt || activeIndex === idx ? 'bg-te-orange/20 text-te-orange' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'}
                            `}
                                >
                                    <div className={`w-1 h-1 rounded-full ${editValue === opt || activeIndex === idx ? 'bg-te-orange' : 'bg-transparent border border-zinc-700'}`}></div>
                                    {opt}
                                </div>
                            )) : (
                                <div className="px-2 py-2 text-[9px] font-mono text-zinc-600 italic text-center">
                                    No matching models
                                </div>
                            )}
                        </div>,
                        document.body
                    )}
                </div>
            </div>
        );
    }

    // Read-only / Default View
    return (
        <div
            onClick={onEdit}
            className={`group relative flex items-center justify-between py-2 px-2 border-b border-zinc-800 transition-colors ${onEdit ? 'hover:bg-te-blue hover:text-white cursor-pointer' : 'hover:bg-zinc-900/30 cursor-default'}`}
        >
            <div className="flex flex-col overflow-hidden mr-2">
                <span className={`text-[9px] font-sans font-semibold tracking-wide mb-0.5 break-all leading-tight ${onEdit ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-600'}`}>
                    {def.label}
                </span>
                <span className={`font-mono text-xs truncate ${!value ? 'text-zinc-600' : 'text-te-offwhite'}`}>
                    {displayValue}
                </span>
            </div>

            {onEdit && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Edit2 size={12} />
                </div>
            )}

            {/* Grid line effect */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-zinc-800/50"></div>
        </div>
    );
};
