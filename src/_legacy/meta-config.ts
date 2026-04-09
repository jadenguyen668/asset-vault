/**
 * Spine Runtime Meta-Config — Export runtime configuration for Game Engine
 * 
 * This module generates a companion JSON file containing custom tweaks
 * made in the viewer (timeScale, mixDuration, colorTint, fxIntensity)
 * to be parsed directly by the Game Engine — WITHOUT modifying original Spine files.
 * 
 * Output format designed to be engine-agnostic (Unity, Unreal, Cocos, custom).
 */

// ── Types ──────────────────────────────────────────────────────

export interface AnimationConfig {
    name: string;
    timeScale: number;          // playback speed multiplier (default: 1.0)
    mixDuration: number;        // crossfade duration to this anim (seconds)
    loop: boolean;
    // FX overrides
    fxIntensity: number;        // 0.0–2.0, multiplier for additive/screen FX slots
    // Color tint
    colorTint: { r: number; g: number; b: number; a: number } | null;
}

export interface SkinConfig {
    name: string;
    isDefault: boolean;
}

export interface RuntimeMetaConfig {
    // Header
    _format: 'spine-runtime-config';
    _version: '1.0';
    _generatedAt: string;
    _generatedBy: 'Spine Asset Hub';
    // Character info
    character: {
        name: string;
        spineVersion: string;
        jsonFile: string;
        defaultSkin: string;
        defaultAnimation: string;
        baseScale: number;
    };
    // Per-animation configs
    animations: AnimationConfig[];
    // Skin list
    skins: SkinConfig[];
    // Global settings
    global: {
        premultipliedAlpha: boolean;
        physicsEnabled: boolean;
        defaultMix: number;         // global default mix duration
    };
}

// ── State ──────────────────────────────────────────────────────

const animConfigs = new Map<string, Partial<AnimationConfig>>();
let globalDefaultMix = 0.2;
let characterName = '';
let defaultSkin = 'default';
let defaultAnimation = '';
let spineVersion = '';
let jsonFile = '';
let baseScale = 1.0;
let allAnimNames: string[] = [];
let allSkinNames: string[] = [];

// ── API ────────────────────────────────────────────────────────

/** Initialize config state for a loaded character */
export function initMetaConfig(opts: {
    name: string;
    spineVersion: string;
    jsonFile: string;
    animations: string[];
    skins: string[];
    currentScale: number;
}) {
    characterName = opts.name;
    spineVersion = opts.spineVersion;
    jsonFile = opts.jsonFile;
    allAnimNames = opts.animations;
    allSkinNames = opts.skins;
    baseScale = opts.currentScale;
    defaultSkin = opts.skins[0] || 'default';
    defaultAnimation = opts.animations[0] || '';
    // Preserve existing per-anim configs, only add new anims
    for (const anim of opts.animations) {
        if (!animConfigs.has(anim)) {
            animConfigs.set(anim, {});
        }
    }
}

/** Set per-animation config */
export function setAnimConfig(animName: string, config: Partial<AnimationConfig>) {
    const existing = animConfigs.get(animName) || {};
    animConfigs.set(animName, { ...existing, ...config });
}

/** Get per-animation config */
export function getAnimConfig(animName: string): Partial<AnimationConfig> {
    return animConfigs.get(animName) || {};
}

/** Set global default mix */
export function setGlobalMix(mix: number) {
    globalDefaultMix = mix;
}

/** Generate the full runtime config JSON */
export function generateMetaConfig(): RuntimeMetaConfig {
    const animations: AnimationConfig[] = allAnimNames.map(name => {
        const custom = animConfigs.get(name) || {};
        return {
            name,
            timeScale: custom.timeScale ?? 1.0,
            mixDuration: custom.mixDuration ?? globalDefaultMix,
            loop: custom.loop ?? true,
            fxIntensity: custom.fxIntensity ?? 1.0,
            colorTint: custom.colorTint ?? null,
        };
    });

    const skins: SkinConfig[] = allSkinNames.map(name => ({
        name,
        isDefault: name === defaultSkin,
    }));

    return {
        _format: 'spine-runtime-config',
        _version: '1.0',
        _generatedAt: new Date().toISOString(),
        _generatedBy: 'Spine Asset Hub',
        character: {
            name: characterName,
            spineVersion,
            jsonFile,
            defaultSkin,
            defaultAnimation,
            baseScale,
        },
        animations,
        skins,
        global: {
            premultipliedAlpha: false,
            physicsEnabled: true,
            defaultMix: globalDefaultMix,
        },
    };
}

/** Export config as downloadable JSON file */
export function downloadMetaConfig(baseFileName: string) {
    const config = generateMetaConfig();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}_runtime_config.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Export character + config as ZIP — with directory picker or fallback download */
export async function downloadAsZip(spineFiles: {
    jsonText: string;
    atlasText: string;
    pngBlobs: { name: string; blob: Blob }[];
    jsonName: string;
}) {
    // Try File System Access API first (Chrome/Edge)
    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await (window as any).showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'downloads',
            });

            // Write JSON
            await writeFileToDir(dirHandle, spineFiles.jsonName, spineFiles.jsonText);

            // Write Atlas
            const atlasName = spineFiles.jsonName.replace(/\.(json|skel)$/i, '.atlas');
            await writeFileToDir(dirHandle, atlasName, spineFiles.atlasText);

            // Write PNGs
            for (const png of spineFiles.pngBlobs) {
                await writeBlobToDir(dirHandle, png.name, png.blob);
            }

            // Write runtime config
            const baseFileName = spineFiles.jsonName.replace(/\.(json|skel)$/i, '');
            const config = generateMetaConfig();
            await writeFileToDir(dirHandle, `${baseFileName}_runtime_config.json`, JSON.stringify(config, null, 2));

            // Show success toast
            showExportToast(`✅ Exported to: ${dirHandle.name}/`, 'success');
            return;
        } catch (e: any) {
            // User cancelled the picker or permission denied
            if (e.name === 'AbortError') return;
            console.warn('[EXPORT] Directory picker failed, falling back to ZIP:', e);
        }
    }

    // Fallback: ZIP download (Safari, Firefox, or if dir picker failed)
    await downloadAsZipFallback(spineFiles);
}

/** Fallback: export as ZIP file download */
async function downloadAsZipFallback(spineFiles: {
    jsonText: string;
    atlasText: string;
    pngBlobs: { name: string; blob: Blob }[];
    jsonName: string;
}) {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add Spine files
    zip.file(spineFiles.jsonName, spineFiles.jsonText);
    const atlasName = spineFiles.jsonName.replace(/\.(json|skel)$/i, '.atlas');
    zip.file(atlasName, spineFiles.atlasText);
    for (const png of spineFiles.pngBlobs) {
        zip.file(png.name, png.blob);
    }

    // Add runtime config
    const baseFileName = spineFiles.jsonName.replace(/\.(json|skel)$/i, '');
    const config = generateMetaConfig();
    zip.file(`${baseFileName}_runtime_config.json`, JSON.stringify(config, null, 2));

    // Generate and download
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}_spine_bundle.zip`;
    a.click();
    URL.revokeObjectURL(url);

    showExportToast(`📦 ZIP downloaded: ${baseFileName}_spine_bundle.zip`, 'success');
}

/** Write text file to a directory handle */
async function writeFileToDir(dirHandle: FileSystemDirectoryHandle, fileName: string, content: string) {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}

/** Write blob file to a directory handle */
async function writeBlobToDir(dirHandle: FileSystemDirectoryHandle, fileName: string, blob: Blob) {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

/** Show a temporary toast notification for export */
function showExportToast(message: string, type: 'success' | 'error') {
    const existing = document.querySelector('.export-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `export-toast export-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

