import type { VersionInfo } from '@/types/spine';

export function detectVersion(jsonText: string): VersionInfo {
  try {
    const data = JSON.parse(jsonText);
    const verStr: string = data?.skeleton?.spine || '';
    const parts = verStr.split('.').map(Number);
    const major = parts[0] || 0;
    const minor = parts[1] || 0;
    let runtime = '4.1';
    if (major <= 3) { runtime = minor <= 7 ? '3.7' : '3.8'; }
    return { version: verStr, major, minor, runtime };
  } catch {
    return { version: 'unknown', major: 0, minor: 0, runtime: '4.1' };
  }
}
