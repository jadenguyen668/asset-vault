'use client';
import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { SpineViewerEngine, type SpineFiles } from '@/lib/spine/viewer-engine';

export interface SpineViewerHandle {
  engine: SpineViewerEngine | null;
  getAnimations: () => string[];
  getSkins: () => string[];
  getBones: () => string[];
  getSkeletonInfo: () => { bones: number; slots: number; anims: number; skins: number };
  playAnimation: (name: string) => void;
  setSkin: (name: string) => void;
  captureThumbnail: (options?: { matchPreview?: boolean }) => Promise<string | null>;
}

interface SpineViewerProps {
  spineFiles: SpineFiles | null;
  majorVersion: number;
  minorVersion: number;
  className?: string;
  onLoaded?: (info: { animations: string[]; skins: string[]; bones: string[] }) => void;
  onError?: (error: string) => void;
  initialAnimation?: string;
  bgImage?: HTMLImageElement | null;
  bgConfigRef?: React.MutableRefObject<{ image: HTMLImageElement | null, offsetX: number, offsetY: number, scale: number }>;
  playbackConfigRef?: React.MutableRefObject<{ speed: number; scale: number; playing: boolean; looping: boolean; reversing: boolean }>;
}

const SpineViewer = forwardRef<SpineViewerHandle, SpineViewerProps>(function SpineViewer(
  { spineFiles, majorVersion, minorVersion, className, onLoaded, onError, initialAnimation, bgImage, bgConfigRef, playbackConfigRef },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SpineViewerEngine | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    engine: engineRef.current,
    getAnimations: () => engineRef.current?.getAnimations() ?? [],
    getSkins: () => engineRef.current?.getSkins() ?? [],
    getBones: () => engineRef.current?.getBones() ?? [],
    getSkeletonInfo: () => engineRef.current?.getSkeletonInfo() ?? { bones: 0, slots: 0, anims: 0, skins: 0 },
    playAnimation: (name: string) => engineRef.current?.playAnimation(name),
    setSkin: (name: string) => engineRef.current?.setSkin(name),
    captureThumbnail: async (options) => engineRef.current?.captureThumbnail(options) ?? null,
  }));

  // Initialize engine on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new SpineViewerEngine(containerRef.current);
    engine.init();
    engineRef.current = engine;
    return () => { engine.dispose(); engineRef.current = null; };
  }, []);

  // Load Spine files when props change
  useEffect(() => {
    if (!spineFiles || !engineRef.current) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await engineRef.current!.loadSpine(spineFiles, majorVersion, minorVersion, initialAnimation);
        if (cancelled) return;
        
        if (bgConfigRef) {
          engineRef.current!.setBgState(bgConfigRef.current);
        } else {
          engineRef.current!.setBgImage(bgImage || null);
        }

        if (playbackConfigRef?.current) {
          engineRef.current!.setPlaying(playbackConfigRef.current.playing);
          engineRef.current!.setLoop(playbackConfigRef.current.looping);
          engineRef.current!.setSpeed(playbackConfigRef.current.speed * (playbackConfigRef.current.reversing ? -1 : 1));
          engineRef.current!.setScale(playbackConfigRef.current.scale);
        }
        
        const anims = engineRef.current!.getAnimations();
        const skins = engineRef.current!.getSkins();
        const bones = engineRef.current!.getBones();
        onLoaded?.({ animations: anims, skins, bones });
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.message || 'Failed to load Spine data';
        setError(msg);
        onError?.(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [spineFiles, majorVersion, minorVersion, onLoaded, onError, initialAnimation]);

  // Sync background changes without full reload when prop changes
  useEffect(() => {
    if (engineRef.current) {
      if (bgConfigRef) {
        engineRef.current.setBgState(bgConfigRef.current);
      } else {
        engineRef.current.setBgImage(bgImage || null);
      }
    }
  }, [bgImage, bgConfigRef]);

  // Mouse interaction: pan (drag) + zoom (wheel)
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !engineRef.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    const dpr = window.devicePixelRatio || 1;
    
    if (e.shiftKey) {
      const baseScale = engineRef.current.getBaseScale();
      const vz = engineRef.current.getViewZoom();
      const normDx = dx * dpr / (baseScale * vz);
      const normDy = dy * dpr / (baseScale * vz);
      engineRef.current.setBgOffset(normDx, normDy);
      if (bgConfigRef?.current) {
        bgConfigRef.current.offsetX += normDx;
        bgConfigRef.current.offsetY += normDy;
      }
    } else {
      const vz = engineRef.current.getViewZoom();
      engineRef.current.setOffset((dx * dpr) / vz, (dy * dpr) / vz);
    }
  }, [bgConfigRef]);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // Use native event listener for wheel to allow preventDefault (React onWheel is passive)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!engineRef.current) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      if (e.shiftKey) {
        const state = engineRef.current.getBgState();
        if (state) {
          const newScale = state.scale * factor;
          engineRef.current.setBgScale(newScale);
          if (bgConfigRef?.current) {
            bgConfigRef.current.scale = newScale;
          }
        }
      } else {
        const zoom = engineRef.current.getViewZoom();
        engineRef.current.setViewZoom(zoom * factor);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [bgConfigRef]);

  const handleDoubleClick = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.resetOffset();
    engineRef.current.setViewZoom(1);
  }, []);

  return (
    <div className={`spine-viewer-wrapper checkerboard-bg ${className || ''}`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 10 }}>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Loading Spine...</div>
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 10 }}>
          <div style={{ color: '#ef4444', fontSize: 13, padding: 20, textAlign: 'center' }}>{error}</div>
        </div>
      )}
    </div>
  );
});

export default SpineViewer;
