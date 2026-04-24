'use client';
import { useAppStore } from '@/stores/appStore';
import { Menu, BookOpen, FolderOpen, Trash2, Tag, Activity } from 'lucide-react';
import type { Project, Collection } from '@/types/database';
import { useState } from 'react';
import { deleteProject } from '@/lib/db/projects';
import { deleteCollection } from '@/lib/db/collections';
import { useRouter } from 'next/navigation';

interface Props { projects: Project[]; collections: Collection[]; tags?: string[]; statuses?: string[]; }

export function LibrarySidebar({ projects, collections, tags = [], statuses = [] }: Props) {
  const { sidebarCollapsed, toggleSidebar, filterType, setFilterType, filterProjectId, setFilterProjectId, filterCollectionId, setFilterCollectionId, filterTag, setFilterTag, filterStatus, setFilterStatus } = useAppStore();
  const router = useRouter();
  const [pendingDeleteProject, setPendingDeleteProject] = useState<Project | null>(null);
  const [pendingDeleteCollection, setPendingDeleteCollection] = useState<Collection | null>(null);

  const confirmDeleteProject = async () => {
    if (!pendingDeleteProject) return;
    try {
      await deleteProject(pendingDeleteProject.id);
      if (filterProjectId === pendingDeleteProject.id) {
        setFilterType('all');
        setFilterProjectId(null);
      }
      setPendingDeleteProject(null);
      router.refresh();
    } catch (e: any) {
      alert(`Delete failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const confirmDeleteCollection = async () => {
    if (!pendingDeleteCollection) return;
    try {
      await deleteCollection(pendingDeleteCollection.id);
      if (filterCollectionId === pendingDeleteCollection.id) {
        setFilterType('all');
        setFilterCollectionId(null);
      }
      setPendingDeleteCollection(null);
      router.refresh();
    } catch (e: any) {
      alert(`Delete failed: ${e?.message || 'Unknown error'}`);
    }
  };
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
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5 min-h-0">
        <li onClick={() => { setFilterType('all'); setFilterProjectId(null); setFilterCollectionId(null); setFilterTag(null); setFilterStatus(null); }}
          className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs ${filterType === 'all' ? 'bg-gradient-to-r from-accent to-[#6d4fde] font-semibold text-white' : 'text-text hover:bg-accent/10'}`}>Everything</li>
        <p className="mt-4 mb-1.5 ml-2 font-mono text-[10px] uppercase tracking-wider text-dim opacity-70">Projects</p>
        {projects.map((p) => (
          <li key={p.id} onClick={() => { setFilterType('project'); setFilterProjectId(p.id); }}
            className={`group relative flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs ${filterProjectId === p.id ? 'bg-gradient-to-r from-accent to-[#6d4fde] font-semibold text-white' : 'text-text hover:bg-accent/10'}`}>
            <div className="flex items-center gap-2 overflow-hidden pr-6">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPendingDeleteProject(p); }}
              className="absolute right-2 opacity-0 group-hover:opacity-100 hover:text-red transition-all p-1"
              title="Delete Project"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        <p className="mt-4 mb-1.5 ml-2 font-mono text-[10px] uppercase tracking-wider text-dim opacity-70">Collections</p>
        {collections.map((c) => (
          <li key={c.id} onClick={() => { setFilterType('collection'); setFilterCollectionId(c.id); }}
            className={`group relative flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs ${filterType === 'collection' && filterCollectionId === c.id ? 'bg-gradient-to-r from-accent to-[#6d4fde] font-semibold text-white' : 'text-text hover:bg-accent/10'}`}>
            <div className="flex items-center gap-2 overflow-hidden pr-6">
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-dim" />
              <span className="truncate">{c.name}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPendingDeleteCollection(c); }}
              className="absolute right-2 opacity-0 group-hover:opacity-100 hover:text-red transition-all p-1"
              title="Delete Collection"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {tags.length > 0 && (
          <>
            <p className="mt-4 mb-1.5 ml-2 font-mono text-[10px] uppercase tracking-wider text-dim opacity-70">Tags</p>
            {tags.map((t) => (
              <li key={t} onClick={() => { setFilterType('tag'); setFilterTag(t); }}
                className={`group relative flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs ${filterType === 'tag' && filterTag === t ? 'bg-gradient-to-r from-accent to-[#6d4fde] font-semibold text-white' : 'text-text hover:bg-accent/10'}`}>
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <Tag className="h-3 w-3 shrink-0 text-dim" />
                  <span className="truncate">{t}</span>
                </div>
              </li>
            ))}
          </>
        )}
        {statuses.length > 0 && (
          <>
            <p className="mt-4 mb-1.5 ml-2 font-mono text-[10px] uppercase tracking-wider text-dim opacity-70">Status</p>
            {statuses.map((s) => (
              <li key={s} onClick={() => { setFilterType('status'); setFilterStatus(s); }}
                className={`group relative flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs ${filterType === 'status' && filterStatus === s ? 'bg-gradient-to-r from-accent to-[#6d4fde] font-semibold text-white' : 'text-text hover:bg-accent/10'}`}>
                <div className="flex items-center gap-2 overflow-hidden pr-2 capitalize">
                  <Activity className="h-3 w-3 shrink-0 text-dim" />
                  <span className="truncate">{s.replace('-', ' ')}</span>
                </div>
              </li>
            ))}
          </>
        )}
      </ul>

      {/* Delete Project Modal */}
      {pendingDeleteProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPendingDeleteProject(null)}>
          <div className="rounded-xl border border-border bg-panel p-6 shadow-2xl w-[340px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-text mb-2">Delete Project</h3>
            <p className="text-sm text-dim mb-5">Delete <strong className="text-text">&quot;{pendingDeleteProject.name}&quot;</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingDeleteProject(null)} className="rounded-lg px-4 py-2 text-sm text-dim hover:text-text hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={confirmDeleteProject} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Collection Modal */}
      {pendingDeleteCollection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPendingDeleteCollection(null)}>
          <div className="rounded-xl border border-border bg-panel p-6 shadow-2xl w-[340px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-text mb-2">Delete Collection</h3>
            <p className="text-sm text-dim mb-5">Delete <strong className="text-text">&quot;{pendingDeleteCollection.name}&quot;</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingDeleteCollection(null)} className="rounded-lg px-4 py-2 text-sm text-dim hover:text-text hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={confirmDeleteCollection} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
