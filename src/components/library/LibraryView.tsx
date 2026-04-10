'use client';
import { useState, useRef, useCallback } from 'react';
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
import { Bone, Layers, Film, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Loader2 } from 'lucide-react';

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

  // Panel layout state
  const [panelWidth, setPanelWidth] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spine-panel-width');
      return saved ? parseInt(saved) : null;
    }
    return null;
  });
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

        {/* Loading state */}
        {loadingChar && (
          <div className="flex flex-1 items-center justify-center gap-2 text-dim">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span className="text-sm">Loading assets...</span>
          </div>
        )}

        {/* Viewer content */}
        {!loadingChar && hasPreview ? (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 relative">
              <SpineViewer
                ref={viewerRef}
                spineFiles={previewFiles}
                majorVersion={previewMajor}
                minorVersion={previewMinor}
                onLoaded={handleViewerLoaded}
                onError={handleViewerError}
              />
            </div>
            {!previewMaximized && (animations.length > 0 || skins.length > 0) && (
              <ViewerControls
                viewerRef={viewerRef}
                animations={animations}
                skins={skins}
              />
            )}
          </div>
        ) : !loadingChar ? (
          <DropZone onFilesLoaded={handleFilesLoaded} />
        ) : null}

        {/* Maximized compact controls strip */}
        {previewMaximized && hasPreview && !loadingChar && (animations.length > 0 || skins.length > 0) && (
          <div className="flex shrink-0 items-center gap-3 px-3 py-2 border-t border-border" style={{ background: 'var(--panel)' }}>
            <ViewerControls viewerRef={viewerRef} animations={animations} skins={skins} compact />
          </div>
        )}
      </div>
    </div>
  );
}
