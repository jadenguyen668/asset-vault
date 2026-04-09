'use client';
import { LibraryCard } from './LibraryCard';
import { useAppStore } from '@/stores/appStore';
import type { Character } from '@/types/database';
import { PackageOpen } from 'lucide-react';

interface Props { characters: Character[]; }

export function LibraryGrid({ characters }: Props) {
  const { searchQuery, filterProjectId, filterType } = useAppStore();
  let filtered = characters;
  if (searchQuery) { const q = searchQuery.toLowerCase(); filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.json_name.toLowerCase().includes(q)); }
  if (filterType === 'project' && filterProjectId) filtered = filtered.filter((c) => c.project_id === filterProjectId);

  if (filtered.length === 0) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <PackageOpen className="h-16 w-16 text-accent/30" />
      <div><h2 className="text-lg font-bold text-text">Asset Library is Empty</h2><p className="mt-1 text-sm text-dim">Drag and drop Spine, GLTF, or Image files</p></div>
    </div>
  );

  return (
    <div className="grid auto-rows-min justify-center gap-3 p-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, 140px)' }}>
      {filtered.map((c) => <LibraryCard key={c.id} character={c} />)}
    </div>
  );
}
