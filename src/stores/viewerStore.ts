import { create } from 'zustand';

type AppMode = 'empty' | 'preview-single' | 'preview-grid' | 'library-browse' | 'library-inspect';

interface ViewerState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  currentCharacterId: number | null;
  setCurrentCharacterId: (id: number | null) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  loop: boolean;
  setLoop: (l: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
  scale: number;
  setScale: (s: number) => void;
  currentAnimation: string | null;
  setCurrentAnimation: (a: string | null) => void;
  currentSkin: string | null;
  setCurrentSkin: (s: string | null) => void;
  previewMaximized: boolean;
  setPreviewMaximized: (m: boolean) => void;
  previewCollapsed: boolean;
  setPreviewCollapsed: (c: boolean) => void;
  panelWidth: number | null;
  setPanelWidth: (w: number | null) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  mode: 'library-browse',
  setMode: (mode) => set({ mode }),
  currentCharacterId: null,
  setCurrentCharacterId: (currentCharacterId) => set({ currentCharacterId }),
  playing: true,
  setPlaying: (playing) => set({ playing }),
  loop: true,
  setLoop: (loop) => set({ loop }),
  speed: 1,
  setSpeed: (speed) => set({ speed }),
  scale: 1,
  setScale: (scale) => set({ scale }),
  currentAnimation: null,
  setCurrentAnimation: (currentAnimation) => set({ currentAnimation }),
  currentSkin: null,
  setCurrentSkin: (currentSkin) => set({ currentSkin }),
  previewMaximized: false,
  setPreviewMaximized: (previewMaximized) => set({ previewMaximized }),
  previewCollapsed: false,
  setPreviewCollapsed: (previewCollapsed) => set({ previewCollapsed }),
  panelWidth: null,
  setPanelWidth: (panelWidth) => set({ panelWidth }),
}));
