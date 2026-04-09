/**
 * Spine Asset Library — IndexedDB Storage (Dexie.js)
 * Add-on module: does NOT affect existing viewer functionality.
 */
import Dexie, { type Table } from 'dexie';

// ── Types ──────────────────────────────────────────────────────

/** Naming template variables: Project, Category, Location, Subject, Action, Version */
export const NAMING_TEMPLATE = '[Project]_[Category]_[Location]_[Subject]_[Action/State]_v[Version]';
export const NAMING_EXAMPLE = 'CTP2_ANM_LOB_Max_v02';
export const NAMING_FIELDS = ['Project', 'Category', 'Location', 'Subject', 'Action/State', 'Version'] as const;

/** Predefined options for naming convention segments */
export const NAMING_OPTIONS: Record<string, { label: string; values: string[] }> = {
    Category: {
        label: 'Category',
        values: ['ANM', 'VFX', 'UIX', 'CHR', 'ENV', 'ICO', 'CUT', 'PRP'],
    },
    Location: {
        label: 'Location',
        values: ['LOB', 'ING', 'CUT', 'MNU', 'DLG', 'MAP', 'BTL', 'SHP'],
    },
};

export interface SpineProject {
    id?: number;
    name: string;           // Full name: "Genshin Impact"
    code: string;           // Short prefix: "GTI" — used in naming convention
    color: string;          // badge color hex
    createdAt: Date;
}

export interface SpineCollection {
    id?: number;
    name: string;
    icon: string;           // emoji icon
    color: string;          // badge color hex
    createdAt: Date;
}

export interface SpineCharacter {
    id?: number;
    assetType?: 'spine' | '2d' | '3d';
    mimeType?: string;          // e.g. 'image/png' or 'model/gltf-binary'
    name: string;               // skeleton name (e.g. "char_NgaoBinh")
    jsonName: string;           // original filename (e.g. "char_NgaoBinh.json")
    spineVersion: string;       // "3.7.94" | "4.1" | "4.2"
    majorVersion: number;       // 3 | 4
    minorVersion: number;
    // Raw file data
    jsonBlob: Blob;
    atlasBlob: Blob;
    pngBlobs: { name: string; blob: Blob }[];
    // Parsed text (for fast reload without re-reading blobs)
    jsonText: string;
    atlasText: string;
    // Metadata
    boneCount: number;
    slotCount: number;
    animCount: number;
    animNames: string[];        // list of animation names
    skinCount: number;
    fileSize: number;           // total bytes
    jsonSize: number;            // JSON file size bytes
    atlasSize: number;           // Atlas file size bytes
    pngSizes: { name: string; size: number }[];  // individual PNG sizes
    thumbnail: string | null;   // base64 data URL of first-frame capture
    // Timestamps
    importedAt: Date;
    lastViewedAt: Date;
    // User metadata
    tags: string[];
    notes: string;
    status: 'under-review' | 'in-review' | 'approved' | 'rejected' | 'needs-revision' | 'draft' | 'review' | 'redo';
    // Project
    projectId: number | null;
    // Collections
    collectionIds: number[];
}

// ── Auto-Tag Generation ────────────────────────────────────────

/** Generate auto-tags based on character metadata */
export function generateAutoTags(char: {
    assetType?: string;
    majorVersion: number;
    spineVersion: string;
    animCount: number;
    boneCount: number;
    skinCount: number;
    fileSize: number;
}): string[] {
    const tags: string[] = [];

    if (char.assetType === '2d') {
        tags.push('2d-art');
    } else if (char.assetType === '3d') {
        tags.push('3d-model');
    } else {
        // Spine version
        tags.push(`spine-${char.majorVersion}.x`);

        // Animation count
        if (char.animCount <= 3) tags.push('few-anims');
        else if (char.animCount <= 10) tags.push('medium-anims');
        else tags.push('many-anims');

        // Bone complexity
        if (char.boneCount <= 15) tags.push('simple-rig');
        else if (char.boneCount <= 50) tags.push('medium-rig');
        else tags.push('complex-rig');

        // Skins
        if (char.skinCount > 1) tags.push('multi-skin');
    }

    // File size
    if (char.fileSize < 500 * 1024) tags.push('lightweight');
    else if (char.fileSize > 5 * 1024 * 1024) tags.push('heavy');

    return tags;
}

/** Standard auto-tag definitions for display */
export const AUTO_TAG_INFO: Record<string, { label: string; color: string; icon: string }> = {
    '2d-art':       { label: '2D Art',        color: '#ec4899', icon: '🖼️' },
    '3d-model':     { label: '3D Model',      color: '#0ea5e9', icon: '🧊' },
    'spine-3.x':    { label: 'Spine 3.x',     color: '#f59e0b', icon: '📦' },
    'spine-4.x':    { label: 'Spine 4.x',     color: '#22c55e', icon: '📦' },
    'few-anims':    { label: 'Few Anims',      color: '#94a3b8', icon: '🎬' },
    'medium-anims': { label: 'Medium Anims',   color: '#60a5fa', icon: '🎬' },
    'many-anims':   { label: 'Many Anims',     color: '#818cf8', icon: '🎬' },
    'simple-rig':   { label: 'Simple Rig',     color: '#a3e635', icon: '🦴' },
    'medium-rig':   { label: 'Medium Rig',     color: '#fbbf24', icon: '🦴' },
    'complex-rig':  { label: 'Complex Rig',    color: '#f87171', icon: '🦴' },
    'multi-skin':   { label: 'Multi-Skin',     color: '#c084fc', icon: '🎭' },
    'lightweight':  { label: 'Lightweight',    color: '#34d399', icon: '⚡' },
    'heavy':        { label: 'Heavy',          color: '#fb923c', icon: '💎' },
};

// ── Database ───────────────────────────────────────────────────

class SpineLibraryDB extends Dexie {
    characters!: Table<SpineCharacter, number>;
    projects!: Table<SpineProject, number>;
    collections!: Table<SpineCollection, number>;

    constructor() {
        super('SpineAssetLibrary');
        this.version(1).stores({
            characters: '++id, name, jsonName, spineVersion, majorVersion, importedAt, lastViewedAt, status',
        });
        // v2: add projects table + projectId index on characters
        this.version(2).stores({
            characters: '++id, name, jsonName, spineVersion, majorVersion, importedAt, lastViewedAt, status, projectId',
            projects: '++id, name, createdAt',
        }).upgrade(tx => {
            return tx.table('characters').toCollection().modify(char => {
                if (char.projectId === undefined) {
                    char.projectId = null;
                }
            });
        });
        // v3: add collections table + collectionIds + auto-tags on characters
        this.version(3).stores({
            characters: '++id, name, jsonName, spineVersion, majorVersion, importedAt, lastViewedAt, status, projectId, *tags',
            projects: '++id, name, createdAt',
            collections: '++id, name, createdAt',
        }).upgrade(tx => {
            return tx.table('characters').toCollection().modify(char => {
                if (!Array.isArray(char.collectionIds)) {
                    char.collectionIds = [];
                }
                // Generate auto-tags for existing characters that have none
                if (!char.tags || char.tags.length === 0) {
                    char.tags = generateAutoTags({
                        majorVersion: char.majorVersion,
                        spineVersion: char.spineVersion,
                        animCount: char.animCount,
                        boneCount: char.boneCount,
                        skinCount: char.skinCount,
                        fileSize: char.fileSize,
                    });
                }
            });
        });
        // v4: add detailed file sizes + status 'redo'
        this.version(4).stores({
            characters: '++id, name, jsonName, spineVersion, majorVersion, importedAt, lastViewedAt, status, projectId, *tags',
            projects: '++id, name, createdAt',
            collections: '++id, name, createdAt',
        }).upgrade(tx => {
            return tx.table('characters').toCollection().modify(char => {
                if (char.jsonSize === undefined) char.jsonSize = 0;
                if (char.atlasSize === undefined) char.atlasSize = 0;
                if (!Array.isArray(char.pngSizes)) char.pngSizes = [];
                // Calculate sizes from blobs if available
                if (char.jsonBlob instanceof Blob && char.jsonSize === 0) char.jsonSize = char.jsonBlob.size;
                if (char.atlasBlob instanceof Blob && char.atlasSize === 0) char.atlasSize = char.atlasBlob.size;
                if (Array.isArray(char.pngBlobs) && char.pngSizes.length === 0) {
                    char.pngSizes = char.pngBlobs.map((p: any) => ({ name: p.name, size: p.blob?.size || 0 }));
                }
                // Migrate shipped → redo is not needed, but ensure valid status
                if (char.status === 'shipped') char.status = 'approved';
            });
        });
        // v5: add animNames
        this.version(5).stores({
            characters: '++id, name, jsonName, spineVersion, majorVersion, importedAt, lastViewedAt, status, projectId, *tags',
            projects: '++id, name, createdAt',
            collections: '++id, name, createdAt',
        }).upgrade(tx => {
            return tx.table('characters').toCollection().modify(char => {
                if (!Array.isArray(char.animNames)) {
                    // Extract from jsonText if available
                    try {
                        const json = JSON.parse(char.jsonText || '{}');
                        char.animNames = Object.keys(json.animations || {});
                    } catch {
                        char.animNames = [];
                    }
                }
            });
        });
    }
}

const db = new SpineLibraryDB();

// ── Project CRUD ───────────────────────────────────────────────

const PROJECT_COLORS = ['#7c5cfc', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899'];

/** Create a new project */
export async function createProject(name: string, code: string, color?: string): Promise<number> {
    const usedColors = (await db.projects.toArray()).map(p => p.color);
    const autoColor = color || PROJECT_COLORS.find(c => !usedColors.includes(c)) || PROJECT_COLORS[0];
    return await db.projects.add({
        name,
        code: code.toUpperCase(),
        color: autoColor,
        createdAt: new Date(),
    });
}

/** Get all projects */
export async function getAllProjects(): Promise<SpineProject[]> {
    return await db.projects.orderBy('createdAt').toArray();
}

/** Get project by ID */
export async function getProject(id: number): Promise<SpineProject | undefined> {
    return await db.projects.get(id);
}

/** Get available project colors */
export function getProjectColors(): string[] {
    return [...PROJECT_COLORS];
}

// ── Collection CRUD ────────────────────────────────────────────

const COLLECTION_COLORS = ['#7c5cfc', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899', '#a78bfa', '#fbbf24'];
const COLLECTION_ICONS = ['📁', '⭐', '🎮', '🗡️', '🛡️', '🧙', '👾', '🌟', '💎', '🔥', '🎯', '🏰'];

/** Create a new collection */
export async function createCollection(name: string, icon?: string, color?: string): Promise<number> {
    const usedColors = (await db.collections.toArray()).map(c => c.color);
    const autoColor = color || COLLECTION_COLORS.find(c => !usedColors.includes(c)) || COLLECTION_COLORS[0];
    return await db.collections.add({
        name,
        icon: icon || '📁',
        color: autoColor,
        createdAt: new Date(),
    });
}

/** Get all collections */
export async function getAllCollections(): Promise<SpineCollection[]> {
    return await db.collections.orderBy('createdAt').toArray();
}

/** Delete a collection */
export async function deleteCollection(id: number): Promise<void> {
    // Remove collection from all characters first
    const chars = await db.characters.toArray();
    for (const char of chars) {
        if (char.collectionIds?.includes(id)) {
            const newIds = char.collectionIds.filter(cid => cid !== id);
            await db.characters.update(char.id!, { collectionIds: newIds });
        }
    }
    await db.collections.delete(id);
}

/** Get collection icons list */
export function getCollectionIcons(): string[] {
    return [...COLLECTION_ICONS];
}

/** Get collection colors list */
export function getCollectionColors(): string[] {
    return [...COLLECTION_COLORS];
}

/** Add character to collection */
export async function addToCollection(charId: number, collectionId: number): Promise<void> {
    const char = await db.characters.get(charId);
    if (!char) return;
    const ids = char.collectionIds || [];
    if (!ids.includes(collectionId)) {
        await db.characters.update(charId, { collectionIds: [...ids, collectionId] });
    }
}

/** Remove character from collection */
export async function removeFromCollection(charId: number, collectionId: number): Promise<void> {
    const char = await db.characters.get(charId);
    if (!char) return;
    const ids = (char.collectionIds || []).filter(id => id !== collectionId);
    await db.characters.update(charId, { collectionIds: ids });
}

/** Get characters in a collection */
export async function getCharactersByCollection(collectionId: number): Promise<SpineCharacter[]> {
    const all = await db.characters.toArray();
    return all.filter(c => c.collectionIds?.includes(collectionId));
}

// ── Character CRUD ─────────────────────────────────────────────

/** Save or update a character in the library.
 * - Same jsonName + same name → update existing (overwrite)
 * - Same jsonName + different name → create new entry (versioning)
 * - New jsonName → create new entry
 */
export async function saveCharacter(char: Omit<SpineCharacter, 'id' | 'importedAt' | 'lastViewedAt' | 'tags' | 'notes' | 'status' | 'collectionIds'> & { projectId?: number | null; tags?: string[]; notes?: string }): Promise<number> {
    const existing = await db.characters.where('jsonName').equals(char.jsonName).first();

    // Generate auto-tags
    const autoTags = generateAutoTags({
        majorVersion: char.majorVersion,
        spineVersion: char.spineVersion,
        animCount: char.animCount,
        boneCount: char.boneCount,
        skinCount: char.skinCount,
        fileSize: char.fileSize,
    });

    if (existing) {
        // Same jsonName → update in-place, preserve user metadata
        // Keep existing custom tags (non-auto), merge with fresh auto-tags and incoming custom tags
        const existingCustomTags = (existing.tags || []).filter(t => !AUTO_TAG_INFO[t]);
        const incomingCustomTags = (char.tags || []).filter(t => !AUTO_TAG_INFO[t]);
        const mergedTags = [...new Set([...autoTags, ...existingCustomTags, ...incomingCustomTags])];

        await db.characters.update(existing.id!, {
            ...char,
            name: char.name || existing.name,
            tags: mergedTags,
            projectId: char.projectId !== undefined ? char.projectId : existing.projectId,
            notes: char.notes || existing.notes,
            lastViewedAt: new Date(),
        });
        return existing.id!;
    }
    // New entry (either new file, or new version of existing file)
    const newTags = char.tags ? [...new Set([...autoTags, ...char.tags])] : autoTags;
    return await db.characters.add({
        ...char,
        projectId: char.projectId ?? null,
        collectionIds: [],
        importedAt: new Date(),
        lastViewedAt: new Date(),
        tags: newTags,
        notes: char.notes || '',
        status: 'under-review',
    });
}

/** Get all characters, sorted by last viewed */
export async function getAllCharacters(): Promise<SpineCharacter[]> {
    return await db.characters.orderBy('lastViewedAt').reverse().toArray();
}

/** Get a single character by ID */
export async function getCharacter(id: number): Promise<SpineCharacter | undefined> {
    return await db.characters.get(id);
}

/** Delete a character */
export async function deleteCharacter(id: number): Promise<void> {
    await db.characters.delete(id);
}

/** Update last viewed timestamp */
export async function updateLastViewed(id: number): Promise<void> {
    await db.characters.update(id, { lastViewedAt: new Date() });
}

/** Update character metadata (tags, notes, status, projectId, collectionIds, name) */
export async function updateCharacterMeta(id: number, meta: Partial<Pick<SpineCharacter, 'name' | 'tags' | 'notes' | 'status' | 'projectId' | 'collectionIds'>>): Promise<void> {
    await db.characters.update(id, meta);
}

/** Update thumbnail */
export async function updateThumbnail(id: number, thumbnail: string): Promise<void> {
    await db.characters.update(id, { thumbnail });
}

/** Get character count */
export async function getCharacterCount(): Promise<number> {
    return await db.characters.count();
}

/** Search characters by name (simple contains) */
export async function searchCharacters(query: string): Promise<SpineCharacter[]> {
    const all = await getAllCharacters();
    const q = query.toLowerCase();
    return all.filter(c => c.name.toLowerCase().includes(q) || c.jsonName.toLowerCase().includes(q));
}

/** Find existing characters by jsonName list — returns map of jsonName → SpineCharacter */
export async function findDuplicates(jsonNames: string[]): Promise<Map<string, SpineCharacter>> {
    const result = new Map<string, SpineCharacter>();
    for (const name of jsonNames) {
        const existing = await db.characters.where('jsonName').equals(name).first();
        if (existing) result.set(name, existing);
    }
    return result;
}

/** Get characters by project ID (null = no project) */
export async function getCharactersByProject(projectId: number | null): Promise<SpineCharacter[]> {
    if (projectId === null) {
        return (await db.characters.toArray()).filter(c => c.projectId === null || c.projectId === undefined);
    }
    return await db.characters.where('projectId').equals(projectId).toArray();
}

/** Get all unique tags across all characters */
export async function getAllUniqueTags(): Promise<string[]> {
    const all = await db.characters.toArray();
    const tagSet = new Set<string>();
    for (const char of all) {
        if (char.tags) {
            for (const tag of char.tags) tagSet.add(tag);
        }
    }
    return Array.from(tagSet).sort();
}

/** Get characters by tag */
export async function getCharactersByTag(tag: string): Promise<SpineCharacter[]> {
    return await db.characters.where('tags').equals(tag).toArray();
}

/** Add a custom tag to a character */
export async function addTag(charId: number, tag: string): Promise<void> {
    const char = await db.characters.get(charId);
    if (!char) return;
    const tags = char.tags || [];
    if (!tags.includes(tag)) {
        await db.characters.update(charId, { tags: [...tags, tag] });
    }
}

/** Remove a tag from a character */
export async function removeTag(charId: number, tag: string): Promise<void> {
    const char = await db.characters.get(charId);
    if (!char) return;
    const tags = (char.tags || []).filter(t => t !== tag);
    await db.characters.update(charId, { tags });
}

export { db };
