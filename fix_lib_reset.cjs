const fs = require('fs');
const mainPath = 'd:/Dev/spine_speedrig/spine-viewer/src/main.ts';
let content = fs.readFileSync(mainPath, 'utf8');

// Find the setOnLibraryLoad callback by markers
const startMarker = `    setOnLibraryLoad(async (char: SpineCharacter) => {`;
const endSearchFrom = content.indexOf(startMarker);

if (endSearchFrom === -1) {
    console.log('ERROR: Could not find setOnLibraryLoad');
    process.exit(1);
}

// Find the closing });  — it's followed by \r\n    await renderLibrary();
const endMarker = `    await renderLibrary();`;
const endIdx = content.indexOf(endMarker, endSearchFrom);

if (endIdx === -1) {
    console.log('ERROR: Could not find await renderLibrary()');
    process.exit(1);
}

// The callback ends at the last }); before "await renderLibrary()"
// Find the "})" immediately before "    await renderLibrary();"
let closingIdx = content.lastIndexOf('});', endIdx);
if (closingIdx < endSearchFrom) {
    console.log('ERROR: Could not find closing });');
    process.exit(1);
}
// Include the }); and newlines
closingIdx = content.indexOf('\n', closingIdx) + 1;

console.log('Callback starts at:', endSearchFrom);
console.log('Callback ends at:', closingIdx);
console.log('Old callback length:', closingIdx - endSearchFrom);

const newCallback = `    setOnLibraryLoad(async (char: SpineCharacter) => {\r
        console.log('[LIBRARY] Loading from library:', char.name, 'id:', char.id);\r
        currentLibraryChar = char;\r
\r
        // ── FULL RESET: destroy any active grid/viewer state ──\r
        if (isGridActive()) destroyGridView();\r
        const gridContainer = document.getElementById('grid-container');\r
        if (gridContainer) gridContainer.style.display = 'none';\r
        const pixiContainer = document.getElementById('pixi-container');\r
        if (pixiContainer) pixiContainer.style.display = '';\r
        allSkeletonSets = [];\r
        const charSection = document.getElementById('char-section');\r
        if (charSection) charSection.style.display = 'none';\r
\r
        // Convert {name,blob}[] back to Map<string, Blob>\r
        const pngBlobMap = new Map<string, Blob>();\r
        for (const p of char.pngBlobs) pngBlobMap.set(p.name, p.blob);\r
        const spineFiles = {\r
            jsonText: char.jsonText,\r
            atlasText: char.atlasText,\r
            pngBlobs: pngBlobMap,\r
            jsonName: char.jsonName,\r
        };\r
\r
        // Hide drop zone, show viewer\r
        document.getElementById('drop-zone')!.classList.remove('active');\r
        document.getElementById('controls')!.classList.remove('hidden');\r
        initViewer();\r
\r
        try {\r
            console.log('[LIBRARY] loadSpine:', char.jsonName, 'pngs:', [...pngBlobMap.keys()]);\r
            await loadSpine(spineFiles, char.majorVersion, char.minorVersion);\r
\r
            const info = getSkeletonInfo();\r
            if (info) {\r
                document.getElementById('info-bones')!.textContent = String(info.bones);\r
                document.getElementById('info-slots')!.textContent = String(info.slots);\r
                document.getElementById('info-anims')!.textContent = String(info.anims);\r
                document.getElementById('info-skins')!.textContent = String(info.skins);\r
            }\r
            const anims = getAnimations();\r
            const animSelect = document.getElementById('anim-select') as HTMLSelectElement;\r
            animSelect.innerHTML = '';\r
            for (const a of anims) {\r
                const o = document.createElement('option');\r
                o.value = a; o.textContent = a;\r
                animSelect.appendChild(o);\r
            }\r
            const skins = getSkins();\r
            const skinSelect = document.getElementById('skin-select') as HTMLSelectElement;\r
            const skinSection = document.getElementById('skin-section')!;\r
            skinSelect.innerHTML = '';\r
            for (const s of skins) {\r
                const o = document.createElement('option');\r
                o.value = s; o.textContent = s;\r
                skinSelect.appendChild(o);\r
            }\r
            skinSection.style.display = skins.length > 1 ? '' : 'none';\r
            // Header\r
            const badge = document.getElementById('version-badge')!;\r
            badge.textContent = 'v' + char.spineVersion;\r
            badge.classList.remove('hidden');\r
            document.getElementById('file-name')!.textContent = char.jsonName;\r
            // Force Animation Single mode\r
            document.getElementById('btn-anim-grid')?.classList.remove('active');\r
            document.getElementById('btn-anim-single')?.classList.add('active');\r
            // Init meta-config\r
            initMetaConfig({\r
                name: char.name,\r
                spineVersion: char.spineVersion,\r
                jsonFile: char.jsonName,\r
                animations: anims,\r
                skins: skins,\r
                currentScale: info?.scale || 1.0,\r
            });\r
            console.log('[LIBRARY] ✓ Loaded:', char.name, 'anims:', anims.length);\r
        } catch (e) {\r
            console.error('[LIBRARY] Load error:', e);\r
        }\r
    });\r\n`;

content = content.substring(0, endSearchFrom) + newCallback + content.substring(closingIdx);
fs.writeFileSync(mainPath, content, 'utf8');
console.log('✓ Rewrote library-load callback with full reset');
