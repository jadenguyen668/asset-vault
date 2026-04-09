import './style.css';
import { detectVersion } from './version-detect';
import {
    initViewer, loadSpine, getAnimations, getSkins, getSkeletonInfo,
    playAnimation, setSkin, setSpeed, setScale, setPlaying, setLoop, setBgColor, setOffset, setBgImage, setBgOffset, setBgScale, setViewZoom, getViewZoom, getBgImage, getViewerState, resetOffset,
    captureCanvasThumbnail,
    type SpineFiles,
} from './viewer';
import { initGridView, destroyGridView, setOnAnimationClick, isGridActive, setGridSpeed, setGridScale, setGridViewZoom, setGridBgImage, getGridOverrides, initMultiSkeletonGrid, type GridSpineData, type AnimViewState , setGridPlaying, setGridSkin} from './viewer-grid';
import { saveCharacter, updateThumbnail, searchCharacters, type SpineCharacter } from './db';
import { renderLibrary, initLibrarySearch, setOnLibraryLoad, setOnLibraryLoadEmbedded } from './library-ui';
import { initMetaConfig, setGlobalMix, downloadMetaConfig, downloadAsZip } from './meta-config';
import { prepareImportItems, showImportDialog } from './import-dialog';
let currentLibraryChar: SpineCharacter | null = null;

// ── DOM refs ───────────────────────────────────────────────────
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ── File Drop Zone ─────────────────────────────────────────────

// Recursively read all files from a dropped directory entry
async function readDirectoryEntries(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
    const files: File[] = [];
    const reader = dirEntry.createReader();

    const readBatch = (): Promise<FileSystemEntry[]> =>
        new Promise((resolve, reject) => reader.readEntries(resolve, reject));

    // readEntries may return results in batches, keep reading until empty
    let batch: FileSystemEntry[];
    do {
        batch = await readBatch();
        for (const entry of batch) {
            if (entry.isFile) {
                const file = await new Promise<File>((resolve, reject) =>
                    (entry as FileSystemFileEntry).file(resolve, reject)
                );
                files.push(file);
            } else if (entry.isDirectory) {
                const subFiles = await readDirectoryEntries(entry as FileSystemDirectoryEntry);
                files.push(...subFiles);
            }
        }
    } while (batch.length > 0);

    return files;
}

// Extract files from drop event — supports both files and folders
async function getFilesFromDrop(dataTransfer: DataTransfer): Promise<File[]> {
    const items = dataTransfer.items;
    const allFiles: File[] = [];

    // Try webkitGetAsEntry first (supports folder traversal)
    const entries: FileSystemEntry[] = [];
    if (items) {
        for (let i = 0; i < items.length; i++) {
            const entry = items[i].webkitGetAsEntry?.();
            if (entry) entries.push(entry);
        }
    }

    if (entries.length > 0) {
        for (const entry of entries) {
            if (entry.isDirectory) {
                const dirFiles = await readDirectoryEntries(entry as FileSystemDirectoryEntry);
                allFiles.push(...dirFiles);
            } else if (entry.isFile) {
                try {
                    const file = await new Promise<File>((resolve, reject) =>
                        (entry as FileSystemFileEntry).file(resolve, reject)
                    );
                    allFiles.push(file);
                } catch {
                    // Fallback: try getting file from items directly
                    const file = items[entries.indexOf(entry)]?.getAsFile?.();
                    if (file) allFiles.push(file);
                }
            }
        }
        if (allFiles.length > 0) return allFiles;
    }

    // Fallback: regular file list (for multi-file drag without folder support)
    if (dataTransfer.files.length > 0) {
        return Array.from(dataTransfer.files);
    }

    return allFiles;
}

function setupDropZone() {
    const dropZone = $('drop-zone');
    const canvasWrap = $('canvas-wrap');

    // Prevent default drag behaviors on whole window (don't stopPropagation!)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        window.addEventListener(evt, (e) => { e.preventDefault(); });
    });

    // Highlight on drag
    canvasWrap.addEventListener('dragenter', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
    canvasWrap.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
    canvasWrap.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));

    // Handle drop — supports folders and files
    canvasWrap.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragging');
        if (e.dataTransfer) {
            const files = await getFilesFromDrop(e.dataTransfer);
            console.log('[DROP] Files received:', files.length, files.map(f => f.name));
            if (files.length > 0) {
                await handleFiles(files);
            }
        }
    });

    // Click IMPORT button → file picker
    const btnImport = document.getElementById('btn-sidebar-import');
    if (btnImport) {
        btnImport.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.addEventListener('change', async () => {
                if (input.files && input.files.length > 0) {
                    await handleFiles(Array.from(input.files));
                }
            });
            input.click();
        });
    }

    // "Load New Files" button
    $('btn-new').addEventListener('click', () => {
        dropZone.classList.add('active');
        $('controls').classList.add('hidden');
    });
}

// ── Smart file handling ────────────────────────────────────────

// Store all folder files for switching between character sets
let folderFiles: File[] = [];
let currentGridData: GridSpineData | null = null;
let gridMode = false;
let allSkeletonSets: GridSpineData[] = [];
let multiSkeletonMode = false;
let animGridActive = false; // true = animation grid, false = multi-skeleton grid

// Per-animation state: stores viewer state for each animation separately
const perAnimState = new Map<string, AnimViewState>();
let currentAnimName: string | null = null;

// Per-character BG storage: save/restore BG image when switching characters
const perCharBgImage = new Map<string, HTMLImageElement | null>();
let currentCharName: string | null = null;

function saveCharBg() {
    if (currentCharName) {
        perCharBgImage.set(currentCharName, getBgImage());
    }
}

function restoreCharBg(charName: string) {
    currentCharName = charName;
    const savedBg = perCharBgImage.get(charName) ?? null;
    setBgImage(savedBg);
}

/** Lazy thumbnail capture: wait frames for render to stabilize, capture, update DB */
function scheduleThumbnailCapture(jsonName: string) {
    let framesLeft = 15;
    function onFrame() {
        if (--framesLeft > 0) { requestAnimationFrame(onFrame); return; }
        const thumb = captureCanvasThumbnail();
        if (!thumb) { console.warn('[THUMBNAIL] Capture returned null for', jsonName); return; }
        // Find character in DB by jsonName and update thumbnail
        searchCharacters(jsonName.replace(/\.(json|skel)$/i, '')).then(chars => {
            const match = chars.find(c => c.jsonName === jsonName);
            if (match?.id != null) {
                updateThumbnail(match.id, thumb).then(() => {
                    console.log('[THUMBNAIL] Saved for', jsonName);
                    renderLibrary();
                });
            }
        });
    }
    requestAnimationFrame(onFrame);
}

function saveCurrentAnimState() {
    if (!currentAnimName) return;
    const vs = getViewerState();
    if (!vs) return;
    perAnimState.set(currentAnimName, {
        scale: vs.scale,
        viewZoom: vs.viewZoom,
        offsetX: vs.offsetX,
        offsetY: vs.offsetY,
        speed: vs.speed,
        bgImage: vs.bgImage,
        bgColor: vs.bgColor,
    });
}

async function handleFiles(files: File[]) {
    folderFiles = files;

    // Find all JSON/SKEL files, sorted alphabetically
    const jsonFiles = files.filter(f => {
        const name = f.name.toLowerCase();
        return name.endsWith('.json') || name.endsWith('.skel');
    }).sort((a, b) => {
        const na = a.name.replace(/\.(json|skel)$/i, '');
        const nb = b.name.replace(/\.(json|skel)$/i, '');
        return na.localeCompare(nb, undefined, { numeric: true, sensitivity: 'base' });
    });

    const consumedFileNames = new Set<string>();

    for (const jf of jsonFiles) {
        const data = await prepareGridSpineData(jf, files);
        if (data) {
            allSkeletonSets.push(data);
            consumedFileNames.add(jf.name);
            for (const pngName of data.pngBlobs.keys()) {
                consumedFileNames.add(pngName);
            }
            // Add atlas names loosely if we matched them (prepareGridSpineData doesn't explicitly return atlas name, but typically it matches json name)
            consumedFileNames.add(jf.name.replace(/\.(json|skel)$/i, '.atlas'));
            consumedFileNames.add(jf.name.replace(/\.(json|skel)$/i, '.atlas.txt'));
            console.log('[MULTI] ✓ Prepared:', jf.name, 'v' + data.majorVersion + '.' + data.minorVersion);
        } else {
            console.warn('[MULTI] ✗ FAILED to prepare:', jf.name);
        }
    }

    // Process standalone assets (2D/3D)
    const standaloneAssets = files.filter(f => {
        if (consumedFileNames.has(f.name)) return false;
        const n = f.name.toLowerCase();
        return n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.webp') ||
               n.endsWith('.glb') || n.endsWith('.gltf') || n.endsWith('.fbx') || n.endsWith('.obj');
    });

    for (const f of standaloneAssets) {
        const is3D = f.name.match(/\.(glb|gltf|fbx|obj)$/i);
        const mime = f.type || (is3D ? 'model/gltf-binary' : 'image/png');
        allSkeletonSets.push({
            assetType: is3D ? '3d' : '2d',
            mimeType: mime,
            fileBlob: f,
            jsonText: '',
            atlasText: '',
            pngBlobs: new Map(),
            jsonName: f.name,
            majorVersion: 0,
            minorVersion: 0,
        });
        console.log('[MULTI] ✓ Prepared Standalone:', f.name, is3D ? '(3D)' : '(2D)');
    }

    console.log('[MULTI] Total assets:', allSkeletonSets.length);

    if (allSkeletonSets.length === 0) {
        showError('No recognized assets found!');
        return;
    }

    // ── Show import dialog — let user choose which to save + assign project ──
    const importItems = await prepareImportItems(allSkeletonSets);
    // Fire-and-forget: show dialog without blocking viewer load
    showImportDialog(importItems).then(async (result) => {
        if (!result) {
            console.log('[LIBRARY] Import skipped by user');
            return;
        }
        // Save selected characters
        for (const item of result.selectedItems) {
            const skelSet = allSkeletonSets.find(s => s.jsonName === item.jsonName);
            if (!skelSet) continue;
            try {
                if (skelSet.assetType === '2d' || skelSet.assetType === '3d') {
                    // Save as Generic Asset
                    await saveCharacter({
                        assetType: skelSet.assetType,
                        mimeType: skelSet.mimeType,
                        name: item.name,
                        jsonName: item.jsonName,
                        spineVersion: 'N/A',
                        majorVersion: 0,
                        minorVersion: 0,
                        jsonBlob: skelSet.fileBlob!, // reuse jsonBlob for primary file
                        atlasBlob: new Blob(),
                        pngBlobs: [],
                        jsonText: '',
                        atlasText: '',
                        boneCount: 0,
                        slotCount: 0,
                        animCount: 0,
                        animNames: [],
                        skinCount: 0,
                        fileSize: skelSet.fileBlob!.size,
                        jsonSize: skelSet.fileBlob!.size,
                        atlasSize: 0,
                        pngSizes: [],
                        thumbnail: null,
                        projectId: result.projectId,
                        notes: result.note || '',
                        tags: result.customTags,
                    });
                } else {
                    const jsonBlob = new Blob([skelSet.jsonText], { type: 'application/json' });
                    const atlasBlob = new Blob([skelSet.atlasText], { type: 'text/plain' });
                    const pngBlobs: { name: string; blob: Blob }[] = [];
                    const pngSizes: { name: string; size: number }[] = [];
                    for (const [pngName, pngBlobVal] of skelSet.pngBlobs) {
                        pngBlobs.push({ name: pngName, blob: pngBlobVal });
                        pngSizes.push({ name: pngName, size: pngBlobVal.size });
                    }
                    let totalSize = jsonBlob.size + atlasBlob.size;
                    for (const p of pngBlobs) totalSize += p.blob.size;
                    await saveCharacter({
                        assetType: 'spine',
                        name: item.name,
                        jsonName: item.jsonName,
                        spineVersion: skelSet.majorVersion + '.' + skelSet.minorVersion,
                        majorVersion: skelSet.majorVersion,
                        minorVersion: skelSet.minorVersion,
                        jsonBlob, atlasBlob, pngBlobs,
                        jsonText: skelSet.jsonText,
                        atlasText: skelSet.atlasText,
                        boneCount: item.boneCount,
                        slotCount: item.slotCount,
                        animCount: item.animCount,
                        animNames: item.animNames || [],
                        skinCount: item.skinCount,
                        fileSize: totalSize,
                        jsonSize: jsonBlob.size,
                        atlasSize: atlasBlob.size,
                        pngSizes,
                        thumbnail: null,
                        projectId: result.projectId,
                        notes: result.note || '',
                        tags: result.customTags,
                    });
                }
                console.log('[LIBRARY] Saved:', item.jsonName, 'to project:', result.projectId, 'note:', result.note);
            } catch (e) {
                console.warn('[LIBRARY] Failed to save:', item.jsonName, e);
            }
        }
        renderLibrary();
    });

    if (allSkeletonSets.length === 0) {
        showError('Could not prepare any skeleton sets.');
        return;
    }

    // If multiple skeletons → auto enter multi-skeleton grid mode (NO single load first)
    if (allSkeletonSets.length > 1) {
        // Populate Character dropdown — "All" = grid, specific = single
        const charSection = document.getElementById('char-section')!;
        const charSelect = $<HTMLSelectElement>('char-select');
        charSelect.innerHTML = '';
        // Add "All" option for grid mode
        const allOpt = document.createElement('option');
        allOpt.value = '__all__';
        allOpt.textContent = '— All —';
        charSelect.appendChild(allOpt);
        for (const jf of jsonFiles) {
            const opt = document.createElement('option');
            opt.value = jf.name;
            opt.textContent = jf.name.replace(/\.(json|skel)$/i, '');
            charSelect.appendChild(opt);
        }
        charSelect.value = '__all__'; // default to All (grid mode)
        charSection.style.display = '';

        // Switch character when dropdown changes
        charSelect.onchange = async () => {
            const selectedName = charSelect.value;

            // "All" selected → enter grid mode
            if (selectedName === '__all__') {
                if (!gridMode || animGridActive) {
                    if (gridMode) { destroyGridView(); gridMode = false; }
                    enterMultiSkeletonGrid();
                }
                return;
            }

            // Specific character selected → enter single mode
            const skeletonName = selectedName.replace(/\.(json|skel)$/i, '');

            if (gridMode && !animGridActive) {
                // Currently in character grid → exit to single
                saveCharBg();
                exitMultiSkeletonGrid(skeletonName);
            } else if (gridMode && animGridActive) {
                // Currently in animation grid → load new character, KEEP animation ALL mode
                saveCharBg();
                destroyGridView();
                gridMode = false;
                animGridActive = false;
                $('pixi-container').style.display = '';
                const data = allSkeletonSets.find(d =>
                    d.jsonName.replace(/\.(json|skel)$/i, '') === skeletonName
                );
                if (data) {
                    currentGridData = data;
                    const spineFiles = { jsonText: data.jsonText, atlasText: data.atlasText, pngBlobs: data.pngBlobs, jsonName: data.jsonName };
                    await loadSpine(spineFiles, data.majorVersion, data.minorVersion);
                    populateControls();
                    resetControlsToDefaults();
                    perAnimState.clear();

                    $<HTMLSelectElement>('char-select').value = data.jsonName;
                    const version = detectVersion(data.jsonText);
                    $('version-badge').textContent = `v${version.version}`;
                    $<HTMLSpanElement>('file-name').textContent = data.jsonName;

                    // Re-enter animation ALL mode for the new character
                    restoreCharBg(skeletonName);
                    enterGridMode();
                }
            } else {
                // Already in single mode — just switch character
                saveCharBg();
                const selected = jsonFiles.find(f => f.name === selectedName);
                if (!selected) return;
                perAnimState.clear();
                currentAnimName = null;
                resetControlsToDefaults();
                await loadSpineSet(selected, files);
                populateControls();
                restoreCharBg(skeletonName);
                const anims = getAnimations();
                currentAnimName = anims.length > 0 ? anims[0] : null;
            }
        };

        // Set currentGridData to first skeleton (for later single mode entry)
        currentGridData = allSkeletonSets[0];

        // Show controls but hide drop zone
        $('drop-zone').classList.remove('active');
        $('controls').classList.remove('hidden');

        // Auto-enter multi-skeleton grid DIRECTLY (no single view first)
        multiSkeletonMode = true;
        await enterMultiSkeletonGrid();
    } else {
        document.getElementById('char-section')!.style.display = 'none';
        multiSkeletonMode = false;
        // Single skeleton: load into viewer then show animation grid
        await loadSpineSet(jsonFiles[0], files);
        enterGridMode();
        // Capture thumbnail for single skeleton
        scheduleThumbnailCapture(jsonFiles[0].name);
    }
}

// ── Button State Helpers ──────────────────────────────────────
function updateCharButtons(mode: 'grid' | 'single') {
    const gridBtn = $('btn-char-grid');
    const singleBtn = $('btn-char-single');
    if (mode === 'grid') {
        gridBtn.classList.add('active');
        singleBtn.classList.remove('active');
    } else {
        gridBtn.classList.remove('active');
        singleBtn.classList.add('active');
    }
}

function updateAnimButtons(mode: 'grid' | 'single') {
    const gridBtn = $('btn-anim-grid');
    const singleBtn = $('btn-anim-single');
    const animSelect = $<HTMLSelectElement>('anim-select');
    if (mode === 'grid') {
        gridBtn.classList.add('active');
        singleBtn.classList.remove('active');
        animSelect.style.display = 'none';
    } else {
        gridBtn.classList.remove('active');
        singleBtn.classList.add('active');
        animSelect.style.display = '';
    }
}

async function enterMultiSkeletonGrid() {
    gridMode = true;
    animGridActive = false;
    updateCharButtons('grid');

    $('pixi-container').style.display = 'none';
    $<HTMLSelectElement>('anim-select').disabled = true;

    // Hide animation controls in Character Grid mode
    $('anim-section').style.display = 'none';

    // Sync dropdown to "All"
    $<HTMLSelectElement>('char-select').value = '__all__';

    await initMultiSkeletonGrid(allSkeletonSets);
}

// Prepare GridSpineData from a JSON file without loading into Single viewer
async function prepareGridSpineData(jsonFile: File, allFiles: File[]): Promise<GridSpineData | null> {
    const baseName = jsonFile.name.replace(/\.(json|skel)$/i, '');
    const baseNameLower = baseName.toLowerCase();
    const jsonPath = (jsonFile as any).webkitRelativePath || jsonFile.name;
    const jsonDir = jsonPath.includes('/') ? jsonPath.substring(0, jsonPath.lastIndexOf('/') + 1) : '';

    console.log(`[PREPARE] "${baseName}" jsonDir="${jsonDir}"`);

    function sameDir(f: File): boolean {
        const fPath = (f as any).webkitRelativePath || f.name;
        const fDir = fPath.includes('/') ? fPath.substring(0, fPath.lastIndexOf('/') + 1) : '';
        return fDir === jsonDir;
    }

    // Auto-match atlas: Step 1 — exact baseName match, same dir
    let atlasFile: File | null = null;
    for (const f of allFiles) {
        const n = f.name.toLowerCase();
        if ((n === baseNameLower + '.atlas' || n === baseNameLower + '.atlas.txt') && sameDir(f)) {
            atlasFile = f; break;
        }
    }
    // Step 2 — exact baseName match, any dir
    if (!atlasFile) {
        for (const f of allFiles) {
            const n = f.name.toLowerCase();
            if (n === baseNameLower + '.atlas' || n === baseNameLower + '.atlas.txt') {
                atlasFile = f; break;
            }
        }
    }
    // Step 3 — ANY .atlas file in same directory (shared atlas)
    if (!atlasFile) {
        for (const f of allFiles) {
            const n = f.name.toLowerCase();
            if ((n.endsWith('.atlas') || n.endsWith('.atlas.txt')) && sameDir(f)) {
                atlasFile = f;
                console.log(`[PREPARE] "${baseName}" using shared atlas: ${f.name}`);
                break;
            }
        }
    }
    // Step 4 — ANY .atlas file at all
    if (!atlasFile) {
        for (const f of allFiles) {
            const n = f.name.toLowerCase();
            if (n.endsWith('.atlas') || n.endsWith('.atlas.txt')) {
                atlasFile = f;
                console.log(`[PREPARE] "${baseName}" using fallback atlas: ${f.name}`);
                break;
            }
        }
    }

    console.log(`[PREPARE] "${baseName}" atlas=${atlasFile?.name || 'NONE'}`);

    // Auto-match PNGs
    let pngFiles: File[] = [];
    let referencedPngs: string[] = [];
    if (atlasFile) {
        const atlasPreview = await atlasFile.text();
        referencedPngs = atlasPreview.split('\n').map(l => l.trim()).filter(l => l.toLowerCase().endsWith('.png'));
        console.log(`[PREPARE] "${baseName}" atlas references PNGs:`, referencedPngs);
    }
    if (referencedPngs.length > 0) {
        for (const pngName of referencedPngs) {
            const pngNameLower = pngName.toLowerCase();
            let found = allFiles.find(f => f.name.toLowerCase() === pngNameLower && sameDir(f));
            if (!found) found = allFiles.find(f => f.name.toLowerCase() === pngNameLower);
            if (found) pngFiles.push(found);
        }
    } else {
        pngFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.png') && sameDir(f) &&
            (f.name.replace(/\.png$/i, '').toLowerCase() === baseNameLower ||
             f.name.replace(/\.png$/i, '').toLowerCase().startsWith(baseNameLower)));
    }
    // Fallback: all PNGs in same dir
    if (pngFiles.length === 0) {
        pngFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.png') && sameDir(f));
    }
    // Last resort: all PNGs everywhere
    if (pngFiles.length === 0) {
        pngFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.png'));
    }

    console.log(`[PREPARE] "${baseName}" pngs=${pngFiles.length}`, pngFiles.map(f => f.name));

    if (!atlasFile || pngFiles.length === 0) {
        console.warn(`[PREPARE] ✗ Skip "${baseName}": atlas=${!!atlasFile}, pngs=${pngFiles.length}`);
        return null;
    }

    try {
        const jsonText = await jsonFile.text();
        const atlasText = await atlasFile.text();
        const version = detectVersion(jsonText);
        const pngBlobs = new Map<string, Blob>();
        for (const png of pngFiles) pngBlobs.set(png.name, png);

        console.log(`[PREPARE] ✓ "${baseName}" → v${version.version}, ${pngBlobs.size} textures`);
        return {
            jsonText,
            atlasText,
            pngBlobs,
            jsonName: jsonFile.name,
            majorVersion: parseInt(version.version.split('.')[0]) || 3,
            minorVersion: parseInt(version.version.split('.')[1]) || 8,
        };
    } catch (err) {
        console.error(`[PREPARE] ✗ "${baseName}" parse error:`, err);
        return null;
    }
}

// Load a spine set: given the chosen JSON, auto-match atlas + png by base name
async function loadSpineSet(jsonFile: File, allFiles: File[]) {
    const baseName = jsonFile.name.replace(/\.(json|skel)$/i, '');
    const baseNameLower = baseName.toLowerCase();

    // Determine the directory of the JSON file (from webkitRelativePath or drag-drop)
    const jsonPath = (jsonFile as any).webkitRelativePath || jsonFile.name;
    const jsonDir = jsonPath.includes('/') ? jsonPath.substring(0, jsonPath.lastIndexOf('/') + 1) : '';

    // Helper: check if file is in the same directory as the JSON
    function sameDir(f: File): boolean {
        const fPath = (f as any).webkitRelativePath || f.name;
        const fDir = fPath.includes('/') ? fPath.substring(0, fPath.lastIndexOf('/') + 1) : '';
        return fDir === jsonDir;
    }

    // Auto-match atlas: same basename + .atlas or .atlas.txt, prefer same directory
    let atlasFile: File | null = null;
    for (const f of allFiles) {
        const n = f.name.toLowerCase();
        if ((n === baseNameLower + '.atlas' || n === baseNameLower + '.atlas.txt') && sameDir(f)) {
            atlasFile = f;
            break;
        }
    }
    // Fallback: match by name only (no dir check)
    if (!atlasFile) {
        for (const f of allFiles) {
            const n = f.name.toLowerCase();
            if (n === baseNameLower + '.atlas' || n === baseNameLower + '.atlas.txt') {
                atlasFile = f;
                break;
            }
        }
    }

    // Auto-match PNGs: prefer same directory, match atlas-referenced PNG names
    let pngFiles: File[] = [];

    // First: read atlas to find exact PNG filenames referenced
    let referencedPngs: string[] = [];
    if (atlasFile) {
        const atlasPreview = await atlasFile.text();
        // Atlas format: PNG filenames appear as lines ending with .png
        referencedPngs = atlasPreview.split('\n')
            .map(l => l.trim())
            .filter(l => l.toLowerCase().endsWith('.png'));
    }

    if (referencedPngs.length > 0) {
        // Match exact PNG names from atlas, prefer same directory
        for (const pngName of referencedPngs) {
            const pngNameLower = pngName.toLowerCase();
            // Prefer same dir
            let found = allFiles.find(f => f.name.toLowerCase() === pngNameLower && sameDir(f));
            if (!found) found = allFiles.find(f => f.name.toLowerCase() === pngNameLower);
            if (found) pngFiles.push(found);
        }
    } else {
        // Fallback: match by basename prefix, same directory first
        for (const f of allFiles) {
            if (f.name.toLowerCase().endsWith('.png') && sameDir(f)) {
                const pngBase = f.name.replace(/\.png$/i, '').toLowerCase();
                if (pngBase === baseNameLower || pngBase.startsWith(baseNameLower)) {
                    pngFiles.push(f);
                }
            }
        }
        // If none found in same dir, try all files
        if (pngFiles.length === 0) {
            for (const f of allFiles) {
                if (f.name.toLowerCase().endsWith('.png')) {
                    const pngBase = f.name.replace(/\.png$/i, '').toLowerCase();
                    if (pngBase === baseNameLower || pngBase.startsWith(baseNameLower)) {
                        pngFiles.push(f);
                    }
                }
            }
        }
    }

    // Last resort: grab ALL PNGs in the same directory
    if (pngFiles.length === 0) {
        pngFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.png') && sameDir(f));
    }

    if (!atlasFile || pngFiles.length === 0) {
        showError(`Missing files for "${baseName}":\n• ${baseName}.json ✓\n• .atlas ${atlasFile ? '✓' : '✗'}\n• .png (${pngFiles.length} found)`);
        return;
    }

    // Show loading
    const dropTitle = document.querySelector('.drop-title') as HTMLElement;
    if (dropTitle) dropTitle.textContent = 'Loading...';

    try {
        const jsonText = await jsonFile.text();
        const atlasText = await atlasFile.text();

        const version = detectVersion(jsonText);

        const badge = $('version-badge');
        badge.textContent = `v${version.version}`;
        badge.classList.remove('hidden');
        $<HTMLSpanElement>('file-name').textContent = jsonFile.name;

        const pngBlobs = new Map<string, Blob>();
        for (const png of pngFiles) {
            pngBlobs.set(png.name, png);
        }

        const spineFiles: SpineFiles = {
            jsonText,
            atlasText,
            pngBlobs,
            jsonName: jsonFile.name,
        };

        const majorVersion = parseInt(version.version.split('.')[0]) || 3;
        const minorVersion = parseInt(version.version.split('.')[1]) || 8;

        await loadSpine(spineFiles, majorVersion, minorVersion);

        // Store data for grid view
        currentGridData = {
            jsonText: jsonText,
            atlasText: atlasText,
            pngBlobs: pngBlobs,
            jsonName: jsonFile.name,
            majorVersion,
            minorVersion,
        };

        // Reset grid mode
        if (gridMode) {
            exitGridMode();
        }

        $('drop-zone').classList.remove('active');
        $('controls').classList.remove('hidden');

        populateControls();

        // Track current animation name for per-anim state
        perAnimState.clear();
        const anims = getAnimations();
        currentAnimName = anims.length > 0 ? anims[0] : null;
    } catch (err) {
        console.error('Load error:', err);
        showError(`Failed to load: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        if (dropTitle) dropTitle.textContent = 'Drop Spine Folder Here';
    }
}


// ── Populate UI controls ───────────────────────────────────────
function populateControls() {
    // Animations
    const animSelect = $<HTMLSelectElement>('anim-select');
    animSelect.innerHTML = '';
    // Add "All" option for animation grid mode
    const allAnimOpt = document.createElement('option');
    allAnimOpt.value = '__all__';
    allAnimOpt.textContent = '— All —';
    animSelect.appendChild(allAnimOpt);
    const anims = getAnimations();
    anims.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        animSelect.appendChild(opt);
    });
    // Default to first animation (single mode)
    if (anims.length > 0) animSelect.value = anims[0];

    // Skins
    const skinSelect = $<HTMLSelectElement>('skin-select');
    const skinSection = $('skin-section');
    const skins = getSkins();
    if (skins.length > 0) {
        skinSection.style.display = '';
        skinSelect.innerHTML = '';
        skins.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            skinSelect.appendChild(opt);
        });
        // Auto-select first non-"default" skin (default skin is usually empty)
        const preferredSkin = skins.find(s => s.toLowerCase() !== 'default') || skins[0];
        skinSelect.value = preferredSkin;
        setSkin(preferredSkin);
    } else {
        skinSection.style.display = 'none';
    }

    // Info
    const info = getSkeletonInfo();
    $('info-bones').textContent = String(info.bones);
    $('info-slots').textContent = String(info.slots);
    $('info-anims').textContent = String(info.anims);
    $('info-skins').textContent = String(info.skins);
}

// ── Reset controls to defaults ─────────────────────────────────
function resetControlsToDefaults() {
    // Reset viewer state
    setSpeed(1);
    setScale(1);
    setViewZoom(1);
    resetOffset();

    // Reset UI sliders to match
    const speedSlider = $<HTMLInputElement>('speed-slider');
    speedSlider.value = '1';
    $('speed-val').textContent = '1.0x';

    const scaleSlider = $<HTMLInputElement>('scale-slider');
    scaleSlider.value = '1';
    $('scale-val').textContent = '1.0x';
}

// ── Setup control event listeners ──────────────────────────────
function setupControls() {
    // Animation select
    $<HTMLSelectElement>('anim-select').addEventListener('change', (e) => {
        const animName = (e.target as HTMLSelectElement).value;

        // "All" selected → enter animation grid mode
        if (animName === '__all__') {
            if (!gridMode || !animGridActive) {
                saveCurrentAnimState();
                enterGridMode();
            }
            return;
        }

        // Specific animation selected
        if (gridMode && animGridActive) {
            // Currently in animation grid → exit to single with selected anim
            exitGridMode(animName);
            return;
        }

        // Already in single mode — switch animation
        saveCurrentAnimState();
        currentAnimName = animName;
        playAnimation(animName);
        // Restore saved state for this animation (if any)
        const pas = perAnimState.get(animName);
        if (pas) {
            setSpeed(pas.speed); setScale(pas.scale); setViewZoom(pas.viewZoom); setBgImage(pas.bgImage);
            $<HTMLInputElement>('speed-slider').value = String(pas.speed);
            $('speed-val').textContent = pas.speed.toFixed(1) + 'x';
            $<HTMLInputElement>('scale-slider').value = String(pas.scale);
            $('scale-val').textContent = pas.scale.toFixed(1) + 'x';
        }
    });

    // Play/Pause
    $('btn-play').addEventListener('click', () => {
        setPlaying(true);
        if (gridMode) setGridPlaying(true);
        $('btn-play').classList.add('active');
        $('btn-pause').classList.remove('active');
    });
    $('btn-pause').addEventListener('click', () => {
        setPlaying(false);
        if (gridMode) setGridPlaying(false);
        $('btn-pause').classList.add('active');
        $('btn-play').classList.remove('active');
    });

    // Loop
    $('btn-loop').addEventListener('click', () => {
        const btn = $('btn-loop');
        const isLoop = btn.classList.toggle('active');
        setLoop(isLoop);
    });

    // Speed
    const speedSlider = $<HTMLInputElement>('speed-slider');
    speedSlider.addEventListener('input', () => {
        const val = parseFloat(speedSlider.value);
        setSpeed(val);
        $('speed-val').textContent = val.toFixed(1) + 'x';
        // Broadcast to grid if active
        if (gridMode) setGridSpeed(val);
    });

    // Scale
    const scaleSlider = $<HTMLInputElement>('scale-slider');
    scaleSlider.addEventListener('input', () => {
        const val = parseFloat(scaleSlider.value);
        setScale(val);
        $('scale-val').textContent = val.toFixed(1) + 'x';
        // Broadcast to grid if active
        if (gridMode) setGridScale(val);
    });

    // Skin
    $<HTMLSelectElement>('skin-select').addEventListener('change', (e) => {
        const skinVal = (e.target as HTMLSelectElement).value;
        setSkin(skinVal);
        if (gridMode) setGridSkin(skinVal);
    });

    // Background image upload
    const bgFileInput = document.getElementById('bg-file-input') as HTMLInputElement;
    document.getElementById('btn-bg-upload')?.addEventListener('click', () => {
        bgFileInput?.click();
    });
    bgFileInput?.addEventListener('change', () => {
        const file = bgFileInput.files?.[0];
        if (file) {
            const img = new Image();
            img.onload = () => {
                setBgImage(img);
                if (gridMode) setGridBgImage(img);
            };
            img.src = URL.createObjectURL(file);
        }
    });
    document.getElementById('btn-bg-clear')?.addEventListener('click', () => {
        setBgImage(null);
        bgFileInput.value = '';
        if (gridMode) setGridBgImage(null);
    });

    // Mouse drag to pan
    const canvasWrap = $('canvas-wrap');
    let dragging = false;
    let lastX = 0, lastY = 0;
    let spaceHeld = false;
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat) {
            spaceHeld = true;
            e.preventDefault(); // prevent page scroll
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') spaceHeld = false;
    });
    canvasWrap.addEventListener('mousedown', (e) => {
        if (e.button === 0 || e.button === 1) {
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (dragging) {
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            const dpr = window.devicePixelRatio || 1;
            const vz = getViewZoom();
            const scaledDx = dx * dpr / vz;
            const scaledDy = dy * dpr / vz;
            if (spaceHeld) {
                // Space+drag → pan both content AND background together
                setOffset(scaledDx, scaledDy);
                setBgOffset(scaledDx, scaledDy);
            } else if (e.shiftKey) {
                // Shift+drag → move background image only
                setBgOffset(scaledDx, scaledDy);
            } else {
                // Normal drag → move character only
                setOffset(scaledDx, scaledDy);
            }
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });
    window.addEventListener('mouseup', () => { dragging = false; });

    // Scroll to zoom — viewport zoom (scales everything: character + background)
    canvasWrap.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1; // Smooth multiplicative zoom
        const newZoom = Math.max(0.1, Math.min(10, getViewZoom() * factor));
        setViewZoom(newZoom);
    }, { passive: false });
}

// ── Error display (VISIBLE on page) ────────────────────────────
function showError(msg: string) {
    const sub = document.querySelector('.drop-sub');
    if (sub) {
        sub.textContent = msg;
        sub.setAttribute('style', 'color: #f87171; white-space: pre-line; font-size: 14px');
    }
    // Also show in a fixed debug panel
    let dbg = document.getElementById('debug-panel');
    if (!dbg) {
        dbg = document.createElement('div');
        dbg.id = 'debug-panel';
        dbg.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a0000;color:#f87171;padding:10px;font-family:monospace;font-size:12px;z-index:9999;max-height:200px;overflow-y:auto;white-space:pre-wrap;border-top:2px solid #f87171';
        document.body.appendChild(dbg);
    }
    dbg.textContent = msg;
}

function debugLog(msg: string) {
    console.log(msg);
    let dbg = document.getElementById('debug-log');
    if (!dbg) {
        dbg = document.createElement('div');
        dbg.id = 'debug-log';
        dbg.style.cssText = 'position:fixed;bottom:0;left:0;right:240px;background:rgba(0,0,0,0.85);color:#34d399;padding:8px;font-family:monospace;font-size:11px;z-index:9998;max-height:180px;overflow-y:auto;white-space:pre-wrap;display:none';
        document.body.appendChild(dbg);

        // Toggle button
        const btn = document.createElement('button');
        btn.textContent = 'DBG';
        btn.title = 'Toggle Debug Log';
        btn.style.cssText = 'position:fixed;bottom:8px;right:248px;z-index:10000;background:#222;color:#34d399;border:1px solid #34d399;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:14px;opacity:0.6';
        btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
        btn.addEventListener('mouseleave', () => btn.style.opacity = '0.6');
        btn.addEventListener('click', () => {
            const panels = [document.getElementById('debug-log'), document.getElementById('dbg-overlay')];
            const show = panels[0]?.style.display === 'none';
            panels.forEach(p => { if (p) p.style.display = show ? '' : 'none'; });
        });
        document.body.appendChild(btn);
    }
    dbg.textContent += msg + '\n';
    dbg.scrollTop = dbg.scrollHeight;
}

// ── Init ───────────────────────────────────────────────────────
function main() {
    // Catch ANY uncaught errors and show on page
    window.onerror = (msg, src, line, col, err) => {
        showError(`JS Error: ${msg}\n${src}:${line}:${col}\n${err?.stack || ''}`);
    };
    window.addEventListener('unhandledrejection', (e) => {
        showError(`Unhandled: ${e.reason?.message || e.reason}\n${e.reason?.stack || ''}`);
    });

    try {
        initViewer();
        setupDropZone();
        setupControls();
        debugLog('[INIT] Spine Viewer ready');
    } catch (e: any) {
        showError(`Init failed: ${e.message}\n${e.stack}`);
    }
}

main();

// ── Grid View ──────────────────────────────────────────────────
function enterGridMode() {
    if (!currentGridData) return;
    gridMode = true;
    animGridActive = true;
    updateAnimButtons('grid');

    $('pixi-container').style.display = 'none';
    // Keep dropdown enabled, sync to "All"
    $<HTMLSelectElement>('anim-select').value = '__all__';
    saveCurrentAnimState();
    setGridPlaying(true); // Ensure playback is active on grid entry
    initGridView({ ...currentGridData, bgImage: getBgImage(), viewerState: getViewerState(), perAnimState: Object.fromEntries(perAnimState) });
}

function exitGridMode(selectedAnim?: string) {
    gridMode = false;
    animGridActive = false;
    updateAnimButtons('single');

    const overrides = getGridOverrides();
    const anims = getAnimations();
    for (const animName of anims) {
        const existing = perAnimState.get(animName) || { scale: 1, viewZoom: 1, offsetX: 0, offsetY: 0, speed: 1, bgImage: null, bgColor: '#2e2e2e' };
        if (overrides.speedOverride) existing.speed = overrides.speed;
        if (overrides.scaleOverride) existing.scale = overrides.scale;
        if (overrides.bgOverride) existing.bgImage = overrides.bgImage;
        perAnimState.set(animName, existing);
    }

    destroyGridView();
    $('pixi-container').style.display = '';

    if (currentGridData) {
        const { jsonText, atlasText, pngBlobs, jsonName, majorVersion, minorVersion } = currentGridData;
        loadSpine({ jsonText, atlasText, pngBlobs, jsonName }, majorVersion, minorVersion).then(() => {
            populateControls();
            const anim = selectedAnim || anims[0];
            if (anim) {
                playAnimation(anim);
                $<HTMLSelectElement>('anim-select').value = anim;
                currentAnimName = anim;
                const pas = perAnimState.get(anim);
                if (pas) {
                    setSpeed(pas.speed); setScale(pas.scale); setViewZoom(pas.viewZoom); setBgImage(pas.bgImage);
                    $<HTMLInputElement>('speed-slider').value = String(pas.speed);
                    $('speed-val').textContent = pas.speed.toFixed(1) + 'x';
                    $<HTMLInputElement>('scale-slider').value = String(pas.scale);
                    $('scale-val').textContent = pas.scale.toFixed(1) + 'x';
                } else { resetControlsToDefaults(); }
            } else { resetControlsToDefaults(); }
        });
    }
}

// ── Button Handlers ────────────────────────────────────────────

// Character: Grid → show all skeletons
$('btn-char-grid').addEventListener('click', () => {
    if (gridMode && !animGridActive) return; // already in char grid
    if (gridMode) { destroyGridView(); gridMode = false; }
    enterMultiSkeletonGrid();
});

// Character: Single → show single skeleton
$('btn-char-single').addEventListener('click', () => {
    if (gridMode && !animGridActive) {
        exitMultiSkeletonGrid();
    }
});

// Animation: All → show all animations
$('btn-anim-grid').addEventListener('click', () => {
    if (gridMode && animGridActive) return; // already in anim grid
    if (gridMode && !animGridActive) {
        destroyGridView(); gridMode = false;
        // Load current skeleton first, then enter anim grid
        if (currentGridData) {
            const { jsonText, atlasText, pngBlobs, jsonName, majorVersion, minorVersion } = currentGridData;
            loadSpine({ jsonText, atlasText, pngBlobs, jsonName }, majorVersion, minorVersion).then(() => {
                populateControls();
                enterGridMode();
            });
            return;
        }
    }
    enterGridMode();
});

// Animation: Single → show single animation
$('btn-anim-single').addEventListener('click', () => {
    if (!gridMode) return; // already in single
    if (animGridActive) exitGridMode();
});

// Grid cell click → switch to single view
setOnAnimationClick((animName: string) => {
    if (animGridActive) {
        exitGridMode(animName);
    } else {
        exitMultiSkeletonGrid(animName);
    }
});

function exitMultiSkeletonGrid(skeletonName?: string) {
    gridMode = false;
    updateCharButtons('single');
    destroyGridView();

    $('pixi-container').style.display = '';
    $<HTMLSelectElement>('anim-select').disabled = false;

    // Show animation controls again
    $('anim-section').style.display = '';

    if (skeletonName) {
        const data = allSkeletonSets.find(d =>
            d.jsonName.replace(/\.(json|skel)$/i, '') === skeletonName
        );
        if (data) {
            currentGridData = data;
            const spineFiles = { jsonText: data.jsonText, atlasText: data.atlasText, pngBlobs: data.pngBlobs, jsonName: data.jsonName };
            loadSpine(spineFiles, data.majorVersion, data.minorVersion).then(() => {
                populateControls();
                resetControlsToDefaults();
                perAnimState.clear();

                $<HTMLSelectElement>('char-select').value = data.jsonName;
                const version = detectVersion(data.jsonText);
                $('version-badge').textContent = `v${version.version}`;
                $<HTMLSpanElement>('file-name').textContent = data.jsonName;

                // Default to Animation ALL mode
                restoreCharBg(skeletonName!);
                enterGridMode();
                // Capture thumbnail when entering single character view
                scheduleThumbnailCapture(data.jsonName);
            });
        }
    } else {
        if (currentGridData) {
            const { jsonText, atlasText, pngBlobs, jsonName, majorVersion, minorVersion } = currentGridData;
            loadSpine({ jsonText, atlasText, pngBlobs, jsonName }, majorVersion, minorVersion).then(() => {
                populateControls();
                // Default to Animation ALL mode
                enterGridMode();
                // Capture thumbnail
                scheduleThumbnailCapture(jsonName);
            });
        }
    }
}

// Double-click canvas → enter animation grid
$('pixi-container').addEventListener('dblclick', () => {
    if (!gridMode && currentGridData) enterGridMode();
});


// ── Meta-Config Export Integration ─────────────────────────────
document.getElementById('btn-export-config')?.addEventListener('click', async () => {
    let baseFileName = 'character';
    if (currentLibraryChar) {
        baseFileName = currentLibraryChar.jsonName.replace(/\.(json|skel)$/i, '');
    } else {
        const { getAllCharacters } = await import('./db');
        const chars = await getAllCharacters();
        const fileName = document.getElementById('file-name')?.textContent || '';
        const match = chars.find(c => c.jsonName === fileName) || chars[0];
        if (match) {
            baseFileName = match.jsonName.replace(/\.(json|skel)$/i, '');
        } else {
            baseFileName = fileName.replace(/\.(json|skel)$/i, '');
        }
    }
    downloadMetaConfig(baseFileName);
});

document.getElementById('btn-export-zip')?.addEventListener('click', async () => {
    if (currentLibraryChar) {
        await downloadAsZip({
            jsonText: currentLibraryChar.jsonText,
            atlasText: currentLibraryChar.atlasText,
            pngBlobs: currentLibraryChar.pngBlobs,
            jsonName: currentLibraryChar.jsonName,
        });
    } else {
        const { getAllCharacters } = await import('./db');
        const chars = await getAllCharacters();
        const fileName = document.getElementById('file-name')?.textContent || '';
        const match = chars.find(c => c.jsonName === fileName) || chars[0];
        if (match) {
            await downloadAsZip({
                jsonText: match.jsonText,
                atlasText: match.atlasText,
                pngBlobs: match.pngBlobs,
                jsonName: match.jsonName,
            });
        }
    }
});

const mixSlider = document.getElementById('mix-duration') as HTMLInputElement;
const mixVal = document.getElementById('mix-val');
mixSlider?.addEventListener('input', () => {
    const v = parseFloat(mixSlider.value);
    if (mixVal) mixVal.textContent = v.toFixed(2) + 's';
    setGlobalMix(v);
});

// ── Library Integration ────────────────────────────────────────
async function internalLoadFromLibrary(char: SpineCharacter, isEmbedded: boolean, embedContainer?: HTMLElement) {
    console.log('[LIBRARY] Loading from library (embedded:' + isEmbedded + '):', char.name, 'id:', char.id, 'jsonName:', char.jsonName);
    currentLibraryChar = char;

    // ── Clean up existing state before loading ──
    if (gridMode) {
        destroyGridView();
        gridMode = false;
        animGridActive = false;
    }
    perAnimState.clear();
    currentAnimName = null;
    
    const pixiContainer = $('pixi-container');
    const dropZone = document.getElementById('drop-zone')!;
    const rightPanel = document.getElementById('right-panel')!;
    const assetContainer = document.getElementById('asset-container');
    const mainContainer = document.getElementById('main')!;
    
    // Show the right panel (preview + controls + properties)
    if (isEmbedded) {
        // Split-screen: library stays visible on left, viewer on right
        mainContainer.classList.add('split-mode');
        dropZone.classList.add('active');
        rightPanel.classList.remove('hidden');
        pixiContainer.style.display = 'block';
    } else {
        // Full screen viewer, hide library panel
        mainContainer.classList.remove('split-mode');
        dropZone.classList.remove('active');
        rightPanel.classList.remove('hidden');
        pixiContainer.style.display = 'block';
    }

    if (assetContainer) assetContainer.style.display = 'none';
    
    // Restore controls panel (may have been hidden by 2D/3D asset view)
    const ctrlPanelRestore = document.getElementById('controls');
    if (ctrlPanelRestore) ctrlPanelRestore.style.display = '';
    
    document.getElementById('char-section')!.style.display = 'none';
    $('anim-section').style.display = '';

    const pngBlobMap = new Map<string, Blob>();
    for (const p of char.pngBlobs) {
        pngBlobMap.set(p.name, p.blob);
    }
    const spineFiles = {
        jsonText: char.jsonText,
        atlasText: char.atlasText,
        pngBlobs: pngBlobMap,
        jsonName: char.jsonName,
    };

    // ── Update UI BEFORE loadSpine (so header shows correct info even if render fails) ──
    const badge = document.getElementById('version-badge')!;
    badge.textContent = (char.assetType === '2d' || char.assetType === '3d') ? char.assetType.toUpperCase() : 'v' + char.spineVersion;
    badge.classList.remove('hidden');
    document.getElementById('file-name')!.textContent = char.jsonName;

    // ── ROUTER: Branch for non-Spine generic assets ──
    if (char.assetType === '2d' || char.assetType === '3d') {
        pixiContainer.style.display = 'none';
        const ctrlPanel = document.getElementById('controls');
        if (ctrlPanel) ctrlPanel.style.display = 'none'; // hidden for purely static content
        
        if (assetContainer) {
            assetContainer.style.display = 'flex';
            const blobUrl = URL.createObjectURL(char.jsonBlob);
            
            const backBtnHtml = isEmbedded ? '' : `
                    <button class="ctrl-btn-full" onclick="document.getElementById('drop-zone').classList.add('active'); document.getElementById('asset-container').style.display='none'; document.getElementById('controls').classList.add('hidden');" 
                        style="width:auto; padding:8px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border-radius: 8px;">
                        ← Back to Library
                    </button>
            `;

            const btnHtml = `
                <div style="position:absolute; top:20px; left:20px; z-index:100; display:flex; gap:8px;">
                    ${backBtnHtml}
                    <a href="${blobUrl}" download="${char.jsonName}" class="ctrl-btn-full" 
                        style="width:auto; padding:8px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border-radius: 8px; text-decoration:none; display:flex; align-items:center; justify-content:center; background:rgb(124, 92, 252); color:white;">
                        ↓ Download
                    </a>
                </div>
            `;

            if (char.assetType === '2d') {
                assetContainer.innerHTML = `${btnHtml}<img src="${blobUrl}" style="max-width:90%; max-height:90%; object-fit:contain; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.5);" />`;
            } else if (char.assetType === '3d') {
                assetContainer.innerHTML = `${btnHtml}<model-viewer src="${blobUrl}" auto-rotate camera-controls style="width:100%; height:100%; background:transparent; --poster-color:transparent;"></model-viewer>`;
            }
        }
        return; // EXIT early, do not invoke Spine runtime!
    }

    currentGridData = {
        jsonText: char.jsonText,
        atlasText: char.atlasText,
        pngBlobs: pngBlobMap,
        jsonName: char.jsonName,
        majorVersion: char.majorVersion,
        minorVersion: char.minorVersion,
    };

    // DO NOT call initViewer() — already called in main().
    // Duplicate calls create multiple render loops → animation freezes.

    try {
        console.log('[LIBRARY] Loading:', char.name, 'v' + char.majorVersion + '.' + char.minorVersion,
            'jsonSize:', char.jsonText?.length, 'atlasSize:', char.atlasText?.length, 'pngs:', pngBlobMap.size);
        
        // Let the container settle constraints before creating spine WebGL textures bounds
        await new Promise(r => setTimeout(r, 50));
        await loadSpine(spineFiles, char.majorVersion, char.minorVersion);

        setPlaying(true);
        $('btn-play').classList.add('active');
        $('btn-pause').classList.remove('active');

        const info = getSkeletonInfo();
        if (info) {
            document.getElementById('info-bones')!.textContent = String(info.bones);
            document.getElementById('info-slots')!.textContent = String(info.slots);
            document.getElementById('info-anims')!.textContent = String(info.anims);
            document.getElementById('info-skins')!.textContent = String(info.skins);
        }

        initMetaConfig({
            name: char.name,
            spineVersion: char.spineVersion,
            jsonFile: char.jsonName,
            animations: getAnimations(),
            skins: getSkins(),
            currentScale: 1.0,
        });

        const anims = getAnimations();
        const animSelect = document.getElementById('anim-select') as HTMLSelectElement;
        animSelect.innerHTML = '';
        const allAnimOpt = document.createElement('option');
        allAnimOpt.value = '__all__';
        allAnimOpt.textContent = '— All —';
        animSelect.appendChild(allAnimOpt);
        for (const a of anims) {
            const o = document.createElement('option');
            o.value = a; o.textContent = a;
            animSelect.appendChild(o);
        }
        if (anims.length > 0) {
            animSelect.value = anims[0];
            currentAnimName = anims[0];
        }
        updateAnimButtons('single');

        const skins = getSkins();
        const skinSelect = document.getElementById('skin-select') as HTMLSelectElement;
        const skinSection = document.getElementById('skin-section')!;
        skinSelect.innerHTML = '';
        for (const s of skins) {
            const o = document.createElement('option');
            o.value = s; o.textContent = s;
            skinSelect.appendChild(o);
        }
        skinSection.style.display = skins.length > 1 ? '' : 'none';

        resetControlsToDefaults();

        console.log('[LIBRARY] Loaded successfully:', char.name);
        if (!char.thumbnail) {
            scheduleThumbnailCapture(char.jsonName);
        }
        
        // Auto scale to fit in embedded view
        if (isEmbedded) {
            setTimeout(() => {
                setViewZoom(0.35); // Adjust scale for thumbnail view
            }, 100);
        } else {
            setViewZoom(1.0);
        }
    } catch (e) {
        console.error('[LIBRARY] Load error for', char.jsonName, ':', e);
        // Still update animation dropdown from DB data so user sees correct info
        const animSelect = document.getElementById('anim-select') as HTMLSelectElement;
        animSelect.innerHTML = '';
        const allAnimOpt = document.createElement('option');
        allAnimOpt.value = '__all__';
        allAnimOpt.textContent = '— All —';
        animSelect.appendChild(allAnimOpt);
        const animNames = char.animNames || [];
        for (const a of animNames) {
            const o = document.createElement('option');
            o.value = a; o.textContent = a;
            animSelect.appendChild(o);
        }
    }
}

(async function initLibrary() {
    initLibrarySearch();
    
    // Bind Full Load (Double Click / Open In Viewer Button)
    setOnLibraryLoad((char: SpineCharacter) => {
        internalLoadFromLibrary(char, false);
    });
    
    // Bind Embedded Load (Single Click Card)
    setOnLibraryLoadEmbedded((char: SpineCharacter, container: HTMLElement) => {
        internalLoadFromLibrary(char, true, container);
    });
    
    await renderLibrary();
    // Clear any false "No JSON" error if library has saved characters
    const { getCharacterCount } = await import('./db');
    const count = await getCharacterCount();
    if (count > 0) {
        const errPanel = document.getElementById('debug-panel');
        if (errPanel) errPanel.remove();
        const sub = document.querySelector('.drop-sub');
        if (sub) sub.textContent = 'Drop a folder or click a character from the library below';
    }
})();
 
