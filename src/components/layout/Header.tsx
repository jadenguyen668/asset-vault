'use client';
import { UserMenu } from '@/components/auth/UserMenu';

export function Header() {
  return (
    <header className="flex h-13 shrink-0 items-center gap-3.5 border-b border-border bg-panel px-4.5 shadow-sm" style={{ zIndex: 10 }}>
      <a href="/library" className="flex items-center gap-2 hover:opacity-90 transition-opacity group">
        <img src="/logo.png" alt="Asset Vault" className="h-8 w-8 object-contain drop-shadow-[0_2px_8px_rgba(249,115,22,0.6)] group-hover:drop-shadow-[0_2px_12px_rgba(249,115,22,0.8)] transition-all" />
        <span className="text-2xl font-bold tracking-wider text-white">
          ASSET <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">VAULT</span>
        </span>
      </a>
      <div className="ml-auto flex items-center gap-2.5"><UserMenu /></div>
    </header>
  );
}
