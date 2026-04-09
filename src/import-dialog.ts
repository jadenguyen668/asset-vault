/**
 * Import Confirm Dialog — Shows before saving characters to library.
 * Detects duplicates, lets user select which to import, build names via naming convention, and assign to a project.
 */
import { findDuplicates, getAllProjects, createProject, getProjectColors, NAMING_TEMPLATE, NAMING_EXAMPLE, NAMING_OPTIONS, type SpineCharacter, type SpineProject } from './db';
import { closeAllPopups } from './library-ui';

export interface ImportDialogItem {
    assetType?: 'spine' | '2d' | '3d';
    fileBlob?: Blob; // Used for inline preview
    jsonName: string;
    name: string;           // display name (can be renamed by user)
    originalName: string;   // original skeleton name (never changes)
    fileSize: number;
    boneCount: number;
    slotCount: number;
    animCount: number;
    animNames: string[];
    skinCount: number;
    isDuplicate: boolean;
    existingChar?: SpineCharacter;
    selected: boolean;
}

export interface ImportDialogResult {
    selectedItems: ImportDialogItem[];
    projectId: number | null;
    note?: string;
    customTags: string[];
}

/** Prepare import items from skeleton data, checking for duplicates */
export async function prepareImportItems(skeletonSets: Array<{
    assetType?: 'spine' | '2d' | '3d';
    fileBlob?: Blob;
    jsonName: string;
    jsonText: string;
    atlasText: string;
    pngBlobs: Map<string, Blob>;
    majorVersion: number;
    minorVersion: number;
}>): Promise<ImportDialogItem[]> {
    const jsonNames = skeletonSets.map(s => s.jsonName);
    const duplicates = await findDuplicates(jsonNames);

    return skeletonSets.map(set => {
        let boneCount = 0, slotCount = 0, animCount = 0, skinCount = 0, fileSize = 0;
        let animNames: string[] = [];
        try {
            const json = JSON.parse(set.jsonText);
            boneCount = json.bones?.length || 0;
            slotCount = json.slots?.length || 0;
            animNames = Object.keys(json.animations || {});
            animCount = animNames.length;
            const skins = json.skins;
            skinCount = Array.isArray(skins) ? skins.length : Object.keys(skins || {}).length;
        } catch { }

        fileSize = new Blob([set.jsonText]).size + new Blob([set.atlasText]).size;
        for (const [, blob] of set.pngBlobs) fileSize += blob.size;

        const isDuplicate = duplicates.has(set.jsonName);
        const baseName = set.jsonName.replace(/\.(json|skel|png|jpg|webp|glb|gltf|fbx|obj)$/i, '');

        if (set.assetType === '2d' || set.assetType === '3d') {
            return {
                assetType: set.assetType,
                fileBlob: set.fileBlob,
                jsonName: set.jsonName,
                name: baseName,
                originalName: baseName,
                fileSize: set.fileBlob?.size || 0,
                boneCount: 0, slotCount: 0, animCount: 0, animNames: [], skinCount: 0,
                isDuplicate,
                existingChar: duplicates.get(set.jsonName),
                selected: !isDuplicate,
            };
        }

        return {
            jsonName: set.jsonName,
            name: baseName,
            originalName: baseName,
            fileSize,
            boneCount, slotCount, animCount, animNames, skinCount,
            isDuplicate,
            existingChar: duplicates.get(set.jsonName),
            selected: !isDuplicate,
        };
    });
}

/** Show the import confirm dialog. Returns promise that resolves with user selection or null (cancelled). */
export function showImportDialog(items: ImportDialogItem[]): Promise<ImportDialogResult | null> {
    return new Promise(async (resolve) => {
        // Remove any existing dialog and leftover popups/backdrops
        document.querySelector('.import-dialog-overlay')?.remove();
        closeAllPopups();

        const projects = await getAllProjects();
        const colors = getProjectColors();

        // Naming builder state
        let builderCategory = '';
        let builderLocation = '';
        let builderSubject = '';
        let builderVersion = '01';

        // ── Build DOM ──
        const overlay = document.createElement('div');
        overlay.className = 'import-dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'import-dialog';

        const newCount = items.filter(i => !i.isDuplicate).length;
        const dupCount = items.filter(i => i.isDuplicate).length;
        const initialSelected = items.filter(i => i.selected).length;

        dialog.innerHTML = `
            <div class="import-dialog-header">
                <h2>Import Characters</h2>
                <div class="import-dialog-summary">
                    <span class="import-badge-new">${newCount} new</span>
                    ${dupCount > 0 ? `<span class="import-badge-dup">${dupCount} already exist</span>` : ''}
                </div>
            </div>

            <div class="import-naming-builder">
                <div class="nb-header">
                    <span class="nb-title">Naming Builder</span>
                    <code class="nb-preview" id="nb-preview">${NAMING_TEMPLATE}</code>
                </div>

                <div class="nb-row">
                    <span class="nb-field-label">Category</span>
                    <div class="nb-chips" id="nb-category">
                        ${NAMING_OPTIONS.Category.values.map(v => `<button class="nb-chip" data-val="${v}">${v}</button>`).join('')}
                    </div>
                </div>

                <div class="nb-row">
                    <span class="nb-field-label">Location</span>
                    <div class="nb-chips" id="nb-location">
                        ${NAMING_OPTIONS.Location.values.map(v => `<button class="nb-chip" data-val="${v}">${v}</button>`).join('')}
                    </div>
                </div>

                <div class="nb-row">
                    <span class="nb-field-label">Subject</span>
                    <div class="nb-subject-row">
                        <input type="text" id="nb-subject" class="nb-subject-input" placeholder="e.g. Max, Dragon (blank = auto from filename)" maxlength="40" />
                    </div>
                </div>

                <div class="nb-row">
                    <span class="nb-field-label">Version</span>
                    <div class="nb-version-row">
                        <span class="nb-version-prefix">v</span>
                        <input type="text" id="nb-version" class="nb-version-input" value="01" maxlength="3" />
                    </div>
                    <button class="nb-apply-btn" id="nb-apply-btn" title="Apply naming convention to all selected characters">⚡ Apply to Selected</button>
                </div>

                <div class="nb-example">Example: <code>${NAMING_EXAMPLE}</code></div>
            </div>

            <div class="import-dialog-toolbar">
                <label class="import-select-all">
                    <input type="checkbox" id="import-select-all-cb" checked />
                    <span>Select All</span>
                </label>
                <div class="import-size-total" id="import-size-total"></div>
            </div>

            <div class="import-dialog-list" id="import-dialog-list"></div>

            <div class="import-dialog-project">
                <label class="import-project-label">Project</label>
                <select id="import-project-select" class="import-project-select">
                    <option value="">— No Project —</option>
                    ${projects.map(p => `<option value="${p.id}" data-color="${p.color}" data-code="${p.code}">[${p.code}] ${p.name}</option>`).join('')}
                    <option value="__new__">➕ New Project...</option>
                </select>
                <div id="import-new-project" class="import-new-project" style="display:none">
                    <div class="import-new-project-row">
                        <input id="import-project-code" type="text" placeholder="Code (e.g. CTP2)" class="import-project-code-input" maxlength="6" />
                        <input id="import-project-name" type="text" placeholder="Full name" class="import-project-name-input" />
                    </div>
                    <div id="import-color-picks" class="import-color-picks">
                        ${colors.map((c, i) => `<button class="import-color-btn${i === 0 ? ' active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
                    </div>
                </div>
            </div>

            <div class="import-dialog-note" style="margin-top: 10px;">
                <label class="import-project-label">Description (Optional)</label>
                <input id="import-note-input" type="text" class="import-project-name-input" style="width: 100%; box-sizing: border-box; margin-top: 4px; border: 1px solid rgba(255,255,255,0.1); background: var(--bg-1);" placeholder="Context, notes, or tags for these characters..." />
            </div>

            <div class="import-dialog-type" style="margin-top: 15px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; border: 1px solid var(--border);">
                <label class="import-project-label" style="display:block; margin-bottom: 8px;">Asset Type Tag</label>
                <div style="display: flex; gap: 16px;">
                    <label style="color:var(--text);font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" name="import-asset-tag" value="Animation" checked> 🎬 Animation</label>
                    <label style="color:var(--text);font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" name="import-asset-tag" value="Artwork"> 🎨 Artwork / Prop</label>
                </div>
            </div>

            <div class="import-dialog-actions" style="margin-top: 20px;">
                <button id="import-btn-skip" class="import-btn import-btn-skip">Skip</button>
                <button id="import-btn-import" class="import-btn import-btn-import">
                    ✅ Import <span id="import-btn-count">${initialSelected}</span> Characters
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Stop events from propagating to drop-zone
        overlay.addEventListener('click', e => e.stopPropagation());
        overlay.addEventListener('mousedown', e => e.stopPropagation());
        overlay.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); });
        overlay.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); });

        // ── Naming Builder Chips ──
        function getProjectCode(): string {
            const sel = projectSelect.value;
            if (sel === '__new__') {
                return (dialog.querySelector('#import-project-code') as HTMLInputElement).value.trim().toUpperCase() || '???';
            }
            if (sel) {
                const opt = projectSelect.selectedOptions[0];
                return opt?.dataset.code || '???';
            }
            return '???';
        }

        function updatePreview() {
            const preview = dialog.querySelector('#nb-preview') as HTMLElement;
            const code = getProjectCode();
            const cat = builderCategory || '___';
            const loc = builderLocation || '___';
            const sub = builderSubject || '[auto]';
            const ver = builderVersion || '01';
            preview.textContent = `${code}_${cat}_${loc}_${sub}_v${ver}`;

            // Highlight active state
            preview.classList.toggle('nb-preview-ready', !!(builderCategory && builderLocation));
        }

        // Category chips
        dialog.querySelectorAll('#nb-category .nb-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const val = (e.target as HTMLElement).dataset.val!;
                // Toggle: click same = deselect
                if (builderCategory === val) {
                    builderCategory = '';
                    (e.target as HTMLElement).classList.remove('active');
                } else {
                    builderCategory = val;
                    dialog.querySelectorAll('#nb-category .nb-chip').forEach(b => b.classList.remove('active'));
                    (e.target as HTMLElement).classList.add('active');
                }
                updatePreview();
            });
        });

        // Location chips
        dialog.querySelectorAll('#nb-location .nb-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const val = (e.target as HTMLElement).dataset.val!;
                if (builderLocation === val) {
                    builderLocation = '';
                    (e.target as HTMLElement).classList.remove('active');
                } else {
                    builderLocation = val;
                    dialog.querySelectorAll('#nb-location .nb-chip').forEach(b => b.classList.remove('active'));
                    (e.target as HTMLElement).classList.add('active');
                }
                updatePreview();
            });
        });

        // Version input
        const versionInput = dialog.querySelector('#nb-version') as HTMLInputElement;
        versionInput.addEventListener('input', () => {
            builderVersion = versionInput.value.replace(/[^0-9]/g, '');
            versionInput.value = builderVersion;
            updatePreview();
        });

        // Subject input
        const subjectInput = dialog.querySelector('#nb-subject') as HTMLInputElement;
        subjectInput.addEventListener('input', () => {
            builderSubject = subjectInput.value.trim();
            updatePreview();
        });

        // Apply button — rename all selected characters with naming convention
        dialog.querySelector('#nb-apply-btn')!.addEventListener('click', (e) => {
            e.preventDefault();
            const code = getProjectCode();
            const cat = builderCategory;
            const loc = builderLocation;
            const ver = builderVersion || '01';

            if (!cat || !loc) {
                // Flash the missing fields
                if (!cat) dialog.querySelector('#nb-category')?.classList.add('nb-flash');
                if (!loc) dialog.querySelector('#nb-location')?.classList.add('nb-flash');
                setTimeout(() => {
                    dialog.querySelector('#nb-category')?.classList.remove('nb-flash');
                    dialog.querySelector('#nb-location')?.classList.remove('nb-flash');
                }, 600);
                return;
            }

            // Build prefix: CTP2_ANM_LOB_
            const prefix = `${code}_${cat}_${loc}_`;

            // First pass: extract subjects and build names
            const nameMap = new Map<string, number>(); // track subject usage count

            for (const item of items) {
                if (!item.selected) continue;
                const subject = builderSubject || extractSubject(item.originalName);
                const baseName = `${prefix}${subject}_v${ver.padStart(2, '0')}`;

                // Track duplicates
                const count = nameMap.get(baseName) || 0;
                nameMap.set(baseName, count + 1);
            }

            // Second pass: apply names, auto-suffix duplicates
            const usedNames = new Map<string, number>(); // current suffix counter
            for (const item of items) {
                if (!item.selected) continue;
                const subject = builderSubject || extractSubject(item.originalName);
                const baseName = `${prefix}${subject}_v${ver.padStart(2, '0')}`;

                if ((nameMap.get(baseName) || 0) > 1) {
                    // Has duplicates — add original prefix to differentiate
                    // e.g., fx_rocket -> Rocket_FX, pu_rocket -> Rocket_PU
                    const origPrefix = extractOriginalPrefix(item.originalName);
                    if (origPrefix) {
                        item.name = `${prefix}${subject}_${origPrefix}_v${ver.padStart(2, '0')}`;
                    } else {
                        // Fallback: sequential suffix
                        const idx = (usedNames.get(baseName) || 0) + 1;
                        usedNames.set(baseName, idx);
                        item.name = idx === 1 ? baseName : `${prefix}${subject}${String(idx).padStart(2, '0')}_v${ver.padStart(2, '0')}`;
                    }
                } else {
                    item.name = baseName;
                }
            }
            renderList();
        });

        // ── Render character list ──
        const listEl = dialog.querySelector('#import-dialog-list') as HTMLElement;
        renderList();

        function renderList() {
            listEl.innerHTML = '';
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const isRenamed = item.name !== item.originalName;
                const row = document.createElement('div');
                row.className = `import-item${item.isDuplicate ? ' import-item-dup' : ''}`;
                
                let metaHtml = '';
                if (item.assetType === '2d') {
                    metaHtml = `<span style="color:#ec4899;font-weight:bold;">🖼️ 2D Art</span><span>${formatSize(item.fileSize)}</span>`;
                } else if (item.assetType === '3d') {
                    metaHtml = `<span style="color:#0ea5e9;font-weight:bold;">🧊 3D Model</span><span>${formatSize(item.fileSize)}</span>`;
                } else {
                    metaHtml = `
                        <span>Anim: ${item.animCount}</span>
                        <span>Bone: ${item.boneCount}</span>
                        <span>${formatSize(item.fileSize)}</span>
                    `;
                }

                row.innerHTML = `
                    <label class="import-item-check">
                        <input type="checkbox" data-idx="${i}" ${item.selected ? 'checked' : ''} />
                    </label>
                    <div class="import-item-info">
                        <div class="import-item-name-row">
                            <input type="text" class="import-item-name-input" data-idx="${i}" value="${escapeHtml(item.name)}" title="Click to rename" />
                            ${isRenamed ? `<span class="import-renamed-badge" title="Original: ${escapeHtml(item.originalName)}">✏️</span>` : ''}
                        </div>
                        <div class="import-item-meta">${metaHtml}</div>
                    </div>
                    <div class="import-item-status">
                        ${item.isDuplicate
                        ? '<span class="import-status-dup">Exists</span>'
                        : '<span class="import-status-new">New</span>'}
                    </div>
                `;
                listEl.appendChild(row);
            }

            // Checkbox handlers
            listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const idx = parseInt((e.target as HTMLInputElement).dataset.idx!);
                    items[idx].selected = (e.target as HTMLInputElement).checked;
                    updateCounts();
                });
            });

            // Rename handlers
            listEl.querySelectorAll('.import-item-name-input').forEach(input => {
                const inputEl = input as HTMLInputElement;
                const idx = parseInt(inputEl.dataset.idx!);

                inputEl.addEventListener('click', (e) => e.stopPropagation());
                inputEl.addEventListener('focus', () => inputEl.select());

                const applyRename = () => {
                    const newName = inputEl.value.trim();
                    if (newName && newName !== items[idx].name) {
                        items[idx].name = newName;
                        renderList();
                    }
                };

                inputEl.addEventListener('blur', applyRename);
                inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); inputEl.blur(); }
                    if (e.key === 'Escape') { inputEl.value = items[idx].name; inputEl.blur(); }
                });
            });

            updateCounts();
        }

        function updateCounts() {
            const selected = items.filter(i => i.selected);
            const totalSize = selected.reduce((sum, i) => sum + i.fileSize, 0);
            const countEl = dialog.querySelector('#import-btn-count') as HTMLElement;
            const sizeEl = dialog.querySelector('#import-size-total') as HTMLElement;
            const selectAllCb = dialog.querySelector('#import-select-all-cb') as HTMLInputElement;

            countEl.textContent = String(selected.length);
            sizeEl.textContent = `${formatSize(totalSize)} total`;
            selectAllCb.checked = selected.length === items.length;
            selectAllCb.indeterminate = selected.length > 0 && selected.length < items.length;

            const importBtn = dialog.querySelector('#import-btn-import') as HTMLButtonElement;
            importBtn.disabled = selected.length === 0;
        }

        // ── Select All ──
        dialog.querySelector('#import-select-all-cb')!.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            items.forEach(i => i.selected = checked);
            renderList();
        });

        // ── Project selector ──
        const projectSelect = dialog.querySelector('#import-project-select') as HTMLSelectElement;
        const newProjectDiv = dialog.querySelector('#import-new-project') as HTMLElement;
        let selectedColor = colors[0];

        projectSelect.addEventListener('change', () => {
            newProjectDiv.style.display = projectSelect.value === '__new__' ? '' : 'none';
            if (projectSelect.value === '__new__') {
                (dialog.querySelector('#import-project-code') as HTMLInputElement).focus();
            }
            updatePreview(); // Update naming builder preview with new project code
        });

        // Auto-uppercase code input
        const codeInput = dialog.querySelector('#import-project-code') as HTMLInputElement;
        codeInput.addEventListener('input', () => {
            codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            updatePreview();
        });

        // Color buttons
        dialog.querySelectorAll('.import-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                dialog.querySelectorAll('.import-color-btn').forEach(b => b.classList.remove('active'));
                (e.target as HTMLElement).classList.add('active');
                selectedColor = (e.target as HTMLElement).dataset.color!;
            });
        });

        // ── Actions ──
        dialog.querySelector('#import-btn-skip')!.addEventListener('click', () => {
            overlay.remove();
            resolve(null);
        });

        dialog.querySelector('#import-btn-import')!.addEventListener('click', async () => {
            const selected = items.filter(i => i.selected);
            if (selected.length === 0) { overlay.remove(); resolve(null); return; }

            let projectId: number | null = null;

            if (projectSelect.value === '__new__') {
                const code = (dialog.querySelector('#import-project-code') as HTMLInputElement).value.trim();
                const name = (dialog.querySelector('#import-project-name') as HTMLInputElement).value.trim();
                if (code || name) {
                    const finalCode = code || name.substring(0, 4).toUpperCase();
                    const finalName = name || code;
                    projectId = await createProject(finalName, finalCode, selectedColor);
                }
            } else if (projectSelect.value) {
                projectId = parseInt(projectSelect.value);
            }

            const noteInput = dialog.querySelector('#import-note-input') as HTMLInputElement;
            const note = noteInput ? noteInput.value.trim() : '';
            
            const tagVal = (dialog.querySelector('input[name="import-asset-tag"]:checked') as HTMLInputElement)?.value;
            const customTags = tagVal ? [tagVal] : [];

            overlay.remove();
            resolve({ selectedItems: selected, projectId, note, customTags });
        });

        // ── Init preview ──
        updatePreview();

        // ── Animate in ──
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });
    });
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Common prefixes to strip from filenames when extracting Subject */
const STRIP_PREFIXES = [
    'fx_', 'vfx_', 'pu_', 'char_', 'chr_', 'bg_', 'ui_', 'uix_',
    'anm_', 'anim_', 'env_', 'ico_', 'icon_', 'prop_', 'prp_',
    'eff_', 'effect_', 'skel_', 'spine_', 'sp_',
];

/**
 * Extract a clean Subject from original filename.
 * e.g. "fx_rocket" → "Rocket", "char_NgaoBinh" → "NgaoBinh", "hero_idle_01" → "HeroIdle01"
 */
function extractSubject(originalName: string): string {
    let name = originalName;

    // Strip known prefixes (case-insensitive)
    for (const prefix of STRIP_PREFIXES) {
        if (name.toLowerCase().startsWith(prefix)) {
            name = name.substring(prefix.length);
            break; // Only strip one prefix
        }
    }

    // Capitalize first letter of each segment after underscores, then join with camelCase
    const parts = name.split('_').filter(p => p.length > 0);
    const capitalized = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
    return capitalized.join('');
}

/**
 * Extract the prefix portion from original filename for disambiguation.
 * e.g. "fx_rocket" → "FX", "pu_rocket" → "PU", "char_hero" → "CHR"
 */
function extractOriginalPrefix(originalName: string): string {
    for (const prefix of STRIP_PREFIXES) {
        if (originalName.toLowerCase().startsWith(prefix)) {
            return prefix.replace(/_$/, '').toUpperCase();
        }
    }
    // No known prefix — try to use first segment before underscore
    const underscoreIdx = originalName.indexOf('_');
    if (underscoreIdx > 0 && underscoreIdx <= 5) {
        return originalName.substring(0, underscoreIdx).toUpperCase();
    }
    return '';
}
