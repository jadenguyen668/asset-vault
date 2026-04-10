'use client';
import type { Character } from '@/types/database';
import { Eye, Globe, Lock } from 'lucide-react';

interface Props {
  character: Character;
  onClick?: (character: Character) => void;
  isSelected?: boolean;
}

export function LibraryCard({ character, onClick, isSelected }: Props) {
  return (
    <div
      onClick={() => onClick?.(character)}
      className={`group flex w-[140px] cursor-pointer flex-col overflow-hidden rounded-[10px] border transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(124,92,252,0.15)] ${isSelected ? 'border-accent bg-accent/10' : 'border-border bg-panel-secondary hover:border-accent'}`}
      style={{ minHeight: '170px' }}
    >
      <div className="relative flex h-24 items-center justify-center overflow-hidden bg-bg">
        {character.thumbnail ? <img src={character.thumbnail} alt={character.name} className="h-full w-full object-contain" /> : <span className="text-3xl opacity-30">🦴</span>}
        <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100">
          <button className="flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-accent-light backdrop-blur-sm"><Eye className="h-3 w-3" /></button>
        </div>
        <div className="absolute left-1 top-1">{character.visibility === 'public' ? <Globe className="h-3 w-3 text-green" /> : <Lock className="h-3 w-3 text-dim" />}</div>
      </div>
      <div className="flex flex-1 flex-col p-1.5">
        <span className="text-xs font-semibold text-text" style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>{character.name}</span>
        <div className="mt-0.5 flex flex-wrap gap-1 font-mono text-[10px] text-dim" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {character.asset_type === 'spine' && <span className="rounded bg-accent/10 px-1 text-accent">v{character.spine_version}</span>}
          {character.asset_type === 'spine' && <span>{character.anim_count} anims</span>}
          <span>{(character.file_size / 1024).toFixed(0)}KB</span>
        </div>
      </div>
    </div>
  );
}
