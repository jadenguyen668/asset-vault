/**
 * Animation Grid View - Hiển thị tất cả animation trong grid
 * Mỗi cell = 1 canvas nhỏ + 1 skeleton clone chạy 1 animation
 * Dùng Canvas2D cho nhẹ (preview only)
 */

import { detectVersion } from './version-detect';
import { loadSpineCanvasRuntime } from './viewer';

// ── Types ───────────────────────────────────────────────────────
export interface AnimViewState {
    scale: number;
    viewZoom: number;
    offsetX: number;
    offsetY: number;
    speed: number;
    bgImage: HTMLImageElement | null;
    bgColor: string;
}

export interface GridSpineData {
    assetType?: 'spine' | '2d' | '3d';
    mimeType?: string;
    fileBlob?: Blob; // raw file blob for 2d/3d
    jsonText: string;
    atlasText: string;
    pngBlobs: Map<string, Blob>;
    jsonName: string;
    majorVersion: number;
    minorVersion: number;
    bgImage?: HTMLImageElement | null;
    viewerState?: {
        scale: number;
        viewZoom: number;
        offsetX: number;
        offsetY: number;
        speed: number;
        bgColor: string;
    } | null;
    perAnimState?: Record<string, AnimViewState>;
}

interface GridCell {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    skeleton: any;
    animState: any;
    renderer: any;
    animName: string;
    element: HTMLDivElement;
    offsetX: number;
    offsetY: number;
    zoom: number;
}

// ── State ───────────────────────────────────────────────────────
let cells: GridCell[] = [];
let gridContainer: HTMLElement | null = null;
let animFrameId: number | null = null;
let gridPlaying = true;
let lastTime = 0;
let onClickCallback: ((animName: string) => void) | null = null;
let checkerPattern: CanvasPattern | null = null;
let gridBgImage: HTMLImageElement | null = null;
let gridSpeed = 1;
let gridBgColor = '#2e2e2e';
let gridViewZoom = 1;
let gridScaleMultiplier = 1;
let gridPerAnimState: Record<string, AnimViewState> = {};

// Override flags: true = user changed in Grid mode → apply to ALL cells
let gridSpeedOverride = false;
let gridZoomOverride = false;
let gridScaleOverride = false;
let gridBgOverride = false;

// Helper: get effective speed for a cell
function getCellSpeed(animName: string): number {
    if (gridSpeedOverride) return gridSpeed;
    return gridPerAnimState[animName]?.speed ?? 1;
}

// Helper: get effective zoom for a cell
function getCellZoom(animName: string): number {
    if (gridZoomOverride) return gridViewZoom;
    return gridPerAnimState[animName]?.viewZoom ?? 1;
}

// Helper: get effective scale multiplier for a cell
function getCellScaleMultiplier(animName: string): number {
    if (gridScaleOverride) return gridScaleMultiplier;
    return gridPerAnimState[animName]?.scale ?? 1;
}

// Helper: get effective BG image for a cell
function getCellBgImage(animName: string): HTMLImageElement | null {
    if (gridBgOverride) return gridBgImage;
    return gridPerAnimState[animName]?.bgImage ?? null;
}

// ── Public API ──────────────────────────────────────────────────

export function setOnAnimationClick(cb: (animName: string) => void) {
    onClickCallback = cb;
}

// Grid global overrides — broadcast to ALL cells
export function setGridSpeed(speed: number) {
    gridSpeed = speed;
    gridSpeedOverride = true;
}

export function setGridScale(scale: number) {
    gridScaleMultiplier = scale;
    gridScaleOverride = true;
}

export function setGridViewZoom(zoom: number) {
    gridViewZoom = zoom;
    gridZoomOverride = true;
    cells.forEach(cell => { cell.zoom = zoom; });
}

export function setGridBgImage(img: HTMLImageElement | null) {
    gridBgImage = img;
    gridBgOverride = true;
    // clear cached WebGL textures
    cells.forEach(cell => { (cell as any)._bgTex = null; });
}

export function setGridPlaying(playing: boolean) {
    gridPlaying = playing;
}

export function setGridSkin(skinName: string) {
    for (const cell of cells) {
        try {
            const skeleton = cell.skeleton;
            if ((skeleton as any).setSkinByName) {
                (skeleton as any).setSkinByName(skinName);
            } else if ((skeleton as any).data?.findSkin) {
                const skinData = (skeleton as any).data.findSkin(skinName);
                if (skinData) (skeleton as any).setSkin(skinData);
            }
            skeleton.setSlotsToSetupPose();
        } catch (e) { /* ignore */ }
    }
}

// Return current grid override state so main.ts can sync back to perAnimState
export function getGridOverrides() {
    return {
        speedOverride: gridSpeedOverride,
        speed: gridSpeed,
        scaleOverride: gridScaleOverride,
        scale: gridScaleMultiplier,
        bgOverride: gridBgOverride,
        bgImage: gridBgImage,
    };
}

export async function initGridView(data: GridSpineData): Promise<void> {
    destroyGridView();

    gridContainer = document.getElementById('grid-container');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';
    gridContainer.style.display = '';
    gridBgImage = data.bgImage || null;

    // Sync viewer state from single mode (used as defaults)
    const vs = data.viewerState;
    gridSpeed = vs?.speed ?? 1;
    gridBgColor = vs?.bgColor ?? '#2e2e2e';
    gridViewZoom = vs?.viewZoom ?? 1;
    gridScaleMultiplier = vs?.scale ?? 1;
    gridPerAnimState = data.perAnimState ?? {};

    // Reset override flags — per-anim state takes priority initially
    gridSpeedOverride = false;
    gridZoomOverride = false;
    gridScaleOverride = false;
    gridBgOverride = false;

    // Determine runtime
    const isSpine3 = data.majorVersion < 4;

    if (isSpine3) {
        await initGrid3x(data);
    } else {
        await initGrid4x(data);
    }

    // Start render loop
    lastTime = performance.now() / 1000;
    animFrameId = requestAnimationFrame(gridRenderLoop);
}

// ── Multi-Skeleton Grid ─────────────────────────────────────────
// Show ALL skeletons in a grid — each cell = 1 skeleton + first animation
export async function initMultiSkeletonGrid(dataSets: GridSpineData[]): Promise<void> {
    destroyGridView();

    gridContainer = document.getElementById('grid-container');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    gridContainer.style.display = '';

    gridSpeedOverride = false;
    gridZoomOverride = false;
    gridScaleOverride = false;
    gridBgOverride = false;

    console.log(`[GRID-MULTI] Creating grid for ${dataSets.length} skeletons`);
    for (let i = 0; i < dataSets.length; i++) {
        const data = dataSets[i];
        const skeletonName = data.jsonName.replace(/\.(json|skel)$/i, '');
        const runtime = data.majorVersion < 4 ? '3.x Canvas2D' : '4.x WebGL';
        console.log(`[GRID-MULTI] [${i+1}/${dataSets.length}] Loading "${skeletonName}" (${runtime})...`);
        try {
            if (data.majorVersion < 4) {
                await initMultiCell3x(data, skeletonName);
            } else {
                await initMultiCell4x(data, skeletonName);
            }
            console.log(`[GRID-MULTI] ✓ "${skeletonName}" loaded, cells=${cells.length}`);
        } catch (err) {
            console.warn(`Failed to load skeleton "${skeletonName}":`, err);
        }
    }

    // Start render loop
    lastTime = performance.now() / 1000;
    animFrameId = requestAnimationFrame(gridRenderLoop);
}

// Multi-skeleton cell: Spine 3.x (Canvas2D)
async function initMultiCell3x(data: GridSpineData, skeletonName: string) {
    // Ensure Spine 3.x Canvas runtime is loaded
    await loadSpineCanvasRuntime(data.minorVersion >= 8 ? 8 : 7);
    const spine = (window as any).spine;
    if (!spine) {
        console.error(`[GRID-MULTI] Spine 3.x runtime failed to load for "${skeletonName}"`);
        return;
    }

    const images = new Map<string, HTMLImageElement>();
    for (const [filename, blob] of data.pngBlobs) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = url;
        });
        images.set(filename, img);
        URL.revokeObjectURL(url);
    }

    const atlas = new spine.TextureAtlas(data.atlasText, (path: string) => {
        let img = images.get(path);
        if (!img) img = images.get(path + '.png');
        if (!img) img = images.get(path.replace(/\.png$/i, ''));
        if (!img) {
            for (const [k, v] of images) {
                if (k.toLowerCase().includes(path.toLowerCase().replace(/\.png$/i, ''))) {
                    img = v; break;
                }
            }
        }
        if (!img) img = images.values().next().value;
        if (!img) return null;
        return { getImage: () => img, setFilters: () => {}, setWraps: () => {} };
    });

    const atlasLoader = new spine.AtlasAttachmentLoader(atlas);
    const jsonParser = new spine.SkeletonJson(atlasLoader);
    const jsonData = JSON.parse(data.jsonText);

    if (data.minorVersion >= 8) {
        convertLegacyMeshTypes(jsonData);
        if (jsonData.skins && !Array.isArray(jsonData.skins)) {
            const skinsArr: any[] = [];
            for (const [skinName, skinSlots] of Object.entries(jsonData.skins)) {
                skinsArr.push({ name: skinName, attachments: skinSlots });
            }
            jsonData.skins = skinsArr;
        }
    }

    const skeletonData = jsonParser.readSkeletonData(jsonData);
    const firstAnim = skeletonData.animations.length > 0 ? skeletonData.animations[0].name : null;

    const skeleton = new spine.Skeleton(skeletonData);
    skeleton.setToSetupPose();
    const firstSkin = (skeletonData.skins?.length > 1 ? skeletonData.skins.find((s: any) => s.name?.toLowerCase() !== 'default') : null) || skeletonData.skins?.[0] || skeletonData.defaultSkin;
    if (firstSkin) { skeleton.setSkin(firstSkin); skeleton.setSlotsToSetupPose(); }
    skeleton.updateWorldTransform();

    let scale = 0.5;
    try {
        const offset = new spine.Vector2(); const size = new spine.Vector2();
        skeleton.getBounds(offset, size, []);
        const cellCanvasH = Math.round((280 - 32) * (window.devicePixelRatio || 1));
        scale = Math.min((cellCanvasH * 0.6) / (size.y || 400), 2);
    } catch {}

    const stateData = new spine.AnimationStateData(skeletonData);
    stateData.defaultMix = 0;
    const animState = new spine.AnimationState(stateData);
    if (firstAnim) animState.setAnimation(0, firstAnim, true);

    const ctx2d = createCell(skeletonName);
    const renderer = new spine.canvas.SkeletonRenderer(ctx2d.ctx);
    renderer.debugRendering = false;
    renderer.triangleRendering = true;
    patchDrawTriangle(renderer, ctx2d.ctx);

    (skeleton as any)._gridScale = scale;
    cells.push({ canvas: ctx2d.canvas, ctx: ctx2d.ctx, skeleton, animState, renderer, animName: skeletonName, element: ctx2d.element, offsetX: 0, offsetY: 0, zoom: 1 });
    setupCellInteraction(cells[cells.length - 1]);
}

// Multi-skeleton cell: Spine 4.x (WebGL)
async function initMultiCell4x(data: GridSpineData, skeletonName: string) {
    console.log(`[CELL-4x] "${skeletonName}" starting...`);
    const spine4 = await import('@esotericsoftware/spine-webgl');

    const textures = new Map<string, HTMLImageElement>();
    for (const [filename, blob] of data.pngBlobs) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = url;
        });
        textures.set(filename, img);
        URL.revokeObjectURL(url);
    }
    console.log(`[CELL-4x] "${skeletonName}" textures loaded: ${textures.size}`);

    const jsonData = JSON.parse(data.jsonText);

    const cellData = createCell(skeletonName, true); // webgl mode
    const gl = cellData.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false })
        || cellData.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) {
        console.error(`[CELL-4x] ✗ WebGL context FAILED for "${skeletonName}"`);
        cellData.element.remove();
        return;
    }
    console.log(`[CELL-4x] "${skeletonName}" GL context OK`);

    const atlas = new spine4.TextureAtlas(data.atlasText);
    for (const page of atlas.pages) {
        const pageName = page.name;
        let texImg = textures.get(pageName) || textures.get(pageName + '.png') || textures.get(pageName.replace(/\.png$/i, ''));
        if (!texImg) {
            const pageBase = pageName.replace(/\.png$/i, '').toLowerCase();
            for (const [fname, fimg] of textures) {
                const fBase = fname.replace(/\.png$/i, '').toLowerCase();
                if (fBase === pageBase || fBase.endsWith(pageBase) || pageBase.endsWith(fBase)) { texImg = fimg; break; }
            }
        }
        if (!texImg && atlas.pages.length === 1) texImg = textures.values().next().value;
        if (texImg) {
            page.setTexture(new spine4.GLTexture(gl as WebGLRenderingContext, texImg));
        } else {
            console.warn(`[CELL-4x] "${skeletonName}" missing texture for page "${pageName}"`);
        }
    }
    console.log(`[CELL-4x] "${skeletonName}" atlas pages: ${atlas.pages.length}`);

    const atlasLoader = new spine4.AtlasAttachmentLoader(atlas);
    const jsonParser = new spine4.SkeletonJson(atlasLoader);
    const skeletonData = jsonParser.readSkeletonData(jsonData);
    console.log(`[CELL-4x] "${skeletonName}" skel: bones=${skeletonData.bones.length} anims=${skeletonData.animations.length}`);

    const skeleton = new spine4.Skeleton(skeletonData);
    skeleton.setToSetupPose();
    const firstSkin = (skeletonData.skins?.length > 1 ? skeletonData.skins.find((s: any) => s.name?.toLowerCase() !== 'default') : null) || skeletonData.skins?.[0] || skeletonData.defaultSkin;
    if (firstSkin) { skeleton.setSkin(firstSkin); skeleton.setSlotsToSetupPose(); }

    let scale = 0.5;
    try {
        const physicsEnum = spine4?.Physics;
        const resetVal = physicsEnum?.reset ?? 0;
        skeleton.updateWorldTransform(resetVal as any);
        const bounds = skeleton.getBoundsRect();
        const cellCanvasH = Math.round((280 - 32) * (window.devicePixelRatio || 1));
        scale = Math.min((cellCanvasH * 0.6) / (bounds.height || 400), 2);
    } catch { try { skeleton.updateWorldTransform(0 as any); } catch {} }

    const firstAnim = skeletonData.animations.length > 0 ? skeletonData.animations[0].name : null;
    const stateData = new spine4.AnimationStateData(skeletonData);
    stateData.defaultMix = 0;
    const animState = new spine4.AnimationState(stateData);
    if (firstAnim) animState.setAnimation(0, firstAnim, true);

    const renderer = new spine4.SceneRenderer(cellData.canvas, gl as WebGLRenderingContext);

    (skeleton as any)._gridScale = scale;
    (skeleton as any)._spine4 = spine4;
    (skeleton as any)._gl = gl;
    const newCell: GridCell = { canvas: cellData.canvas, ctx: null as any, skeleton, animState, renderer, animName: skeletonName, element: cellData.element, offsetX: 0, offsetY: 0, zoom: 1 };
    setupCellInteraction(newCell);
    cells.push(newCell);
}


export function destroyGridView() {
    if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    cells.forEach(cell => {
        // Properly dispose WebGL resources
        try {
            if (cell.renderer?.dispose) cell.renderer.dispose();
        } catch { /* ignore */ }
        // Force-lose GL context to free GPU resources
        const gl = (cell.skeleton as any)?._gl as WebGLRenderingContext;
        if (gl) {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
        }
        cell.canvas.remove();
        cell.element.remove();
    });
    cells = [];
    checkerPattern = null;
    gridPlaying = true; // Reset on destroy so re-entry starts playing
    if (gridContainer) {
        gridContainer.innerHTML = '';
        gridContainer.style.display = 'none';
    }
}

export function isGridActive(): boolean {
    return cells.length > 0;
}

// ── Spine 3.x Grid ─────────────────────────────────────────────
async function initGrid3x(data: GridSpineData) {
    // Ensure Spine 3.x Canvas runtime is loaded
    await loadSpineCanvasRuntime(data.minorVersion >= 8 ? 8 : 7);
    const spine = (window as any).spine;
    if (!spine) throw new Error('Spine 3.x runtime not loaded');

    // Load PNG as Image elements
    const images = new Map<string, HTMLImageElement>();
    for (const [filename, blob] of data.pngBlobs) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load PNG: ' + filename));
            img.src = url;
        });
        images.set(filename, img);
        URL.revokeObjectURL(url);
    }

    // Parse atlas
    const atlas = new spine.TextureAtlas(data.atlasText, (path: string) => {
        let img = images.get(path);
        if (!img) img = images.get(path + '.png');
        if (!img) img = images.get(path.replace(/\.png$/i, ''));
        if (!img) {
            for (const [k, v] of images) {
                if (k.toLowerCase().includes(path.toLowerCase().replace(/\.png$/i, ''))) {
                    img = v; break;
                }
            }
        }
        if (!img) img = images.values().next().value;
        if (!img) return null;
        return { getImage: () => img, setFilters: () => {}, setWraps: () => {} };
    });

    // Parse skeleton
    const atlasLoader = new spine.AtlasAttachmentLoader(atlas);
    const jsonParser = new spine.SkeletonJson(atlasLoader);
    const jsonData = JSON.parse(data.jsonText);

    // Convert legacy types for 3.8
    if (data.minorVersion >= 8) {
        convertLegacyMeshTypes(jsonData);
        if (jsonData.skins && !Array.isArray(jsonData.skins)) {
            const skinsArr: any[] = [];
            for (const [skinName, skinSlots] of Object.entries(jsonData.skins)) {
                skinsArr.push({ name: skinName, attachments: skinSlots });
            }
            jsonData.skins = skinsArr;
        }
    }

    const skeletonData = jsonParser.readSkeletonData(jsonData);
    const animations: string[] = skeletonData.animations.map((a: any) => a.name);

    // Create cells
    for (const animName of animations) {
        const skeleton = new spine.Skeleton(skeletonData);
        skeleton.setToSetupPose();
        const firstSkin4 = (skeletonData.skins?.length > 1 ? skeletonData.skins.find((s: any) => s.name?.toLowerCase() !== 'default') : null) || skeletonData.skins?.[0] || skeletonData.defaultSkin;
        if (firstSkin4) {
            skeleton.setSkin(firstSkin4);
            skeleton.setSlotsToSetupPose();
        }
        skeleton.updateWorldTransform();

        // Auto-fit scale — same formula as Single mode viewer
        let scale = 0.5;
        try {
            const offset = new spine.Vector2();
            const size = new spine.Vector2();
            skeleton.getBounds(offset, size, []);
            const cellCanvasH = Math.round((280 - 32) * (window.devicePixelRatio || 1));
            const fitScale = (cellCanvasH * 0.6) / (size.y || 400);
            scale = Math.min(fitScale, 2);
        } catch { /* use default */ }

        const stateData = new spine.AnimationStateData(skeletonData);
        stateData.defaultMix = 0;
        const animState = new spine.AnimationState(stateData);
        animState.setAnimation(0, animName, true);

        const ctx2d = createCell(animName);
        const renderer = new spine.canvas.SkeletonRenderer(ctx2d.ctx);
        renderer.debugRendering = false;
        renderer.triangleRendering = true;

        // Patch drawTriangle for seam fix
        patchDrawTriangle(renderer, ctx2d.ctx);

        (skeleton as any)._gridScale = scale;

        // Apply per-animation state if available
        const pas = gridPerAnimState[animName];
        const newCell: GridCell = {
            canvas: ctx2d.canvas,
            ctx: ctx2d.ctx,
            skeleton,
            animState,
            renderer,
            animName,
            element: ctx2d.element,
            offsetX: 0,
            offsetY: 0,
            zoom: pas?.viewZoom ?? gridViewZoom,
        };
        setupCellInteraction(newCell);
        cells.push(newCell);
    }
}

// ── Spine 4.x Grid ─────────────────────────────────────────────
async function initGrid4x(data: GridSpineData) {
    // For 4.x, we still use Canvas2D for lightweight grid preview
    // We re-parse skeleton data and create Canvas2D-compatible rendering
    // Since spine 4.x uses WebGL, we'll use a simple approach:
    // Load spine-canvas 3.8 for grid preview (it can render most spine data)

    // Alternative: use offscreen WebGL rendering per cell
    // For simplicity, we'll try to use the spine4 module but with 2D canvas fallback

    const spine4 = await import('@esotericsoftware/spine-webgl');

    // For grid, we'll create small WebGL canvases per cell
    const textures = new Map<string, HTMLImageElement>();
    for (const [filename, blob] of data.pngBlobs) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load PNG: ' + filename));
            img.src = url;
        });
        textures.set(filename, img);
        URL.revokeObjectURL(url);
    }

    const jsonData = JSON.parse(data.jsonText);

    // Convert 3.x JSON to 4.x format if needed
    if (data.majorVersion < 4) {
        if (jsonData.skins && !Array.isArray(jsonData.skins)) {
            const skinsArr: any[] = [];
            for (const [skinName, skinSlots] of Object.entries(jsonData.skins)) {
                skinsArr.push({ name: skinName, attachments: skinSlots });
            }
            jsonData.skins = skinsArr;
        }
        convertLegacyMeshTypes(jsonData);
    }

    const animations: string[] = [];

    // Parse animation names from skeletonData
    const animSection = jsonData.animations;
    if (animSection) {
        for (const name of Object.keys(animSection)) {
            animations.push(name);
        }
    }

    // Create one shared WebGL context approach won't work well for grid
    // Instead, create individual WebGL canvases
    for (const animName of animations) {
        const cellData = createCell(animName, true); // webgl mode
        const gl = cellData.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false })
            || cellData.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });

        if (!gl) continue;

        // Create atlas with GL textures for this cell
        const atlas = new spine4.TextureAtlas(data.atlasText);
        for (const page of atlas.pages) {
            const pageName = page.name;
            let texImg = textures.get(pageName)
                || textures.get(pageName + '.png')
                || textures.get(pageName.replace(/\.png$/i, ''));

            if (!texImg) {
                const pageBase = pageName.replace(/\.png$/i, '').toLowerCase();
                for (const [fname, fimg] of textures) {
                    const fBase = fname.replace(/\.png$/i, '').toLowerCase();
                    if (fBase === pageBase || fBase.endsWith(pageBase) || pageBase.endsWith(fBase)) {
                        texImg = fimg;
                        break;
                    }
                }
            }

            if (!texImg && atlas.pages.length === 1) {
                texImg = textures.values().next().value;
            }

            if (texImg) {
                page.setTexture(new spine4.GLTexture(gl as WebGLRenderingContext, texImg));
            }
        }

        const atlasLoader = new spine4.AtlasAttachmentLoader(atlas);
        const jsonParser = new spine4.SkeletonJson(atlasLoader);
        const skeletonData = jsonParser.readSkeletonData(jsonData);

        const skeleton = new spine4.Skeleton(skeletonData);
        skeleton.setToSetupPose();
            const firstSkinM = (skeletonData.skins?.length > 1 ? skeletonData.skins.find((s: any) => s.name?.toLowerCase() !== 'default') : null) || skeletonData.skins?.[0] || skeletonData.defaultSkin;
            if (firstSkinM) {
                skeleton.setSkin(firstSkinM);
                skeleton.setSlotsToSetupPose();
            }

        // Auto-fit scale
        let scale = 0.5;
        try {
            const physicsEnum = spine4?.Physics;
            const resetVal = physicsEnum?.reset ?? 0;
            skeleton.updateWorldTransform(resetVal as any);
            const bounds = skeleton.getBoundsRect();
            const cellCanvasH = Math.round((280 - 32) * (window.devicePixelRatio || 1));
            const fitScale = (cellCanvasH * 0.6) / (bounds.height || 400);
            scale = Math.min(fitScale, 2);
        } catch {
            try { skeleton.updateWorldTransform(0 as any); } catch {}
        }

        const stateData = new spine4.AnimationStateData(skeletonData);
        stateData.defaultMix = 0;
        const animState = new spine4.AnimationState(stateData);
        animState.setAnimation(0, animName, true);

        // FX-FIX: Same fixes as single viewer
        for (let si = 0; si < skeleton.slots.length; si++) {
            const slot = skeleton.slots[si];
            const blendMode = slot.data.blendMode;
            const att = slot.getAttachment();
            if (blendMode !== 0 && att && att.name === 'rec') {
                slot.color.a = 0;
            }
            if (blendMode === 0 && att && att.name === 'frost_spike_big') {
                slot.data.blendMode = 1;
            }
        }

        const renderer = new spine4.SceneRenderer(cellData.canvas, gl as WebGLRenderingContext);

        (skeleton as any)._gridScale = scale;
        (skeleton as any)._spine4 = spine4;
        (skeleton as any)._gl = gl;
        // Apply per-animation state if available
        const pas = gridPerAnimState[animName];
        const newCell: GridCell = {
            canvas: cellData.canvas,
            ctx: null as any, // WebGL mode - no 2D ctx
            skeleton,
            animState,
            renderer,
            animName,
            element: cellData.element,
            offsetX: 0,
            offsetY: 0,
            zoom: pas?.viewZoom ?? gridViewZoom,
        };
        setupCellInteraction(newCell);
        cells.push(newCell);
    }
}

// ── Cell creation ───────────────────────────────────────────────
function createCell(animName: string, webgl = false): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; element: HTMLDivElement } {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.title = `${animName} — Drag to pan, scroll to zoom, click to select`;

    const canvas = document.createElement('canvas');
    // Initial size — will be synced to actual CSS size every frame
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(250 * dpr);
    canvas.height = Math.round(248 * dpr);
    canvas.style.width = '100%';
    canvas.style.height = '100%'; // fill the grid cell, let CSS grid control the sizing

    const label = document.createElement('div');
    label.className = 'grid-cell-label';
    label.textContent = animName;

    cell.appendChild(canvas);
    cell.appendChild(label);
    gridContainer!.appendChild(cell);

    const ctx = webgl ? null : canvas.getContext('2d');
    return { canvas, ctx: ctx as any, element: cell };
}

// ── Per-cell interaction: drag-to-pan, scroll-to-zoom, click-to-select ──
function setupCellInteraction(cell: GridCell) {
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let hasMoved = false;

    cell.element.addEventListener('mousedown', (e) => {
        if (e.button === 0 || e.button === 1) {
            dragging = true;
            hasMoved = false;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            e.preventDefault();
        }
    });

    const onMouseMove = (e: MouseEvent) => {
        if (!dragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
        const dpr = window.devicePixelRatio || 1;
        cell.offsetX += dx * dpr / cell.zoom;
        cell.offsetY += dy * dpr / cell.zoom;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
    };

    const onMouseUp = () => {
        if (dragging && !hasMoved) {
            // Pure click (no drag) → select animation
            if (onClickCallback) onClickCallback(cell.animName);
        }
        dragging = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Scroll to zoom per-cell
    cell.element.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        cell.zoom = Math.max(0.2, Math.min(5, cell.zoom * factor));
    }, { passive: false });
}

// ── Sync canvas pixel buffer with CSS display size ─────────────
function syncCellCanvasSize(cell: GridCell) {
    const rect = cell.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (cell.canvas.width !== w || cell.canvas.height !== h) {
        cell.canvas.width = w;
        cell.canvas.height = h;
        // For Canvas2D cells, we need to re-get the context (reset transform)
        // ctx reference stays valid after resize
    }
}

// ── Render Loop ─────────────────────────────────────────────────
function gridRenderLoop() {
    animFrameId = requestAnimationFrame(gridRenderLoop);

    const now = performance.now() / 1000;
    const delta = Math.min(now - lastTime, 0.05); // cap delta to 50ms
    lastTime = now;

    for (const cell of cells) {
        syncCellCanvasSize(cell);
        if (cell.ctx) {
            // Canvas2D (Spine 3.x)
            renderCell2D(cell, delta);
        } else {
            // WebGL (Spine 4.x)
            renderCellWebGL(cell, delta);
        }
    }
}

function renderCell2D(cell: GridCell, delta: number) {
    const { canvas, ctx, skeleton, animState, renderer } = cell;
    const w = canvas.width;
    const h = canvas.height;
    const scale = ((skeleton as any)._gridScale || 0.5) * getCellScaleMultiplier(cell.animName);

    // Clear with checker pattern
    ctx.save();
    if (!checkerPattern) {
        const sz = 10;
        const pc = document.createElement('canvas');
        pc.width = sz * 2; pc.height = sz * 2;
        const pctx = pc.getContext('2d')!;
        pctx.fillStyle = '#3a3a3a';
        pctx.fillRect(0, 0, sz * 2, sz * 2);
        pctx.fillStyle = '#2a2a2a';
        pctx.fillRect(0, 0, sz, sz);
        pctx.fillRect(sz, sz, sz, sz);
        checkerPattern = ctx.createPattern(pc, 'repeat');
    }
    ctx.fillStyle = checkerPattern || '#2e2e2e';
    ctx.fillRect(0, 0, w, h);

    // Draw background image centered on skeleton
    const cellBg = getCellBgImage(cell.animName);
    if (cellBg) {
        const bgW = cellBg.naturalWidth;
        const bgH = cellBg.naturalHeight;
        const bgScale = Math.min(w / bgW, h / bgH);
        // Center BG on skeleton position (before transform)
        const skelX = w / 2 + cell.offsetX;
        const skelY = h * 0.9 + cell.offsetY;
        const bx = skelX - (bgW * bgScale) / 2;
        const by = skelY - (bgH * bgScale) / 2;
        ctx.drawImage(cellBg, bx, by, bgW * bgScale, bgH * bgScale);
    }

    // Viewport zoom
    const vz = cell.zoom;
    ctx.translate(w / 2, h / 2);
    ctx.scale(vz, vz);
    ctx.translate(-w / 2, -h / 2);

    // Transform: center-bottom, flip Y + offset
    ctx.translate(w / 2 + cell.offsetX, h * 0.9 + cell.offsetY);
    ctx.scale(scale, -scale);

    // Update
    if (gridPlaying) {
        animState.update(delta * getCellSpeed(cell.animName));
    }
    animState.apply(skeleton);
    skeleton.updateWorldTransform();

    // Draw
    try {
        renderer.draw(skeleton);
    } catch { /* ignore render errors in grid */ }

    ctx.restore();
}

function renderCellWebGL(cell: GridCell, delta: number) {
    const { canvas, skeleton, animState, renderer } = cell;
    const gl = (skeleton as any)._gl as WebGLRenderingContext;
    const spine4 = (skeleton as any)._spine4;
    const scale = ((skeleton as any)._gridScale || 0.5) * getCellScaleMultiplier(cell.animName);
    const w = canvas.width;
    const h = canvas.height;

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    skeleton.x = w / 2 + cell.offsetX;
    skeleton.y = h * 0.1 - cell.offsetY;
    skeleton.scaleX = scale;
    skeleton.scaleY = scale;

    if (gridPlaying) {
        animState.update(delta * getCellSpeed(cell.animName));
    }
    animState.apply(skeleton);
    skeleton.update(gridPlaying ? delta * getCellSpeed(cell.animName) : 0);

    try {
        const physicsVal = spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0;
        skeleton.updateWorldTransform(physicsVal as any);
    } catch {
        try { skeleton.updateWorldTransform(0 as any); } catch {}
    }

    const vz = cell.zoom;
    renderer.camera.position.x = w / 2;
    renderer.camera.position.y = h / 2;
    renderer.camera.viewportWidth = w / vz;
    renderer.camera.viewportHeight = h / vz;
    renderer.camera.update();

    // Force-reset Spine batcher's internal blend tracking to Normal blend
    // Properties: srcColorBlend, srcAlphaBlend, dstBlend (from PolygonBatcher.js)
    // This ensures begin() will apply Normal blend via gl.blendFuncSeparate
    const batcher = (renderer as any).batcher;
    if (batcher) {
        batcher.srcColorBlend = gl.SRC_ALPHA;
        batcher.srcAlphaBlend = gl.ONE;
        batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }

    renderer.begin();

    // Draw checkerboard background (tiled at viewport resolution)
    const cSz = 10;
    if (!(cell as any)._checkerTex || (cell as any)._checkerW !== w || (cell as any)._checkerH !== h) {
        if ((cell as any)._checkerTex) (cell as any)._checkerTex.dispose?.();
        (cell as any)._checkerTex = null;
        if (spine4) {
            const pc2 = document.createElement('canvas');
            pc2.width = w; pc2.height = h;
            const pctx2 = pc2.getContext('2d')!;
            pctx2.fillStyle = '#3a3a3a';
            pctx2.fillRect(0, 0, w, h);
            pctx2.fillStyle = '#2a2a2a';
            for (let ry = 0; ry < h; ry += cSz) {
                for (let rx = 0; rx < w; rx += cSz) {
                    if (((rx / cSz) + (ry / cSz)) % 2 === 0) {
                        pctx2.fillRect(rx, ry, cSz, cSz);
                    }
                }
            }
            (cell as any)._checkerTex = new spine4.GLTexture(gl, pc2 as any);
            (cell as any)._checkerW = w;
            (cell as any)._checkerH = h;
        }
    }
    if ((cell as any)._checkerTex) {
        const camW = w / vz;
        const camH = h / vz;
        renderer.drawTexture((cell as any)._checkerTex, w / 2 - camW / 2, h / 2 - camH / 2, camW, camH);
    }

    // Draw background image centered on skeleton
    const cellBg = getCellBgImage(cell.animName);
    if (cellBg && spine4) {
        if (!(cell as any)._bgTex) {
            (cell as any)._bgTex = new spine4.GLTexture(gl, cellBg);
        }
        const bgTex = (cell as any)._bgTex;
        if (bgTex) {
            const skelX = w / 2 + cell.offsetX;
            const skelY = h * 0.1 - cell.offsetY;
            const bgW = cellBg.naturalWidth;
            const bgH = cellBg.naturalHeight;
            // Use skeleton scale (same as single viewer) to preserve BG/char ratio
            const bgScale = scale;
            const bx = skelX - (bgW * bgScale) / 2;
            const by = skelY - (bgH * bgScale) / 2;
            renderer.drawTexture(bgTex, bx, by, bgW * bgScale, bgH * bgScale);
        }
    }
    renderer.end();

    // Skeleton pass: reset batcher to Normal blend before drawing
    if (batcher) {
        batcher.srcColorBlend = gl.SRC_ALPHA;
        batcher.srcAlphaBlend = gl.ONE;
        batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }

    renderer.begin();
    try {
        renderer.drawSkeleton(skeleton, false);
    } catch { /* ignore render errors in grid */ }
    renderer.end();

    // Force-reset batcher after skeleton draw for next frame
    if (batcher) {
        batcher.srcColorBlend = gl.SRC_ALPHA;
        batcher.srcAlphaBlend = gl.ONE;
        batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }
}

// ── Helpers ─────────────────────────────────────────────────────
function convertLegacyMeshTypes(jsonData: any) {
    if (!jsonData.skins) return;
    const skins = Array.isArray(jsonData.skins) ? jsonData.skins : Object.values(jsonData.skins);
    for (const skin of skins) {
        const attachments = (skin as any).attachments || skin;
        if (typeof attachments !== 'object') continue;
        for (const slotAtts of Object.values(attachments)) {
            if (!slotAtts || typeof slotAtts !== 'object') continue;
            for (const attData of Object.values(slotAtts as Record<string, any>)) {
                if (!attData || typeof attData !== 'object') continue;
                const type = (attData as any).type;
                if (type === 'skinnedmesh' || type === 'weightedmesh') {
                    (attData as any).type = 'mesh';
                } else if (type === 'weightedlinkedmesh') {
                    (attData as any).type = 'linkedmesh';
                }
            }
        }
    }
}

function patchDrawTriangle(renderer: any, ctx: CanvasRenderingContext2D) {
    renderer.drawTriangle = function (img: any, x0: number, y0: number, u0: number, v0: number,
        x1: number, y1: number, u1: number, v1: number,
        x2: number, y2: number, u2: number, v2: number) {
        u0 *= img.width; v0 *= img.height;
        u1 *= img.width; v1 *= img.height;
        u2 *= img.width; v2 *= img.height;

        const du1 = u1 - u0, dv1 = v1 - v0;
        const du2 = u2 - u0, dv2 = v2 - v0;
        const uvDet = du1 * dv2 - du2 * dv1;
        if (Math.abs(uvDet) < 1e-6) return;

        const cx = (x0 + x1 + x2) / 3;
        const cy = (y0 + y1 + y2) / 3;
        const expand = 2.0;
        const ex0 = x0 + (x0 - cx) * expand / Math.max(1, Math.hypot(x0 - cx, y0 - cy));
        const ey0 = y0 + (y0 - cy) * expand / Math.max(1, Math.hypot(x0 - cx, y0 - cy));
        const ex1 = x1 + (x1 - cx) * expand / Math.max(1, Math.hypot(x1 - cx, y1 - cy));
        const ey1 = y1 + (y1 - cy) * expand / Math.max(1, Math.hypot(x1 - cx, y1 - cy));
        const ex2 = x2 + (x2 - cx) * expand / Math.max(1, Math.hypot(x2 - cx, y2 - cy));
        const ey2 = y2 + (y2 - cy) * expand / Math.max(1, Math.hypot(x2 - cx, y2 - cy));

        ctx.beginPath();
        ctx.moveTo(ex0, ey0);
        ctx.lineTo(ex1, ey1);
        ctx.lineTo(ex2, ey2);
        ctx.closePath();

        const _x1 = x1 - x0, _y1 = y1 - y0;
        const _x2 = x2 - x0, _y2 = y2 - y0;
        const det = 1 / (du1 * dv2 - du2 * dv1);
        const a = (dv2 * _x1 - dv1 * _x2) * det;
        const b = (dv2 * _y1 - dv1 * _y2) * det;
        const c = (du1 * _x2 - du2 * _x1) * det;
        const d = (du1 * _y2 - du2 * _y1) * det;
        const e = x0 - a * u0 - c * v0;
        const f = y0 - b * u0 - d * v0;

        if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(d)) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.transform(a, b, c, d, e, f);
        ctx.clip();
        ctx.drawImage(img, 0, 0);
        ctx.restore();
    };
}
