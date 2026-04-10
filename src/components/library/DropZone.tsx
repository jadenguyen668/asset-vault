'use client';
import { useState, useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';
import { detectVersion } from '@/lib/spine/version-detect';
import type { SpineFiles } from '@/lib/spine/viewer-engine';

interface ParsedSpineSet {
  spineFiles: SpineFiles;
  majorVersion: number;
  minorVersion: number;
  name: string;
  animCount: number;
  boneCount: number;
  slotCount: number;
  skinCount: number;
  animNames: string[];
}

interface DropZoneProps {
  onFilesLoaded: (sets: ParsedSpineSet[]) => void;
}

/** Recursively read all files from a dropped directory */
async function readDirectoryEntries(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];
  const reader = dirEntry.createReader();
  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));
  let batch: FileSystemEntry[];
  do {
    batch = await readBatch();
    for (const entry of batch) {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject));
        files.push(file);
      } else if (entry.isDirectory) {
        files.push(...await readDirectoryEntries(entry as FileSystemDirectoryEntry));
      }
    }
  } while (batch.length > 0);
  return files;
}

/** Extract files from drop event (supports both files and folders) */
async function getFilesFromDrop(dataTransfer: DataTransfer): Promise<File[]> {
  const items = dataTransfer.items;
  const allFiles: File[] = [];
  const entries: FileSystemEntry[] = [];

  if (items) {
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
  }

  if (entries.length > 0) {
    for (const entry of entries) {
      if (entry.isDirectory) {
        allFiles.push(...await readDirectoryEntries(entry as FileSystemDirectoryEntry));
      } else if (entry.isFile) {
        try {
          const file = await new Promise<File>((resolve, reject) =>
            (entry as FileSystemFileEntry).file(resolve, reject));
          allFiles.push(file);
        } catch { /* fallback below */ }
      }
    }
    if (allFiles.length > 0) return allFiles;
  }

  if (dataTransfer.files.length > 0) return Array.from(dataTransfer.files);
  return allFiles;
}

/** Parse a set of files into SpineFiles */
async function parseSpineSet(jsonFile: File, allFiles: File[]): Promise<ParsedSpineSet | null> {
  const baseName = jsonFile.name.replace(/\.(json|skel)$/i, '');
  const baseNameLower = baseName.toLowerCase();
  const jsonPath = (jsonFile as any).webkitRelativePath || jsonFile.name;
  const jsonDir = jsonPath.includes('/') ? jsonPath.substring(0, jsonPath.lastIndexOf('/') + 1) : '';
  const sameDir = (f: File) => {
    const fPath = (f as any).webkitRelativePath || f.name;
    const fDir = fPath.includes('/') ? fPath.substring(0, fPath.lastIndexOf('/') + 1) : '';
    return fDir === jsonDir;
  };

  // Find atlas file
  let atlasFile: File | null = null;
  for (const f of allFiles) {
    const n = f.name.toLowerCase();
    if ((n === baseNameLower + '.atlas' || n === baseNameLower + '.atlas.txt') && sameDir(f)) { atlasFile = f; break; }
  }
  if (!atlasFile) {
    for (const f of allFiles) {
      const n = f.name.toLowerCase();
      if (n === baseNameLower + '.atlas' || n === baseNameLower + '.atlas.txt') { atlasFile = f; break; }
    }
  }
  if (!atlasFile) {
    for (const f of allFiles) {
      const n = f.name.toLowerCase();
      if ((n.endsWith('.atlas') || n.endsWith('.atlas.txt')) && sameDir(f)) { atlasFile = f; break; }
    }
  }
  if (!atlasFile) {
    for (const f of allFiles) {
      const n = f.name.toLowerCase();
      if (n.endsWith('.atlas') || n.endsWith('.atlas.txt')) { atlasFile = f; break; }
    }
  }

  // Find PNG files
  let pngFiles: File[] = [];
  if (atlasFile) {
    const atlasText = await atlasFile.text();
    const referencedPngs = atlasText.split('\n').map(l => l.trim()).filter(l => l.toLowerCase().endsWith('.png'));
    if (referencedPngs.length > 0) {
      for (const pngName of referencedPngs) {
        const nl = pngName.toLowerCase();
        let found = allFiles.find(f => f.name.toLowerCase() === nl && sameDir(f));
        if (!found) found = allFiles.find(f => f.name.toLowerCase() === nl);
        if (found) pngFiles.push(found);
      }
    }
  }
  if (pngFiles.length === 0) pngFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.png') && sameDir(f));
  if (pngFiles.length === 0) pngFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.png'));

  if (!atlasFile || pngFiles.length === 0) return null;

  try {
    const jsonText = await jsonFile.text();
    const atlasText = await atlasFile.text();
    const version = detectVersion(jsonText);
    const pngBlobs = new Map<string, Blob>();
    for (const png of pngFiles) pngBlobs.set(png.name, png);

    // Parse metadata from JSON
    const jsonData = JSON.parse(jsonText);
    const animNames = Object.keys(jsonData.animations || {});

    return {
      spineFiles: { jsonText, atlasText, pngBlobs, jsonName: jsonFile.name },
      majorVersion: version.major || 3,
      minorVersion: version.minor || 8,
      name: baseName,
      animCount: animNames.length,
      boneCount: (jsonData.bones || []).length,
      slotCount: (jsonData.slots || []).length,
      skinCount: Array.isArray(jsonData.skins) ? jsonData.skins.length : Object.keys(jsonData.skins || {}).length,
      animNames,
    };
  } catch (err) {
    console.error(`Failed to parse ${baseName}:`, err);
    return null;
  }
}

export function DropZone({ onFilesLoaded }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) { setDragging(false); dragCounter.current = 0; }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    if (!e.dataTransfer) return;

    setParsing(true);
    try {
      const files = await getFilesFromDrop(e.dataTransfer);
      const jsonFiles = files.filter(f => {
        const n = f.name.toLowerCase();
        return n.endsWith('.json') || n.endsWith('.skel');
      });

      const sets: ParsedSpineSet[] = [];
      for (const jf of jsonFiles) {
        const result = await parseSpineSet(jf, files);
        if (result) sets.push(result);
      }

      if (sets.length > 0) onFilesLoaded(sets);
    } catch (err) {
      console.error('[DropZone] Error:', err);
    } finally {
      setParsing(false);
    }
  }, [onFilesLoaded]);

  const handleBrowse = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.json,.skel,.atlas,.atlas.txt,.png';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      if (!input.files || input.files.length === 0) { input.remove(); return; }
      setParsing(true);
      try {
        const files = Array.from(input.files);
        const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json') || f.name.toLowerCase().endsWith('.skel'));
        const sets: ParsedSpineSet[] = [];
        for (const jf of jsonFiles) {
          const result = await parseSpineSet(jf, files);
          if (result) sets.push(result);
        }
        if (sets.length > 0) onFilesLoaded(sets);
      } finally { setParsing(false); input.remove(); }
    });
    input.click();
  }, [onFilesLoaded]);

  return (
    <div
      className={`drop-zone-overlay ${dragging ? 'active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="drop-zone-modal">
          <Upload size={48} strokeWidth={1.5} />
          <p className="drop-zone-title">Drop Spine Files Here</p>
          <p className="drop-zone-sub">.json + .atlas + .png</p>
        </div>
      )}
      {parsing && (
        <div className="drop-zone-modal">
          <div className="drop-zone-spinner" />
          <p className="drop-zone-title">Parsing files...</p>
        </div>
      )}
      {!dragging && !parsing && (
        <button onClick={handleBrowse} className="drop-zone-browse-btn">
          <Upload size={16} /> Import Files
        </button>
      )}
      <style jsx>{`
        .drop-zone-overlay {
          position: relative;
        }
        .drop-zone-overlay.active::before {
          content: '';
          position: fixed;
          inset: 0;
          background: rgba(124, 92, 252, 0.1);
          border: 3px dashed var(--accent, #7c5cfc);
          border-radius: 12px;
          z-index: 100;
          pointer-events: none;
        }
        .drop-zone-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--panel, #1e1e2e);
          border: 2px solid var(--accent, #7c5cfc);
          border-radius: 16px;
          padding: 40px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 101;
          color: var(--text, #e0e0e0);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .drop-zone-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .drop-zone-sub {
          font-size: 13px;
          color: var(--dim, #666);
          margin: 0;
        }
        .drop-zone-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border, #2a2a3e);
          border-top: 3px solid var(--accent, #7c5cfc);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .drop-zone-browse-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--border, #2a2a3e);
          background: var(--panel-secondary, #252538);
          color: var(--dim, #666);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .drop-zone-browse-btn:hover {
          background: var(--accent, #7c5cfc);
          color: #fff;
          border-color: var(--accent, #7c5cfc);
        }
      `}</style>
    </div>
  );
}

export type { ParsedSpineSet };
