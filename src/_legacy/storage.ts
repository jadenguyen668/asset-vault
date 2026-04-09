/**
 * Supabase Storage — Upload/download Spine asset files.
 * Files stored in bucket "spine-assets" under {userId}/{charId}/ prefix.
 */
import { supabase } from './supabase';
import { getUserId } from './auth';

const BUCKET = 'spine-assets';

/** Build storage path prefix for a character */
async function charPrefix(charId: number): Promise<string> {
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');
    return `${userId}/${charId}`;
}

/** Upload all Spine files for a character. Returns stored paths. */
export async function uploadSpineFiles(
    charId: number,
    jsonBlob: Blob,
    atlasBlob: Blob,
    pngBlobs: { name: string; blob: Blob }[],
    jsonName: string,
): Promise<{ jsonPath: string; atlasPath: string; pngPaths: string[] }> {
    const prefix = await charPrefix(charId);

    // Upload JSON/SKEL
    const jsonPath = `${prefix}/${jsonName}`;
    const { error: jsonErr } = await supabase.storage
        .from(BUCKET)
        .upload(jsonPath, jsonBlob, { upsert: true });
    if (jsonErr) throw new Error(`Failed to upload JSON: ${jsonErr.message}`);

    // Upload Atlas
    const atlasName = jsonName.replace(/\.(json|skel)$/i, '.atlas');
    const atlasPath = `${prefix}/${atlasName}`;
    const { error: atlasErr } = await supabase.storage
        .from(BUCKET)
        .upload(atlasPath, atlasBlob, { upsert: true });
    if (atlasErr) throw new Error(`Failed to upload atlas: ${atlasErr.message}`);

    // Upload PNGs
    const pngPaths: string[] = [];
    for (const png of pngBlobs) {
        const pngPath = `${prefix}/${png.name}`;
        const { error: pngErr } = await supabase.storage
            .from(BUCKET)
            .upload(pngPath, png.blob, { upsert: true });
        if (pngErr) throw new Error(`Failed to upload PNG ${png.name}: ${pngErr.message}`);
        pngPaths.push(pngPath);
    }

    return { jsonPath, atlasPath, pngPaths };
}

/** Upload a thumbnail image */
export async function uploadThumbnail(charId: number, thumbnailBase64: string): Promise<string> {
    const prefix = await charPrefix(charId);
    const path = `${prefix}/thumbnail.png`;

    // Convert base64 data URL to blob
    const response = await fetch(thumbnailBase64);
    const blob = await response.blob();

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: 'image/png' });
    if (error) throw new Error(`Failed to upload thumbnail: ${error.message}`);
    return path;
}

/** Download a file from storage as Blob */
export async function downloadFile(path: string): Promise<Blob> {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(path);
    if (error) throw new Error(`Failed to download ${path}: ${error.message}`);
    return data;
}

/** Download all Spine files for a character */
export async function downloadSpineFiles(
    jsonPath: string,
    atlasPath: string,
    pngPaths: string[],
): Promise<{ jsonBlob: Blob; atlasBlob: Blob; pngBlobs: { name: string; blob: Blob }[] }> {
    const jsonBlob = await downloadFile(jsonPath);
    const atlasBlob = await downloadFile(atlasPath);

    const pngBlobs: { name: string; blob: Blob }[] = [];
    for (const pngPath of pngPaths) {
        const name = pngPath.split('/').pop() || 'texture.png';
        const blob = await downloadFile(pngPath);
        pngBlobs.push({ name, blob });
    }

    return { jsonBlob, atlasBlob, pngBlobs };
}

/** Delete all files for a character */
export async function deleteSpineFiles(charId: number): Promise<void> {
    const prefix = await charPrefix(charId);

    // List all files under this prefix
    const { data: files, error: listErr } = await supabase.storage
        .from(BUCKET)
        .list(prefix);
    if (listErr) {
        console.warn(`Failed to list files for char ${charId}:`, listErr.message);
        return;
    }

    if (files && files.length > 0) {
        const paths = files.map(f => `${prefix}/${f.name}`);
        const { error: delErr } = await supabase.storage
            .from(BUCKET)
            .remove(paths);
        if (delErr) console.warn(`Failed to delete files for char ${charId}:`, delErr.message);
    }
}

/** Get a signed URL for temporary file access (1 hour) */
export async function getSignedUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
}
