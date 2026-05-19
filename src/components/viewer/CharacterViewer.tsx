'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import SpineViewer, { type SpineViewerHandle } from './SpineViewer';
import { ViewerControls } from './ViewerControls';
import { downloadFile } from '@/lib/storage/r2';
import type { Character } from '@/types/database';
import type { SpineFiles } from '@/lib/spine/viewer-engine';
import { Loader2, ArrowLeft, Bone, Film, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updatePreviewConfig } from '@/lib/db/characters';
import { downloadAsZip, type RuntimeMetaConfig } from '@/lib/export/meta-config';

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
  const [bones, setBones] = useState<string[]>([]);

  // Parse initial config from DB
  const initialConfig = typeof character.preview_config === 'object' && character.preview_config ? character.preview_config as Record<string, any> : {};
  const playbackConfigRef = useRef({
    speed: initialConfig.speed ?? 1,
    scale: initialConfig.scale ?? 1,
    playing: true,
    looping: true,
    reversing: false
  });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load assets on mount
  useEffect(() => {
    const load = async () => {
      try {
        let jsonText = character.json_text;
        let atlasText = character.atlas_text;

        if (!jsonText && character.json_path) {
          const blob = await downloadFile(character.json_path, character.user_id);
          jsonText = await blob.text();
        }
        if (!atlasText && character.atlas_path) {
          const blob = await downloadFile(character.atlas_path, character.user_id);
          atlasText = await blob.text();
        }

        const pngBlobs = new Map<string, Blob>();
        if (character.png_paths?.length) {
          await Promise.all(
            character.png_paths.map(async (path) => {
              try {
                const blob = await downloadFile(path, character.user_id);
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

  const handleLoaded = useCallback((info: { animations: string[]; skins: string[]; bones: string[] }) => {
    setAnimations(info.animations);
    setSkins(info.skins);
    setBones(info.bones);
  }, []);

  const handleConfigChange = useCallback((config: { speed: number; scale: number }) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      let previewConfig = typeof character.preview_config === 'object' && character.preview_config ? { ...character.preview_config } : {};
      previewConfig = { ...previewConfig, speed: config.speed, scale: config.scale };
      updatePreviewConfig(character.id, previewConfig).catch(e => console.error('Failed to auto-save config:', e));
    }, 1000);
  }, [character.id, character.preview_config]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportBundle = useCallback(async (targetVersion?: string) => {
    if (!spineFiles) return;

    setIsExporting(true);
    try {
      let finalJsonText = spineFiles.jsonText;
      let finalSpineVersion = character.spine_version;

      if (targetVersion && targetVersion !== 'current' && !character.spine_version.startsWith(targetVersion)) {
        const response = await fetch('/api/convert-spine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            jsonText: spineFiles.jsonText, 
            targetVersion: targetVersion 
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to convert spine version');
        }

        const data = await response.json();
        if (data.success && data.jsonText) {
          finalJsonText = data.jsonText;
          finalSpineVersion = data.newVersion || targetVersion;
          if (data.warning) {
            alert(data.warning);
          }
        }
      }

      let currentConfig = typeof character.preview_config === 'object' && character.preview_config ? { ...character.preview_config } : {};
      currentConfig.speed = playbackConfigRef.current.speed;
      currentConfig.scale = playbackConfigRef.current.scale;

      const metaConfig: RuntimeMetaConfig = {
        _format: 'spine-runtime-config',
        _version: '1.0',
        _generatedAt: new Date().toISOString(),
        _generatedBy: 'Spine Asset Hub',
        character: {
          name: character.name,
          spineVersion: finalSpineVersion,
          jsonFile: character.json_name,
          defaultSkin: skins[0] || 'default',
          defaultAnimation: animations[0] || '',
          baseScale: currentConfig.scale || 1.0,
        },
        animations: animations.map(a => ({
          name: a,
          timeScale: currentConfig.speed || 1.0,
          mixDuration: 0.2,
          loop: true,
          fxIntensity: 1.0,
          colorTint: null
        })),
        skins: skins.map(s => ({
          name: s,
          isDefault: s === skins[0],
        })),
        global: {
          premultipliedAlpha: false,
          physicsEnabled: true,
          defaultMix: 0.2,
        }
      };

      await downloadAsZip({
        jsonText: finalJsonText,
        atlasText: spineFiles.atlasText,
        pngBlobs: Array.from(spineFiles.pngBlobs.entries()).map(([k, v]) => ({ name: k, blob: v })),
        jsonName: spineFiles.jsonName,
        metaConfig
      });
    } catch (err: any) {
      alert("Lỗi khi Export: " + err.message);
    } finally {
      setIsExporting(false);
    }
  }, [spineFiles, character, animations, skins]);

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
            {isExporting && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 text-white">
                  <Loader2 className="h-8 w-8 animate-spin text-accent drop-shadow-md" />
                  <span className="text-sm font-semibold tracking-wide drop-shadow-md">Đang chuyển đổi Spine Version...</span>
                  <span className="text-[10px] text-white/70 font-mono tracking-widest text-center">QUÁ TRÌNH NÀY SẼ MẤT ÍT GIÂY TÙY VÀO DUNG LƯỢNG FILE</span>
                </div>
              </div>
            )}
          </div>
        {(animations.length > 0 || skins.length > 0) && (
          <ViewerControls 
            viewerRef={viewerRef} 
            animations={animations} 
            skins={skins} 
            bones={bones}
            playbackConfigRef={playbackConfigRef}
            onConfigChange={handleConfigChange}
            onExportBundle={character.allow_download !== false ? handleExportBundle : undefined}
            spineVersion={character.spine_version}
          />
        )}
      </div>
    </div>
  );
}
