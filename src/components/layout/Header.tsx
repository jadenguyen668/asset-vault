'use client';
import { UserMenu } from '@/components/auth/UserMenu';

export function Header() {
  return (
    <header className="flex h-13 shrink-0 items-center gap-3.5 border-b border-border bg-panel px-4.5 shadow-sm" style={{ zIndex: 10 }}>
      <a href="/library" className="flex items-center gap-3 hover:opacity-90 transition-all group select-none">
        <img src="/logo.png" alt="Asset Vault" className="h-9 w-9 object-contain group-hover:scale-105 transition-transform duration-300" style={{ filter: 'drop-shadow(0 3px 10px rgba(249,115,22,0.7))' }} />
        <span className="text-[26px] font-black tracking-tighter leading-none flex items-center pt-1">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-300 drop-shadow-sm">ASSET</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-500 to-pink-500 ml-1.5 py-1 pr-2 -mr-2" style={{ filter: 'drop-shadow(0 3px 8px rgba(244,63,94,0.5))' }}>VAULT</span>
        </span>
      </a>
      <div className="ml-auto flex items-center gap-2.5"><UserMenu /></div>
    </header>
  );
}
