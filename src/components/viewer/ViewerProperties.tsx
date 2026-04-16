'use client';
import { useState, useEffect, useMemo } from 'react';
import type { Character, Project, Collection, AssetStatus } from '@/types/database';
import { Box, Calendar, FileText, Tag, Bone, Layers, Film, HardDrive, Edit2, Save, X, FolderOpen } from 'lucide-react';

interface Props {
  character: Character | null;
  projects?: Project[];
  collections?: Collection[];
  onUpdate?: (updates: Partial<Character>, newProj?: { code: string; name: string; color: string }) => void;
}

const NAMING_CATEGORIES = ['VFX', 'UI', 'ANM', 'CHR', 'OBJ', 'PRT', 'BG'];
const NAMING_LOCATIONS = ['LOB', 'ING', 'CMN', 'PL', 'EN'];
const PROJECT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

export function ViewerProperties({ character, projects = [], collections = [], onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  
  // States
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<AssetStatus>('draft');
  const [editTags, setEditTags] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editProject, setEditProject] = useState<string>('');
  const [editCollectionIds, setEditCollectionIds] = useState<number[]>([]);
  const [editAllowDownload, setEditAllowDownload] = useState(true);

  // New Project State
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[7]);

  // Naming Builder State
  const [builderCategory, setBuilderCategory] = useState('');
  const [builderLocation, setBuilderLocation] = useState('');
  const [builderSubject, setBuilderSubject] = useState('');
  const [builderVersion, setBuilderVersion] = useState('1');

  useEffect(() => {
    if (character) {
      setEditName(character.name || '');
      setEditStatus((character.status as AssetStatus) || 'draft');
      setEditTags((character.tags || []).join(', '));
      setEditNotes(character.notes || '');
      setEditProject(character.project_id ? String(character.project_id) : '');
      setEditCollectionIds(character.collection_ids || []);
      setEditAllowDownload(character.allow_download ?? true);
      
      // Auto-parse values from existing name if possible
      const parts = (character.name || '').split('_');
      if (parts.length >= 4) {
        setBuilderCategory(NAMING_CATEGORIES.includes(parts[1]) ? parts[1] : '');
        setBuilderLocation(NAMING_LOCATIONS.includes(parts[2]) ? parts[2] : '');
        const verStr = parts.find(p => p.startsWith('v') && !isNaN(parseInt(p.slice(1))));
        if (verStr) {
          setBuilderVersion(parseInt(verStr.slice(1)).toString());
          const namePartStart = 3;
          const namePartEnd = parts.indexOf(verStr);
          if (namePartEnd > namePartStart) {
            setBuilderSubject(parts.slice(namePartStart, namePartEnd).join('_'));
          } else {
            setBuilderSubject(parts[3] || '');
          }
        }
      } else {
        setBuilderSubject(character.name || '');
      }
    }
  }, [character, isEditing]);

  const projectCodeStr = useMemo(() => {
    if (editProject === '__new__') return newProjectCode.trim() || '???';
    const p = projects.find(x => String(x.id) === editProject);
    return p ? p.code : '???';
  }, [editProject, newProjectCode, projects]);

  const generatedName = `${projectCodeStr}_${builderCategory || '___'}_${builderLocation || '___'}_${builderSubject || '[auto]'}_v${builderVersion.padStart(2, '0')}`;

  const handleSave = () => {
    if (!onUpdate) return;
    const finalName = (builderCategory && builderLocation) ? generatedName : editName;
    
    const updates: Partial<Character> = {
      name: finalName,
      status: editStatus,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
      notes: editNotes,
      project_id: editProject && editProject !== '__new__' ? parseInt(editProject) : null,
      collection_ids: editCollectionIds,
      allow_download: editAllowDownload,
    };
    
    let newProj;
    if (editProject === '__new__' && (newProjectCode || newProjectName)) {
      newProj = {
        code: newProjectCode || newProjectName.substring(0, 4).toUpperCase(),
        name: newProjectName || newProjectCode,
        color: selectedColor
      };
    }
    
    onUpdate(updates, newProj);
    setIsEditing(false);
  };

  const toggleCollection = (id: number) => {
    setEditCollectionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (!character) {
    return (
      <div className="flex flex-1 items-center justify-center p-5 text-center text-sm text-dim">
        Select an asset<br />to view properties
      </div>
    );
  }

  const rows: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'File', value: character.json_name, icon: <FileText size={12} /> },
    { label: 'Type', value: character.asset_type.toUpperCase(), icon: <Layers size={12} /> },
  ];

  if (character.asset_type === 'spine') {
    rows.push(
      { label: 'Version', value: `Spine ${character.spine_version}`, icon: <Tag size={12} /> },
      { label: 'Bones', value: String(character.bone_count), icon: <Bone size={12} /> },
      { label: 'Slots', value: String(character.slot_count), icon: <Layers size={12} /> },
      { label: 'Anims', value: String(character.anim_count), icon: <Film size={12} /> },
      { label: 'Skins', value: String(character.skin_count), icon: <Layers size={12} /> },
    );
  }

  rows.push(
    { label: 'Size', value: formatSize(character.file_size), icon: <HardDrive size={12} /> },
    { label: 'Imported', value: formatDate(character.imported_at), icon: <Calendar size={12} /> },
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Box size={12} className="text-accent" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-dim font-mono">Properties</span>
        </div>
        {onUpdate && (
          isEditing ? (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="text-dim hover:text-white"><X size={14} /></button>
              <button onClick={handleSave} className="text-accent hover:text-accent-light"><Save size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="text-dim hover:text-white"><Edit2 size={12} /></button>
          )
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3.5">
        {/* Name / Naming Builder */}
        {isEditing ? (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Asset Name</span>
            
            <div className="mt-1 rounded border border-border bg-bg p-2 shadow-inner space-y-2">
               {/* Free text name (fallback if builder isn't used) */}
               <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  className="w-full rounded border border-border bg-panel px-2 py-1.5 text-xs text-text outline-none focus:border-accent" 
                  placeholder="Asset Name (Or use Builder below)" 
                />

               <div className="border-t border-border pt-2">
                 <div className="text-[10px] font-bold text-dim mb-1 uppercase tracking-widest">Naming Builder</div>
                 <div className="text-center font-mono text-[11px] font-bold text-accent mb-2 break-all bg-panel py-1 rounded border border-border">
                   {generatedName}
                 </div>
                 <div className="flex flex-wrap gap-1 mb-2">
                    {NAMING_CATEGORIES.map(c => <button key={c} onClick={() => setBuilderCategory(c === builderCategory ? '' : c)} className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${c === builderCategory ? 'bg-accent text-white' : 'bg-white/5 text-dim hover:bg-white/10'}`}>{c}</button>)}
                 </div>
                 <div className="flex flex-wrap gap-1 mb-2">
                    {NAMING_LOCATIONS.map(c => <button key={c} onClick={() => setBuilderLocation(c === builderLocation ? '' : c)} className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${c === builderLocation ? 'bg-accent text-white' : 'bg-white/5 text-dim hover:bg-white/10'}`}>{c}</button>)}
                 </div>
                 <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[9px] text-dim mb-0.5">Subject</div>
                      <input type="text" className="w-full rounded border border-border bg-panel px-1.5 py-1 text-[10px] text-text outline-none" value={builderSubject} onChange={e => setBuilderSubject(e.target.value)} />
                    </div>
                    <div className="w-12">
                      <div className="text-[9px] text-dim mb-0.5">v</div>
                      <input type="text" className="w-full rounded border border-border bg-panel px-1.5 py-1 text-[10px] text-text outline-none text-center" value={builderVersion} onChange={e => setBuilderVersion(e.target.value.replace(/[^0-9]/g, ''))} />
                    </div>
                 </div>
                 <button 
                   onClick={() => setEditName(generatedName)} 
                   className="mt-2 w-full rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-accent transistion"
                 >
                   Apply Builder Name
                 </button>
               </div>
            </div>
          </div>
        ) : (
          <h3 className="text-base font-bold text-text break-words">{character.name}</h3>
        )}

        {/* Project */}
        <div className="mt-1">
          {isEditing ? (
             <>
               <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Project</span>
               <select 
                 value={editProject} 
                 onChange={e => setEditProject(e.target.value)}
                 className="mt-1 w-full rounded border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-accent mb-2"
               >
                 <option value="">— No Project —</option>
                 {projects.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                 <option value="__new__">➕ New Project...</option>
               </select>

               {editProject === '__new__' && (
                 <div className="rounded border border-border bg-bg p-2 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input type="text" placeholder="CODE" className="w-1/3 uppercase rounded border border-border bg-panel px-2 py-1.5 text-xs outline-none" value={newProjectCode} onChange={e => setNewProjectCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6))} />
                      <input type="text" placeholder="Project Name" className="flex-1 rounded border border-border bg-panel px-2 py-1.5 text-xs outline-none" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                       {PROJECT_COLORS.map(c => <button key={c} onClick={() => setSelectedColor(c)} className={`h-4 w-4 rounded-full border-2 ${c === selectedColor ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                    </div>
                 </div>
               )}
             </>
          ) : character.project_id && (
            <div className="flex items-center gap-1.5 text-xs text-dim">
               <span className="text-[10px] uppercase tracking-wider text-dim font-mono mr-1">Project</span>
               <span className="h-2 w-2 rounded-full" style={{ background: projects.find(p => p.id === character.project_id)?.color || '#555' }} />
               {projects.find(p => p.id === character.project_id)?.name || 'Unknown Project'}
            </div>
          )}
        </div>

        {/* Collections */}
        <div className="mt-1">
          {isEditing ? (
             <>
               <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Collections</span>
               <div className="mt-1 max-h-32 overflow-y-auto rounded border border-border bg-bg p-2 text-xs space-y-1 text-dim">
                  {collections.length === 0 ? <div className="italic p-1">No collections available</div> : collections.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:text-white p-1 rounded hover:bg-white/5">
                      <input type="checkbox" checked={editCollectionIds.includes(c.id)} onChange={() => toggleCollection(c.id)} />
                      <FolderOpen size={12} className={editCollectionIds.includes(c.id) ? 'text-accent' : ''} /> {c.name}
                    </label>
                  ))}
               </div>
             </>
          ) : character.collection_ids && character.collection_ids.length > 0 && (
             <div className="flex flex-col gap-1 text-xs text-dim">
               <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Collections</span>
               <div className="flex flex-wrap gap-1 mt-1">
                 {character.collection_ids.map(id => {
                    const c = collections.find(x => x.id === id);
                    if (!c) return null;
                    return (
                      <span key={id} className="flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[10px]">
                        <FolderOpen size={10} /> {c.name}
                      </span>
                    )
                 })}
               </div>
             </div>
          )}
        </div>

        <hr className="border-border my-1" />

        {/* Download Permission */}
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center justify-between border-b border-white/5 py-1 text-xs">
            <span className="flex items-center gap-1.5 text-dim"><HardDrive size={12} /> Tải Bundle</span>
            {isEditing ? (
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="hidden" checked={editAllowDownload} onChange={e => setEditAllowDownload(e.target.checked)} />
                <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${editAllowDownload ? 'bg-accent' : 'bg-white/10'}`}>
                   <div className={`w-3 h-3 rounded-full bg-white transition-transform ${editAllowDownload ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </label>
            ) : (
              <span className={`font-mono text-[11px] font-bold ${character.allow_download ? 'text-accent' : 'text-red-400'}`}>
                {character.allow_download ? 'Cho Phép' : 'Bị Khóa'}
              </span>
            )}
          </div>
        </div>

        <hr className="border-border my-1" />

        {/* Info rows */}
        <div className="flex flex-col gap-1 mt-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b border-white/5 py-1 text-xs">
              <span className="flex items-center gap-1.5 text-dim">{r.icon} {r.label}</span>
              <span className="text-accent font-mono text-[11px]">{r.value}</span>
            </div>
          ))}
        </div>

        <hr className="border-border my-1" />

        {/* Status */}
        <div className="mt-1">
          <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Status</span>
          {isEditing ? (
             <select 
               value={editStatus} 
               onChange={e => setEditStatus(e.target.value as AssetStatus)}
               className="mt-1 w-full rounded border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
             >
               <option value="draft">Draft</option>
               <option value="in-review">In Review</option>
               <option value="approved">Approved</option>
               <option value="needs-revision">Needs Revision</option>
               <option value="rejected">Rejected</option>
             </select>
          ) : character.status && (
            <div className="mt-1">
              <span className="rounded px-2 py-0.5 text-[10px] font-bold capitalize"
                style={{
                  background: statusColor(character.status) + '22',
                  color: statusColor(character.status),
                  border: `1px solid ${statusColor(character.status)}44`,
                }}>
                {character.status.replace(/-/g, ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mt-2">
          <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Tags</span>
          {isEditing ? (
            <input 
              type="text" 
              value={editTags} 
              onChange={e => setEditTags(e.target.value)} 
              className="mt-1 w-full rounded border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-accent" 
              placeholder="Comma separated tags..." 
            />
          ) : character.tags && character.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {character.tags.map((t) => (
                <span key={t} className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent-light">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-2">
          <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Notes</span>
          {isEditing ? (
            <textarea 
              value={editNotes} 
              onChange={e => setEditNotes(e.target.value)} 
              className="mt-1 w-full min-h-[60px] rounded border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-accent" 
              placeholder="Additional notes..." 
            />
          ) : character.notes && (
            <p className="mt-1 rounded bg-white/3 p-2 text-xs text-dim italic">{character.notes}</p>
          )}
        </div>

        {/* Animations list */}
        {!isEditing && character.anim_names && character.anim_names.length > 0 && (
          <div className="mt-2">
            <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Animations</span>
            <div className="mt-1 max-h-24 overflow-y-auto rounded bg-white/3 p-2">
              {character.anim_names.map((a) => (
                <div key={a} className="text-[10px] font-mono text-dim py-0.5">{a}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso || 'Unknown';
  }
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: '#6b7280', 'under-review': '#f59e0b', 'in-review': '#3b82f6',
    approved: '#34d399', rejected: '#f87171', 'needs-revision': '#fb923c', redo: '#ef4444',
  };
  return map[status] || '#6b7280';
}
