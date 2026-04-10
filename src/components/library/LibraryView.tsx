'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LibrarySidebar } from './LibrarySidebar';
import { LibraryGrid } from './LibraryGrid';
import { LibrarySearch } from './LibrarySearch';
import { DropZone, type ParsedSpineSet } from './DropZone';
import SpineViewer, { type SpineViewerHandle } from '@/components/viewer/SpineViewer';
import { ViewerControls } from '@/components/viewer/ViewerControls';
import { PanelResizer } from '@/components/layout/PanelResizer';
import type { Character, Project, Collection } from '@/types/database';
import type { SpineFiles } from '@/lib/spine/viewer-engine';
import { downloadFile } from '@/lib/storage/r2';
import { ViewerProperties } from '@/components/viewer/ViewerProperties';
import { Bone, Layers, Film, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Loader2, Download, Play, Pause, Repeat } from 'lucide-react';

interface Props {
  initialCharacters: Character[];
  initialProjects: Project[];
  initialCollections: Collection[];
}

export function LibraryView({ initialCharacters, initialProjects, initialCollections }: Props) {
  useAuth();

  const viewerRef = useRef<SpineViewerHandle>(null);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [previewFiles, setPreviewFiles] = useState<SpineFiles | null>(null);
  const [previewMajor, setPreviewMajor] = useState(3);
  const [previewMinor, setPreviewMinor] = useState(8);
  const [animations, setAnimations] = useState<string[]>([]);
  const [skins, setSkins] = useState<string[]>([]);
  const [previewName, setPreviewName] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingChar, setLoadingChar] = useState(false);

  // Panel layout state — defer localStorage read to useEffect to avoid hydration mismatch
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem('spine-panel-width');
    if (saved) setPanelWidth(parseInt(saved));
  }, []);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // Handle card click -> load character in preview (fetch PNGs from R2)
  const handleCardClick = useCallback(async (char: Character) => {
    setSelectedChar(char);
    setPreviewCollapsed(false);
    setLoadingChar(true);
    setPreviewError(null);

    try {
      // Get JSON/Atlas text (from DB or R2)
      let jsonText = char.json_text;
      let atlasText = char.atlas_text;

      if (!jsonText && char.json_path) {
        const blob = await downloadFile(char.json_path);
        jsonText = await blob.text();
      }
      if (!atlasText && char.atlas_path) {
        const blob = await downloadFile(char.atlas_path);
        atlasText = await blob.text();
      }

      // Fetch PNG textures from R2
      const pngBlobs = new Map<string, Blob>();
      if (char.png_paths && char.png_paths.length > 0) {
        await Promise.all(
          char.png_paths.map(async (path) => {
            try {
              const blob = await downloadFile(path);
              const filename = path.split('/').pop() || path;
              pngBlobs.set(filename, blob);
            } catch (e) {
              console.warn('[PREVIEW] Failed to fetch PNG:', path, e);
            }
          })
        );
      }

      if (!jsonText) {
        setPreviewError('No skeleton data available for this character.');
        setLoadingChar(false);
        return;
      }

      setPreviewFiles({
        jsonText,
        atlasText: atlasText || '',
        pngBlobs,
        jsonName: char.json_name,
      });
      setPreviewMajor(char.major_version);
      setPreviewMinor(char.minor_version);
      setPreviewName(char.name);
    } catch (e: any) {
      setPreviewError(e?.message || 'Failed to load character assets');
    }
    setLoadingChar(false);
  }, []);

  // Handle drag-drop files -> preview directly
  const handleFilesLoaded = useCallback((sets: ParsedSpineSet[]) => {
    if (sets.length === 0) return;
    const first = sets[0];
    setPreviewFiles(first.spineFiles);
    setPreviewMajor(first.majorVersion);
    setPreviewMinor(first.minorVersion);
    setPreviewName(first.name);
    setPreviewError(null);
    setSelectedChar(null);
  }, []);

  const handleViewerLoaded = useCallback((info: { animations: string[]; skins: string[] }) => {
    setAnimations(info.animations);
    setSkins(info.skins);
  }, []);

  const handleViewerError = useCallback((error: string) => {
    setPreviewError(error);
  }, []);

  const hasPreview = previewFiles !== null;

  const handleResize = useCallback((width: number) => {
    setPanelWidth(width);
    localStorage.setItem('spine-panel-width', String(Math.round(width)));
  }, []);

  const toggleCollapse = useCallback(() => {
    setPreviewCollapsed((c) => !c);
    setPreviewMaximized(false);
  }, []);

  const toggleMaximize = useCallback(() => {
    setPreviewMaximized((m) => !m);
    setPreviewCollapsed(false);
  }, []);

  return (
    <div id="main-layout" className="flex flex-1 overflow-hidden">
      {/* Left: Library Panel */}
      <div
        className="flex flex-col bg-bg overflow-hidden"
        style={{
          flex: previewMaximized ? '0 0 0px' : previewCollapsed ? '1 1 auto' : '1 1 auto',
          minWidth: previewMaximized ? 0 : 300,
          opacity: previewMaximized ? 0 : 1,
          pointerEvents: previewMaximized ? 'none' : 'auto',
          transition: 'flex 0.3s ease, opacity 0.3s ease',
        }}
      >
        <div className="flex flex-1 overflow-hidden">
          <LibrarySidebar projects={initialProjects} collections={initialCollections} />
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-panel">
              <div className="flex-1"><LibrarySearch /></div>
              {previewCollapsed && (
                <button onClick={toggleCollapse} className="shrink-0 rounded-md border border-border bg-panel-secondary p-1.5 text-dim hover:bg-accent hover:text-white" title="Show Preview">
                  <PanelRightOpen className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <LibraryGrid characters={initialCharacters} onCardClick={handleCardClick} selectedId={selectedChar?.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Resizable divider */}
      {!previewCollapsed && !previewMaximized && (
        <PanelResizer onResize={handleResize} />
      )}

      {/* Right: Preview Panel */}
      <div
        className="flex flex-col border-l border-border bg-bg overflow-hidden"
        style={{
          flex: previewCollapsed ? '0 0 0px' : previewMaximized ? '1 1 auto' : (panelWidth ? `0 0 ${panelWidth}px` : '0 0 35%'),
          minWidth: previewCollapsed ? 0 : 280,
          opacity: previewCollapsed ? 0 : 1,
          pointerEvents: previewCollapsed ? 'none' : 'auto',
          transition: 'flex 0.3s ease, opacity 0.3s ease',
        }}
      >
        {/* Preview header */}
        <div className="flex shrink-0 items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: 'var(--panel)' }}>
          <span className="text-[10px] uppercase tracking-widest text-dim font-mono flex-1">Preview</span>
          {hasPreview && (
            <>
              {previewMajor > 0 && (
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-accent text-white">
                  v{previewMajor}.{previewMinor}
                </span>
              )}
              {animations.length > 0 && (
                <span className="text-[10px] font-mono text-dim flex items-center gap-0.5">
                  <Film size={10} /> {animations.length}
                </span>
              )}
              {skins.length > 1 && (
                <span className="text-[10px] font-mono text-dim flex items-center gap-0.5">
                  <Layers size={10} /> {skins.length}
                </span>
              )}
            </>
          )}
          <button onClick={toggleMaximize} className="rounded p-1 text-dim hover:bg-accent hover:text-white" title={previewMaximized ? 'Restore' : 'Maximize'}>
            {previewMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          {!previewMaximized && (
            <button onClick={toggleCollapse} className="rounded p-1 text-dim hover:bg-accent hover:text-white" title="Collapse Preview">
              <PanelRightClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* === TOP: Preview Canvas — always visible with checkerboard === */}
        <div
          className="relative overflow-hidden"
          style={{
            flex: previewMaximized ? 1 : '1 1 50%',
            minHeight: previewMaximized ? 0 : 200,
            borderBottom: '1px solid var(--border)',
            background: 'repeating-conic-gradient(#2a2a3a 0% 25%, #1e1e2e 0% 50%) 50%/20px 20px',
          }}
        >
          {/* Loading overlay */}
          {loadingChar && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
              <div className="flex items-center gap-2 text-white">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
                <span className="text-sm font-semibold">Loading assets...</span>
              </div>
            </div>
          )}

          {/* Spine Viewer (when file loaded) */}
          {hasPreview && (
            <SpineViewer
              ref={viewerRef}
              spineFiles={previewFiles}
              majorVersion={previewMajor}
              minorVersion={previewMinor}
              onLoaded={handleViewerLoaded}
              onError={handleViewerError}
            />
          )}

          {/* Empty state hint */}
          {!hasPreview && !loadingChar && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <Download className="h-8 w-8 text-dim opacity-40" />
              <span className="text-xs text-dim font-mono tracking-wide opacity-60">Drop asset here to preview</span>
            </div>
          )}
        </div>

        {/* === BOTTOM: Controls + Properties — always visible === */}
        {previewMaximized ? (
          (animations.length > 0 || skins.length > 0) && (
            <div className="flex shrink-0 items-center gap-3 px-3 py-2 border-t border-border" style={{ background: 'var(--panel)' }}>
              <ViewerControls viewerRef={viewerRef} animations={animations} skins={skins} compact />
            </div>
          )
        ) : (
          <div className="flex overflow-hidden border-t border-border" style={{ flex: '1 1 50%', minHeight: 180 }}>
            {/* Left: Controls */}
            <div className="flex flex-col gap-2 overflow-y-auto border-r border-border p-2.5" style={{ flex: 1, background: 'var(--panel)', minWidth: 0 }}>
              {hasPreview && (animations.length > 0 || skins.length > 0) ? (
                <ViewerControls viewerRef={viewerRef} animations={animations} skins={skins} />
              ) : (
                <div className="flex flex-1 flex-col gap-3 p-1">
                  <div><span className="text-[10px] uppercase tracking-widest text-dim font-mono">Animation</span>
                    <select disabled className="mt-1 w-full rounded border border-border bg-panel-secondary px-2 py-1.5 text-xs text-dim opacity-50"><option>No animation</option></select></div>
                  <div><span className="text-[10px] uppercase tracking-widest text-dim font-mono">Playback</span>
                    <div className="mt-1 flex gap-1 opacity-40">
                      <span className="flex h-7 w-7 items-center justify-center rounded border border-border bg-panel-secondary text-dim"><Play size={12} /></span>
                      <span className="flex h-7 w-7 items-center justify-center rounded border border-border bg-panel-secondary text-dim"><Pause size={12} /></span>
                      <span className="flex h-7 w-7 items-center justify-center rounded border border-border bg-panel-secondary text-dim"><Repeat size={12} /></span>
                    </div></div>
                  <div><span className="text-[10px] uppercase tracking-widest text-dim font-mono">Speed <span className="text-accent">1.0x</span></span>
                    <input type="range" disabled className="mt-1 w-full opacity-30" /></div>
                  <div><span className="text-[10px] uppercase tracking-widest text-dim font-mono">Scale <span className="text-accent">1.0x</span></span>
                    <input type="range" disabled className="mt-1 w-full opacity-30" /></div>
                </div>
              )}
            </div>
            {/* Right: Properties */}
            <div className="flex flex-col overflow-hidden" style={{ flex: 1, background: 'var(--panel-secondary)', minWidth: 0 }}>
              <ViewerProperties character={selectedChar} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
