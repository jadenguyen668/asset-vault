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

        // Spine JSON has "skeleton.spine" field with version string
        const versionStr: string = data?.skeleton?.spine || '';

        if (!versionStr) {
            // Try to detect by format features
            if (data.skeleton && data.bones) {
                // Has skeleton structure — assume 3.8 as fallback
                return { version: 'unknown', major: 3, minor: 8, runtime: '3.8' };
            }
            return { version: 'unknown', major: 0, minor: 0, runtime: 'unknown' };
        }

        const parts = versionStr.split('.');
        const major = parseInt(parts[0]) || 0;
        const minor = parseInt(parts[1]) || 0;

        // Map to available runtime — match exact minor version
        let runtime: VersionInfo['runtime'] = 'unknown';
        if (major <= 3) {
            if (minor <= 7) {
                runtime = '3.7'; // spine-canvas-3.7 for 3.7.x and earlier
            } else {
                runtime = '3.8'; // spine-canvas-3.8 for 3.8.x
            }
        } else if (major === 4) {
            runtime = '4.1'; // spine-webgl 4.x handles 4.0-4.2
        }

        return { version: versionStr, major, minor, runtime };
    } catch {
        return { version: 'error', major: 0, minor: 0, runtime: 'unknown' };
    }
}
