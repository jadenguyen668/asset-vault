'use client';
import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { SpineViewerEngine, type SpineFiles } from '@/lib/spine/viewer-engine';

export interface SpineViewerHandle {
  engine: SpineViewerEngine | null;
  getAnimations: () => string[];
  getSkins: () => string[];
  getSkeletonInfo: () => { bones: number; slots: number; anims: number; skins: number };
  playAnimation: (name: string) => void;
  setSkin: (name: string) => void;
  captureThumbnail: () => Promise<string | null>;
}

interface SpineViewerProps {
  spineFiles: SpineFiles | null;
  majorVersion: number;
  minorVersion: number;
  className?: string;
  onLoaded?: (info: { animations: string[]; skins: string[] }) => void;
  onError?: (error: string) => void;
}

const SpineViewer = forwardRef<SpineViewerHandle, SpineViewerProps>(function SpineViewer(
  { spineFiles, majorVersion, minorVersion, className, onLoaded, onError },
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
    getSkeletonInfo: () => engineRef.current?.getSkeletonInfo() ?? { bones: 0, slots: 0, anims: 0, skins: 0 },
    playAnimation: (name: string) => engineRef.current?.playAnimation(name),
    setSkin: (name: string) => engineRef.current?.setSkin(name),
    captureThumbnail: async () => engineRef.current?.captureThumbnail() ?? null,
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
        await engineRef.current!.loadSpine(spineFiles, majorVersion, minorVersion);
        if (cancelled) return;
        const anims = engineRef.current!.getAnimations();
        const skins = engineRef.current!.getSkins();
        onLoaded?.({ animations: anims, skins });
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
  }, [spineFiles, majorVersion, minorVersion, onLoaded, onError]);

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
    engineRef.current.setOffset(dx * dpr, dy * dpr);
  }, []);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!engineRef.current) return;
    e.preventDefault();
    const zoom = engineRef.current.getViewZoom();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    engineRef.current.setViewZoom(zoom * factor);
  }, []);

  return (
    <div className={`spine-viewer-wrapper ${className || ''}`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#1a1a2e' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
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
