/**
 * Spine Universal Viewer - Dual Runtime
 * - Spine 3.x: Uses spine-canvas 3.8 (Canvas2D rendering - proven mesh support)
 * - Spine 4.x: Uses @esotericsoftware/spine-webgl npm package
 */

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Types ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
export interface SpineFiles {
    jsonText: string;
    atlasText: string;
    pngBlobs: Map<string, Blob>; // filename ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ blob
    jsonName: string;
}

interface ViewerState {
    canvas: HTMLCanvasElement;
    ctx2d: CanvasRenderingContext2D | null;
    gl: WebGLRenderingContext | null;
    playing: boolean;
    loop: boolean;
    speed: number;
    scale: number;
    viewZoom: number; // Viewport zoom ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â scales EVERYTHING (background + skeleton)
    bgColor: string;
    bgImage: HTMLImageElement | null;
    bgOffsetX: number;
    bgOffsetY: number;
    bgScale: number;
    lastTime: number;
    offsetX: number;
    offsetY: number;
    skeleton: any;
    animState: any;
    renderer: any;
    runtimeVersion: '3.x' | '4.x';
}

let state: ViewerState | null = null;
let checkerPattern: CanvasPattern | null = null;
let checkerGlTexture: any = null; // WebGL texture for checkerboard

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Visible Debug ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
function dbg(msg: string) {
    console.log(msg);
    let el = document.getElementById('dbg-overlay');
    if (!el) {
        el = document.createElement('pre');
        el.id = 'dbg-overlay';
        el.style.cssText = 'position:fixed;bottom:0;left:0;right:240px;background:rgba(0,0,0,0.9);color:#34d399;padding:8px;font:11px monospace;z-index:9999;max-height:200px;overflow-y:auto;margin:0;display:none';
        document.body.appendChild(el);
    }
    el.textContent += msg + '\n';
    el.scrollTop = el.scrollHeight;
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Load Spine 3.x Canvas Runtimes ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
// Both 3.7 and 3.8 use window.spine global ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â only one can be active
let loadedSpineMinor: number | null = null;

export async function loadSpineCanvasRuntime(minor: number): Promise<void> {
    // If correct version already loaded, skip
    if (loadedSpineMinor === minor && (window as any).spine?.canvas) {
        return;
    }
    // Clear previous spine global to avoid conflicts
    if ((window as any).spine) {
        try { delete (window as any).spine; } catch { (window as any).spine = undefined; }
    }
    // Remove old script tags
    document.querySelectorAll('script[data-spine-canvas]').forEach(s => s.remove());

    const file = minor <= 7 ? '/spine-canvas-3.7.js' : '/spine-canvas-3.8.js';
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = file;
        script.setAttribute('data-spine-canvas', String(minor));
        script.onload = () => {
            loadedSpineMinor = minor;
            dbg(`[RUNTIME] Spine 3.${minor} Canvas loaded`);
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${file}`));
        document.head.appendChild(script);
    });
}


// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Public API ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Canvas sync helper ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
// Ensures canvas pixel buffer matches CSS display size ÃƒÆ’Ã¢â‚¬â€ devicePixelRatio
// Called every frame AND on container resize to prevent stretching
function syncCanvasSize() {
    if (!state) return;
    const container = document.getElementById('pixi-container')!;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);

    if (state.canvas.width !== w || state.canvas.height !== h) {
        state.canvas.width = w;
        state.canvas.height = h;
        // Keep CSS size matching container (not pixel buffer)
        state.canvas.style.width = rect.width + 'px';
        state.canvas.style.height = rect.height + 'px';
    }
}

export function initViewer(): ViewerState {
    const container = document.getElementById('pixi-container')!;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    container.appendChild(canvas);

    // Use ResizeObserver for precise container resize detection
    const ro = new ResizeObserver(() => syncCanvasSize());
    ro.observe(container);
    // Fallback for older browsers
    window.addEventListener('resize', () => syncCanvasSize());

    state = {
        canvas,
        ctx2d: null,
        gl: null,
        skeleton: null, animState: null, renderer: null,
        playing: true, loop: true, speed: 1, scale: 1, viewZoom: 1,
        bgColor: '#1a1a2e',
        bgImage: null,
        bgOffsetX: 0, bgOffsetY: 0, bgScale: 1,
        lastTime: performance.now() / 1000,
        offsetX: 0, offsetY: 0,
        runtimeVersion: '3.x',
    };

    requestAnimationFrame(renderLoop);
    return state;
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Render Loop ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
let renderErrorLogged = false;
let blendDebugDone = false;
let bgGlTexture: any = null;
let bgImageSrc: string = '';
let crosshairGlTexture: any = null;
function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (!state || !state.skeleton || !state.animState || !state.renderer) return;

    // Sync canvas pixel buffer size every frame to prevent stretching
    syncCanvasSize();

    const now = performance.now() / 1000;
    const delta = now - state.lastTime;
    state.lastTime = now;

    if (state.runtimeVersion === '3.x') {
        renderCanvas2D(delta);
    } else {
        renderWebGL(delta);
    }
}

// Canvas2D triangle texture mapping (same algorithm as spine-canvas SkeletonRenderer.drawTriangle)
function drawCanvasTriangle(ctx: CanvasRenderingContext2D, img: HTMLImageElement,
    x0: number, y0: number, u0: number, v0: number,
    x1: number, y1: number, u1: number, v1: number,
    x2: number, y2: number, u2: number, v2: number) {
    u0 *= img.width; v0 *= img.height;
    u1 *= img.width; v1 *= img.height;
    u2 *= img.width; v2 *= img.height;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    const dx1 = x1 - x0, dy1 = y1 - y0, dx2 = x2 - x0, dy2 = y2 - y0;
    const du1 = u1 - u0, dv1 = v1 - v0, du2 = u2 - u0, dv2 = v2 - v0;
    const det = 1 / (du1 * dv2 - du2 * dv1);
    if (!isFinite(det)) return;
    const a = (dv2 * dx1 - dv1 * dx2) * det;
    const b = (dv2 * dy1 - dv1 * dy2) * det;
    const c = (du1 * dx2 - du2 * dx1) * det;
    const d = (du1 * dy2 - du2 * dy1) * det;
    const e = x0 - a * u0 - c * v0;
    const f = y0 - b * u0 - d * v0;
    ctx.save();
    ctx.transform(a, b, c, d, e, f);
    ctx.clip();
    ctx.drawImage(img, 0, 0);
    ctx.restore();
}

function renderCanvas2D(delta: number) {
    if (!state || !state.ctx2d) return;
    const { canvas, ctx2d, skeleton, animState } = state;
    const w = canvas.width;
    const h = canvas.height;

    // Clear with checkerboard pattern (transparent indicator like Spine Editor)
    ctx2d.save();
    if (!checkerPattern) {
        const sz = 16; // size of each checker square
        const pc = document.createElement('canvas');
        pc.width = sz * 2; pc.height = sz * 2;
        const pctx = pc.getContext('2d')!;
        pctx.fillStyle = '#3a3a3a';
        pctx.fillRect(0, 0, sz * 2, sz * 2);
        pctx.fillStyle = '#2a2a2a';
        pctx.fillRect(0, 0, sz, sz);
        pctx.fillRect(sz, sz, sz, sz);
        checkerPattern = ctx2d.createPattern(pc, 'repeat');
    }
    if (checkerPattern) {
        ctx2d.fillStyle = checkerPattern;
    } else {
        ctx2d.fillStyle = '#2e2e2e';
    }
    ctx2d.fillRect(0, 0, w, h);

    // Viewport zoom ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â scales EVERYTHING from canvas center
    const vz = state.viewZoom;
    ctx2d.translate(w / 2, h / 2);
    ctx2d.scale(vz, vz);
    ctx2d.translate(-w / 2, -h / 2);

    // Draw background image centered on skeleton (before spine transform)
    if (state.bgImage) {
        const bgNatW = state.bgImage.naturalWidth;
        const bgNatH = state.bgImage.naturalHeight;
        // Scale BG proportional to skeleton scale (preserves BG/char ratio across modes)
        const bgDisplayScale = state.scale * state.bgScale;
        const imgW = bgNatW * bgDisplayScale;
        const imgH = bgNatH * bgDisplayScale;
        const bgCenterX = w / 2;
        const bgCenterY = h * 0.85;
        const bx = bgCenterX - imgW / 2 + state.bgOffsetX;
        const by = bgCenterY - imgH / 2 + state.bgOffsetY;
        ctx2d.drawImage(state.bgImage, bx, by, imgW, imgH);
    }

    // Draw crosshair origin lines (above BG, below skeleton content)
    const originX = w / 2 + state.offsetX;
    const originY = h * 0.85 + state.offsetY;
    const ext = Math.max(w, h) / vz + 2000; // extend well beyond visible area
    ctx2d.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx2d.lineWidth = 3;
    ctx2d.beginPath();
    ctx2d.moveTo(originX - ext, originY);
    ctx2d.lineTo(originX + ext, originY);
    ctx2d.stroke();
    ctx2d.beginPath();
    ctx2d.moveTo(originX, originY - ext);
    ctx2d.lineTo(originX, originY + ext);
    ctx2d.stroke();

    // Position: center-bottom, flip Y (Spine Y-up ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Canvas Y-down)
    ctx2d.translate(w / 2 + state.offsetX, h * 0.85 + state.offsetY);
    ctx2d.scale(state.scale, -state.scale);

    // Update animation
    if (state.playing) {
        animState.update(delta * state.speed);
    }
    animState.apply(skeleton);
    skeleton.updateWorldTransform();

    // Draw
    try {
        if (!blendDebugDone) {
            const drawableSlots = skeleton.drawOrder.filter((s: any) => s.getAttachment() !== null).length;
            dbg(`[DRAW-PRE] ctx:${!!ctx2d} renderer:${!!state.renderer} drawable:${drawableSlots} scale:${state.scale.toFixed(2)} pos:(${(w / 2 + state.offsetX).toFixed(0)},${(h * 0.85 + state.offsetY).toFixed(0)})`);
            dbg(`[DRAW-PRE] canvas:${canvas.width}x${canvas.height} transform:scale(${state.scale},-${state.scale})`);
        }
        state.renderer.draw(skeleton);
        if (!blendDebugDone) {
            blendDebugDone = true;
            dbg(`[DRAW-POST] draw() completed OK`);
        }
    } catch (e: any) {
        if (!renderErrorLogged) {
            renderErrorLogged = true;
            dbg(`[RENDER-ERR] ${e.message}\n${e.stack}`);
        }
    }

    ctx2d.restore();
}

function renderWebGL(delta: number) {
    if (!state || !state.gl) return;
    const { gl, canvas, skeleton, animState } = state;

    gl.viewport(0, 0, canvas.width, canvas.height);
    // Clear with transparent (checkerboard will be drawn below)
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const w = canvas.width;
    const h = canvas.height;
    const vz = state.viewZoom;

    skeleton.x = w / 2 + state.offsetX;
    skeleton.y = h * 0.2 - state.offsetY; // Negate: WebGL Y-up, mouse Y-down
    skeleton.scaleX = state.scale;
    skeleton.scaleY = state.scale;

    if (state.playing) {
        animState.update(delta * state.speed);
    }
    animState.apply(skeleton);

    const spine4 = _spine4;
    try {
        skeleton.updateWorldTransform(spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0 as any);
    } catch {
        try { skeleton.updateWorldTransform(0 as any); } catch { }
    }

    // Camera viewport zoom ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dividing by vz zooms everything (skeleton + bg)
    state.renderer.camera.position.x = w / 2;
    state.renderer.camera.position.y = h / 2;
    state.renderer.camera.viewportWidth = w / vz;
    state.renderer.camera.viewportHeight = h / vz;
    state.renderer.camera.update();

    // Force-reset batcher blend to Normal before BG draw
    const batcher = (state.renderer as any).batcher;
    if (batcher) {
        batcher.srcColorBlend = gl.SRC_ALPHA;
        batcher.srcAlphaBlend = gl.ONE;
        batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }

    state.renderer.begin();

    // Draw checkerboard background (transparent indicator like Spine Editor)
    // Create/recreate tiled checkerboard at viewport resolution
    const checkerSz = 16; // square size in pixels
    if (!checkerGlTexture || (checkerGlTexture as any)._w !== w || (checkerGlTexture as any)._h !== h) {
        if (checkerGlTexture) checkerGlTexture.dispose?.();
        checkerGlTexture = null;
        if (_spine4) {
            const pc = document.createElement('canvas');
            pc.width = w; pc.height = h;
            const pctx = pc.getContext('2d')!;
            pctx.fillStyle = '#3a3a3a';
            pctx.fillRect(0, 0, w, h);
            pctx.fillStyle = '#2a2a2a';
            for (let y = 0; y < h; y += checkerSz) {
                for (let x = 0; x < w; x += checkerSz) {
                    if (((x / checkerSz) + (y / checkerSz)) % 2 === 0) {
                        pctx.fillRect(x, y, checkerSz, checkerSz);
                    }
                }
            }
            checkerGlTexture = new _spine4.GLTexture(gl, pc as any);
            (checkerGlTexture as any)._w = w;
            (checkerGlTexture as any)._h = h;
        }
    }
    if (checkerGlTexture) {
        // Draw at full viewport (world coords matching camera)
        const camW = w / vz;
        const camH = h / vz;
        state.renderer.drawTexture(checkerGlTexture, w / 2 - camW / 2, h / 2 - camH / 2, camW, camH);
    }

    // Draw crosshair origin lines as thin quads (below BG, on top of checker)
    if (!crosshairGlTexture && _spine4) {
        const pc = document.createElement('canvas');
        pc.width = 1; pc.height = 1;
        const pctx = pc.getContext('2d')!;
        pctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        pctx.fillRect(0, 0, 1, 1);
        crosshairGlTexture = new _spine4.GLTexture(gl, pc as any);
    }
    // Draw background image in its own batch to avoid blend mode contamination
    if (state.bgImage && _spine4) {
        if (!bgGlTexture || bgImageSrc !== state.bgImage.src) {
            bgGlTexture?.dispose();
            bgGlTexture = new _spine4.GLTexture(gl, state.bgImage);
            bgImageSrc = state.bgImage.src;
        }
        if (bgGlTexture) {
            // Scale BG proportional to skeleton scale (preserves BG/char ratio across modes)
            const bgNatW = state.bgImage!.naturalWidth;
            const bgNatH = state.bgImage!.naturalHeight;
            const bgDisplayScale = state.scale * state.bgScale;
            const imgW = bgNatW * bgDisplayScale;
            const imgH = bgNatH * bgDisplayScale;
            const bgCenterX = w / 2;
            const bgCenterY = h * 0.2;
            const bx = bgCenterX - imgW / 2 + state.bgOffsetX;
            const by = bgCenterY - imgH / 2 - state.bgOffsetY;
            state.renderer.drawTexture(bgGlTexture, bx, by, imgW, imgH);
        }
    }

    // Draw crosshair origin lines (above BG, below skeleton content)
    if (crosshairGlTexture) {
        const lineW = 3;
        const ox = w / 2 + state.offsetX;
        const oy = h * 0.2 - state.offsetY;
        const camW = w / vz;
        const camH = h / vz;
        const vpLeft = w / 2 - camW / 2;
        const vpTop = h / 2 - camH / 2;
        // Horizontal line spanning full viewport
        state.renderer.drawTexture(crosshairGlTexture, vpLeft, oy - lineW / 2, camW, lineW);
        // Vertical line spanning full viewport
        state.renderer.drawTexture(crosshairGlTexture, ox - lineW / 2, vpTop, lineW, camH);
    }
    state.renderer.end();

    // Reset batcher to Normal blend before skeleton draw
    if (batcher) {
        batcher.srcColorBlend = gl.SRC_ALPHA;
        batcher.srcAlphaBlend = gl.ONE;
        batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }

    state.renderer.begin();
    try {
        state.renderer.drawSkeleton(skeleton, false);
    } catch (e: any) {
        if (!renderErrorLogged) {
            renderErrorLogged = true;
            dbg(`[RENDER-ERR] drawSkeleton: ${e.message}`);
        }
    }
    state.renderer.end();

    // Force-reset batcher after skeleton draw for next frame
    if (batcher) {
        batcher.srcColorBlend = gl.SRC_ALPHA;
        batcher.srcAlphaBlend = gl.ONE;
        batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }

    // One-time debug: focus on frost/rec slots alpha
    if (!blendDebugDone) {
        blendDebugDone = true;
        const drawOrder = skeleton.drawOrder;
        for (let i = 0; i < drawOrder.length; i++) {
            const slot = drawOrder[i];
            const att = slot.getAttachment();
            const attName = att?.name || '(none)';
            const slotName = slot.data.name;
            // Log frost/rec/spike slots with alpha detail
            if (attName.includes('frost') || attName.includes('spike') || attName === 'rec' ||
                slotName.includes('frost') || slotName.includes('rec')) {
                const a = slot.color?.a?.toFixed(3) || '?';
                dbg(`[SLOT] "${slotName}" att:"${attName}" blend:${slot.data.blendMode} slotAlpha:${a}`);
            }
        }
    }
}

let _spine4: any = null;

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Load Spine Files ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
export async function loadSpine(files: SpineFiles, detectedMajor: number, detectedMinor: number = 8): Promise<void> {
    if (!state) return;

    // Clear debug overlay
    const dbgEl = document.getElementById('dbg-overlay');
    if (dbgEl) dbgEl.textContent = '';
    renderErrorLogged = false;
    blendDebugDone = false;

    // Recreate canvas to reset GL/2D context lock
    // (A canvas with WebGL context cannot get 2D context and vice versa)
    const container = document.getElementById('pixi-container')!;
    // Explicitly release old WebGL context to free up context slot
    if (state.gl) {
        const loseCtx = state.gl.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
    }
    if (state.canvas.parentNode) {
        state.canvas.parentNode.removeChild(state.canvas);
    }
    const newCanvas = document.createElement('canvas');
    // Ensure container is visible before measuring
    container.style.display = '';
    // Force reflow so getBoundingClientRect returns correct size
    void container.offsetHeight;
    container.appendChild(newCanvas);
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const rw = rect.width || container.clientWidth || 800;
    const rh = rect.height || container.clientHeight || 600;
    newCanvas.width = Math.round(rw * dpr);
    newCanvas.height = Math.round(rh * dpr);
    newCanvas.style.width = rw + 'px';
    newCanvas.style.height = rh + 'px';
    state.canvas = newCanvas;
    state.ctx2d = null;
    state.gl = null;
    state.skeleton = null;
    state.animState = null;
    state.renderer = null;
    bgGlTexture = null;
    bgImageSrc = '';
    checkerGlTexture = null;

    if (detectedMajor < 4) {
        await loadSpine3x(files, detectedMinor);
    } else {
        await loadSpine4x(files, detectedMajor);
    }

    // Play first animation
    const anims = getAnimations();
    if (anims.length > 0) playAnimation(anims[0]);
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Spine 3.x: Canvas2D ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
async function loadSpine3x(files: SpineFiles, minor: number = 8) {
    if (!state) return;

    await loadSpineCanvasRuntime(minor);
    const spine = (window as any).spine;
    if (!spine) throw new Error(`Spine 3.${minor} runtime not available`);

    state.runtimeVersion = '3.x';
    dbg(`[MODE] Using Spine 3.${minor} Canvas2D renderer`);

    // Get Canvas2D context
    state.ctx2d = state.canvas.getContext('2d')!;
    if (!state.ctx2d) throw new Error('Canvas 2D not supported');

    // Create Canvas2D renderer
    state.renderer = new spine.canvas.SkeletonRenderer(state.ctx2d);
    state.renderer.debugRendering = false;
    state.renderer.triangleRendering = true; // Enable mesh attachment support

    // Load PNG as Image elements
    const images = new Map<string, HTMLImageElement>();
    for (const [filename, blob] of files.pngBlobs) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load PNG: ' + filename));
            img.src = url;
        });
        images.set(filename, img);
        URL.revokeObjectURL(url);
        dbg(`[PNG] ${filename} ${img.width}x${img.height}`);
    }

    // Parse atlas ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â spine-canvas TextureAtlas uses callback that returns a "fake texture"
    // wrapping the Image element
    const atlas = new spine.TextureAtlas(files.atlasText, (path: string) => {
        dbg(`[TEX] "${path}"`);
        let img = images.get(path);
        if (!img) img = images.get(path + '.png');
        if (!img) img = images.get(path.replace(/\.png$/i, ''));
        if (!img) {
            // Case-insensitive
            for (const [k, v] of images) {
                if (k.toLowerCase().includes(path.toLowerCase().replace(/\.png$/i, ''))) {
                    img = v; break;
                }
            }
        }
        if (!img) img = images.values().next().value;

        if (!img) {
            dbg(`[TEX] NO image for: "${path}"`);
            return null;
        }

        // spine-canvas expects texture object with getImage(), setFilters(), setWraps()
        return {
            getImage: () => img,
            setFilters: () => { },
            setWraps: () => { },
        };
    });
    dbg(`[ATLAS] pages:${atlas.pages.length} regions:${atlas.regions.length}`);

    // Parse skeleton JSON
    const atlasLoader = new spine.AtlasAttachmentLoader(atlas);
    const jsonParser = new spine.SkeletonJson(atlasLoader);
    const jsonData = JSON.parse(files.jsonText);

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Raw JSON Analysis: scan ALL attachment types ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    const rawTypes: Record<string, number> = {};
    const skinsSection = jsonData.skins;
    let firstMeshDump = '';
    if (skinsSection) {
        const skinEntries = Array.isArray(skinsSection) ? skinsSection : Object.entries(skinsSection).map(([n, v]) => ({ name: n, attachments: v }));
        for (const skin of skinEntries) {
            const slots = (skin as any).attachments || skin;
            if (typeof slots !== 'object') continue;
            for (const [_slotName, slotAttachments] of Object.entries(slots as Record<string, any>)) {
                if (!slotAttachments || typeof slotAttachments !== 'object') continue;
                for (const [attName, attData] of Object.entries(slotAttachments as Record<string, any>)) {
                    if (!attData || typeof attData !== 'object') continue;
                    const type = (attData as any).type || 'region';
                    rawTypes[type] = (rawTypes[type] || 0) + 1;
                    // Dump first mesh-like attachment
                    if (!firstMeshDump && (type === 'mesh' || type === 'skinnedmesh' || type === 'weightedmesh' || type === 'linkedmesh')) {
                        const d = attData as any;
                        firstMeshDump = `[MESH-RAW] "${attName}" type:${type} uvs:${d.uvs?.length} tri:${d.triangles?.length} verts:${d.vertices?.length} hull:${d.hull} parent:${d.parent}`;
                    }
                    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Convert legacy mesh types to 3.8 format (only for 3.8 runtime) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
                    if (minor >= 8) {
                        if (type === 'skinnedmesh' || type === 'weightedmesh') {
                            (attData as any).type = 'mesh';
                        } else if (type === 'weightedlinkedmesh') {
                            (attData as any).type = 'linkedmesh';
                        }
                    }
                }
            }
        }
    }
    dbg(`[RAW-TYPES] ${JSON.stringify(rawTypes)}`);
    if (firstMeshDump) dbg(firstMeshDump);

    // Convert 3.7 skins (object) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 3.8 (array) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â only needed for 3.8 runtime
    if (minor >= 8 && jsonData.skins && !Array.isArray(jsonData.skins)) {
        dbg('[FIX] Converting skins 3.7 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 3.8');
        const skinsObj = jsonData.skins;
        const skinsArr: any[] = [];
        for (const [skinName, skinSlots] of Object.entries(skinsObj)) {
            skinsArr.push({ name: skinName, attachments: skinSlots });
        }
        jsonData.skins = skinsArr;
    }

    const skeletonData = jsonParser.readSkeletonData(jsonData);
    dbg(`[SKEL] bones:${skeletonData.bones.length} slots:${skeletonData.slots.length} skins:${skeletonData.skins.length} anims:${skeletonData.animations.length}`);

    const skeleton = new spine.Skeleton(skeletonData);
    skeleton.setToSetupPose();
    const firstSkin = (skeletonData.skins?.length > 1 ? skeletonData.skins.find((s: any) => s.name?.toLowerCase() !== 'default') : null) || skeletonData.skins?.[0] || skeletonData.defaultSkin;
    if (firstSkin) {
        skeleton.setSkin(firstSkin);
        skeleton.setSlotsToSetupPose();
    }
    skeleton.updateWorldTransform();

    // Post-parse mesh debug: check ACTUAL mesh objects in draw order
    let meshOk = 0, meshBad = 0, regionCount = 0;
    for (let i = 0; i < skeleton.drawOrder.length; i++) {
        const slot = skeleton.drawOrder[i];
        const a = slot.getAttachment();
        if (!a) continue;
        if (a instanceof spine.MeshAttachment) {
            const m = a as any;
            const hasRegion = !!m.region;
            const hasRenderObj = hasRegion && !!m.region.renderObject;
            const hasTex = hasRenderObj && !!m.region.renderObject.texture;
            const hasGetImage = hasTex && typeof m.region.renderObject.texture.getImage === 'function';
            if (hasGetImage && m.uvs && m.triangles) {
                meshOk++;
            } else {
                meshBad++;
                dbg(`[MESH-FAIL] slot:"${slot.data.name}" region:${hasRegion} renderObj:${hasRenderObj} tex:${hasTex} getImage:${hasGetImage} uvs:${!!m.uvs} tri:${!!m.triangles}`);
            }
        } else if (a instanceof spine.RegionAttachment) {
            regionCount++;
        }
    }
    dbg(`[POST] region:${regionCount} mesh-ok:${meshOk} mesh-bad:${meshBad}`);

    // Monkey-patch drawTriangle to fix:
    // 1. Degenerate triangles (NaN from zero-area UV)
    // 2. Dark seam lines (Canvas2D anti-aliases clip edges ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ blends with black)
    // Fix: expand clip path outward by ~1px so triangles overlap, hiding seams
    const rendererCtx = state.ctx2d!;
    state.renderer.drawTriangle = function (img: any, x0: number, y0: number, u0: number, v0: number,
        x1: number, y1: number, u1: number, v1: number,
        x2: number, y2: number, u2: number, v2: number) {
        // Scale UVs to pixel coords
        u0 *= img.width; v0 *= img.height;
        u1 *= img.width; v1 *= img.height;
        u2 *= img.width; v2 *= img.height;

        // Check degenerate
        const du1 = u1 - u0, dv1 = v1 - v0;
        const du2 = u2 - u0, dv2 = v2 - v0;
        const uvDet = du1 * dv2 - du2 * dv1;
        if (Math.abs(uvDet) < 1e-6) return;

        // Compute centroid and expand vertices to exactly cover ~0.5 physical screen pixels
        // Divide by the global scale and viewZoom so the expansion is consistent regardless of zoom level
        const cx = (x0 + x1 + x2) / 3;
        const cy = (y0 + y1 + y2) / 3;
        const globalScale = Math.abs((state?.scale ?? 1) * (state?.viewZoom ?? 1));
        const expand = 0.6 / globalScale;
        const ex0 = x0 + (x0 - cx) * expand / Math.max(1, Math.hypot(x0 - cx, y0 - cy));
        const ey0 = y0 + (y0 - cy) * expand / Math.max(1, Math.hypot(x0 - cx, y0 - cy));
        const ex1 = x1 + (x1 - cx) * expand / Math.max(1, Math.hypot(x1 - cx, y1 - cy));
        const ey1 = y1 + (y1 - cy) * expand / Math.max(1, Math.hypot(x1 - cx, y1 - cy));
        const ex2 = x2 + (x2 - cx) * expand / Math.max(1, Math.hypot(x2 - cx, y2 - cy));
        const ey2 = y2 + (y2 - cy) * expand / Math.max(1, Math.hypot(x2 - cx, y2 - cy));

        rendererCtx.beginPath();
        rendererCtx.moveTo(ex0, ey0);
        rendererCtx.lineTo(ex1, ey1);
        rendererCtx.lineTo(ex2, ey2);
        rendererCtx.closePath();

        // Affine transform: map UV triangle ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ screen triangle
        const _x1 = x1 - x0, _y1 = y1 - y0;
        const _x2 = x2 - x0, _y2 = y2 - y0;
        const _u1 = u1 - u0, _v1 = v1 - v0;
        const _u2 = u2 - u0, _v2 = v2 - v0;
        const det = 1 / (_u1 * _v2 - _u2 * _v1);
        const a = (_v2 * _x1 - _v1 * _x2) * det;
        const b = (_v2 * _y1 - _v1 * _y2) * det;
        const c = (_u1 * _x2 - _u2 * _x1) * det;
        const d = (_u1 * _y2 - _u2 * _y1) * det;
        const e = x0 - a * u0 - c * v0;
        const f = y0 - b * u0 - d * v0;

        if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(d)) return;

        rendererCtx.save();
        // Clip FIRST, then transform
        rendererCtx.clip();
        rendererCtx.transform(a, b, c, d, e, f);
        
        // Multi-draw hack: Canvas2D anti-aliases the clip edges, leaving a semi-transparent gap between adjacent triangles.
        // Drawing it 3 times increases the edge alpha from ~0.5 to ~0.875, hiding the visible seam drastically 
        // without stretching UVs into transparent atlas space (which caused explicit wireframe artifacts).
        rendererCtx.drawImage(img, 0, 0);
        rendererCtx.drawImage(img, 0, 0);
        rendererCtx.drawImage(img, 0, 0);
        rendererCtx.restore();
    };

    // Auto-fit scale
    try {
        const offset = new spine.Vector2();
        const size = new spine.Vector2();
        skeleton.getBounds(offset, size, []);
        const canvasH = state.canvas.height;
        const fitScale = (canvasH * 0.6) / (size.y || 400);
        state.scale = Math.min(fitScale, 2);
        dbg(`[FIT] ${Math.round(size.x)}x${Math.round(size.y)} scale:${state.scale.toFixed(2)}`);
    } catch {
        state.scale = 0.5;
    }

    // Debug attachment types
    const attached = skeleton.drawOrder.filter((s: any) => s.getAttachment() !== null).length;
    dbg(`[DRAW] attached:${attached}/${skeleton.drawOrder.length}`);

    // Animation state
    const stateData = new spine.AnimationStateData(skeletonData);
    stateData.defaultMix = 0.2;
    const animState = new spine.AnimationState(stateData);

    state.skeleton = skeleton;
    state.animState = animState;
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Spine 4.x: WebGL ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
async function loadSpine4x(files: SpineFiles, detectedMajor: number = 4) {
    if (!state) return;

    const spine4 = await import('@esotericsoftware/spine-webgl');
    _spine4 = spine4;
    state.runtimeVersion = '4.x';
    dbg('[MODE] Using Spine 4.x WebGL runtime');

    // Get WebGL context
    if (!state.gl) {
        const glConfig: WebGLContextAttributes = { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true };
        state.gl = (state.canvas.getContext('webgl2', glConfig) || state.canvas.getContext('webgl', glConfig)) as WebGLRenderingContext;
    }
    const gl = state.gl;
    if (!gl) throw new Error('WebGL not supported');

    if (!state.renderer) {
        state.renderer = new spine4.SceneRenderer(state.canvas, gl);
    }

    // Load textures
    const textures = new Map<string, any>();
    for (const [filename, blob] of files.pngBlobs) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load PNG: ' + filename));
            img.src = url;
        });
        textures.set(filename, new spine4.GLTexture(gl, img));
        URL.revokeObjectURL(url);
        dbg(`[PNG] ${filename} ${img.width}x${img.height}`);
    }

    const atlas = new spine4.TextureAtlas(files.atlasText);
    for (const page of atlas.pages) {
        const pageName = page.name;
        let tex = textures.get(pageName);
        let matchType = 'exact';

        if (!tex) { tex = textures.get(pageName + '.png'); matchType = '+.png'; }
        if (!tex) { tex = textures.get(pageName.replace(/\.png$/i, '')); matchType = '-ext'; }

        // Case-insensitive + basename matching
        if (!tex) {
            const pageBase = pageName.replace(/\.png$/i, '').toLowerCase();
            for (const [fname, ftex] of textures) {
                const fBase = fname.replace(/\.png$/i, '').toLowerCase();
                if (fBase === pageBase || fBase.endsWith(pageBase) || pageBase.endsWith(fBase)) {
                    tex = ftex;
                    matchType = `fuzzy:${fname}`;
                    break;
                }
            }
        }

        if (!tex) {
            // Only fallback to first texture if there's only 1 page
            if (atlas.pages.length === 1) {
                tex = textures.values().next().value;
                matchType = 'single-fallback';
            } else {
                dbg(`[PAGE-WARN] ÃƒÂ¢Ã…Â¡Ã‚Â  No texture for page "${pageName}" ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â will render incorrectly!`);
                matchType = 'MISSING';
            }
        }

        if (tex) page.setTexture(tex);
        dbg(`[PAGE] "${pageName}" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ${matchType}`);
    }
    dbg(`[ATLAS] pages:${atlas.pages.length} regions:${atlas.regions.length}`);

    // Standalone PNGs: override atlas regions with separate PNG files
    // (e.g., frost_spike_big.png has proper alpha, atlas-packed version may not)
    const atlasPageNames = new Set<string>();
    for (const page of atlas.pages) {
        atlasPageNames.add((page.name || '').replace(/\.png$/i, '').toLowerCase());
    }
    for (const [filename] of files.pngBlobs) {
        const base = filename.replace(/\.png$/i, '').toLowerCase();
        if (!atlasPageNames.has(base)) {
            const tex = textures.get(filename);
            if (tex) {
                const img = tex.getImage();
                // Create atlas page for this standalone PNG
                const page = new spine4.TextureAtlasPage(filename) as any;
                page.width = img.width;
                page.height = img.height;
                page.setTexture(tex);
                atlas.pages.push(page);

                // REMOVE any existing region with the same name (from spritesheet)
                const existingIdx = atlas.regions.findIndex((r: any) =>
                    r.name === base || r.name === filename.replace(/\.png$/i, '')
                );
                if (existingIdx >= 0) {
                    atlas.regions.splice(existingIdx, 1);
                    dbg(`[STANDALONE] Replaced existing atlas region "${base}" with standalone PNG`);
                } else {
                    dbg(`[STANDALONE] Added new region "${base}"`);
                }

                // Create region covering full image ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â INSERT at beginning for priority
                const region = new spine4.TextureAtlasRegion(page, base) as any;
                region.x = 0;
                region.y = 0;
                region.width = img.width;
                region.height = img.height;
                region.originalWidth = img.width;
                region.originalHeight = img.height;
                region.offsetX = 0;
                region.offsetY = 0;
                region.u = 0;
                region.v = 0;
                region.u2 = 1;
                region.v2 = 1;
                region.degrees = 0;
                region.texture = tex;
                // Insert at beginning so findRegion finds this FIRST
                atlas.regions.unshift(region);

                dbg(`[STANDALONE] "${base}" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ${img.width}x${img.height}`);
            }
        }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Frost debug: check atlas region + pixel alpha ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    const hasFrostInAtlas = files.atlasText.includes('frost_spike_big');
    dbg(`[FROST] In atlas text: ${hasFrostInAtlas}`);
    const frostRegion = atlas.findRegion('frost_spike_big');
    if (frostRegion) {
        const fr = frostRegion as any;
        dbg(`[FROST] Region found! page:"${fr.page?.name}" x:${fr.x} y:${fr.y} w:${fr.width} h:${fr.height} u:${fr.u?.toFixed(3)} v:${fr.v?.toFixed(3)} u2:${fr.u2?.toFixed(3)} v2:${fr.v2?.toFixed(3)}`);
        // Check pixel alpha at the CORNER of the frost region (should be 0 if transparent)
        try {
            const texImg = fr.texture?.getImage() || fr.page?.texture?.getImage();
            if (texImg) {
                const c = document.createElement('canvas');
                c.width = texImg.width; c.height = texImg.height;
                const ctx2 = c.getContext('2d')!;
                ctx2.drawImage(texImg, 0, 0);
                // Sample corner pixel of frost region
                const px = ctx2.getImageData(fr.x || 0, fr.y || 0, 1, 1).data;
                const px2 = ctx2.getImageData((fr.x || 0) + (fr.width || 0) - 1, (fr.y || 0) + (fr.height || 0) - 1, 1, 1).data;
                dbg(`[FROST-ALPHA] TopLeft: rgba(${px[0]},${px[1]},${px[2]},${px[3]}) BottomRight: rgba(${px2[0]},${px2[1]},${px2[2]},${px2[3]})`);
            }
        } catch (e: any) {
            dbg(`[FROST-ALPHA] Error: ${e.message}`);
        }
    } else {
        dbg(`[FROST] Region NOT found in atlas!`);
    }

    // Check "rec" region too ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â if it's an opaque white rectangle, it causes bright artifacts
    const recRegion = atlas.findRegion('rec');
    if (recRegion) {
        const rr = recRegion as any;
        try {
            const texImg = rr.texture?.getImage() || rr.page?.texture?.getImage();
            if (texImg) {
                const c = document.createElement('canvas');
                c.width = texImg.width; c.height = texImg.height;
                const ctx2 = c.getContext('2d')!;
                ctx2.drawImage(texImg, 0, 0);
                const px = ctx2.getImageData(rr.x || 0, rr.y || 0, 1, 1).data;
                dbg(`[REC] x:${rr.x} y:${rr.y} w:${rr.width} h:${rr.height} pixel:rgba(${px[0]},${px[1]},${px[2]},${px[3]})`);
            }
        } catch { }
    }

    const atlasLoader = new spine4.AtlasAttachmentLoader(atlas);
    const jsonParser = new spine4.SkeletonJson(atlasLoader);
    const jsonData = JSON.parse(files.jsonText);

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 3.x ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 4.x JSON format conversion ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    if (detectedMajor < 4) {
        dbg(`[COMPAT] Converting Spine ${detectedMajor}.x JSON ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 4.x format`);

        // Convert skins: object { "default": {...} } ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ array [{ name: "default", attachments: {...} }]
        if (jsonData.skins && !Array.isArray(jsonData.skins)) {
            const skinsArr: any[] = [];
            for (const [skinName, skinSlots] of Object.entries(jsonData.skins)) {
                skinsArr.push({ name: skinName, attachments: skinSlots });
            }
            jsonData.skins = skinsArr;
            dbg('[COMPAT] Converted skins object ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ array');
        }

        // Convert legacy mesh types in all skins
        if (jsonData.skins && Array.isArray(jsonData.skins)) {
            for (const skin of jsonData.skins) {
                const attachments = skin.attachments || {};
                for (const slotAttachments of Object.values(attachments)) {
                    if (!slotAttachments || typeof slotAttachments !== 'object') continue;
                    for (const attData of Object.values(slotAttachments as Record<string, any>)) {
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
            dbg('[COMPAT] Converted legacy mesh types');
        }
    }

    const skeletonData = jsonParser.readSkeletonData(jsonData);
    dbg(`[SKEL] bones:${skeletonData.bones.length} slots:${skeletonData.slots.length} skins:${skeletonData.skins.length} anims:${skeletonData.animations.length}`);
    if (skeletonData.skins.length > 0) {
        const skinNames = skeletonData.skins.map((s: any) => s.name).join(', ');
        dbg(`[SKINS] ${skinNames}`);
    }

    const skeleton = new spine4.Skeleton(skeletonData);
    skeleton.setToSetupPose();
    const firstSkin4x = (skeletonData.skins?.length > 1 ? skeletonData.skins.find((s: any) => s.name?.toLowerCase() !== 'default') : null) || skeletonData.skins?.[0] || skeletonData.defaultSkin;
    if (firstSkin4x) {
        skeleton.setSkin(firstSkin4x);
        skeleton.setSlotsToSetupPose();
    }

    // Fix: Hide pure-FX "rec" rectangle slots that are Additive/Screen blend
    // These are white rectangle placeholders for skill effects ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â should be invisible in idle
    // They only become visible when animation explicitly sets their alpha > 0
    let hiddenFxCount = 0;
    for (let i = 0; i < skeleton.slots.length; i++) {
        const slot = skeleton.slots[i];
        const blendMode = slot.data.blendMode;
        const att = slot.getAttachment();
        // Hide if: non-Normal blend + attachment is generic "rec" (white rectangle FX)
        if (blendMode !== 0 && att && att.name === 'rec') {
            slot.color.a = 0;
            hiddenFxCount++;
        }
        // Fix: Transparent glow PNGs (like frost_spike_big) must use Additive blend,
        // NOT Normal blend. Normal blend with transparent glow creates rectangular overlay
        // because dst * (1-alpha) replaces face pixels. Additive just adds brightness.
        if (blendMode === 0 && att && att.name === 'frost_spike_big') {
            slot.data.blendMode = 1; // Change Normal ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Additive
            dbg(`[FX-FIX] Changed "${slot.data.name}" blend: NormalÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Additive (transparent glow PNG)`);
        }
    }
    if (hiddenFxCount > 0) {
        dbg(`[FX-FIX] Hidden ${hiddenFxCount} pure-FX "rec" rectangle slots (Additive/Screen blend)`);
    }

    dbg('[SETUP] Calling updateWorldTransform...');
    try {
        skeleton.updateWorldTransform(spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0 as any);
        dbg('[SETUP] updateWorldTransform OK');
    } catch (e: any) {
        dbg(`[SETUP] updateWorldTransform with Physics failed: ${e.message}`);
        try { skeleton.updateWorldTransform(0 as any); dbg('[SETUP] updateWorldTransform(0) OK'); }
        catch (e2: any) { dbg(`[SETUP] updateWorldTransform(0) also failed: ${e2.message}`); }
    }

    dbg('[SETUP] Calculating bounds...');
    try {
        const bounds = skeleton.getBoundsRect();
        dbg(`[BOUNDS] x:${bounds.x?.toFixed(0)} y:${bounds.y?.toFixed(0)} w:${bounds.width?.toFixed(0)} h:${bounds.height?.toFixed(0)}`);
        const canvasH = state.canvas.height;
        const fitScale = (canvasH * 0.6) / (bounds.height || 400);
        state.scale = Math.min(fitScale, 2);
        dbg(`[FIT] scale:${state.scale.toFixed(2)}`);
    } catch (e: any) {
        dbg(`[BOUNDS-ERR] ${e.message}`);
        state.scale = 0.5;
    }

    const stateData = new spine4.AnimationStateData(skeletonData);
    stateData.defaultMix = 0.2;
    const animState = new spine4.AnimationState(stateData);

    state.skeleton = skeleton;
    state.animState = animState;
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Control API ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
export function getAnimations(): string[] {
    if (!state?.skeleton) return [];
    return state.skeleton.data.animations.map((a: any) => a.name);
}

export function getSkins(): string[] {
    if (!state?.skeleton) return [];
    return state.skeleton.data.skins.map((s: any) => s.name);
}

export function getSkeletonInfo() {
    if (!state?.skeleton) return { bones: 0, slots: 0, anims: 0, skins: 0 };
    const data = state.skeleton.data;
    return {
        bones: data.bones.length,
        slots: data.slots.length,
        anims: data.animations.length,
        skins: data.skins.length,
    };
}

export function playAnimation(name: string) {
    if (!state?.animState || !state?.skeleton) return;
    try {
        const skeleton = state.skeleton;

        // Reset skeleton to setup pose before switching animation
        // This ensures all slots/attachments are in their default state,
        // and the new animation's keyframes will control visibility correctly
        // (including clipping attachments and FX slots)
        skeleton.setToSetupPose();

        // Re-apply FX fixes (hide rec slots with non-Normal blend)
        for (let i = 0; i < skeleton.slots.length; i++) {
            const slot = skeleton.slots[i];
            const blendMode = slot.data.blendMode;
            const att = slot.getAttachment();
            if (blendMode !== 0 && att && att.name === 'rec') {
                slot.color.a = 0;
            }
        }

        state.animState.setAnimation(0, name, state.loop);
    } catch (e) { console.warn('play:', e); }
}

export function setSkin(name: string) {
    if (!state?.skeleton) return;
    try {
        state.skeleton.setSkinByName(name);
        state.skeleton.setSlotsToSetupPose();
    } catch (e) { console.warn('skin:', e); }
}

export function setSpeed(s: number) { if (state) state.speed = s; }
export function setScale(s: number) { if (state) state.scale = s; }
export function setViewZoom(z: number) { if (state) state.viewZoom = Math.max(0.1, Math.min(10, z)); }
export function getViewZoom(): number { return state?.viewZoom ?? 1; }
export function setPlaying(p: boolean) { if (state) state.playing = p; }

export function setLoop(loop: boolean) {
    if (!state) return;
    state.loop = loop;
    if (state.animState) {
        const current = state.animState.getCurrent(0);
        if (current) current.loop = loop;
    }
}

export function setBgColor(color: number | 'checkers') {
    if (!state) return;
    if (color === 'checkers') {
        state.bgColor = '#333333';
    } else {
        state.bgColor = '#' + color.toString(16).padStart(6, '0');
    }
}

export function setOffset(dx: number, dy: number) {
    if (!state) return;
    state.offsetX += dx;
    state.offsetY += dy;
}

export function resetOffset() {
    if (!state) return;
    state.offsetX = 0;
    state.offsetY = 0;
}

export function setBgImage(img: HTMLImageElement | null) {
    if (!state) return;
    state.bgImage = img;
    state.bgOffsetX = 0;
    state.bgOffsetY = 0;
    state.bgScale = 1;
}

export function setBgOffset(dx: number, dy: number) {
    if (!state) return;
    state.bgOffsetX += dx;
    state.bgOffsetY += dy;
}

export function setBgScale(s: number) {
    if (!state) return;
    state.bgScale = Math.max(0.1, Math.min(5, s));
}

export function getBgImage(): HTMLImageElement | null {
    return state?.bgImage ?? null;
}

export function getViewerState() {
    if (!state) return null;
    return {
        scale: state.scale,
        viewZoom: state.viewZoom,
        offsetX: state.offsetX,
        offsetY: state.offsetY,
        speed: state.speed,
        bgImage: state.bgImage,
        bgColor: state.bgColor,
    };
}

/** Capture current canvas frame as a thumbnail (base64 data URL, resized to thumbSizeÃƒÆ’Ã¢â‚¬â€thumbSize) */
export function captureCanvasThumbnail(thumbSize = 200): string | null {
    if (!state || !state.canvas) return null;
    const src = state.canvas;
    if (src.width === 0 || src.height === 0) return null;

    try {
        // Create offscreen canvas at thumbnail size
        const thumb = document.createElement('canvas');
        const aspect = src.width / src.height;
        let tw: number, th: number;
        if (aspect >= 1) {
            tw = thumbSize;
            th = Math.round(thumbSize / aspect);
        } else {
            th = thumbSize;
            tw = Math.round(thumbSize * aspect);
        }
        thumb.width = tw;
        thumb.height = th;
        const ctx = thumb.getContext('2d')!;
        ctx.drawImage(src, 0, 0, tw, th);
        return thumb.toDataURL('image/png');
    } catch (e) {
        console.warn('[THUMBNAIL] Capture failed:', e);
        return null;
    }
}
