/**
 * Detect Spine version from JSON skeleton data
 */
export interface VersionInfo {
  version: string;      // e.g. "3.7.94"
  major: number;        // e.g. 3
  minor: number;        // e.g. 7
  runtime: '3.7' | '3.8' | '4.1' | 'unknown';
}

export function detectVersion(jsonText: string): VersionInfo {
  try {
    const data = JSON.parse(jsonText);
    const versionStr: string = data?.skeleton?.spine || '';

    if (!versionStr) {
      if (data.skeleton && data.bones) {
        return { version: 'unknown', major: 3, minor: 8, runtime: '3.8' };
      }
      return { version: 'unknown', major: 0, minor: 0, runtime: 'unknown' };
    }

    const parts = versionStr.split('.');
    const major = parseInt(parts[0]) || 0;
    const minor = parseInt(parts[1]) || 0;

    let runtime: VersionInfo['runtime'] = 'unknown';
    if (major <= 3) {
      runtime = minor <= 7 ? '3.7' : '3.8';
    } else if (major === 4) {
      runtime = '4.1';
    }

    return { version: versionStr, major, minor, runtime };
  } catch {
    return { version: 'error', major: 0, minor: 0, runtime: 'unknown' };
  }
}
