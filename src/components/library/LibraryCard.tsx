'use client';
import type { Character } from '@/types/database';
import { Trash2 } from 'lucide-react';

interface Props {
  character: Character;
  onClick?: (character: Character) => void;
  onDelete?: (character: Character) => void;
  isSelected?: boolean;
}

export function LibraryCard({ character, onClick, onDelete, isSelected }: Props) {
  return (
    <div
      onClick={() => onClick?.(character)}
      className={`group relative flex w-[160px] cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_6px_24px_rgba(124,92,252,0.2)] ${isSelected ? 'border-accent ring-2 ring-accent/30 bg-accent/5' : 'border-border bg-panel-secondary hover:border-accent/60'}`}
    >
      {/* Thumbnail — fixed aspect ratio, centered */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#1a1a2e]">
        {character.thumbnail ? (
          <img 
            src={character.thumbnail} 
            alt={character.name} 
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] bg-transparent" 
            draggable={false}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-4xl opacity-20">🦴</span>
          </div>
        )}
        
        {/* Delete button — shown on hover when onDelete prop is provided */}
        {onDelete && (
          <button
            onMouseDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => { 
              e.stopPropagation(); 
              e.preventDefault();
              onDelete(character); 
            }}
            className="absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-red-600/80 text-white backdrop-blur-sm hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}


      </div>

      {/* Info section */}
      <div className="flex flex-col gap-0.5 px-2.5 py-2">
        <span 
          className="text-[11px] font-semibold text-text leading-tight line-clamp-2" 
          title={character.name}
        >
          {character.name}
        </span>
        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-dim" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {character.asset_type === 'spine' && (
            <span className="rounded-sm bg-accent/15 px-1 py-px text-accent font-semibold mr-1">v{character.spine_version}</span>
          )}
          <span className="truncate flex-1" title={character.profiles?.display_name || character.profiles?.email || 'Unknown'}>
            {character.profiles?.display_name || character.profiles?.email?.split('@')[0] || 'Unknown User'}
          </span>
        </div>
      </div>
    </div>
  );
}
