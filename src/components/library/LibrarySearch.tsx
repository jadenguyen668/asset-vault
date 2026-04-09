'use client';
import { useAppStore } from '@/stores/appStore';
import { Search, Upload } from 'lucide-react';

export function LibrarySearch() {
  const { searchQuery, setSearchQuery, sortBy, setSortBy } = useAppStore();
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-panel px-3.5 py-2.5">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        <input type="text" placeholder="Search assets…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off"
          className="w-full rounded-lg border border-border bg-panel-secondary py-1.5 pl-9 pr-3 text-sm text-text outline-none placeholder:text-dim hover:border-accent/50 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,92,252,0.15)]" />
      </div>
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="shrink-0 rounded-md border border-border bg-panel-secondary px-2.5 py-1.5 text-xs text-text outline-none">
        <option value="date-desc">Newest</option><option value="date-asc">Oldest</option><option value="name-asc">A→Z</option><option value="name-desc">Z→A</option>
      </select>
      <button className="flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-br from-accent to-[#6d4fde] px-3 py-1.5 text-xs font-bold text-white hover:-translate-y-0.5 hover:shadow-lg">
        <Upload className="h-3.5 w-3.5" /> IMPORT
      </button>
    </div>
  );
}
