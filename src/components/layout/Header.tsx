'use client';
import { UserMenu } from '@/components/auth/UserMenu';

export function Header() {
  return (
    <header className="flex h-13 shrink-0 items-center gap-3.5 border-b border-border bg-panel px-4.5 shadow-sm" style={{ zIndex: 10 }}>
      <a href="/library" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <img src="/logo.png" alt="Live Asset" className="h-10 w-10 object-contain drop-shadow-[0_4px_12px_rgba(255,102,0,0.5)]" />
        <span className="text-2xl font-black tracking-widest text-white">LIVE <span className="bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">ASSET</span></span>
      </a>
      <div className="ml-auto flex items-center gap-2.5"><UserMenu /></div>
    </header>
  );
}
