'use client';
import { useState, useEffect, useMemo } from 'react';
import type { ParsedSpineSet } from './DropZone';
import type { Project, Collection, Character } from '@/types/database';
import { findDuplicates } from '@/lib/db/characters';
import { NAMING_CATEGORIES, NAMING_LOCATIONS } from '@/lib/db/types';
import { X, Check, Save, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface ImportDialogItem {
  spineSet: ParsedSpineSet;
  name: string;
  originalName: string;
  isDuplicate: boolean;
  existingChar?: Character;
  selected: boolean;
  fileSize: number;
}

export interface ImportResult {
  selectedItems: ImportDialogItem[];
  projectId: number | null;
  newProject?: { name: string; code: string; color: string };
  collectionIds: number[];
  assetTags: string[];
  notes: string;
}

interface Props {
  sets: ParsedSpineSet[];
  projects: Project[];
  collections: Collection[];
  onConfirm: (result: ImportResult) => void;
  onCancel: () => void;
}

const STRIP_PREFIXES = [
  'fx_', 'vfx_', 'pu_', 'char_', 'chr_', 'bg_', 'ui_', 'uix_',
  'anm_', 'anim_', 'env_', 'ico_', 'icon_', 'prop_', 'prp_',
  'eff_', 'effect_', 'skel_', 'spine_', 'sp_',
];

function extractSubject(originalName: string): string {
  let name = originalName;
  for (const prefix of STRIP_PREFIXES) {
    if (name.toLowerCase().startsWith(prefix)) {
      name = name.substring(prefix.length);
      break;
    }
  }
  const parts = name.split('_').filter(p => p.length > 0);
  const capitalized = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
  return capitalized.join('');
}

function extractOriginalPrefix(originalName: string): string {
  for (const prefix of STRIP_PREFIXES) {
    if (originalName.toLowerCase().startsWith(prefix)) return prefix.replace(/_$/, '').toUpperCase();
  }
  const idx = originalName.indexOf('_');
  if (idx > 0 && idx <= 5) return originalName.substring(0, idx).toUpperCase();
  return '';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function ImportDialog({ sets, projects, collections: initialCollections, onConfirm, onCancel }: Props) {
  const [items, setItems] = useState<ImportDialogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [localCollections, setLocalCollections] = useState<Collection[]>(initialCollections || []);
  const [newCollectionName, setNewCollectionName] = useState('');
  const collections = localCollections;

  // Naming builder state
  const [builderCategory, setBuilderCategory] = useState('');
  const [builderLocation, setBuilderLocation] = useState('');
  const [builderSubject, setBuilderSubject] = useState('');
  const [builderVersion, setBuilderVersion] = useState('01');

  // Meta state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [assetTag, setAssetTag] = useState('Animation');

  const PROJECT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[7]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: any;
    
    async function load() {
      try {
        const names = sets.map(s => s.spineFiles.jsonName);
        
        // Timeout bảo vệ nếu findDuplicates bị kẹt backend/RLS
        const dupes = await Promise.race([
          findDuplicates(names),
          new Promise<Map<string, Character>>((resolve) => {
            timeoutId = setTimeout(() => {
              console.warn("findDuplicates timeout - proceeding anyway");
              resolve(new Map());
            }, 3000);
          })
        ]);
        
        if (!isMounted) return;

        const newItems: ImportDialogItem[] = sets.map(set => {
          const isDup = dupes.has(set.spineFiles.jsonName);
          let fileSize = new Blob([set.spineFiles.jsonText]).size + new Blob([set.spineFiles.atlasText]).size;
          for (const [, blob] of set.spineFiles.pngBlobs) fileSize += blob.size;
          return {
            spineSet: set,
            name: set.name,
            originalName: set.name,
            isDuplicate: isDup,
            existingChar: dupes.get(set.spineFiles.jsonName),
            selected: !isDup,
            fileSize,
          };
        });
        setItems(newItems);
      } catch (err) {
        console.error("Failed to load dialog:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sets]);

  const projectCodeStr = useMemo(() => {
    if (selectedProjectId === '__new__') return newProjectCode.trim() || '???';
    const p = projects.find(x => String(x.id) === selectedProjectId);
    return p ? p.code : '???';
  }, [selectedProjectId, newProjectCode, projects]);

  const previewName = `${projectCodeStr}_${builderCategory || '___'}_${builderLocation || '___'}_${builderSubject || '[auto]'}_v${builderVersion}`;

  const applyNaming = () => {
    if (!builderCategory || !builderLocation) return;
    const prefix = `${projectCodeStr}_${builderCategory}_${builderLocation}_`;
    const nameMap = new Map<string, number>();
    for (const item of items) {
      if (!item.selected) continue;
      const sub = builderSubject || extractSubject(item.originalName);
      const baseName = `${prefix}${sub}_v${builderVersion.padStart(2, '0')}`;
      nameMap.set(baseName, (nameMap.get(baseName) || 0) + 1);
    }
    const used = new Map<string, number>();
    setItems(prev => prev.map(item => {
      if (!item.selected) return item;
      const sub = builderSubject || extractSubject(item.originalName);
      const baseName = `${prefix}${sub}_v${builderVersion.padStart(2, '0')}`;
      if ((nameMap.get(baseName) || 0) > 1) {
        const origPref = extractOriginalPrefix(item.originalName);
        if (origPref) return { ...item, name: `${prefix}${sub}_${origPref}_v${builderVersion.padStart(2, '0')}` };
        const idx = (used.get(baseName) || 0) + 1;
        used.set(baseName, idx);
        return { ...item, name: idx === 1 ? baseName : `${prefix}${sub}${String(idx).padStart(2, '0')}_v${builderVersion.padStart(2, '0')}` };
      }
      return { ...item, name: baseName };
    }));
  };

  const handleImport = () => {
    const selectedItems = items.filter(i => i.selected);
    if (!selectedItems.length) return;
    const res: ImportResult = {
      selectedItems,
      projectId: selectedProjectId !== '__new__' && selectedProjectId ? parseInt(selectedProjectId) : null,
      collectionIds: selectedCollectionIds,
      assetTags: [assetTag],
      notes,
    };
    if (selectedProjectId === '__new__' && (newProjectCode || newProjectName)) {
      res.newProject = { code: newProjectCode || newProjectName.substring(0, 4).toUpperCase(), name: newProjectName || newProjectCode, color: selectedColor };
    }
    onConfirm(res);
  };

  const totalSize = items.filter(i => i.selected).reduce((s, i) => s + i.fileSize, 0);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-xl text-white flex items-center gap-2"><div className="h-6 w-6 animate-spin rounded-full border-t-2 border-accent"></div> Checking library...</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="flex h-[90vh] w-[900px] flex-col rounded-xl border border-border bg-panel shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-bold text-text">Save to Library</h2>
            <div className="flex gap-2 text-xs mt-1">
              <span className="rounded bg-accent/20 px-2 py-0.5 text-accent font-semibold">{items.filter(i => !i.isDuplicate).length} new</span>
              {items.filter(i => i.isDuplicate).length > 0 && <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-400 font-semibold">{items.filter(i => i.isDuplicate).length} already exist</span>}
            </div>
          </div>
          <button onClick={onCancel} className="rounded p-2 text-dim hover:bg-white/10 hover:text-white"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: List */}
          <div className="flex flex-col flex-1 border-r border-border min-w-0">
            <div className="flex items-center justify-between p-3 border-b border-border bg-panel-secondary">
              <label className="flex items-center gap-2 text-sm text-dim cursor-pointer">
                <input type="checkbox" checked={items.every(i => i.selected)} 
                  onChange={e => { const v = e.target.checked; setItems(prev => prev.map(p => ({ ...p, selected: v }))); }} />
                Select All
              </label>
              <div className="text-xs text-dim">{formatSize(totalSize)} total</div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {items.map((item, idx) => (
                <div key={idx} className={`mb-2 flex items-center gap-3 rounded-lg border ${item.isDuplicate ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-panel'} p-3 py-2 transistion`}>
                  <input type="checkbox" checked={item.selected} onChange={e => { const v = e.target.checked; setItems(prev => prev.map((p, i) => i === idx ? { ...p, selected: v } : p)); }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <input type="text" className="bg-transparent text-sm font-semibold text-text outline-none focus:border-accent border-b border-transparent max-w-[200px]" value={item.name}
                        onChange={e => { const v = e.target.value; setItems(prev => prev.map((p, i) => i === idx ? { ...p, name: v } : p)); }} />
                      {item.name !== item.originalName && <span className="text-[10px] text-dim bg-white/5 px-1 rounded truncate max-w-[100px]" title={item.originalName}>✏️ {item.originalName}</span>}
                    </div>
                    <div className="flex gap-3 text-[10px] text-dim mt-1 font-mono">
                      <span>🎬 {item.spineSet.animCount}</span>
                      <span>🦴 {item.spineSet.boneCount}</span>
                      <span>{formatSize(item.fileSize)}</span>
                    </div>
                  </div>
                  {item.isDuplicate && <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-500 font-bold uppercase tracking-wider">Exists</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Meta */}
          <div className="w-[340px] flex flex-col bg-panel-secondary overflow-y-auto">
            <div className="p-4 flex flex-col gap-5">
              
              {/* Naming Builder */}
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-dim mb-3">Naming Builder</div>
                <div className="rounded border border-border bg-bg p-3 shadow-inner">
                  <div className="text-center font-mono text-[13px] font-bold text-accent mb-4 break-all">{previewName}</div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] text-dim mb-1">Category</div>
                      <div className="flex flex-wrap gap-1">
                        {NAMING_CATEGORIES.map(c => <button key={c} onClick={() => setBuilderCategory(c === builderCategory ? '' : c)} className={`rounded px-2 py-1 text-[10px] font-bold ${c === builderCategory ? 'bg-accent text-white' : 'bg-white/5 text-dim hover:bg-white/10'}`}>{c}</button>)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-dim mb-1">Location</div>
                      <div className="flex flex-wrap gap-1">
                        {NAMING_LOCATIONS.map(c => <button key={c} onClick={() => setBuilderLocation(c === builderLocation ? '' : c)} className={`rounded px-2 py-1 text-[10px] font-bold ${c === builderLocation ? 'bg-accent text-white' : 'bg-white/5 text-dim hover:bg-white/10'}`}>{c}</button>)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <div className="text-[10px] text-dim mb-1">Subject</div>
                          <input type="text" className="w-full rounded border border-border bg-panel px-2 py-1 text-xs text-text outline-none" placeholder="auto" value={builderSubject} onChange={e => setBuilderSubject(e.target.value)} />
                       </div>
                       <div className="w-16">
                          <div className="text-[10px] text-dim mb-1">Version</div>
                          <input type="text" className="w-full rounded border border-border bg-panel px-2 py-1 text-xs text-text outline-none" value={builderVersion} onChange={e => setBuilderVersion(e.target.value.replace(/[^0-9]/g, ''))} />
                       </div>
                    </div>
                    <button onClick={applyNaming} className="w-full rounded bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-accent transistion flex items-center justify-center gap-2">
                      <Check size={14} /> Apply to Selected
                    </button>
                  </div>
                </div>
              </div>

              {/* Project Map */}
              <div>
                 <div className="text-xs font-bold uppercase tracking-widest text-dim mb-2">Project</div>
                 <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full rounded border border-border bg-panel px-3 py-2 text-sm text-text outline-none mb-2">
                   <option value="">— No Project —</option>
                   {projects.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                   <option value="__new__">➕ New Project...</option>
                 </select>
                 {selectedProjectId === '__new__' && (
                    <div className="rounded border border-border bg-bg p-3 mt-2 flex flex-col gap-2">
                       <div className="flex gap-2">
                         <input type="text" placeholder="CODE" className="w-1/3 uppercase rounded border border-border bg-panel px-2 py-1.5 text-xs outline-none" value={newProjectCode} onChange={e => setNewProjectCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6))} />
                         <input type="text" placeholder="Project Name" className="flex-1 rounded border border-border bg-panel px-2 py-1.5 text-xs outline-none" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                       </div>
                       <div className="flex flex-wrap gap-1 mt-1">
                          {PROJECT_COLORS.map(c => <button key={c} onClick={() => setSelectedColor(c)} className={`h-5 w-5 rounded-full border-2 ${c === selectedColor ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                       </div>
                    </div>
                 )}
              </div>

              {/* Collections Map */}
              <div>
                 <div className="text-xs font-bold uppercase tracking-widest text-dim mb-2">Collections</div>
                 <div className="max-h-24 overflow-y-auto rounded border border-border bg-panel p-2 text-xs text-text space-y-1">
                   {collections.length > 0 ? collections.map(c => (
                     <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                       <input type="checkbox" checked={selectedCollectionIds.includes(c.id)} onChange={(e) => {
                         if (e.target.checked) setSelectedCollectionIds(prev => [...prev, c.id]);
                         else setSelectedCollectionIds(prev => prev.filter(id => id !== c.id));
                       }} />
                       <span className="truncate">{c.name}</span>
                     </label>
                   )) : <div className="text-dim italic">No collections yet</div>}
                 </div>
                 <div className="mt-1 flex gap-1">
                   <input 
                     type="text" 
                     placeholder="+ New Collection" 
                     className="flex-1 rounded border border-border bg-panel px-2 py-1.5 text-xs outline-none focus:border-accent text-text" 
                     value={newCollectionName}
                     onChange={e => setNewCollectionName(e.target.value)}
                     onKeyDown={async (e) => {
                       if (e.key === 'Enter') {
                         const val = newCollectionName.trim();
                         if (!val) return;
                         e.preventDefault();
                         try {
                           const supabase = createClient();
                           const { data, error } = await supabase.from('collections').insert([{ name: val, color: '#7c5cfc' }]).select('*').single();
                           if (error) { console.error('[Collection] Create error:', error); return; }
                           if (data) {
                             setLocalCollections(prev => [...prev, data as Collection]);
                             setSelectedCollectionIds(prev => [...prev, data.id]);
                             setNewCollectionName('');
                           }
                         } catch (err) { console.error('[Collection] Create failed:', err); }
                       }
                     }}
                   />
                   <button
                     type="button"
                     className="rounded border border-border bg-accent/20 px-2 py-1 text-xs text-accent hover:bg-accent hover:text-white transition-colors"
                     onClick={async () => {
                       const val = newCollectionName.trim();
                       if (!val) return;
                       try {
                         const supabase = createClient();
                         const { data, error } = await supabase.from('collections').insert([{ name: val, color: '#7c5cfc' }]).select('*').single();
                         if (error) { console.error('[Collection] Create error:', error); return; }
                         if (data) {
                           setLocalCollections(prev => [...prev, data as Collection]);
                           setSelectedCollectionIds(prev => [...prev, data.id]);
                           setNewCollectionName('');
                         }
                       } catch (err) { console.error('[Collection] Create failed:', err); }
                     }}
                   >
                     <Plus size={12} />
                   </button>
                 </div>
              </div>

               {/* Meta Data */}
               <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-dim mb-2">Metadata</div>
                  <label className="flex gap-2 text-xs text-dim bg-panel px-3 py-2 rounded border border-border mb-2 cursor-pointer">
                     <input type="radio" checked={assetTag === 'Animation'} onChange={() => setAssetTag('Animation')} /> 🎬 Animation
                  </label>
                  <label className="flex gap-2 text-xs text-dim bg-panel px-3 py-2 rounded border border-border mb-2 cursor-pointer">
                     <input type="radio" checked={assetTag === 'Artwork'} onChange={() => setAssetTag('Artwork')} /> 🎨 Artwork
                  </label>
                  <textarea placeholder="Notes or additional tags..." className="w-full rounded border border-border bg-panel px-3 py-2 text-xs text-text outline-none min-h-[60px]" value={notes} onChange={e => setNotes(e.target.value)} />
               </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border p-4">
           <button onClick={onCancel} className="rounded px-4 py-2 text-sm font-semibold text-dim hover:text-white">Cancel</button>
           <button onClick={handleImport} disabled={!items.some(i => i.selected)} className="flex items-center gap-2 rounded bg-gradient-to-br from-accent to-[#6d4fde] px-6 py-2 text-sm font-bold text-white shadow hover:scale-105 disabled:opacity-50 disabled:pointer-events-none transition-all">
              <Save size={16} /> Import {items.filter(i => i.selected).length} Items
           </button>
        </div>
      </div>
    </div>
  );
}
