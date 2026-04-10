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
import { ArrowLeft } from 'lucide-react';

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
  const [showPreview, setShowPreview] = useState(false);
  const [previewName, setPreviewName] = useState('');

  // Handle card click -> load character in preview
  const handleCardClick = useCallback((char: Character) => {
    setSelectedChar(char);
    // Build SpineFiles from character's stored text data
    if (char.json_text && char.atlas_text) {
      // For now, we need PNGs — if stored in R2, we'd fetch them
      // Since we have json_text and atlas_text in Supabase, we can at least try
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
      setShowPreview(true);
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
    setShowPreview(true);
    setSelectedChar(null);
  }, []);

  const handleViewerLoaded = useCallback((info: { animations: string[]; skins: string[] }) => {
    setAnimations(info.animations);
    setSkins(info.skins);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewFiles(null);
    setAnimations([]);
    setSkins([]);
    setSelectedChar(null);
  }, []);

  return (
    <div
      className="flex flex-1 overflow-hidden"
      onDragEnter={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      {/* Left: Library */}
      <div className={`flex flex-col bg-bg transition-all duration-300 ${showPreview ? 'w-[400px] min-w-[300px]' : 'flex-1'}`}>
        <div className="flex flex-1 overflow-hidden">
          <LibrarySidebar projects={initialProjects} collections={initialCollections} />
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1"><LibrarySearch /></div>
              <DropZone onFilesLoaded={handleFilesLoaded} />
            </div>
            <div className="flex-1 overflow-y-auto">
              <LibraryGrid characters={initialCharacters} onCardClick={handleCardClick} selectedId={selectedChar?.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Preview Panel */}
      {showPreview && (
        <div className="flex flex-1 flex-col border-l border-border bg-bg min-w-[400px]">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-panel">
            <button
              onClick={handleClosePreview}
              className="flex items-center justify-center w-7 h-7 rounded-md border border-border bg-panel-secondary text-dim hover:bg-accent hover:text-white hover:border-accent transition-colors"
              title="Close Preview"
            >
              <ArrowLeft size={14} />
            </button>
            <span className="text-sm font-semibold text-text truncate">{previewName}</span>
            {previewMajor > 0 && (
              <span className="text-[10px] font-bold font-mono text-dim bg-bg px-2 py-0.5 rounded">
                v{previewMajor}.{previewMinor}
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
        </div>
      )}
    </div>
  );
}
