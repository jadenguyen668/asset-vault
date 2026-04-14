'use client';
import { type SpineFiles } from '@/lib/spine/viewer-engine';
import SpineViewer from './SpineViewer';

interface SpineGridViewerProps {
  spineFiles: SpineFiles;
  majorVersion: number;
  minorVersion: number;
  animations: string[];
  onSelectAnimation?: (animName: string) => void;
  bgImage?: HTMLImageElement | null;
  bgConfigRef?: React.MutableRefObject<{ image: HTMLImageElement | null, offsetX: number, offsetY: number, scale: number }>;
  playbackConfigRef?: React.MutableRefObject<{ speed: number; scale: number; playing: boolean; looping: boolean; reversing: boolean }>;
}

export function SpineGridViewer({ spineFiles, majorVersion, minorVersion, animations, onSelectAnimation, bgImage, bgConfigRef, playbackConfigRef }: SpineGridViewerProps) {
  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-bg p-4">
      <div 
        className="grid gap-4" 
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
      >
        {animations.map((anim, index) => (
          <div 
            key={`${anim}-${index}`} 
            onDoubleClick={() => onSelectAnimation?.(anim)}
            className="flex flex-col border border-border bg-panel-secondary rounded shadow-sm overflow-hidden aspect-square hover:border-accent hover:shadow-md transition-all cursor-pointer"
          >
            <div className="bg-panel px-2 py-1 text-[10px] font-mono font-bold text-dim border-b border-border truncate text-center" title={anim}>
              {anim}
            </div>
            <div className="flex-1 relative bg-[#1a1a2e]">
              <SpineViewer
                spineFiles={spineFiles}
                majorVersion={majorVersion}
                minorVersion={minorVersion}
                initialAnimation={anim}
                bgImage={bgImage}
                bgConfigRef={bgConfigRef}
                playbackConfigRef={playbackConfigRef}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
