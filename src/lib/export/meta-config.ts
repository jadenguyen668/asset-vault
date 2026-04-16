/**
 * Spine Runtime Meta-Config — Export runtime configuration for Game Engine
 */
import JSZip from 'jszip';

export interface AnimationConfig {
    name: string;
    timeScale: number;
    mixDuration: number;
    loop: boolean;
    fxIntensity: number;
    colorTint: { r: number; g: number; b: number; a: number } | null;
}

export interface SkinConfig {
    name: string;
    isDefault: boolean;
}

export interface RuntimeMetaConfig {
    _format: 'spine-runtime-config';
    _version: '1.0';
    _generatedAt: string;
    _generatedBy: 'Spine Asset Hub';
    character: {
        name: string;
        spineVersion: string;
        jsonFile: string;
        defaultSkin: string;
        defaultAnimation: string;
        baseScale: number;
    };
    animations: AnimationConfig[];
    skins: SkinConfig[];
    global: {
        premultipliedAlpha: boolean;
        physicsEnabled: boolean;
        defaultMix: number;
    };
}

export async function downloadAsZip(spineFiles: {
    jsonText: string;
    atlasText: string;
    pngBlobs: { name: string; blob: Blob }[];
    jsonName: string;
    metaConfig: RuntimeMetaConfig;
}) {
    // Try File System Access API first (Chrome/Edge)
    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await (window as any).showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'downloads',
            });

            await writeFileToDir(dirHandle, spineFiles.jsonName, spineFiles.jsonText);

            const atlasName = spineFiles.jsonName.replace(/\.(json|skel)$/i, '.atlas');
            await writeFileToDir(dirHandle, atlasName, spineFiles.atlasText);

            for (const png of spineFiles.pngBlobs) {
                await writeBlobToDir(dirHandle, png.name, png.blob);
            }

            const baseFileName = spineFiles.jsonName.replace(/\.(json|skel)$/i, '');
            await writeFileToDir(dirHandle, `${baseFileName}_runtime_config.json`, JSON.stringify(spineFiles.metaConfig, null, 2));

            // Return success
            return true;
        } catch (e: any) {
            if (e.name === 'AbortError') return false;
            console.warn('[EXPORT] Directory picker failed, falling back to ZIP:', e);
        }
    }

    // Fallback: ZIP download
    await downloadAsZipFallback(spineFiles);
    return true;
}

async function downloadAsZipFallback(spineFiles: {
    jsonText: string;
    atlasText: string;
    pngBlobs: { name: string; blob: Blob }[];
    jsonName: string;
    metaConfig: RuntimeMetaConfig;
}) {
    const zip = new JSZip();

    zip.file(spineFiles.jsonName, spineFiles.jsonText);
    const atlasName = spineFiles.jsonName.replace(/\.(json|skel)$/i, '.atlas');
    zip.file(atlasName, spineFiles.atlasText);
    for (const png of spineFiles.pngBlobs) {
        zip.file(png.name, png.blob);
    }

    const baseFileName = spineFiles.jsonName.replace(/\.(json|skel)$/i, '');
    zip.file(`${baseFileName}_runtime_config.json`, JSON.stringify(spineFiles.metaConfig, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}_spine_bundle.zip`;
    a.click();
    URL.revokeObjectURL(url);
}

async function writeFileToDir(dirHandle: FileSystemDirectoryHandle, fileName: string, content: string | Blob) {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}

async function writeBlobToDir(dirHandle: FileSystemDirectoryHandle, fileName: string, blob: Blob) {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}
