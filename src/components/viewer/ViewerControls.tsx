'use client';
import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Repeat, ZoomIn, ZoomOut } from 'lucide-react';
import type { SpineViewerHandle } from './SpineViewer';

interface ViewerControlsProps {
  viewerRef: React.RefObject<SpineViewerHandle | null>;
  animations: string[];
  skins: string[];
  compact?: boolean;
}

export function ViewerControls({ viewerRef, animations, skins, compact }: ViewerControlsProps) {
  const [currentAnim, setCurrentAnim] = useState(animations[0] || '');
  const [currentSkin, setCurrentSkin] = useState(skins[0] || '');
  const [playing, setPlaying] = useState(true);
  const [looping, setLooping] = useState(true);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (animations.length > 0 && !currentAnim) setCurrentAnim(animations[0]);
  }, [animations, currentAnim]);

  useEffect(() => {
    if (skins.length > 0 && !currentSkin) setCurrentSkin(skins[0]);
  }, [skins, currentSkin]);

  const handleAnimChange = useCallback((name: string) => {
    setCurrentAnim(name);
    viewerRef.current?.playAnimation(name);
  }, [viewerRef]);

  const handleSkinChange = useCallback((name: string) => {
    setCurrentSkin(name);
    viewerRef.current?.setSkin(name);
  }, [viewerRef]);

  const togglePlay = useCallback(() => {
    const next = !playing;
    setPlaying(next);
    viewerRef.current?.engine?.setPlaying(next);
  }, [playing, viewerRef]);

  const toggleLoop = useCallback(() => {
    const next = !looping;
    setLooping(next);
    viewerRef.current?.engine?.setLoop(next);
  }, [looping, viewerRef]);

  const handleSpeedChange = useCallback((val: number) => {
    setSpeed(val);
    viewerRef.current?.engine?.setSpeed(val);
  }, [viewerRef]);

  const handleReset = useCallback(() => {
    viewerRef.current?.engine?.resetOffset();
    viewerRef.current?.engine?.setViewZoom(1);
  }, [viewerRef]);

  const handleZoomIn = useCallback(() => {
    const z = viewerRef.current?.engine?.getViewZoom() ?? 1;
    viewerRef.current?.engine?.setViewZoom(z * 1.2);
  }, [viewerRef]);

  const handleZoomOut = useCallback(() => {
    const z = viewerRef.current?.engine?.getViewZoom() ?? 1;
    viewerRef.current?.engine?.setViewZoom(z / 1.2);
  }, [viewerRef]);

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {animations.length > 0 && (
          <select value={currentAnim} onChange={(e) => handleAnimChange(e.target.value)}
            className="rounded border border-border bg-panel-secondary px-2 py-1 text-xs text-text outline-none" style={{ minWidth: 140, maxWidth: 240 }}>
            {animations.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <div className="flex gap-1">
          <button onClick={togglePlay} className="flex h-7 w-7 items-center justify-center rounded border border-border bg-panel-secondary text-dim hover:bg-accent hover:text-white">
            {playing ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button onClick={toggleLoop} className={`flex h-7 w-7 items-center justify-center rounded border border-border ${looping ? 'bg-accent text-white border-accent' : 'bg-panel-secondary text-dim'} hover:bg-accent hover:text-white`}>
            <Repeat size={12} />
          </button>
        </div>
        <label className="flex items-center gap-1 text-[10px] text-dim font-mono whitespace-nowrap">
          Speed {speed.toFixed(1)}x
          <input type="range" min="0.1" max="3" step="0.1" value={speed} onChange={(e) => handleSpeedChange(parseFloat(e.target.value))} className="w-20" style={{ accentColor: 'var(--accent)' }} />
        </label>
      </div>
    );
  }

  return (
    <div className="viewer-controls">
      {/* Animation Select */}
      {animations.length > 0 && (
        <div className="control-group">
          <label className="control-label">Animation</label>
          <select
            value={currentAnim}
            onChange={(e) => handleAnimChange(e.target.value)}
            className="control-select"
          >
            {animations.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}

      {/* Skin Select */}
      {skins.length > 1 && (
        <div className="control-group">
          <label className="control-label">Skin</label>
          <select
            value={currentSkin}
            onChange={(e) => handleSkinChange(e.target.value)}
            className="control-select"
          >
            {skins.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Playback Controls */}
      <div className="control-group">
        <label className="control-label">Playback</label>
        <div className="control-row">
          <button onClick={togglePlay} className="control-btn" title={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={toggleLoop} className={`control-btn ${looping ? 'active' : ''}`} title="Loop">
            <Repeat size={14} />
          </button>
          <button onClick={handleReset} className="control-btn" title="Reset View">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Speed */}
      <div className="control-group">
        <label className="control-label">Speed: {speed.toFixed(1)}x</label>
        <input
          type="range" min="0.1" max="3" step="0.1" value={speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          className="control-slider"
        />
      </div>

      {/* Zoom */}
      <div className="control-group">
        <label className="control-label">Zoom</label>
        <div className="control-row">
          <button onClick={handleZoomOut} className="control-btn" title="Zoom Out"><ZoomOut size={14} /></button>
          <button onClick={handleZoomIn} className="control-btn" title="Zoom In"><ZoomIn size={14} /></button>
        </div>
      </div>

      <style jsx>{`
        .viewer-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
          background: var(--panel, #1e1e2e);
          border-left: 1px solid var(--border, #2a2a3e);
          min-width: 200px;
          overflow-y: auto;
        }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .control-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--dim, #666);
        }
        .control-select {
          background: var(--panel-secondary, #252538);
          border: 1px solid var(--border, #2a2a3e);
          color: var(--text, #e0e0e0);
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 12px;
          outline: none;
          cursor: pointer;
        }
        .control-select:focus {
          border-color: var(--accent, #7c5cfc);
        }
        .control-row {
          display: flex;
          gap: 4px;
        }
        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid var(--border, #2a2a3e);
          background: var(--panel-secondary, #252538);
          color: var(--dim, #666);
          cursor: pointer;
          transition: all 0.15s;
        }
        .control-btn:hover {
          background: var(--accent, #7c5cfc);
          color: #fff;
          border-color: var(--accent, #7c5cfc);
        }
        .control-btn.active {
          background: var(--accent, #7c5cfc);
          color: #fff;
          border-color: var(--accent, #7c5cfc);
        }
        .control-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: var(--border, #2a2a3e);
          outline: none;
          cursor: pointer;
        }
        .control-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent, #7c5cfc);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
