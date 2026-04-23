'use client';
import { LibraryCard } from './LibraryCard';
import { useAppStore } from '@/stores/appStore';
import type { Character, Collection } from '@/types/database';
import { PackageOpen } from 'lucide-react';

interface Props {
  characters: Character[];
  collections?: Collection[];
  onCardClick?: (character: Character) => void;
  onDelete?: (character: Character) => void;
  selectedId?: number;
}

export function LibraryGrid({ characters, collections, onCardClick, onDelete, selectedId }: Props) {
  const { searchQuery, filterProjectId, filterCollectionId, filterType, sortBy } = useAppStore();
  let filtered = characters;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    // Build a map of collection id -> name for search
    const collectionNameMap = new Map<number, string>();
    if (collections) {
      for (const col of collections) {
        collectionNameMap.set(col.id, col.name.toLowerCase());
      }
    }
    filtered = filtered.filter((c) => {
      // Match by name or json_name
      if (c.name.toLowerCase().includes(q)) return true;
      if (c.json_name.toLowerCase().includes(q)) return true;
      // Match by status (e.g. "draft", "in review", "in-review")
      if (c.status?.toLowerCase().replace(/-/g, ' ').includes(q)) return true;
      if (c.status?.toLowerCase().includes(q.replace(/\s+/g, '-'))) return true;
      // Match by spine version (e.g. "3.7", "4.2")
      if (c.spine_version?.toLowerCase().includes(q)) return true;
      // Match by tags
      if (c.tags?.some(t => t.toLowerCase().includes(q))) return true;
      // Match by notes
      if (c.notes?.toLowerCase().includes(q)) return true;
      // Match by collection name
      if (c.collection_ids?.some(id => collectionNameMap.get(id)?.includes(q))) return true;
      return false;
    });
  }
  if (filterType === 'project' && filterProjectId) filtered = filtered.filter((c) => c.project_id === filterProjectId);
  if (filterType === 'collection' && filterCollectionId) filtered = filtered.filter((c) => c.collection_ids?.includes(filterCollectionId));

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc': return new Date(b.imported_at || 0).getTime() - new Date(a.imported_at || 0).getTime();
      case 'date-asc': return new Date(a.imported_at || 0).getTime() - new Date(b.imported_at || 0).getTime();
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      default: return 0;
    }
  });

  if (filtered.length === 0) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <PackageOpen className="h-16 w-16 text-accent/30" />
      <div><h2 className="text-lg font-bold text-text">Asset Library is Empty</h2><p className="mt-1 text-sm text-dim">Drag and drop Spine files to preview</p></div>
    </div>
  );

  return (
    <div className="grid auto-rows-min justify-center gap-4 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, 160px)' }}>
      {filtered.map((c) => <LibraryCard key={c.id} character={c} onClick={onCardClick} onDelete={onDelete} isSelected={selectedId === c.id} />)}
    </div>
  );
}
