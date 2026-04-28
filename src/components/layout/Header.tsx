'use client';
import { UserMenu } from '@/components/auth/UserMenu';

export function Header() {
  return (
    <header className="flex h-13 shrink-0 items-center gap-3.5 border-b border-border bg-panel px-4.5 shadow-sm" style={{ zIndex: 10 }}>
      <a href="/library" className="flex items-center hover:opacity-90 transition-all group select-none">
        <img src="/logo.png" alt="Asset Vault" className="h-8 w-8 object-contain -mr-0.5 group-hover:scale-110 transition-transform duration-300" style={{ filter: 'drop-shadow(0 2px 8px rgba(249,115,22,0.7))' }} />
        <span className="text-[24px] font-black tracking-tight leading-none bg-gradient-to-r from-orange-400 via-rose-400 to-pink-500 bg-clip-text text-transparent py-1" style={{ filter: 'drop-shadow(0 2px 6px rgba(244,63,94,0.4))' }}>ASSETVAULT</span>
      </a>
      <div className="ml-auto flex items-center gap-2.5"><UserMenu /></div>
    </header>
  );
}
