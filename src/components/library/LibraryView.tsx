'use client';
import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LibrarySidebar } from './LibrarySidebar';
import { LibraryGrid } from './LibraryGrid';
import { LibrarySearch } from './LibrarySearch';
import { DropZone, type ParsedSpineSet } from './DropZone';
import SpineViewer, { type SpineViewerHandle } from '@/components/viewer/SpineViewer';
import { ViewerControls } from '@/components/viewer/ViewerControls';
import type { Character, Project, Collection } from '@/types/database';
import type { SpineFiles } from '@/lib/spine/viewer-engine';
import { Upload, Bone, Layers, Film, ExternalLink } from 'lucide-react';

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

  // Handle card click -> load character in preview
  const handleCardClick = useCallback((char: Character) => {
    setSelectedChar(char);
    if (char.json_text && char.atlas_text) {
      const pngBlobs = new Map<string, Blob>();
      // TODO: Fetch PNGs from R2 using png_paths
      setPreviewFiles({
        jsonText: char.json_text,
        atlasText: char.atlas_text,
        pngBlobs,
        jsonName: char.json_name,
      });
      setPreviewMajor(char.major_version);
      setPreviewMinor(char.minor_version);
      setPreviewName(char.name);
      setPreviewError(null);
    }
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

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Library Panel */}
      <div className="flex flex-col bg-bg" style={{ width: '340px', minWidth: '280px', maxWidth: '400px' }}>
        <div className="flex flex-1 overflow-hidden">
          <LibrarySidebar projects={initialProjects} collections={initialCollections} />
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex-1"><LibrarySearch /></div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <LibraryGrid characters={initialCharacters} onCardClick={handleCardClick} selectedId={selectedChar?.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Preview Panel — ALWAYS visible */}
      <div className="flex flex-1 flex-col border-l border-border bg-bg min-w-[400px]">
        {hasPreview ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border" style={{ background: 'var(--panel)' }}>
              <Bone size={14} className="text-accent" />
              <span className="text-sm font-semibold text-text truncate flex-1">{previewName}</span>
              {previewMajor > 0 && (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>
                  Spine {previewMajor}.{previewMinor}
                </span>
              )}
              {animations.length > 0 && (
                <span className="text-[10px] font-mono text-dim flex items-center gap-1">
                  <Film size={10} /> {animations.length} anims
                </span>
              )}
              {skins.length > 1 && (
                <span className="text-[10px] font-mono text-dim flex items-center gap-1">
                  <Layers size={10} /> {skins.length} skins
                </span>
              )}
            </div>

            {/* Viewer + Controls */}
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
              {(animations.length > 0 || skins.length > 0) && (
                <ViewerControls
                  viewerRef={viewerRef}
                  animations={animations}
                  skins={skins}
                />
              )}
            </div>
          </>
        ) : (
          /* Empty State — Drop Zone */
          <DropZone onFilesLoaded={handleFilesLoaded} />
        )}
      </div>
    </div>
  );
}
