'use client';
import type { Character } from '@/types/database';
import { Box, Calendar, FileText, Tag, Bone, Layers, Film, HardDrive } from 'lucide-react';

interface Props {
  character: Character | null;
}

export function ViewerProperties({ character }: Props) {
  if (!character) {
    return (
      <div className="flex flex-1 items-center justify-center p-5 text-center text-sm text-dim">
        Select an asset<br />to view properties
      </div>
    );
  }

  const rows: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'Name', value: character.name, icon: <Box size={12} /> },
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
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-4 py-2.5">
        <Box size={12} className="text-accent" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-dim font-mono">Properties</span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3.5">
        {/* Title */}
        <h3 className="text-base font-bold text-text break-words">{character.name}</h3>

        {/* Info rows */}
        <div className="flex flex-col gap-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b border-white/5 py-1.5 text-xs">
              <span className="flex items-center gap-1.5 text-dim">{r.icon} {r.label}</span>
              <span className="text-accent font-mono text-[11px]">{r.value}</span>
            </div>
          ))}
        </div>

        {/* Status */}
        {character.status && (
          <div className="mt-1">
            <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Status</span>
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
          </div>
        )}

        {/* Tags */}
        {character.tags && character.tags.length > 0 && (
          <div className="mt-1">
            <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Tags</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {character.tags.map((t) => (
                <span key={t} className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent-light">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {character.notes && (
          <div className="mt-1">
            <span className="text-[10px] uppercase tracking-wider text-dim font-mono">Notes</span>
            <p className="mt-1 rounded bg-white/3 p-2 text-xs text-dim italic">{character.notes}</p>
          </div>
        )}

        {/* Animations list */}
        {character.anim_names && character.anim_names.length > 0 && (
          <div className="mt-1">
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
