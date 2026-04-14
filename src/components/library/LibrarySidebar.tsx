'use client';
import { useAppStore } from '@/stores/appStore';
import { Menu, BookOpen, FolderOpen } from 'lucide-react';
import type { Project, Collection } from '@/types/database';

interface Props { projects: Project[]; collections: Collection[]; }

export function LibrarySidebar({ projects, collections }: Props) {
  const { sidebarCollapsed, toggleSidebar, filterType, setFilterType, filterProjectId, setFilterProjectId } = useAppStore();

  if (sidebarCollapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-panel-secondary py-4">
        <button onClick={toggleSidebar} className="text-text opacity-60 hover:opacity-100" aria-label="Toggle sidebar">
          <Menu className="h-4.5 w-4.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-55 shrink-0 flex-col border-r border-border bg-panel-secondary">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-4 py-4">
        <button onClick={toggleSidebar} className="text-text opacity-60 hover:opacity-100" aria-label="Toggle sidebar"><Menu className="h-4.5 w-4.5" /></button>
        <span className="flex items-center gap-1.5 text-sm font-bold text-accent"><BookOpen className="h-4 w-4" /> Asset Library</span>
      </div>
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
        <li onClick={() => { setFilterType('all'); setFilterProjectId(null); }}
          className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs ${filterType === 'all' ? 'bg-gradient-to-r from-accent to-[#6d4fde] font-semibold text-white' : 'text-text hover:bg-accent/10'}`}>Everything</li>
        <p className="mt-4 mb-1.5 ml-2 font-mono text-[10px] uppercase tracking-wider text-dim opacity-70">Projects</p>
        {projects.map((p) => (
          <li key={p.id} onClick={() => { setFilterType('project'); setFilterProjectId(p.id); }}
            className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs ${filterProjectId === p.id ? 'bg-gradient-to-r from-accent to-[#6d4fde] font-semibold text-white' : 'text-text hover:bg-accent/10'}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}
          </li>
        ))}
        <p className="mt-4 mb-1.5 ml-2 font-mono text-[10px] uppercase tracking-wider text-dim opacity-70">Collections</p>
        {collections.map((c) => (
          <li key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-text hover:bg-accent/10">
            <FolderOpen className="h-3.5 w-3.5 text-dim" />{c.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
