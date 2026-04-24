import { create } from 'zustand';
import type { Profile } from '@/types/database';

interface AppState {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  filterType: string;
  setFilterType: (t: string) => void;
  filterProjectId: number | null;
  setFilterProjectId: (id: number | null) => void;
  filterCollectionId: number | null;
  setFilterCollectionId: (id: number | null) => void;
  filterTag: string | null;
  setFilterTag: (t: string | null) => void;
  filterStatus: string | null;
  setFilterStatus: (s: string | null) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  sortBy: 'date-desc',
  setSortBy: (sortBy) => set({ sortBy }),
  filterType: 'all',
  setFilterType: (filterType) => set({ filterType }),
  filterProjectId: null,
  setFilterProjectId: (filterProjectId) => set({ filterProjectId }),
  filterCollectionId: null,
  setFilterCollectionId: (filterCollectionId) => set({ filterCollectionId }),
  filterTag: null,
  setFilterTag: (filterTag) => set({ filterTag }),
  filterStatus: null,
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
