'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LibrarySidebar } from './LibrarySidebar';
import { LibraryGrid } from './LibraryGrid';
import { LibrarySearch } from './LibrarySearch';
import { DropZone, getFilesFromDrop, parseSpineSet, type ParsedSpineSet } from './DropZone';
import SpineViewer, { type SpineViewerHandle } from '@/components/viewer/SpineViewer';
import { SpineGridViewer } from '@/components/viewer/SpineGridViewer';
import { ViewerControls } from '@/components/viewer/ViewerControls';
import { PanelResizer } from '@/components/layout/PanelResizer';
import type { Character, Project, Collection } from '@/types/database';
import type { SpineFiles } from '@/lib/spine/viewer-engine';
import { downloadFile } from '@/lib/storage/r2';
import { ViewerProperties } from '@/components/viewer/ViewerProperties';
import { Bone, Layers, Film, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Loader2, Download, Play, Pause, Repeat, Save, LayoutGrid, LayoutPanelLeft } from 'lucide-react';
import { ImportDialog, type ImportResult } from './ImportDialog';
import { uploadSpineFiles } from '@/lib/storage/r2';
import { createClient } from '@/lib/supabase/client';
import { saveCharacter, deleteCharacter, updatePreviewConfig } from '@/lib/db/characters';
import { downloadAsZip, type RuntimeMetaConfig } from '@/lib/export/meta-config';
import { useRouter } from 'next/navigation';

interface Props {
  initialCharacters: Character[];
  initialProjects: Project[];
  initialCollections: Collection[];
}

export function LibraryView({ initialCharacters, initialProjects, initialCollections }: Props) {
  useAuth();

  const viewerRef = useRef<SpineViewerHandle>(null);
  const router = useRouter();
  const [activeSets, setActiveSets] = useState<ParsedSpineSet[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [localCharacters, setLocalCharacters] = useState<Character[]>(initialCharacters);
  useEffect(() => { setLocalCharacters(initialCharacters); }, [initialCharacters]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [pendingDeleteChar, setPendingDeleteChar] = useState<Character | null>(null);
  const [previewFiles, setPreviewFiles] = useState<SpineFiles | null>(null);
  const [previewMajor, setPreviewMajor] = useState(3);
  const [previewMinor, setPreviewMinor] = useState(8);
  const [animations, setAnimations] = useState<string[]>([]);
  const [skins, setSkins] = useState<string[]>([]);
  const [bones, setBones] = useState<string[]>([]);
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
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [targetAnimation, setTargetAnimation] = useState<string | null>(null);
  const [globalBgImage, setGlobalBgImage] = useState<HTMLImageElement | null>(null);
  const globalBgConfigRef = useRef<{ image: HTMLImageElement | null, offsetX: number, offsetY: number, scale: number }>({ image: null, offsetX: 0, offsetY: 0, scale: 1 });
  const globalPlaybackConfigRef = useRef<{ speed: number; scale: number; playing: boolean; looping: boolean; reversing: boolean }>({ speed: 1, scale: 1, playing: true, looping: true, reversing: false });
  const previewRequestRef = useRef(0);
  const activePreviewCharIdRef = useRef<number | null>(null);

  const handleBgImageChange = useCallback((img: HTMLImageElement | null) => {
    globalBgConfigRef.current.image = img;
    globalBgConfigRef.current.offsetX = 0;
    globalBgConfigRef.current.offsetY = 0;
    globalBgConfigRef.current.scale = 1;
    setGlobalBgImage(img);
  }, []);

  const saveConfigTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleConfigChange = useCallback((config: { speed: number; scale: number }) => {
    if (!selectedChar) return;
    if (saveConfigTimeoutRef.current) clearTimeout(saveConfigTimeoutRef.current);
    saveConfigTimeoutRef.current = setTimeout(() => {
      let previewConfig = typeof selectedChar.preview_config === 'object' && selectedChar.preview_config ? { ...selectedChar.preview_config } : {};
      previewConfig = { ...previewConfig, speed: config.speed, scale: config.scale };
      updatePreviewConfig(selectedChar.id, previewConfig).catch(e => console.error('Failed to auto-save config:', e));
    }, 1000);
  }, [selectedChar]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportBundle = useCallback(async (targetVersion?: string) => {
    if (!previewFiles || !selectedChar) return;

    setIsExporting(true);
    try {
      let finalJsonText = previewFiles.jsonText;
      let finalSpineVersion = selectedChar.spine_version;

      if (targetVersion && targetVersion !== 'current' && !selectedChar.spine_version.startsWith(targetVersion)) {
        const response = await fetch('/api/convert-spine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            jsonText: previewFiles.jsonText, 
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

      let currentConfig = typeof selectedChar.preview_config === 'object' && selectedChar.preview_config ? { ...selectedChar.preview_config } : {};
      currentConfig.speed = globalPlaybackConfigRef.current.speed;
      currentConfig.scale = globalPlaybackConfigRef.current.scale;

      const metaConfig: RuntimeMetaConfig = {
        _format: 'spine-runtime-config',
        _version: '1.0',
        _generatedAt: new Date().toISOString(),
        _generatedBy: 'Spine Asset Hub',
        character: {
          name: selectedChar.name,
          spineVersion: finalSpineVersion,
          jsonFile: selectedChar.json_name,
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
        atlasText: previewFiles.atlasText,
        pngBlobs: Array.from(previewFiles.pngBlobs.entries()).map(([k, v]) => ({ name: k, blob: v })),
        jsonName: previewFiles.jsonName,
        metaConfig
      });
    } catch (err: any) {
      alert("Lỗi khi Export: " + err.message);
    } finally {
      setIsExporting(false);
    }
  }, [previewFiles, selectedChar, animations, skins]);

  // Handle card click -> load character in preview (fetch PNGs from R2)
  const handleCardClick = useCallback(async (char: Character) => {
    const requestId = ++previewRequestRef.current;
    activePreviewCharIdRef.current = char.id;

    // Reset playback config to defaults IMMEDIATELY before any async work
    // so ViewerControls reads 1.0 when it remounts due to key change
    globalPlaybackConfigRef.current.speed = 1;
    globalPlaybackConfigRef.current.scale = 1;
    globalPlaybackConfigRef.current.playing = true;
    globalPlaybackConfigRef.current.looping = true;
    globalPlaybackConfigRef.current.reversing = false;

    setSelectedChar(char);
    setPreviewCollapsed(false);
    setLoadingChar(true);
    setPreviewError(null);
    setPreviewFiles(null);
    setPreviewName(char.name);
    setPreviewMajor(char.major_version);
    setPreviewMinor(char.minor_version);
    // Use anim_names from DB immediately so Grid Mode has correct data
    setAnimations(char.anim_names || []);
    setTargetAnimation(null);
    setSkins([]);
    setBones([]);

    try {
      // Lazy fetch full character details if this is lightweight data (no json_text/atlas_text)
      let fullChar = char;
      if (!(char as any)._fullLoaded) {
         const supabase = createClient();
         const { data, error } = await supabase.from('characters').select('json_text, atlas_text, png_paths, json_path, atlas_path').eq('id', char.id).single();
         if (data) {
            if (requestId !== previewRequestRef.current) return;
            fullChar = { ...char, ...data, _fullLoaded: true } as any;
            // Update local state so we don't refetch on subsequent clicks
            setLocalCharacters(prev => prev.map(c => c.id === char.id ? { ...c, ...data, _fullLoaded: true } as any : c));
            setSelectedChar(fullChar);
         } else {
            if (requestId !== previewRequestRef.current) return;
            console.warn('[PREVIEW] Failed to fetch full character data', error);
            setPreviewError('Failed to load character data from database.');
            setLoadingChar(false);
            return;
         }
      }

      // Get JSON/Atlas text (from DB or R2)
      let jsonText = fullChar.json_text;
      let atlasText = fullChar.atlas_text;

      if (!jsonText && fullChar.json_path) {
        const blob = await downloadFile(fullChar.json_path, fullChar.user_id);
        if (requestId !== previewRequestRef.current) return;
        jsonText = await blob.text();
      }
      if (!atlasText && fullChar.atlas_path) {
        const blob = await downloadFile(fullChar.atlas_path, fullChar.user_id);
        if (requestId !== previewRequestRef.current) return;
        atlasText = await blob.text();
      }

      // Fetch PNG textures from R2 or base64 data URLs
      const pngBlobs = new Map<string, Blob>();
      if (fullChar.png_paths && fullChar.png_paths.length > 0) {
        await Promise.all(
          fullChar.png_paths.map(async (path) => {
            try {
              if (path.startsWith('data:image/')) {
                // Base64 data URL: extract filename and decode
                const nameMatch = path.match(/;name=([^;]+);/);
                const filename = nameMatch ? nameMatch[1] : 'texture.png';
                const base64Part = path.split(',')[1];
                const binaryStr = atob(base64Part);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                pngBlobs.set(filename, new Blob([bytes], { type: 'image/png' }));
              } else {
                // R2 path
                const blob = await downloadFile(path, fullChar.user_id);
                const filename = path.split('/').pop() || path;
                pngBlobs.set(filename, blob);
              }
            } catch (e) {
              console.warn('[PREVIEW] Failed to fetch PNG:', path, e);
            }
          })
        );
      }

      if (requestId !== previewRequestRef.current) return;

      if (!jsonText) {
        setPreviewError('No skeleton data available for this character.');
        setLoadingChar(false);
        return;
      }

      setPreviewFiles({
        jsonText,
        atlasText: atlasText || '',
        pngBlobs,
        jsonName: fullChar.json_name,
      });

      setPreviewMajor(fullChar.major_version);
      setPreviewMinor(fullChar.minor_version);
      setPreviewName(fullChar.name);
    } catch (e: any) {
      if (requestId !== previewRequestRef.current) return;
      console.error('[PREVIEW] Error loading character:', e);
      setPreviewError(e?.message || 'Failed to load character assets');
    } finally {
      if (requestId === previewRequestRef.current) setLoadingChar(false);
    }
  }, []);

  // Handle drag-drop files -> preview directly
  const handleFilesLoaded = useCallback((sets: ParsedSpineSet[]) => {
    if (sets.length === 0) return;
    previewRequestRef.current += 1;
    activePreviewCharIdRef.current = null;
    setActiveSets(sets);
    const first = sets[0];
    setPreviewFiles(first.spineFiles);
    setPreviewMajor(first.majorVersion);
    setPreviewMinor(first.minorVersion);
    setPreviewName(first.name);
    setPreviewError(null);
    setSelectedChar(null);
    setTargetAnimation(null);
  }, []);

  const [skelInfo, setSkelInfo] = useState<{ bones: number; slots: number; anims: number; skins: number } | null>(null);

  const handleViewerLoaded = useCallback((info: { animations: string[]; skins: string[]; bones: string[] }) => {
    const requestId = previewRequestRef.current;
    setAnimations(info.animations);
    setSkins(info.skins);
    setBones(info.bones);
    // Get skeleton info after a tick (engine needs to finish setup)
    setTimeout(() => {
      if (requestId !== previewRequestRef.current) return;
      const si = viewerRef.current?.getSkeletonInfo();
      if (si) setSkelInfo(si);
    }, 100);
  }, []);

  const handleViewerError = useCallback((error: string) => {
    setPreviewError(error);
  }, []);

  const hasPreview = previewFiles !== null;
  const [draggingOver, setDraggingOver] = useState(false);

  // Prevent browser default drop behavior globally
  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault(); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => { window.removeEventListener('dragover', prevent); window.removeEventListener('drop', prevent); };
  }, []);

  // Handle drop on preview canvas
  const handleCanvasDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(false);
    if (!e.dataTransfer) return;
    setLoadingChar(true);
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
      if (sets.length > 0) handleFilesLoaded(sets);
    } catch (err) {
      console.error('[DROP] Error:', err);
      setPreviewError('Failed to parse dropped files');
    }
    setLoadingChar(false);
  }, [handleFilesLoaded]);

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
  const [pendingThumbnail, setPendingThumbnail] = useState<string | null>(null);

  const handleOpenImportDialog = async () => {
    if (viewerRef.current) {
      try {
        const thumb = await viewerRef.current.captureThumbnail();
        setPendingThumbnail(thumb);
      } catch (e) {
        console.warn('Failed to capture thumbnail', e);
      }
    }
    setShowImportDialog(true);
  };

  const handleConfirmImport = useCallback(async (result: ImportResult) => {
    setLoadingChar(true);
    setShowImportDialog(false);
    
    // Safety timeout — force clear loading after 60s
    const safetyTimer = setTimeout(() => {
      console.error('[IMPORT] 60s timeout reached! Force clearing loading state.');
      setLoadingChar(false);
      setPreviewError('Import timed out after 60 seconds. Check console for details.');
    }, 60000);

    try {
      console.time('[IMPORT] Total');
      const supabase = createClient();
      let projectId = result.projectId;
      
      // If there's a new project created from ImportDialog, save it first
      if (result.newProject) {
        console.log('[IMPORT] Creating new project...');
        const { data: projData, error: projErr } = await supabase.from('projects').insert([
          { code: result.newProject.code, name: result.newProject.name, color: result.newProject.color }
        ]).select('id').single();
        if (projData) projectId = projData.id;
        if (projErr) console.error('[IMPORT] Project create error:', projErr);
      }

      for (const item of result.selectedItems) {
        console.log('[IMPORT] Saving character:', item.name);
        const charData: Omit<Character, 'id' | 'created_at'> = {
          user_id: '',
          name: item.name,
          json_name: item.spineSet.spineFiles.jsonName,
          asset_type: 'spine',
          mime_type: 'application/json',
          spine_version: `${item.spineSet.majorVersion}.${item.spineSet.minorVersion}`,
          major_version: item.spineSet.majorVersion,
          minor_version: item.spineSet.minorVersion,
          json_text: item.spineSet.spineFiles.jsonText,
          atlas_text: item.spineSet.spineFiles.atlasText,
          bone_count: item.spineSet.boneCount,
          slot_count: item.spineSet.slotCount,
          anim_count: item.spineSet.animCount,
          anim_names: item.spineSet.animNames,
          skin_count: item.spineSet.skinCount,
          file_size: item.fileSize,
          json_size: new Blob([item.spineSet.spineFiles.jsonText]).size,
          atlas_size: new Blob([item.spineSet.spineFiles.atlasText]).size,
          png_sizes: Array.from(item.spineSet.spineFiles.pngBlobs.entries()).map(([name, blob]) => ({ name, size: blob.size })),
          tags: result.assetTags,
          notes: result.notes,
          status: 'draft',
          project_id: projectId,
          collection_ids: result.collectionIds || [],
          allow_download: true,
          json_path: null,
          atlas_path: null,
          png_paths: [],
          imported_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
          thumbnail: pendingThumbnail
        };
        
        console.time('[IMPORT] saveCharacter');
        const charId = await saveCharacter(charData);
        console.timeEnd('[IMPORT] saveCharacter');
        console.log('[IMPORT] Saved charId:', charId);

        // Try R2 upload, fallback to base64 if it fails
        try {
           console.time('[IMPORT] R2 upload');
           const jsonBlob = new Blob([item.spineSet.spineFiles.jsonText]);
           const atlasBlob = new Blob([item.spineSet.spineFiles.atlasText]);
           const pngs = Array.from(item.spineSet.spineFiles.pngBlobs.entries()).map(([n, b]) => ({ name: n, blob: b }));
           const paths = await uploadSpineFiles(charId, jsonBlob, atlasBlob, pngs, item.spineSet.spineFiles.jsonName);
           await supabase.from('characters').update({ json_path: paths.jsonPath, atlas_path: paths.atlasPath, png_paths: paths.pngPaths }).eq('id', charId);
           console.timeEnd('[IMPORT] R2 upload');
        } catch(e) {
           console.warn('[IMPORT] R2 upload failed, falling back to base64', e);
           console.time('[IMPORT] base64 fallback');
           const base64Paths: string[] = [];
           const getBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = error => reject(error);
           });
           
           for (const [filename, blob] of item.spineSet.spineFiles.pngBlobs) {
               try {
                  const dataUrl = await getBase64(blob);
                  const formatted = dataUrl.replace(/^data:image\/[^;]+;base64,/, `data:image/png;name=${filename};base64,`);
                  base64Paths.push(formatted);
               } catch (err) {
                  console.error('[IMPORT] Failed to convert PNG to base64', err);
               }
           }
           if (base64Paths.length > 0) {
              await supabase.from('characters').update({ png_paths: base64Paths }).eq('id', charId);
           }
           console.timeEnd('[IMPORT] base64 fallback');
        }
      }
      console.log('[IMPORT] All done! Refreshing...');
      console.timeEnd('[IMPORT] Total');
      router.refresh();
      setActiveSets([]);
      setPendingThumbnail(null);
    } catch (err: any) {
      console.error('[IMPORT] Fatal error:', err);
      setPreviewError(err?.message || 'Import failed');
    } finally {
      clearTimeout(safetyTimer);
      setLoadingChar(false);
    }
  }, [router, pendingThumbnail]);

  const handleDeleteChar = useCallback((char: Character) => {
    setPendingDeleteChar(char);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteChar) return;
    const char = pendingDeleteChar;
    setPendingDeleteChar(null);
    try {
      await deleteCharacter(char.id);
      if (selectedChar?.id === char.id) {
        setSelectedChar(null);
        setPreviewFiles(null);
      }
      router.refresh();
    } catch (e: any) {
      console.error('Delete failed', e);
      alert(`Delete failed: ${e?.message || 'Unknown error'}`);
    }
  }, [pendingDeleteChar, selectedChar, router]);

  const handleUpdateChar = useCallback(async (updates: Partial<Character>, newProject?: { code: string; name: string; color: string }) => {
    if (!selectedChar) return;
    try {
      const supabase = createClient();
      let projectId = updates.project_id;
      if (newProject) {
        const { data: projData } = await supabase.from('projects').insert([
          { code: newProject.code, name: newProject.name, color: newProject.color }
        ]).select('id').single();
        if (projData) projectId = projData.id;
      }

      // Only send DB-safe fields to avoid 400 errors
      const dbUpdates: Record<string, any> = {};
      const safeFields = ['name', 'status', 'tags', 'notes', 'project_id', 'collection_ids', 'allow_download'];
      for (const key of safeFields) {
        if (key in updates) {
          dbUpdates[key] = (updates as any)[key];
        }
      }
      if (projectId !== undefined) {
        dbUpdates.project_id = projectId;
      }

      console.log('[handleUpdateChar] Sending update:', dbUpdates);
      const { error } = await supabase.from('characters').update(dbUpdates).eq('id', selectedChar.id);
      if (error) {
        console.error('[handleUpdateChar] Update error:', error);
        return;
      }
      setSelectedChar({ ...selectedChar, ...dbUpdates } as Character);
      // Update local list immediately for search/filter
      setLocalCharacters(prev => prev.map(c => c.id === selectedChar.id ? { ...c, ...dbUpdates } : c));
      router.refresh();
    } catch(e) {
      console.error('Update failed', e);
    }
  }, [selectedChar, router]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (!input.files || input.files.length === 0) return;
    setLoadingChar(true);
    setPreviewError(null);
    try {
      const files = Array.from(input.files);
      const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json') || f.name.toLowerCase().endsWith('.skel'));
      const sets: ParsedSpineSet[] = [];
      for (const jf of jsonFiles) {
        const result = await parseSpineSet(jf, files);
        if (result) sets.push(result);
      }
      if (sets.length > 0) handleFilesLoaded(sets);
      else setPreviewError('No valid Spine files found in selection');
    } catch (err) {
      console.error('[IMPORT] Error parsing selections:', err);
      setPreviewError('Failed to parse selected files');
    } finally {
      input.value = ''; // Reset to allow re-selecting same files
      setLoadingChar(false);
    }
  }, [handleFilesLoaded]);

  return (
    <div id="main-layout" className="flex flex-1 overflow-hidden">
      <input 
        id="hidden-file-input" 
        type="file" 
        multiple 
        accept=".json,.skel,.atlas,.atlas.txt,.png" 
        className="hidden" 
        onChange={handleFileInput} 
        style={{ display: 'none' }} 
      />
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
          <LibrarySidebar 
            projects={initialProjects} 
            collections={initialCollections} 
            tags={[...new Set(localCharacters.flatMap(c => c.tags || []))].sort()} 
            statuses={[...new Set(localCharacters.map(c => c.status).filter(Boolean))].sort()}
          />
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
              <LibraryGrid characters={localCharacters} collections={initialCollections} onCardClick={handleCardClick} onDelete={handleDeleteChar} selectedId={selectedChar?.id} />
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
              <span className="text-xs font-semibold text-text truncate">{previewName}</span>
              {previewMajor > 0 && (
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-accent text-white">
                  v{previewMajor}.{previewMinor}
                </span>
              )}
              {skelInfo && (
                <>
                  <span className="text-[10px] font-mono text-dim flex items-center gap-0.5"><Bone size={10} /> {skelInfo.bones}</span>
                  <span className="text-[10px] font-mono text-dim flex items-center gap-0.5"><Film size={10} /> {skelInfo.anims}</span>
                  {skelInfo.skins > 1 && <span className="text-[10px] font-mono text-dim flex items-center gap-0.5"><Layers size={10} /> {skelInfo.skins}</span>}
                </>
              )}
            </>
          )}
          {!selectedChar && hasPreview && activeSets.length > 0 && (
             <button onClick={handleOpenImportDialog} className="ml-2 flex items-center gap-1.5 rounded bg-gradient-to-br from-accent to-[#6d4fde] px-2.5 py-1 text-[11px] font-bold text-white hover:scale-105 shadow transition-all mr-auto">
               <Save size={12} /> Save to Library
             </button>
          )}

          {hasPreview && animations.length > 0 && (
            <div className="flex border border-border rounded bg-panel-secondary ml-auto mr-2">
              <button 
                onClick={() => setViewMode('single')} 
                className={`p-1 ${viewMode === 'single' ? 'bg-accent text-white' : 'text-dim hover:text-white'} transition-colors rounded-l`}
                title="Single View"
              >
                <LayoutPanelLeft className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-1 ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-dim hover:text-white'} transition-colors rounded-r`}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <button onClick={toggleMaximize} className={`rounded p-1 text-dim hover:bg-accent hover:text-white mt-auto mb-auto ${hasPreview && animations.length > 0 ? '' : 'ml-auto'}`} title={previewMaximized ? 'Restore' : 'Maximize'}>
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
          className="relative overflow-hidden checkerboard-bg"
          style={{
            flex: previewMaximized ? 1 : '1 1 50%',
            minHeight: previewMaximized ? 0 : 200,
            borderBottom: '1px solid var(--border)',
            outline: draggingOver ? '2px solid var(--accent)' : 'none',
          }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingOver(true); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingOver(false); }}
          onDrop={handleCanvasDrop}
        >
          {/* Loading overlay */}
          {(loadingChar || isExporting) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-accent drop-shadow-md" />
                <span className="text-sm font-semibold tracking-wide drop-shadow-md">
                  {isExporting ? 'Đang chuyển đổi Spine Version...' : 'Đang tải Assets...'}
                </span>
                {isExporting && (
                  <span className="text-[10px] text-white/70 font-mono tracking-widest text-center">
                    QUÁ TRÌNH NÀY SẼ MẤT ÍT GIÂY TÙY VÀO DUNG LƯỢNG FILE
                  </span>
                )}
                {!isExporting && (
                  <button 
                    onClick={() => { setLoadingChar(false); setPreviewError('Loading cancelled by user.'); }}
                    className="mt-2 rounded-md border border-white/20 px-3 py-1 text-[11px] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Spine Viewer (when file loaded) */}
          {hasPreview && (
            viewMode === 'grid' ? (
              <SpineGridViewer
                spineFiles={previewFiles!}
                majorVersion={previewMajor}
                minorVersion={previewMinor}
                animations={animations}
                onSelectAnimation={(anim) => { 
                  setTargetAnimation(anim); 
                  setViewMode('single'); 
                }}
                bgImage={globalBgImage}
                bgConfigRef={globalBgConfigRef}
                playbackConfigRef={globalPlaybackConfigRef}
              />
            ) : (
              <SpineViewer
                key={selectedChar?.id ?? previewName ?? 'drop-preview'}
                ref={viewerRef}
                spineFiles={previewFiles}
                majorVersion={previewMajor}
                minorVersion={previewMinor}
                onLoaded={handleViewerLoaded}
                onError={handleViewerError}
                initialAnimation={targetAnimation || undefined}
                bgImage={globalBgImage}
                bgConfigRef={globalBgConfigRef}
                playbackConfigRef={globalPlaybackConfigRef}
              />
            )
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
              <ViewerControls key={selectedChar?.id ?? previewName ?? 'default'} viewerRef={viewerRef} animations={animations} skins={skins} bones={bones} compact initialAnimation={targetAnimation || undefined} globalBgImage={globalBgImage} onBgImageChange={handleBgImageChange} disableCharacterControls={viewMode === 'grid' || !hasPreview} playbackConfigRef={globalPlaybackConfigRef} />
            </div>
          )
        ) : (
          <div className="flex overflow-hidden border-t border-border" style={{ flex: '1 1 50%', minHeight: 180 }}>
            {/* Left: Controls */}
            <div className="flex flex-col gap-2 overflow-y-auto border-r border-border p-2.5" style={{ flex: 1, background: 'var(--panel)', minWidth: 0 }}>
              <ViewerControls 
                key={selectedChar?.id ?? previewName ?? 'default'}
                viewerRef={viewerRef} 
                animations={animations} 
                skins={skins} 
                bones={bones}
                initialAnimation={targetAnimation || undefined} 
                globalBgImage={globalBgImage} 
                onBgImageChange={handleBgImageChange} 
                disableCharacterControls={viewMode === 'grid' || !hasPreview} 
                playbackConfigRef={globalPlaybackConfigRef}
                onConfigChange={handleConfigChange}
                onExportBundle={selectedChar && selectedChar.allow_download ? handleExportBundle : undefined}
                spineVersion={selectedChar?.spine_version}
              />
            </div>
            {/* Right: Properties */}
            <div className="flex flex-col overflow-hidden" style={{ flex: 1, background: 'var(--panel-secondary)', minWidth: 0 }}>
              <ViewerProperties character={selectedChar} projects={initialProjects} collections={initialCollections} allTags={[...new Set(localCharacters.flatMap(c => c.tags || []))].sort()} onUpdate={handleUpdateChar} />
            </div>
          </div>
        )}
      </div>
      
      {showImportDialog && (
        <ImportDialog 
          sets={activeSets} 
          projects={initialProjects} 
          collections={initialCollections}
          onConfirm={handleConfirmImport} 
          onCancel={() => setShowImportDialog(false)} 
        />
      )}

      {/* Delete confirmation modal */}
      {pendingDeleteChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPendingDeleteChar(null)}>
          <div className="rounded-xl border border-border bg-panel p-6 shadow-2xl w-[340px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-text mb-2">Delete Character</h3>
            <p className="text-sm text-dim mb-5">Delete <strong className="text-text">&quot;{pendingDeleteChar.name}&quot;</strong> from library? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingDeleteChar(null)} className="rounded-lg px-4 py-2 text-sm text-dim hover:text-text hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
