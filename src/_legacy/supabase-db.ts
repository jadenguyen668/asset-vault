/**
 * Supabase DB — CRUD functions mirroring db.ts (Dexie) but targeting Supabase PostgreSQL.
 * Each function matches the signature of its db.ts counterpart.
 */
import { supabase } from './supabase';
import { getUserId } from './auth';
import { uploadSpineFiles, deleteSpineFiles } from './storage';
import type { SpineCharacter, SpineProject, SpineCollection } from './db';
import { generateAutoTags } from './db';

// ── Helper: snake_case ↔ camelCase conversion ────────────────

function rowToCharacter(row: any): SpineCharacter {
    return {
        id: row.id,
        assetType: row.asset_type,
        mimeType: row.mime_type,
        name: row.name,
        jsonName: row.json_name,
        spineVersion: row.spine_version,
        majorVersion: row.major_version,
        minorVersion: row.minor_version,
        jsonBlob: new Blob(), // not stored in DB, download from Storage on demand
        atlasBlob: new Blob(),
        pngBlobs: [],
        jsonText: row.json_text || '',
        atlasText: row.atlas_text || '',
        boneCount: row.bone_count,
        slotCount: row.slot_count,
        animCount: row.anim_count,
        animNames: row.anim_names || [],
        skinCount: row.skin_count,
        fileSize: row.file_size,
        jsonSize: row.json_size,
        atlasSize: row.atlas_size,
        pngSizes: row.png_sizes || [],
        thumbnail: row.thumbnail,
        importedAt: new Date(row.imported_at),
        lastViewedAt: new Date(row.last_viewed_at),
        tags: row.tags || [],
        notes: row.notes || '',
        status: row.status || 'draft',
        projectId: row.project_id,
        collectionIds: row.collection_ids || [],
        // Storage paths (extra fields not in local SpineCharacter)
        _jsonPath: row.json_path,
        _atlasPath: row.atlas_path,
        _pngPaths: row.png_paths || [],
    } as SpineCharacter & { _jsonPath?: string; _atlasPath?: string; _pngPaths?: string[] };
}

function rowToProject(row: any): SpineProject {
    return {
        id: row.id,
        name: row.name,
        code: row.code,
        color: row.color,
        createdAt: new Date(row.created_at),
    };
}

function rowToCollection(row: any): SpineCollection {
    return {
        id: row.id,
        name: row.name,
        icon: row.icon,
        color: row.color,
        createdAt: new Date(row.created_at),
    };
}

// ── Character CRUD ───────────────────────────────────────────

export async function saveCharacter(char: any): Promise<number> {
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');

    // Check for duplicate
    const { data: existing } = await supabase
        .from('characters')
        .select('id, name')
        .eq('json_name', char.jsonName)
        .eq('user_id', userId)
        .maybeSingle();

    // Generate auto-tags
    const autoTags = generateAutoTags(char as any);
    const customTags = (char.tags || []).filter((t: string) => !autoTags.includes(t));
    const allTags = [...new Set([...autoTags, ...customTags])];

    const row = {
        user_id: userId,
        asset_type: char.assetType || 'spine',
        mime_type: char.mimeType,
        name: char.name,
        json_name: char.jsonName,
        spine_version: char.spineVersion,
        major_version: char.majorVersion,
        minor_version: char.minorVersion,
        json_text: char.jsonText,
        atlas_text: char.atlasText,
        bone_count: char.boneCount,
        slot_count: char.slotCount,
        anim_count: char.animCount,
        anim_names: char.animNames || [],
        skin_count: char.skinCount,
        file_size: char.fileSize,
        json_size: char.jsonSize,
        atlas_size: char.atlasSize,
        png_sizes: char.pngSizes || [],
        thumbnail: char.thumbnail,
        tags: allTags,
        notes: char.notes || '',
        status: char.status || 'draft',
        project_id: char.projectId,
        collection_ids: char.collectionIds || [],
    };

    let charId: number;

    if (existing && existing.name === char.name) {
        // Update existing
        charId = existing.id;
        await supabase.from('characters').update(row).eq('id', charId);
    } else {
        // Insert new
        const { data, error } = await supabase.from('characters').insert(row).select('id').single();
        if (error) throw new Error(`Failed to save character: ${error.message}`);
        charId = data.id;
    }

    // Upload files to Storage
    if (char.assetType !== '2d' && char.assetType !== '3d' && char.jsonBlob) {
        try {
            const pngBlobs = Array.isArray(char.pngBlobs)
                ? char.pngBlobs
                : [...(char.pngBlobs as Map<string, Blob>)].map(([name, blob]: [string, Blob]) => ({ name, blob }));

            const paths = await uploadSpineFiles(charId, char.jsonBlob, char.atlasBlob, pngBlobs, char.jsonName);
            await supabase.from('characters').update({
                json_path: paths.jsonPath,
                atlas_path: paths.atlasPath,
                png_paths: paths.pngPaths,
            }).eq('id', charId);
        } catch (e) {
            console.warn('[SUPABASE] File upload failed:', e);
        }
    }

    return charId;
}

export async function getAllCharacters(): Promise<SpineCharacter[]> {
    const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('last_viewed_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToCharacter);
}

export async function getCharacter(id: number): Promise<SpineCharacter | undefined> {
    const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error || !data) return undefined;
    return rowToCharacter(data);
}

export async function deleteCharacter(id: number): Promise<void> {
    await deleteSpineFiles(id);
    await supabase.from('characters').delete().eq('id', id);
}

export async function updateLastViewed(id: number): Promise<void> {
    await supabase.from('characters').update({ last_viewed_at: new Date().toISOString() }).eq('id', id);
}

export async function updateCharacterMeta(id: number, meta: Partial<{ name: string; tags: string[]; notes: string; status: string; projectId: number | null; collectionIds: number[] }>): Promise<void> {
    const update: any = {};
    if (meta.name !== undefined) update.name = meta.name;
    if (meta.tags !== undefined) update.tags = meta.tags;
    if (meta.notes !== undefined) update.notes = meta.notes;
    if (meta.status !== undefined) update.status = meta.status;
    if (meta.projectId !== undefined) update.project_id = meta.projectId;
    if (meta.collectionIds !== undefined) update.collection_ids = meta.collectionIds;
    await supabase.from('characters').update(update).eq('id', id);
}

export async function updateThumbnail(id: number, thumbnail: string): Promise<void> {
    await supabase.from('characters').update({ thumbnail }).eq('id', id);
}

export async function getCharacterCount(): Promise<number> {
    const { count, error } = await supabase.from('characters').select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
}

export async function searchCharacters(query: string): Promise<SpineCharacter[]> {
    const q = `%${query}%`;
    const { data, error } = await supabase
        .from('characters')
        .select('*')
        .or(`name.ilike.${q},json_name.ilike.${q}`)
        .order('last_viewed_at', { ascending: false });
    if (error) return [];
    return (data || []).map(rowToCharacter);
}

export async function findDuplicates(jsonNames: string[]): Promise<Map<string, SpineCharacter>> {
    const { data } = await supabase
        .from('characters')
        .select('*')
        .in('json_name', jsonNames);
    const map = new Map<string, SpineCharacter>();
    if (data) {
        for (const row of data) {
            map.set(row.json_name, rowToCharacter(row));
        }
    }
    return map;
}

export async function getCharactersByProject(projectId: number | null): Promise<SpineCharacter[]> {
    let query = supabase.from('characters').select('*');
    if (projectId === null) {
        query = query.is('project_id', null);
    } else {
        query = query.eq('project_id', projectId);
    }
    const { data } = await query.order('last_viewed_at', { ascending: false });
    return (data || []).map(rowToCharacter);
}

export async function getAllUniqueTags(): Promise<string[]> {
    const { data } = await supabase.from('characters').select('tags');
    if (!data) return [];
    const tagSet = new Set<string>();
    for (const row of data) {
        for (const tag of (row.tags || [])) tagSet.add(tag);
    }
    return [...tagSet].sort();
}

export async function getCharactersByTag(tag: string): Promise<SpineCharacter[]> {
    const { data } = await supabase
        .from('characters')
        .select('*')
        .contains('tags', [tag])
        .order('last_viewed_at', { ascending: false });
    return (data || []).map(rowToCharacter);
}

export async function addTag(charId: number, tag: string): Promise<void> {
    const char = await getCharacter(charId);
    if (!char) return;
    const tags = [...new Set([...(char.tags || []), tag])];
    await supabase.from('characters').update({ tags }).eq('id', charId);
}

export async function removeTag(charId: number, tag: string): Promise<void> {
    const char = await getCharacter(charId);
    if (!char) return;
    const tags = (char.tags || []).filter(t => t !== tag);
    await supabase.from('characters').update({ tags }).eq('id', charId);
}

// ── Project CRUD ─────────────────────────────────────────────

export async function createProject(name: string, code: string, color?: string): Promise<number> {
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('projects')
        .insert({ user_id: userId, name, code, color: color || '#7c5cfc' })
        .select('id')
        .single();
    if (error) throw new Error(error.message);
    return data.id;
}

export async function getAllProjects(): Promise<SpineProject[]> {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
    return (data || []).map(rowToProject);
}

export async function getProject(id: number): Promise<SpineProject | undefined> {
    const { data } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
    return data ? rowToProject(data) : undefined;
}

// ── Collection CRUD ──────────────────────────────────────────

export async function createCollection(name: string, icon?: string, color?: string): Promise<number> {
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('collections')
        .insert({ user_id: userId, name, icon: icon || '', color: color || '#7c5cfc' })
        .select('id')
        .single();
    if (error) throw new Error(error.message);
    return data.id;
}

export async function getAllCollections(): Promise<SpineCollection[]> {
    const { data } = await supabase.from('collections').select('*').order('created_at', { ascending: true });
    return (data || []).map(rowToCollection);
}

export async function deleteCollection(id: number): Promise<void> {
    await supabase.from('collections').delete().eq('id', id);
}

export async function addToCollection(charId: number, collectionId: number): Promise<void> {
    const char = await getCharacter(charId);
    if (!char) return;
    const ids = [...new Set([...(char.collectionIds || []), collectionId])];
    await supabase.from('characters').update({ collection_ids: ids }).eq('id', charId);
}

export async function removeFromCollection(charId: number, collectionId: number): Promise<void> {
    const char = await getCharacter(charId);
    if (!char) return;
    const ids = (char.collectionIds || []).filter(id => id !== collectionId);
    await supabase.from('characters').update({ collection_ids: ids }).eq('id', charId);
}

export async function getCharactersByCollection(collectionId: number): Promise<SpineCharacter[]> {
    const { data } = await supabase
        .from('characters')
        .select('*')
        .contains('collection_ids', [collectionId])
        .order('last_viewed_at', { ascending: false });
    return (data || []).map(rowToCharacter);
}
