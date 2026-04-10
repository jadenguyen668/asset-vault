'use client';
import { useCallback, useRef } from 'react';

interface Props {
  onResize: (rightPanelWidth: number) => void;
}

export function PanelResizer({ onResize }: Props) {
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const mainEl = document.getElementById('main-layout');
      if (!mainEl) return;
      const rect = mainEl.getBoundingClientRect();
      const newWidth = rect.right - ev.clientX;
      const clamped = Math.max(280, Math.min(rect.width - 300, newWidth));
      onResize(clamped);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group relative z-10 w-1 shrink-0 cursor-col-resize transition-colors hover:bg-accent"
      style={{ background: 'var(--border)' }}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
