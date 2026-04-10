'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import SpineViewer, { type SpineViewerHandle } from './SpineViewer';
import { ViewerControls } from './ViewerControls';
import { downloadFile } from '@/lib/storage/r2';
import type { Character } from '@/types/database';
import type { SpineFiles } from '@/lib/spine/viewer-engine';
import { Loader2, ArrowLeft, Bone, Film, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  character: Character;
}

export function CharacterViewer({ character }: Props) {
  const router = useRouter();
  const viewerRef = useRef<SpineViewerHandle>(null);
  const [spineFiles, setSpineFiles] = useState<SpineFiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animations, setAnimations] = useState<string[]>([]);
  const [skins, setSkins] = useState<string[]>([]);

  // Load assets on mount
  useEffect(() => {
    const load = async () => {
      try {
        let jsonText = character.json_text;
        let atlasText = character.atlas_text;

        if (!jsonText && character.json_path) {
          const blob = await downloadFile(character.json_path);
          jsonText = await blob.text();
        }
        if (!atlasText && character.atlas_path) {
          const blob = await downloadFile(character.atlas_path);
          atlasText = await blob.text();
        }

        const pngBlobs = new Map<string, Blob>();
        if (character.png_paths?.length) {
          await Promise.all(
            character.png_paths.map(async (path) => {
              try {
                const blob = await downloadFile(path);
                pngBlobs.set(path.split('/').pop() || path, blob);
              } catch (e) {
                console.warn('Failed to fetch PNG:', path, e);
              }
            })
          );
        }

        if (!jsonText) {
          setError('No skeleton data available');
          setLoading(false);
          return;
        }

        setSpineFiles({ jsonText, atlasText: atlasText || '', pngBlobs, jsonName: character.json_name });
      } catch (e: any) {
        setError(e?.message || 'Failed to load assets');
      }
      setLoading(false);
    };
    load();
  }, [character]);

  const handleLoaded = useCallback((info: { animations: string[]; skins: string[] }) => {
    setAnimations(info.animations);
    setSkins(info.skins);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-dim">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span>Loading {character.name}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-red">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2" style={{ background: 'var(--panel)' }}>
        <button onClick={() => router.push('/library')} className="rounded p-1 text-dim hover:bg-accent hover:text-white" title="Back to Library">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Bone size={14} className="text-accent" />
        <span className="text-sm font-semibold text-text truncate flex-1">{character.name}</span>
        {character.major_version > 0 && (
          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-accent text-white">
            Spine {character.major_version}.{character.minor_version}
          </span>
        )}
        {animations.length > 0 && (
          <span className="text-[10px] font-mono text-dim flex items-center gap-0.5">
            <Film size={10} /> {animations.length} anims
          </span>
        )}
        {skins.length > 1 && (
          <span className="text-[10px] font-mono text-dim flex items-center gap-0.5">
            <Layers size={10} /> {skins.length} skins
          </span>
        )}
      </div>

      {/* Viewer + Controls */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <SpineViewer
            ref={viewerRef}
            spineFiles={spineFiles}
            majorVersion={character.major_version}
            minorVersion={character.minor_version}
            onLoaded={handleLoaded}
            onError={(msg) => setError(msg)}
          />
        </div>
        {(animations.length > 0 || skins.length > 0) && (
          <ViewerControls viewerRef={viewerRef} animations={animations} skins={skins} />
        )}
      </div>
    </div>
  );
}
