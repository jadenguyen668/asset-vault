# Spine Multi-Skeleton Viewer — Current State & Roadmap (v4 — 2026-03-31)

## 1. What is this tool?

A **browser-based Spine animation viewer** (Vite + TypeScript) that supports **Spine 3.x** (Canvas2D) and **Spine 4.x** (WebGL). Users drag-drop skeleton files → view/inspect animations with playback controls, skin switching, background overlay, and multi-skeleton grid comparison.

**Repository**: `github.com/chaunhun/spine_speedrig` — branch `feature/spine-viewer-v4`

---

## 2. File Structure

```
spine-viewer/
├── src/
│   ├── main.ts            # App controller, UI events, mode management, state persistence
│   ├── viewer.ts          # Single-skeleton renderer (WebGL 4.x / Canvas2D 3.x)
│   ├── viewer-grid.ts     # Grid renderer (multi-skeleton & multi-animation grid)
│   ├── version-detect.ts  # Auto-detect Spine version from JSON/SKEL
│   ├── db.ts              # IndexedDB storage (Dexie.js) — characters, projects, collections
│   ├── library-ui.ts      # Library panel — search, sort, tags, collections, status, notes
│   ├── import-dialog.ts   # Import confirm dialog with naming builder
│   ├── meta-config.ts     # Runtime meta-config export
│   └── style.css          # UI styles (dark theme, glassmorphism)
├── index.html
└── package.json           # deps: spine-canvas, @esotericsoftware/spine-webgl, vite, dexie
```

---

## 3. Current Features (Working)

### Display Modes
- **Character Grid**: All skeletons in CSS grid (drop folder → auto-enter)
- **Character Single**: One skeleton via dropdown
- **Animation ALL**: All animations of selected skeleton in grid cells
- **Animation Single**: One animation via dropdown or click

### Playback & Controls
- Play/Pause, Speed (0.1x–2x), Loop toggle — works in both Single and Grid modes
- Scale slider, Viewport Zoom (scroll wheel)
- Skin dropdown — syncs to all grid cells via `setGridSkin()`

### Background System
- Upload PNG/JPG as background behind skeleton
- Per-character BG storage (`perCharBgImage Map`) — persists across character switches
- BG scale uses skeleton scale (consistent between Single and Grid modes)

### Rendering
- Spine 4.x: WebGL via `SceneRenderer` + `PolygonBatcher`
- Spine 3.x: Canvas2D via `spine-canvas` runtime
- Checkerboard transparency indicator (like Photoshop/Spine Editor)
- FX-FIX: auto-hide "rec" placeholder slots, fix frost_spike_big blend (Normal→Additive)
- **PolygonBatcher blend reset**: force-reset `srcColorBlend`/`srcAlphaBlend`/`dstBlend` before BG draw and after skeleton draw to prevent Additive/Screen blend leaking to BG layer

### State Persistence
- `perAnimState Map`: saves scale, zoom, offset, speed, bgImage per animation
- `perCharBgImage Map`: saves BG image per character
- Auto-save/restore on animation and character switch

---

## 4. Known Solved Issues (for reference)

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| BG flickering bright/dark | PolygonBatcher cached Additive blend from `drawSkeleton` leaked to BG draw on next frame | Reset `batcher.srcColorBlend`/`srcAlphaBlend`/`dstBlend` at 3 points in render loop |
| BG leaking to other characters | `state.bgImage` was global, carried across `loadSpine` calls | Per-character BG Map + `saveCharBg()`/`restoreCharBg()` |
| Clipping mask broken in Single mode | ANIM-FILTER logic detached clipping attachments | Replaced with `setToSetupPose()` — Spine handles visibility natively |
| Mouse drag drift | Drag delta not compensated by viewport zoom | Divide delta by `viewZoom` |
| BG follows character drag | BG position included `state.offsetX/Y` | Removed offset from BG positioning |
| WebGL context crash on char switch | Multiple concurrent `loadSpine()` calls | Manual cleanup flow, only one `loadSpine()` per switch |
| Grid→Single default mode | Exited to Animation Single instead of ALL | `exitMultiSkeletonGrid` → `enterGridMode()` after load |

---

## 5. Architecture Decisions

| Decision | Why |
|----------|-----|
| Canvas recreation on character switch | Prevents WebGL context locking between skeletons |
| `setToSetupPose()` not slot filtering | Spine's AnimationState handles clipping/FX correctly |
| Batcher property reset (not `gl.disable`) | `SceneRenderer.begin()` overrides `gl.disable(gl.BLEND)` |
| Grid BG uses skeleton scale (not fit-to-cell) | Consistent BG/character ratio across modes |
| FX-FIX in both viewer.ts and viewer-grid.ts | Grid creates separate skeleton instances per cell |

---

## 6. State Machine

```
[Drop Files] → Character Grid (all skeletons)
    │
    ├── Click character → Character Single + Animation ALL (grid of animations)
    │       │
    │       ├── Click animation → Animation Single
    │       │       │
    │       │       ├── Change animation dropdown → Animation Single (different anim)
    │       │       └── Click "ALL" tab → Animation ALL
    │       │
    │       ├── Change character dropdown → Animation ALL (new character, preserves mode)
    │       └── Select "All" in char dropdown → Character Grid
    │
    └── Upload BG / Change Skin / Play-Pause → Applies globally
```

**Key rules:**
- Grid → Single: default is **Animation ALL**
- Character switch: preserves current animation mode (ALL/Single)
- BG persists per-character until user clears it
- Play/Pause and Skin affect both Single viewer and all Grid cells

---

## 7. Roadmap — Features to Build

### Phase 1: Persistent Library (Priority: HIGH) ✅
- [x] **IndexedDB storage**: save dropped skeleton files → reopen app without re-dropping
- [x] **Library dashboard**: grid of saved characters with thumbnails
- [x] **Search**: full-text search by name
- [x] **Sort**: by name, date imported, version, animation count, file size

### Phase 2: Categorization (Priority: HIGH) ✅
- [x] **Tag system**: auto-tags (Spine version, anim count, rig complexity, skin count, file size) + custom tags
- [x] **Collections**: group characters into named collections with CRUD management
- [x] **Status tracking**: Draft → Review → Approved → Shipped
- [x] **Notes**: per-character text notes

### Phase 3: Statistics (Priority: MEDIUM)
- [ ] **Per-character stats panel**: bone/slot/anim/skin/mesh/constraint/atlas/FX counts
- [ ] **Library overview charts**: version distribution, size breakdown, top heaviest
- [ ] **Comparison view**: select 2+ characters → side-by-side stats

### Phase 4: Export & Sharing (Priority: MEDIUM)
- [ ] **Screenshot export**: current frame → PNG (transparent BG option)
- [ ] **GIF/WebP export**: animation loop → animated file
- [ ] **Share URL**: encode viewer state (character + anim + skin + zoom) into URL
- [ ] **PDF report**: per-character summary export

### Phase 5: Validation (Priority: LOW)
- [ ] **Auto-check rules**: missing atlas regions, orphan bones, oversized atlas, version mismatch
- [ ] **Visual diff**: compare 2 versions of same character

### Phase 6: Team Collaboration (Priority: LOW, needs backend)
- [ ] **Cloud sync**: Firebase/Supabase storage
- [ ] **Review workflow**: upload → review → approve with comments
- [ ] **Version history**: track changes per character

---

## 8. Tech Stack

| Current | Planned |
|---------|---------|
| Vite + TypeScript | Same |
| spine-canvas (3.x) | Same |
| @esotericsoftware/spine-webgl (4.x) | Same |
| Vanilla CSS | Same |
| — | IndexedDB via `idb` |
| — | Fuse.js (search) |
| — | Chart.js (stats) |
| — | gif.js (GIF export) |
| — | Firebase (Phase 6 only) |

---

## 9. How to Run

```bash
cd spine-viewer
npm install
npm run dev     # → http://localhost:5173
```

Drop a folder containing `.json`/`.skel` + `.atlas` + `.png` files onto the page.
