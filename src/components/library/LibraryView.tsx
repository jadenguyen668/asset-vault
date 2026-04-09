'use client';
import { useAuth } from '@/hooks/useAuth';
import { LibrarySidebar } from './LibrarySidebar';
import { LibraryGrid } from './LibraryGrid';
import { LibrarySearch } from './LibrarySearch';
import type { Character, Project, Collection } from '@/types/database';

interface Props { initialCharacters: Character[]; initialProjects: Project[]; initialCollections: Collection[]; }

export function LibraryView({ initialCharacters, initialProjects, initialCollections }: Props) {
  useAuth();
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col bg-bg">
        <div className="flex flex-1 overflow-hidden">
          <LibrarySidebar projects={initialProjects} collections={initialCollections} />
          <div className="flex flex-1 flex-col">
            <LibrarySearch />
            <div className="flex-1 overflow-y-auto"><LibraryGrid characters={initialCharacters} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
