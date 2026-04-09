/**
 * Spine Asset Library — UI Module
 * Renders library panel, handles search, sort, status, notes, tags, collections, project filter, delete, and load-from-library.
 * Add-on module: does NOT affect existing viewer functionality.
 */
import {
    getAllCharacters, deleteCharacter, getCharacter, updateCharacterMeta,
    getAllProjects, getCharactersByProject, getAllCollections, createCollection,
    deleteCollection, addToCollection, removeFromCollection, getCharactersByCollection,
    addTag, removeTag, getAllUniqueTags, getCollectionIcons, getCollectionColors,
    AUTO_TAG_INFO,
    type SpineCharacter, type SpineProject, type SpineCollection,
} from './db';

export let selectedCharacterId: number | null = null;
export let isInspectorActive: boolean = false;
let loadCallback: ((char: SpineCharacter) => void) | null = null;
let loadCallbackEmbedded: ((char: SpineCharacter, container: HTMLElement) => void) | null = null;
let currentFilter = '';
let currentSort = 'date-desc';
let currentProjectFilter: number | null | 'all' = 'all';
let currentCollectionFilter: number | null | 'all' = 'all';
let currentTagFilter: string | null = null;
let panelEventsAttached = false;
let cachedProjects: SpineProject[] = [];
let cachedCollections: SpineCollection[] = [];
let cachedTags: string[] = [];

const STATUS_CYCLE: SpineCharacter['status'][] = ['under-review', 'in-review', 'approved', 'rejected', 'needs-revision'];
const STATUS_LABELS: Record<string, string> = {
    'under-review': 'Under Review',
    'in-review': 'In Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'needs-revision': 'Needs Revision',
    // Fallback mappings for old db data
    draft: 'Under Review',
    review: 'In Review',
    redo: 'Needs Revision',
};
const STATUS_COLORS: Record<string, string> = {
    'under-review': '#94a3b8',
    'in-review': '#3b82f6',
    'approved': '#22c55e',
    'rejected': '#64748b',
    'needs-revision': '#ef4444',
    // Fallback mappings for old db data
    draft: '#94a3b8',
    review: '#3b82f6',
    redo: '#ef4444',
};

// ── SVG Icons (Lucide-style, 14px) ─────────────────────────────
const SVG = (d: string, size = 14) => `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
    tag:      SVG('<path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l6.58-6.58a1 1 0 0 0 0-1.42Z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>'),
    folder:   SVG('<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>'),
    edit:     SVG('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
    note:     SVG('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>'),
    trash:    SVG('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
    film:     SVG('<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>'),
    masks:    SVG('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>'),
    box:      SVG('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
    calendar: SVG('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    comment:  SVG('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
};

/** Set callback for when user clicks "Open in Viewer" (Full transition) */
export function setOnLibraryLoad(cb: (char: SpineCharacter) => void) {
    loadCallback = cb;
}

/** Set callback for when user single-clicks a card (Embedded view) */
export function setOnLibraryLoadEmbedded(cb: (char: SpineCharacter, container: HTMLElement) => void) {
    loadCallbackEmbedded = cb;
}

/** Sort characters array based on current sort option */
function sortCharacters(chars: SpineCharacter[]): SpineCharacter[] {
    const [field, dir] = currentSort.split('-') as [string, string];
    const asc = dir === 'asc';

    return [...chars].sort((a, b) => {
        let cmp = 0;
        switch (field) {
            case 'name': cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }); break;
            case 'date': cmp = new Date(a.importedAt).getTime() - new Date(b.importedAt).getTime(); break;
            case 'version': cmp = a.spineVersion.localeCompare(b.spineVersion, undefined, { numeric: true }); break;
            case 'anims': cmp = a.animCount - b.animCount; break;
            case 'size': cmp = a.fileSize - b.fileSize; break;
            case 'project': {
                const pa = cachedProjects.find(p => p.id === a.projectId);
                const pb = cachedProjects.find(p => p.id === b.projectId);
                const na = pa?.name || 'zzz'; // no-project goes last
                const nb = pb?.name || 'zzz';
                cmp = na.localeCompare(nb, undefined, { numeric: true, sensitivity: 'base' });
                break;
            }
            default: cmp = 0;
        }
        return asc ? cmp : -cmp;
    });
}

/** Render the library panel (call on app init and after save/delete) */
export async function renderLibrary() {
    const panel = document.getElementById('library-panel');
    const grid = document.getElementById('library-grid');
    const countEl = document.getElementById('library-count');
    if (!panel || !grid) return;

    // Attach panel-level event stop ONCE (prevents click bubbling to drop-zone file input)
    if (!panelEventsAttached) {
        panel.addEventListener('click', (e) => e.stopPropagation());
        panel.addEventListener('mousedown', (e) => e.stopPropagation());
        panelEventsAttached = true;
    }

    // Clean up any leftover popups/backdrops that might block UI
    closeAllPopups();

    // Refresh caches
    cachedProjects = await getAllProjects();
    cachedCollections = await getAllCollections();
    cachedTags = await getAllUniqueTags();

    // Update filter dropdowns
    renderProjectFilter();
    renderCollectionFilter();

    // Get characters based on filters
    let chars: SpineCharacter[];

    // Start with collection filter (most specific)
    if (currentCollectionFilter !== 'all') {
        chars = await getCharactersByCollection(currentCollectionFilter as number);
    } else if (currentProjectFilter !== 'all') {
        chars = await getCharactersByProject(currentProjectFilter as number | null);
    } else {
        chars = await getAllCharacters();
    }

    // Apply tag filter
    if (currentTagFilter) {
        chars = chars.filter(c => c.tags?.includes(currentTagFilter!));
    }

    // Apply text search
    if (currentFilter) {
        const q = currentFilter.toLowerCase();
        chars = chars.filter(c => {
            if (c.name.toLowerCase().includes(q) || c.jsonName.toLowerCase().includes(q)) return true;
            if (c.spineVersion && ('v' + c.spineVersion).toLowerCase().includes(q)) return true;
            if (c.spineVersion?.toLowerCase().includes(q)) return true;
            if (c.status?.toLowerCase().includes(q)) return true;
            if (c.notes?.toLowerCase().includes(q)) return true;
            if (c.animNames?.some(a => a.toLowerCase().includes(q))) return true;
            if (c.projectId) {
                const proj = cachedProjects.find(p => p.id === c.projectId);
                if (proj && (proj.name.toLowerCase().includes(q) || proj.code.toLowerCase().includes(q))) return true;
            }
            if (c.tags?.some(t => t.toLowerCase().includes(q))) return true;
            
            // Fallback: search the raw JSON text to match skins, slots, or obscure data
            if (c.jsonText && c.jsonText.toLowerCase().includes(q)) return true;

            return false;
        });
    }

    // Apply sort
    chars = sortCharacters(chars);

    panel.style.display = 'flex';
    if (chars.length === 0 && !currentFilter && currentProjectFilter === null && currentCollectionFilter === 'all' && !currentTagFilter) {
        // Fallback condition if user really has 0 characters
    }
    
    // Explicit empty state check when the entire library has 0 items
    if (chars.length === 0 && cachedProjects.length === 0 && cachedCollections.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:400px; text-align:center;">
                <div style="font-size:56px; opacity:0.4; margin-bottom:16px; animation:float 3s ease-in-out infinite;">📥</div>
                <div style="font-size:22px; font-weight:700; color:var(--text); letter-spacing:1px; margin-bottom:8px;">Asset Library is Empty</div>
                <div style="font-size:13px; color:var(--dim); margin-bottom:24px;">Drag and drop Spine, GLTF, or Image files anywhere on this window</div>
                <button id="btn-empty-import" style="background:var(--accent); color:#fff; border:none; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; transition:transform 0.15s;">
                    Browse Files
                </button>
            </div>
        `;
        if (countEl) countEl.textContent = '0 characters';
        
        setTimeout(() => {
            const btn = document.getElementById('btn-empty-import');
            if (btn) btn.addEventListener('click', () => document.getElementById('btn-sidebar-import')?.click());
        }, 50);
        return;
    }
    if (chars.length === 0) {
        grid.innerHTML = '<div style="text-align:center;color:var(--dim);padding:20px;font-size:13px;">No matching characters found.</div>';
        if (countEl) countEl.textContent = '0 characters';
        return;
    }
    if (countEl) countEl.textContent = `${chars.length} character${chars.length !== 1 ? 's' : ''}`;

    grid.innerHTML = '';
    for (const char of chars) {
        const charId = char.id!;
        const charName = char.name;
        const statusColor = STATUS_COLORS[char.status] || STATUS_COLORS.draft;
        const statusLabel = STATUS_LABELS[char.status] || STATUS_LABELS.draft;
        const project = cachedProjects.find(p => p.id === char.projectId);
        const charCollections = cachedCollections.filter(col => char.collectionIds?.includes(col.id!));

        const card = document.createElement('div');
        card.className = 'library-card';
        card.dataset.charId = String(charId);

        // Truncate notes preview
        const notePreview = char.notes ? (char.notes.length > 50 ? char.notes.slice(0, 50) + '…' : char.notes) : '';

        // Upload date
        const uploadDate = char.importedAt ? new Date(char.importedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

        // Spine bone SVG (vertebra style)
        const spineBoneSvg = `<svg class="spine-bone-icon" viewBox="0 0 32 32" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4c-2 0-3.5 1.5-3.5 3.5 0 1 .4 1.9 1 2.5L12 14h8l-1.5-4c.6-.6 1-1.5 1-2.5C19.5 5.5 18 4 16 4z" fill="#94a3b8" opacity="0.7"/>
            <rect x="13" y="13" width="6" height="6" rx="1" fill="#7c5cfc" opacity="0.5"/>
            <path d="M16 28c2 0 3.5-1.5 3.5-3.5 0-1-.4-1.9-1-2.5L20 18h-8l1.5 4c-.6.6-1 1.5-1 2.5C12.5 26.5 14 28 16 28z" fill="#94a3b8" opacity="0.7"/>
        </svg>`;

        let thumbHtml = '';
        if (char.assetType === '2d' && char.jsonBlob) {
            const objectUrl = URL.createObjectURL(char.jsonBlob);
            // Intentionally not revoking object URL immediately so the image stays rendered when scrolling
            thumbHtml = `<img src="${objectUrl}" alt="${char.jsonName}" />`;
        } else if (char.assetType === '3d') {
            thumbHtml = `<span class="no-thumb" style="font-size:40px;opacity:0.8;">🧊</span>`;
        } else {
            thumbHtml = char.thumbnail
                ? `<img src="${char.thumbnail}" alt="${char.jsonName}" />`
                : `<span class="no-thumb">${spineBoneSvg}</span>`;
        }

        let versionHtml = '';
        if (char.assetType === '2d') {
            versionHtml = `<span title="Asset Type" style="font-size:10px;font-weight:700;font-family:var(--mono);color:#ec4899;background:rgba(236,72,153,0.1);padding:2px 5px;border-radius:4px;white-space:nowrap;">2D ART</span>`;
        } else if (char.assetType === '3d') {
            versionHtml = `<span title="Asset Type" style="font-size:10px;font-weight:700;font-family:var(--mono);color:#0ea5e9;background:rgba(14,165,233,0.1);padding:2px 5px;border-radius:4px;white-space:nowrap;">3D MODEL</span>`;
        } else {
            versionHtml = `<span title="Spine version" style="font-size:10px;font-weight:700;font-family:var(--mono);color:var(--dim);background:rgba(255,255,255,0.06);padding:2px 5px;border-radius:4px;white-space:nowrap;">v${char.spineVersion}</span>`;
        }

        card.innerHTML = `
            <div class="library-card-thumb">
                ${thumbHtml}
            </div>
            <div class="library-card-info" style="display:flex;flex-direction:column;padding:10px 8px;height:76px;box-sizing:border-box;container-type:inline-size;">
                <!-- Row 1: Fixed 1-line auto-scaled Name -->
                <div class="library-card-name" title="${char.jsonName}" style="font-size:clamp(9px, calc(100cqi / (${Math.max(char.name.length, 5)} * 0.62)), 13px);white-space:nowrap;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;line-height:1;">
                    ${char.name}
                </div>
                
                <!-- Row 2: Status & Version -->
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:nowrap;margin-top:auto;">
                    <span class="library-card-status-badge" style="background:color-mix(in srgb, ${statusColor} 15%, transparent);color:${statusColor};border:1px solid color-mix(in srgb, ${statusColor} 30%, transparent);padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;cursor:pointer;letter-spacing:0.5px;white-space:nowrap;" data-char-id="${charId}" title="${statusLabel} (click to change)">${statusLabel}</span>
                    ${versionHtml}
                </div>

                <!-- Row 3: Date & Notes -->
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:nowrap;margin-top:6px;">
                    <span class="library-card-date" style="font-size:10px;color:rgba(255,255,255,0.4);font-family:var(--mono);white-space:nowrap;">${ICON.calendar} ${uploadDate}</span>
                    ${char.notes ? `<span class="library-card-note-icon" title="Note: ${char.notes.replace(/"/g, '&quot;')}" style="color:var(--accent);display:flex;align-items:center;">${ICON.comment}</span>` : ''}
                </div>
            </div>
        `;

        // Single click card → Select and open inspector + always show right panel
        card.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            const target = e.target as HTMLElement;
            
            // Ignore status badge click or tag click (they have separate handlers)
            if (target.closest('.library-card-status-badge') || target.closest('.tag-remove') || target.closest('.tag-pill')) {
                return;
            }

            // Deselect others
            document.querySelectorAll('.library-card.selected').forEach(c => c.classList.remove('selected'));
            
            // Select this
            card.classList.add('selected');
            selectedCharacterId = charId;
            
            // Ensure right panel is visible when selecting a character
            const rightPanel = document.getElementById('right-panel');
            const mainEl = document.getElementById('main');
            if (rightPanel) rightPanel.classList.remove('collapsed');
            if (mainEl) mainEl.classList.add('split-mode');
            // Remove any lingering expand button
            document.getElementById('btn-expand-panel')?.remove();
            
            console.log('[LIBRARY] Card selected, charId:', charId, 'name:', charName);
            openInspector(charId);
        });

        // Double click card → Open Live Viewer
        card.addEventListener('dblclick', (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('[LIBRARY] Card double-clicked, opening viewer:', charId);
            const target = e.target as HTMLElement;
            if (target.closest('.library-card-status-badge') || target.closest('.tag-remove') || target.closest('.tag-pill')) return;

            getCharacter(charId).then(freshChar => {
                if (freshChar && loadCallback) {
                    loadCallback(freshChar);
                }
            });
        });

        // Status badge click → cycle status (Keep inline)
        card.querySelector('.library-card-status-badge')!.addEventListener('click', async (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
            const idx = STATUS_CYCLE.indexOf(char.status as SpineCharacter['status']);
            const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
            await updateCharacterMeta(charId, { status: nextStatus });
            await renderLibrary();
        });

        // Tag remove buttons
        card.querySelectorAll('.tag-remove').forEach((btn: Element) => {
            btn.addEventListener('click', async (e: Event) => {
                e.stopPropagation();
                e.preventDefault();
                const el = e.target as HTMLElement;
                const cId = parseInt(el.dataset.charId!);
                const tag = el.dataset.tag!;
                await removeTag(cId, tag);
                await renderLibrary();
            });
        });

        // Tag pill click → filter by tag
        card.querySelectorAll('.tag-pill').forEach((pill: Element) => {
            pill.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                e.preventDefault();
                const tag = (e.currentTarget as HTMLElement).dataset.tag!;
                if (currentTagFilter === tag) {
                    currentTagFilter = null;
                } else {
                    currentTagFilter = tag;
                }
                renderLibrary();
            });
        });

        grid.appendChild(card);
    }
}

/** Render or update the project filter dropdown */
function renderProjectFilter() {
    const filterEl = document.getElementById('sidebar-projects');
    if (!filterEl) return;

    filterEl.innerHTML = `
        <li class="sidebar-item ${currentProjectFilter === null ? 'active' : ''}" data-type="project" data-id="none">📭 No Project</li>
        ${cachedProjects.map(p => `
            <li class="sidebar-item ${currentProjectFilter === p.id ? 'active' : ''}" data-type="project" data-id="${p.id}">
                <div><span style="color:${p.color}">●</span> [${p.code}] ${p.name}</div>
            </li>
        `).join('')}
    `;
}

/** Render collection filter dropdown */
function renderCollectionFilter() {
    const filterEl = document.getElementById('sidebar-collections');
    if (!filterEl) return;

    filterEl.innerHTML = `
        ${cachedCollections.map(c => `
            <li class="sidebar-item ${currentCollectionFilter === c.id ? 'active' : ''}" data-type="collection" data-id="${c.id}">
                ${c.icon} ${c.name}
            </li>
        `).join('')}
        <li class="sidebar-item" data-type="collection" data-id="__manage__" style="opacity:0.7">⚙️ Manage...</li>
    `;
}


/** Open right-panel properties section */
async function openInspector(charId: number) {
    const char = await getCharacter(charId);
    if (!char) return;

    const propsEmpty = document.getElementById('props-empty');
    const propsContent = document.getElementById('props-content');
    if (!propsEmpty || !propsContent) return;

    propsEmpty.style.display = 'none';
    propsContent.style.display = 'flex';
    isInspectorActive = true;

    const project = cachedProjects.find(p => p.id === char.projectId);
    const projLabel = project ? project.name : 'No Project';

    const uploadDate = char.importedAt ? new Date(char.importedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    propsContent.innerHTML = `
        <div class="props-header">${ICON.box} Properties</div>
        <div class="props-body">
            <div class="props-title">${char.name}</div>
            
            <div class="props-actions">
                <button class="props-btn" id="insp-btn-rename" title="Rename">${ICON.edit} Rename</button>
                <button class="props-btn" id="insp-btn-collections" title="Add to collection">${ICON.folder} Collection</button>
                <button class="props-btn" id="insp-btn-tags" title="Edit tags">${ICON.tag} Tags</button>
                <button class="props-btn" id="insp-btn-notes" title="Notes" style="${char.notes ? 'color:var(--accent);border-color:var(--accent);' : ''}">${ICON.note} Notes</button>
            </div>

            <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
                <div class="props-meta-row"><span>Project</span> <span style="font-weight:600;color:var(--text);">${projLabel}</span></div>
                <div class="props-meta-row"><span>Asset Server ID</span> <span style="font-family:var(--mono);">${char.jsonName}</span></div>
                <div class="props-meta-row"><span>Uploaded</span> <span style="font-family:var(--mono);">${uploadDate}</span></div>
                ${char.assetType === 'spine' ? `
                    <div class="props-meta-row"><span>Spine Version</span> <span style="font-weight:600;color:var(--text);">v${char.spineVersion}</span></div>
                    <div class="props-meta-row"><span>Size</span> <span style="font-family:var(--mono);">${(char.fileSize! / 1024).toFixed(1)} KB</span></div>
                    <div class="props-meta-row"><span>Animations</span> <span style="font-family:var(--mono);">${char.animCount}</span></div>
                ` : ''}
            </div>
            
            ${char.notes ? `
            <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px;font-size:12px;color:rgba(255,255,255,0.8);white-space:pre-wrap;border:1px solid rgba(255,255,255,0.05);">
                <div style="font-weight:600;margin-bottom:6px;color:var(--accent);font-size:10px;text-transform:uppercase;letter-spacing:1px;">Notes</div>
                ${char.notes}
            </div>
            ` : ''}

            <button class="props-btn btn-danger" id="insp-btn-delete" style="margin-top:auto;padding:10px;">${ICON.trash} Delete Asset</button>
        </div>
    `;

    // Bind action buttons
    document.getElementById('insp-btn-rename')?.addEventListener('click', async () => {
        const newName = prompt('Enter new display name for the character:', char.name);
        if (newName !== null && newName.trim() !== '' && newName !== char.name) {
            await updateCharacterMeta(charId, { name: newName.trim() });
            await renderLibrary();
            await openInspector(charId);
        }
    });

    document.getElementById('insp-btn-delete')?.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${char.name}"?`)) {
            await deleteCharacter(charId);
            propsEmpty.style.display = 'flex';
            propsContent.style.display = 'none';
            selectedCharacterId = null;
            // Hide the right panel
            const rightPanel = document.getElementById('right-panel');
            if (rightPanel) rightPanel.classList.add('hidden');
            document.getElementById('main')?.classList.remove('split-mode');
            await renderLibrary();
        }
    });

    document.getElementById('insp-btn-notes')?.addEventListener('click', (e) => {
        openNotesEditor(e.target as HTMLElement, charId, char.notes || '');
    });

    document.getElementById('insp-btn-collections')?.addEventListener('click', (e) => {
        openCollectionPicker(e.target as HTMLElement, charId, char.collectionIds || []);
    });

    document.getElementById('insp-btn-tags')?.addEventListener('click', (e) => {
        openTagEditor(e.target as HTMLElement, charId, char.tags || []);
    });

    // ─────────────────────────────────────────────
    // [EMBEDDED VIEWER TRIGGER]
    // ─────────────────────────────────────────────
    // The canvas is already visible in #right-preview, just trigger the load
    if (loadCallbackEmbedded) {
        const rightPreview = document.querySelector('.right-preview');
        if (rightPreview) {
            setTimeout(() => {
                loadCallbackEmbedded!(char, rightPreview as HTMLElement);
            }, 50);
        }
    }
}

/** Open inline tag editor popup */
/** Create a transparent overlay behind a popup — click overlay = close popup */
function createPopupOverlay(popup: HTMLElement): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'popup-backdrop';
    overlay.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        overlay.remove();
        popup.remove();
    });
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    return overlay;
}

/** Remove all open popups */
export function closeAllPopups() {
    document.querySelectorAll('.popup-backdrop').forEach(el => el.remove());
    document.querySelectorAll('.tag-editor-popup, .collection-picker-popup, .notes-editor-popup').forEach(el => el.remove());
}

function openTagEditor(anchor: HTMLElement, charId: number, currentTags: string[]) {
    closeAllPopups();

    const popup = document.createElement('div');
    popup.className = 'tag-editor-popup';

    // Separate auto tags and custom tags
    const autoTags = currentTags.filter(t => AUTO_TAG_INFO[t]);
    const customTags = currentTags.filter(t => !AUTO_TAG_INFO[t]);

    popup.innerHTML = `
        <div class="tag-editor-title">🏷️ Tags</div>
        <div class="tag-editor-auto">
            ${autoTags.map(t => {
                const info = AUTO_TAG_INFO[t];
                return `<span class="tag-pill tag-auto tag-small" style="--tag-color:${info.color}">${info.icon} ${info.label}</span>`;
            }).join('') || '<span class="tag-editor-empty">No auto-tags</span>'}
        </div>
        <div class="tag-editor-custom-label">Custom Tags</div>
        <div class="tag-editor-custom">
            ${customTags.map(t =>
                `<span class="tag-pill tag-custom tag-small">🏷️ ${t}<button class="tag-remove-popup" data-tag="${t}">✕</button></span>`
            ).join('') || '<span class="tag-editor-empty">No custom tags yet</span>'}
        </div>
        <div class="tag-editor-add-row">
            <input type="text" class="tag-editor-input" placeholder="New tag..." maxlength="30" />
            <button class="tag-editor-add-btn">+</button>
        </div>
    `;

    // Position near anchor
    const rect = anchor.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
    popup.style.top = Math.min(rect.bottom + 4, window.innerHeight - 240) + 'px';

    const overlay = createPopupOverlay(popup);
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    popup.addEventListener('click', (e) => e.stopPropagation());
    popup.addEventListener('mousedown', (e) => e.stopPropagation());

    const input = popup.querySelector('.tag-editor-input') as HTMLInputElement;
    input.focus();

    // Add tag
    const doAdd = async () => {
        const tag = input.value.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
        if (!tag) return;
        await addTag(charId, tag);
        overlay.remove();
        popup.remove();
        await renderLibrary();
    };

    popup.querySelector('.tag-editor-add-btn')!.addEventListener('click', doAdd);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); doAdd(); }
        if (e.key === 'Escape') { overlay.remove(); popup.remove(); }
    });

    // Remove tag buttons
    popup.querySelectorAll('.tag-remove-popup').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const tag = (e.target as HTMLElement).dataset.tag!;
            await removeTag(charId, tag);
            overlay.remove();
            popup.remove();
            await renderLibrary();
        });
    });
}

/** Open collection picker popup */
function openCollectionPicker(anchor: HTMLElement, charId: number, currentCollectionIds: number[]) {
    closeAllPopups();

    const popup = document.createElement('div');
    popup.className = 'collection-picker-popup';

    const overlay = createPopupOverlay(popup);

    const renderPickerContent = () => {
        popup.innerHTML = `
            <div class="collection-picker-title">📂 Collections</div>
            <div class="collection-picker-list">
                ${cachedCollections.length === 0
                    ? '<div class="collection-picker-empty">No collections yet</div>'
                    : cachedCollections.map(col => {
                        const isIn = currentCollectionIds.includes(col.id!);
                        return `<label class="collection-picker-item${isIn ? ' active' : ''}">
                            <input type="checkbox" data-col-id="${col.id}" ${isIn ? 'checked' : ''} />
                            <span class="collection-picker-icon" style="--col-color:${col.color}">${col.icon}</span>
                            <span class="collection-picker-name">${col.name}</span>
                            <button class="collection-delete-btn" data-col-id="${col.id}" title="Delete collection">✕</button>
                        </label>`;
                    }).join('')}
            </div>
            <div class="collection-picker-create">
                <input type="text" class="collection-create-input" placeholder="New collection..." maxlength="30" />
                <button class="collection-create-btn">+</button>
            </div>
        `;

        // Checkbox handlers
        popup.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', async (e) => {
                e.stopPropagation();
                const colId = parseInt((e.target as HTMLInputElement).dataset.colId!);
                const checked = (e.target as HTMLInputElement).checked;
                if (checked) {
                    await addToCollection(charId, colId);
                    currentCollectionIds.push(colId);
                } else {
                    await removeFromCollection(charId, colId);
                    const idx = currentCollectionIds.indexOf(colId);
                    if (idx >= 0) currentCollectionIds.splice(idx, 1);
                }
                await renderLibrary();
            });
        });

        // Delete collection buttons
        popup.querySelectorAll('.collection-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const colId = parseInt((e.target as HTMLElement).dataset.colId!);
                await deleteCollection(colId);
                cachedCollections = await getAllCollections();
                const idx = currentCollectionIds.indexOf(colId);
                if (idx >= 0) currentCollectionIds.splice(idx, 1);
                renderPickerContent();
                await renderLibrary();
            });
        });

        // Create new collection
        const createInput = popup.querySelector('.collection-create-input') as HTMLInputElement;
        const doCreate = async () => {
            const name = createInput.value.trim();
            if (!name) return;
            const icons = getCollectionIcons();
            const icon = icons[cachedCollections.length % icons.length];
            const colors = getCollectionColors();
            const color = colors[cachedCollections.length % colors.length];
            const newId = await createCollection(name, icon, color);
            await addToCollection(charId, newId);
            currentCollectionIds.push(newId);
            cachedCollections = await getAllCollections();
            renderPickerContent();
            await renderLibrary();
        };

        popup.querySelector('.collection-create-btn')?.addEventListener('click', doCreate);
        createInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); doCreate(); }
            if (e.key === 'Escape') { overlay.remove(); popup.remove(); }
        });
    };

    // Position near anchor
    const rect = anchor.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
    popup.style.top = Math.min(rect.bottom + 4, window.innerHeight - 300) + 'px';

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    popup.addEventListener('click', (e) => e.stopPropagation());
    popup.addEventListener('mousedown', (e) => e.stopPropagation());

    renderPickerContent();
}

/** Open inline notes editor */
function openNotesEditor(anchor: HTMLElement, charId: number, currentNotes: string) {
    closeAllPopups();

    const popup = document.createElement('div');
    popup.className = 'notes-editor-popup';
    popup.innerHTML = `
        <textarea class="notes-textarea" placeholder="Add notes...">${currentNotes}</textarea>
        <div class="notes-actions">
            <button class="notes-save">💾 Save</button>
            <button class="notes-cancel">✕</button>
        </div>
    `;

    // Position near anchor
    const rect = anchor.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
    popup.style.top = Math.min(rect.bottom + 4, window.innerHeight - 160) + 'px';

    const overlay = createPopupOverlay(popup);
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    popup.addEventListener('click', (e) => e.stopPropagation());
    popup.addEventListener('mousedown', (e) => e.stopPropagation());

    const textarea = popup.querySelector('.notes-textarea') as HTMLTextAreaElement;
    textarea.focus();

    popup.querySelector('.notes-save')!.addEventListener('click', async () => {
        const text = textarea.value.trim();
        await updateCharacterMeta(charId, { notes: text });
        overlay.remove();
        popup.remove();
        await renderLibrary();
    });

    popup.querySelector('.notes-cancel')!.addEventListener('click', () => {
        overlay.remove();
        popup.remove();
    });
}

/** Initialize library search + sort + sidebar menus */
export function initLibrarySearch() {
    const searchInput = document.getElementById('library-search') as HTMLInputElement;
    const sortSelect = document.getElementById('library-sort') as HTMLSelectElement;
    const sidebarMenu = document.getElementById('sidebar-menu');
    const sidebarToggle = document.getElementById('btn-sidebar-toggle');
    const sidebar = document.getElementById('library-sidebar');

    if (sidebarToggle && sidebar) {
        const isCollapsed = localStorage.getItem('spine-sidebar-collapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            addSidebarExpandBtn();
        }
        
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const collapsed = sidebar.classList.toggle('collapsed');
            localStorage.setItem('spine-sidebar-collapsed', String(collapsed));
            if (collapsed) {
                addSidebarExpandBtn();
            } else {
                document.getElementById('btn-sidebar-expand')?.remove();
            }
        });
    }

    function addSidebarExpandBtn() {
        if (document.getElementById('btn-sidebar-expand')) return;
        const libraryMain = document.querySelector('.library-main');
        if (!libraryMain) return;
        const btn = document.createElement('button');
        btn.id = 'btn-sidebar-expand';
        btn.title = 'Show Sidebar';
        btn.innerHTML = '☰';
        btn.style.cssText = 'position:absolute;top:10px;left:10px;z-index:30;width:32px;height:32px;border-radius:6px;background:rgba(0,0,0,0.6);border:1px solid var(--border);color:var(--dim);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .2s;backdrop-filter:blur(6px);';
        btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--accent)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--accent)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(0,0,0,0.6)'; btn.style.color = 'var(--dim)'; btn.style.borderColor = 'var(--border)'; });
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sb = document.getElementById('library-sidebar');
            if (sb) sb.classList.remove('collapsed');
            localStorage.setItem('spine-sidebar-collapsed', 'false');
            btn.remove();
        });
        (libraryMain as HTMLElement).style.position = 'relative';
        libraryMain.appendChild(btn);
    }

    // ── Right Panel Collapse/Expand Toggle ──
    const collapseBtn = document.getElementById('btn-collapse-panel');
    const rightPanel = document.getElementById('right-panel');
    const dropZone = document.getElementById('drop-zone');
    const mainEl = document.getElementById('main');

    if (collapseBtn && rightPanel && dropZone && mainEl) {
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            rightPanel.classList.add('collapsed');
            mainEl.classList.remove('split-mode');

            addExpandBtn();
        });
    }

    function addExpandBtn() {
        if (document.getElementById('btn-expand-panel')) return;
        const dropZoneEl = document.getElementById('drop-zone');
        if (!dropZoneEl) return;
        const btn = document.createElement('button');
        btn.id = 'btn-expand-panel';
        btn.className = 'expand-panel-btn';
        btn.title = 'Show Preview Panel';
        btn.textContent = '▶';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rp = document.getElementById('right-panel');
            const m = document.getElementById('main');
            if (rp) rp.classList.remove('collapsed');
            if (m) m.classList.add('split-mode');

            btn.remove();
        });
        dropZoneEl.appendChild(btn);
    }

    if (searchInput) {
        searchInput.addEventListener('click', (e) => e.stopPropagation());
        searchInput.addEventListener('mousedown', (e) => e.stopPropagation());
        searchInput.addEventListener('input', () => {
            currentFilter = searchInput.value.trim();
            renderLibrary();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('click', (e) => e.stopPropagation());
        sortSelect.addEventListener('mousedown', (e) => e.stopPropagation());
        sortSelect.addEventListener('change', () => {
            currentSort = sortSelect.value;
            renderLibrary();
        });
    }

    // Event delegation for Sidebar routing
    if (sidebarMenu) {
        sidebarMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const li = target.closest('.sidebar-item') as HTMLElement;
            if (!li) return;

            const type = li.dataset.type;
            const id = li.dataset.id;

            if (type === 'all') {
                currentProjectFilter = 'all';
                currentCollectionFilter = 'all';
                currentTagFilter = null;
            } else if (type === 'project') {
                currentCollectionFilter = 'all';
                if (id === 'none') currentProjectFilter = null;
                else currentProjectFilter = parseInt(id!);
            } else if (type === 'collection') {
                if (id === '__manage__') {
                    openCollectionManager();
                    return; // Don't re-render yet
                } else {
                    currentProjectFilter = 'all';
                    currentCollectionFilter = parseInt(id!);
                }
            }

            renderLibrary();
        });
        sidebarMenu.addEventListener('mousedown', (e) => e.stopPropagation());
    }
}

/** Open collection manager dialog */
function openCollectionManager() {
    document.querySelector('.collection-manager-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'collection-manager-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'collection-manager-dialog';

    const renderContent = async () => {
        const collections = await getAllCollections();
        dialog.innerHTML = `
            <div class="cm-header">
                <h3>📂 Manage Collections</h3>
                <button class="cm-close">✕</button>
            </div>
            <div class="cm-list">
                ${collections.length === 0
                    ? '<div class="cm-empty">No collections yet. Create one below!</div>'
                    : collections.map(col => `
                        <div class="cm-item">
                            <span class="cm-icon" style="--col-color:${col.color}">${col.icon}</span>
                            <span class="cm-name">${col.name}</span>
                            <button class="cm-delete" data-col-id="${col.id}" title="Delete">🗑️</button>
                        </div>
                    `).join('')}
            </div>
            <div class="cm-create">
                <input type="text" class="cm-create-input" placeholder="New collection name..." maxlength="30" />
                <button class="cm-create-btn">➕ Create</button>
            </div>
        `;

        dialog.querySelector('.cm-close')!.addEventListener('click', () => overlay.remove());

        dialog.querySelectorAll('.cm-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const colId = parseInt((e.target as HTMLElement).dataset.colId!);
                await deleteCollection(colId);
                await renderContent();
                await renderLibrary();
            });
        });

        const createInput = dialog.querySelector('.cm-create-input') as HTMLInputElement;
        const doCreate = async () => {
            const name = createInput.value.trim();
            if (!name) return;
            const icons = getCollectionIcons();
            const colors = getCollectionColors();
            const cols = await getAllCollections();
            await createCollection(name, icons[cols.length % icons.length], colors[cols.length % colors.length]);
            await renderContent();
            await renderLibrary();
        };
        dialog.querySelector('.cm-create-btn')!.addEventListener('click', doCreate);
        createInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); doCreate(); }
            if (e.key === 'Escape') overlay.remove();
        });
    };

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());

    renderContent();

    requestAnimationFrame(() => overlay.classList.add('visible'));
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
