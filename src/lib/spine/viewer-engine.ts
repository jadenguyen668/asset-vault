/**
 * Spine Viewer Engine — Class-based wrapper for React integration
 * Dual Runtime: Spine 3.x (Canvas2D via spine-canvas) + Spine 4.x (WebGL via @esotericsoftware/spine-webgl)
 * 
 * Ported from legacy viewer.ts with these changes:
 * - Class-based instead of module-level state (supports multiple instances)
 * - Container element passed as parameter (no DOM queries)
 * - dispose() method for cleanup
 */

export interface SpineFiles {
  jsonText: string;
  atlasText: string;
  pngBlobs: Map<string, Blob>;
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
  viewZoom: number;
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

// Track loaded spine-canvas minor version globally (only one can be active)
let loadedSpineMinor: number | null = null;

async function loadSpineCanvasRuntime(minor: number): Promise<void> {
  if (loadedSpineMinor === minor && (window as any).spine?.canvas) return;
  if ((window as any).spine) {
    try { delete (window as any).spine; } catch { (window as any).spine = undefined; }
  }
  document.querySelectorAll('script[data-spine-canvas]').forEach(s => s.remove());
  const file = minor <= 7 ? '/spine-canvas-3.7.js' : '/spine-canvas-3.8.js';
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = file;
    script.setAttribute('data-spine-canvas', String(minor));
    script.onload = () => { loadedSpineMinor = minor; resolve(); };
    script.onerror = () => reject(new Error(`Failed to load ${file}`));
    document.head.appendChild(script);
  });
}

export class SpineViewerEngine {
  private state: ViewerState | null = null;
  private container: HTMLElement;
  private rafId: number | null = null;
  private disposed = false;
  private checkerPattern: CanvasPattern | null = null;
  private checkerGlTexture: any = null;
  private bgGlTexture: any = null;
  private bgImageSrc = '';
  private crosshairGlTexture: any = null;
  private renderErrorLogged = false;
  private blendDebugDone = false;
  private _spine4: any = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  // ── Init ──────────────────────────────────────────────────────
  init(): ViewerState {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.style.display = 'block';
    this.container.appendChild(canvas);

    this.resizeObserver = new ResizeObserver(() => this.syncCanvasSize());
    this.resizeObserver.observe(this.container);

    this.state = {
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

    this.renderLoop();
    return this.state;
  }

  // ── Dispose ───────────────────────────────────────────────────
  dispose() {
    this.disposed = true;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    if (this.state?.gl) {
      const loseCtx = this.state.gl.getExtension('WEBGL_lose_context');
      if (loseCtx) loseCtx.loseContext();
    }
    if (this.state?.canvas.parentNode) {
      this.state.canvas.parentNode.removeChild(this.state.canvas);
    }
    this.state = null;
  }

  // ── Canvas sync ───────────────────────────────────────────────
  private syncCanvasSize() {
    if (!this.state) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (this.state.canvas.width !== w || this.state.canvas.height !== h) {
      this.state.canvas.width = w;
      this.state.canvas.height = h;
      this.state.canvas.style.width = rect.width + 'px';
      this.state.canvas.style.height = rect.height + 'px';
    }
  }

  // ── Render Loop ───────────────────────────────────────────────
  private renderLoop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.renderLoop);
    if (!this.state?.skeleton || !this.state.animState || !this.state.renderer) return;

    this.syncCanvasSize();
    const now = performance.now() / 1000;
    const delta = now - this.state.lastTime;
    this.state.lastTime = now;

    if (this.state.runtimeVersion === '3.x') {
      this.renderCanvas2D(delta);
    } else {
      this.renderWebGL(delta);
    }

    if (this._captureResolve && this.state.canvas) {
      const dataUrl = this.state.canvas.toDataURL('image/webp', 0.8);
      this._captureResolve(dataUrl);
      this._captureResolve = null;
    }
  };

  private _captureResolve: ((dataUrl: string) => void) | null = null;
  captureThumbnail(): Promise<string> {
    return new Promise((resolve) => {
      this._captureResolve = resolve;
    });
  }

  // ── Canvas2D Rendering (Spine 3.x) ───────────────────────────
  private renderCanvas2D(delta: number) {
    if (!this.state?.ctx2d) return;
    const { canvas, ctx2d, skeleton, animState } = this.state;
    const w = canvas.width;
    const h = canvas.height;

    ctx2d.save();
    if (!this.checkerPattern) {
      const sz = 16;
      const pc = document.createElement('canvas');
      pc.width = sz * 2; pc.height = sz * 2;
      const pctx = pc.getContext('2d')!;
      pctx.fillStyle = '#3a3a3a';
      pctx.fillRect(0, 0, sz * 2, sz * 2);
      pctx.fillStyle = '#2a2a2a';
      pctx.fillRect(0, 0, sz, sz);
      pctx.fillRect(sz, sz, sz, sz);
      this.checkerPattern = ctx2d.createPattern(pc, 'repeat');
    }
    ctx2d.fillStyle = this.checkerPattern || '#2e2e2e';
    ctx2d.fillRect(0, 0, w, h);

    const vz = this.state.viewZoom;
    ctx2d.translate(w / 2, h / 2);
    ctx2d.scale(vz, vz);
    ctx2d.translate(-w / 2, -h / 2);

    if (this.state.bgImage) {
      const bgDisplayScale = this.state.scale * this.state.bgScale;
      const imgW = this.state.bgImage.naturalWidth * bgDisplayScale;
      const imgH = this.state.bgImage.naturalHeight * bgDisplayScale;
      const bx = w / 2 - imgW / 2 + this.state.bgOffsetX * this.state.scale;
      const by = h * 0.85 - imgH / 2 + this.state.bgOffsetY * this.state.scale;
      ctx2d.drawImage(this.state.bgImage, bx, by, imgW, imgH);
    }

    // Crosshair
    const originX = w / 2 + this.state.offsetX;
    const originY = h * 0.85 + this.state.offsetY;
    const ext = Math.max(w, h) / vz + 2000;
    ctx2d.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx2d.lineWidth = 3;
    ctx2d.beginPath(); ctx2d.moveTo(originX - ext, originY); ctx2d.lineTo(originX + ext, originY); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.moveTo(originX, originY - ext); ctx2d.lineTo(originX, originY + ext); ctx2d.stroke();

    ctx2d.translate(w / 2 + this.state.offsetX, h * 0.85 + this.state.offsetY);
    ctx2d.scale(this.state.scale, -this.state.scale);

    if (this.state.playing) animState.update(delta * this.state.speed);
    animState.apply(skeleton);
    skeleton.updateWorldTransform();

    try { this.state.renderer.draw(skeleton); } catch(e: any) {
      if (!this.renderErrorLogged) { this.renderErrorLogged = true; console.error('[RENDER-ERR]', e); }
    }
    ctx2d.restore();
  }

  // ── WebGL Rendering (Spine 4.x) ──────────────────────────────
  private renderWebGL(delta: number) {
    if (!this.state?.gl) return;
    const { gl, canvas, skeleton, animState } = this.state;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const w = canvas.width;
    const h = canvas.height;
    const vz = this.state.viewZoom;

    skeleton.x = w / 2 + this.state.offsetX;
    skeleton.y = h * 0.2 - this.state.offsetY;
    skeleton.scaleX = this.state.scale;
    skeleton.scaleY = this.state.scale;

    if (this.state.playing) animState.update(delta * this.state.speed);
    animState.apply(skeleton);

    const spine4 = this._spine4;
    try {
      skeleton.updateWorldTransform(spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0 as any);
    } catch { try { skeleton.updateWorldTransform(0 as any); } catch { /* ignore */ } }

    this.state.renderer.camera.position.x = w / 2;
    this.state.renderer.camera.position.y = h / 2;
    this.state.renderer.camera.viewportWidth = w / vz;
    this.state.renderer.camera.viewportHeight = h / vz;
    this.state.renderer.camera.update();

    const batcher = (this.state.renderer as any).batcher;
    if (batcher) {
      batcher.srcColorBlend = gl.SRC_ALPHA;
      batcher.srcAlphaBlend = gl.ONE;
      batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }

    this.state.renderer.begin();

    // Checkerboard background
    const checkerSz = 16;
    if (!this.checkerGlTexture || (this.checkerGlTexture as any)._w !== w || (this.checkerGlTexture as any)._h !== h) {
      if (this.checkerGlTexture) this.checkerGlTexture.dispose?.();
      this.checkerGlTexture = null;
      if (spine4) {
        const pc = document.createElement('canvas');
        pc.width = w; pc.height = h;
        const pctx = pc.getContext('2d')!;
        pctx.fillStyle = '#3a3a3a'; pctx.fillRect(0, 0, w, h);
        pctx.fillStyle = '#2a2a2a';
        for (let y = 0; y < h; y += checkerSz) {
          for (let x = 0; x < w; x += checkerSz) {
            if (((x / checkerSz) + (y / checkerSz)) % 2 === 0) pctx.fillRect(x, y, checkerSz, checkerSz);
          }
        }
        this.checkerGlTexture = new spine4.GLTexture(gl, pc as any);
        (this.checkerGlTexture as any)._w = w;
        (this.checkerGlTexture as any)._h = h;
      }
    }
    if (this.checkerGlTexture) {
      const camW = w / vz, camH = h / vz;
      this.state.renderer.drawTexture(this.checkerGlTexture, w / 2 - camW / 2, h / 2 - camH / 2, camW, camH);
    }

    // Crosshair
    if (!this.crosshairGlTexture && spine4) {
      const pc = document.createElement('canvas'); pc.width = 1; pc.height = 1;
      const pctx = pc.getContext('2d')!;
      pctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; pctx.fillRect(0, 0, 1, 1);
      this.crosshairGlTexture = new spine4.GLTexture(gl, pc as any);
    }

    // Background image
    if (this.state.bgImage && spine4) {
      if (!this.bgGlTexture || this.bgImageSrc !== this.state.bgImage.src) {
        this.bgGlTexture?.dispose();
        this.bgGlTexture = new spine4.GLTexture(gl, this.state.bgImage);
        this.bgImageSrc = this.state.bgImage.src;
      }
      if (this.bgGlTexture) {
        const bgDisplayScale = this.state.scale * this.state.bgScale;
        const imgW = this.state.bgImage.naturalWidth * bgDisplayScale;
        const imgH = this.state.bgImage.naturalHeight * bgDisplayScale;
        const bx = w / 2 - imgW / 2 + this.state.bgOffsetX * this.state.scale;
        const by = h * 0.2 - imgH / 2 - this.state.bgOffsetY * this.state.scale;
        this.state.renderer.drawTexture(this.bgGlTexture, bx, by, imgW, imgH);
      }
    }

    // Crosshair lines
    if (this.crosshairGlTexture) {
      const lineW = 3;
      const ox = w / 2 + this.state.offsetX, oy = h * 0.2 - this.state.offsetY;
      const camW = w / vz, camH = h / vz;
      const vpLeft = w / 2 - camW / 2, vpTop = h / 2 - camH / 2;
      this.state.renderer.drawTexture(this.crosshairGlTexture, vpLeft, oy - lineW / 2, camW, lineW);
      this.state.renderer.drawTexture(this.crosshairGlTexture, ox - lineW / 2, vpTop, lineW, camH);
    }
    this.state.renderer.end();

    if (batcher) { batcher.srcColorBlend = gl.SRC_ALPHA; batcher.srcAlphaBlend = gl.ONE; batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA; }

    this.state.renderer.begin();
    try { this.state.renderer.drawSkeleton(skeleton, false); } catch(e: any) {
      if (!this.renderErrorLogged) { this.renderErrorLogged = true; console.error('[RENDER-ERR]', e); }
    }
    this.state.renderer.end();

    if (batcher) { batcher.srcColorBlend = gl.SRC_ALPHA; batcher.srcAlphaBlend = gl.ONE; batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA; }
  }

  // ── Load Spine ────────────────────────────────────────────────
  async loadSpine(files: SpineFiles, detectedMajor: number, detectedMinor: number = 8, initialAnimation?: string): Promise<void> {
    if (!this.state) return;
    this.renderErrorLogged = false;
    this.blendDebugDone = false;

    // Recreate canvas
    if (this.state.gl) {
      const loseCtx = this.state.gl.getExtension('WEBGL_lose_context');
      if (loseCtx) loseCtx.loseContext();
    }
    if (this.state.canvas.parentNode) this.state.canvas.parentNode.removeChild(this.state.canvas);

    const newCanvas = document.createElement('canvas');
    this.container.style.display = '';
    void this.container.offsetHeight;
    this.container.appendChild(newCanvas);
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const rw = rect.width || 800;
    const rh = rect.height || 600;
    newCanvas.width = Math.round(rw * dpr);
    newCanvas.height = Math.round(rh * dpr);
    newCanvas.style.width = rw + 'px';
    newCanvas.style.height = rh + 'px';
    newCanvas.style.display = 'block';
    this.state.canvas = newCanvas;
    this.state.ctx2d = null;
    this.state.gl = null;
    this.state.skeleton = null;
    this.state.animState = null;
    this.state.renderer = null;
    this.bgGlTexture = null;
    this.bgImageSrc = '';
    this.checkerGlTexture = null;

    if (detectedMajor < 4) {
      await this.loadSpine3x(files, detectedMinor);
    } else {
      await this.loadSpine4x(files, detectedMajor);
    }

    const anims = this.getAnimations();
    if (initialAnimation && anims.includes(initialAnimation)) {
      this.playAnimation(initialAnimation);
    } else if (anims.length > 0) {
      this.playAnimation(anims[0]);
    }
  }

  // ── Spine 3.x: Canvas2D ──────────────────────────────────────
  private async loadSpine3x(files: SpineFiles, minor: number = 8) {
    if (!this.state) return;

    await loadSpineCanvasRuntime(minor);
    const spine = (window as any).spine;
    if (!spine) throw new Error(`Spine 3.${minor} runtime not available`);

    this.state.runtimeVersion = '3.x';
    this.state.ctx2d = this.state.canvas.getContext('2d')!;
    if (!this.state.ctx2d) throw new Error('Canvas 2D not supported');

    this.state.renderer = new spine.canvas.SkeletonRenderer(this.state.ctx2d);
    this.state.renderer.debugRendering = false;
    this.state.renderer.triangleRendering = true;

    // Load PNGs
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
    }

    // Parse atlas
    const atlas = new spine.TextureAtlas(files.atlasText, (path: string) => {
      let img = images.get(path) || images.get(path + '.png') || images.get(path.replace(/\.png$/i, ''));
      if (!img) {
        for (const [k, v] of images) {
          if (k.toLowerCase().includes(path.toLowerCase().replace(/\.png$/i, ''))) { img = v; break; }
        }
      }
      if (!img) img = images.values().next().value;
      if (!img) return null;
      return { getImage: () => img, setFilters: () => {}, setWraps: () => {} };
    });

    // Parse JSON
    const atlasLoader = new spine.AtlasAttachmentLoader(atlas);
    const jsonParser = new spine.SkeletonJson(atlasLoader);
    const jsonData = JSON.parse(files.jsonText);

    // Convert legacy mesh types for 3.8
    if (minor >= 8 && jsonData.skins) {
      const skinEntries = Array.isArray(jsonData.skins) ? jsonData.skins : Object.entries(jsonData.skins).map(([n, v]) => ({ name: n, attachments: v }));
      for (const skin of skinEntries) {
        const slots = (skin as any).attachments || skin;
        if (typeof slots !== 'object') continue;
        for (const slotAttachments of Object.values(slots as Record<string, any>)) {
          if (!slotAttachments || typeof slotAttachments !== 'object') continue;
          for (const attData of Object.values(slotAttachments as Record<string, any>)) {
            if (!attData || typeof attData !== 'object') continue;
            const type = (attData as any).type;
            if (type === 'skinnedmesh' || type === 'weightedmesh') (attData as any).type = 'mesh';
            else if (type === 'weightedlinkedmesh') (attData as any).type = 'linkedmesh';
          }
        }
      }
    }

    // 3.7 → 3.8 skins format
    if (minor >= 8 && jsonData.skins && !Array.isArray(jsonData.skins)) {
      const skinsArr: any[] = [];
      for (const [skinName, skinSlots] of Object.entries(jsonData.skins)) {
        skinsArr.push({ name: skinName, attachments: skinSlots });
      }
      jsonData.skins = skinsArr;
    }

    const skeletonData = jsonParser.readSkeletonData(jsonData);
    const skeleton = new spine.Skeleton(skeletonData);
    skeleton.setToSetupPose();
    const firstSkin = (skeletonData.skins?.length > 1 ? skeletonData.skins.find((s: any) => s.name?.toLowerCase() !== 'default') : null) || skeletonData.skins?.[0] || skeletonData.defaultSkin;
    if (firstSkin) { skeleton.setSkin(firstSkin); skeleton.setSlotsToSetupPose(); }
    skeleton.updateWorldTransform();

    // Monkey-patch drawTriangle for anti-alias seam fix
    const rendererCtx = this.state.ctx2d!;
    const stateRef = this.state;
    this.state.renderer.drawTriangle = function (img: any, x0: number, y0: number, u0: number, v0: number,
      x1: number, y1: number, u1: number, v1: number,
      x2: number, y2: number, u2: number, v2: number) {
      u0 *= img.width; v0 *= img.height;
      u1 *= img.width; v1 *= img.height;
      u2 *= img.width; v2 *= img.height;
      const _du1 = u1 - u0, _dv1 = v1 - v0, _du2 = u2 - u0, _dv2 = v2 - v0;
      const uvDet = _du1 * _dv2 - _du2 * _dv1;
      if (Math.abs(uvDet) < 1e-6) return;
      const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3;
      const globalScale = Math.abs((stateRef?.scale ?? 1) * (stateRef?.viewZoom ?? 1));
      const expand = 0.6 / globalScale;
      const ex0 = x0 + (x0 - cx) * expand / Math.max(1, Math.hypot(x0 - cx, y0 - cy));
      const ey0 = y0 + (y0 - cy) * expand / Math.max(1, Math.hypot(x0 - cx, y0 - cy));
      const ex1 = x1 + (x1 - cx) * expand / Math.max(1, Math.hypot(x1 - cx, y1 - cy));
      const ey1 = y1 + (y1 - cy) * expand / Math.max(1, Math.hypot(x1 - cx, y1 - cy));
      const ex2 = x2 + (x2 - cx) * expand / Math.max(1, Math.hypot(x2 - cx, y2 - cy));
      const ey2 = y2 + (y2 - cy) * expand / Math.max(1, Math.hypot(x2 - cx, y2 - cy));
      rendererCtx.beginPath(); rendererCtx.moveTo(ex0, ey0); rendererCtx.lineTo(ex1, ey1); rendererCtx.lineTo(ex2, ey2); rendererCtx.closePath();
      const a1 = x1 - x0, b1 = y1 - y0, a2 = x2 - x0, b2 = y2 - y0;
      const c1 = u1 - u0, d1 = v1 - v0, c2 = u2 - u0, d2 = v2 - v0;
      const det = 1 / (c1 * d2 - c2 * d1);
      const a = (d2 * a1 - d1 * a2) * det, b = (d2 * b1 - d1 * b2) * det;
      const c = (c1 * a2 - c2 * a1) * det, d = (c1 * b2 - c2 * b1) * det;
      const e = x0 - a * u0 - c * v0, f = y0 - b * u0 - d * v0;
      if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(d)) return;
      rendererCtx.save(); rendererCtx.clip(); rendererCtx.transform(a, b, c, d, e, f);
      rendererCtx.drawImage(img, 0, 0); rendererCtx.drawImage(img, 0, 0); rendererCtx.drawImage(img, 0, 0);
      rendererCtx.restore();
    };

    // Auto-fit
    try {
      const offset = new spine.Vector2(), size = new spine.Vector2();
      skeleton.getBounds(offset, size, []);
      this.state.scale = Math.min((this.state.canvas.height * 0.6) / (size.y || 400), 2);
    } catch { this.state.scale = 0.5; }

    const stateData = new spine.AnimationStateData(skeletonData);
    stateData.defaultMix = 0.2;
    this.state.skeleton = skeleton;
    this.state.animState = new spine.AnimationState(stateData);
  }

  // ── Spine 4.x: WebGL ─────────────────────────────────────────
  private async loadSpine4x(files: SpineFiles, detectedMajor: number = 4) {
    if (!this.state) return;

    const spine4 = await import('@esotericsoftware/spine-webgl');
    this._spine4 = spine4;
    this.state.runtimeVersion = '4.x';

    // CRITICAL: Disable premultiplied alpha on GL textures
    // GLTexture premultiplies by default, but drawSkeleton(skel, false) expects straight alpha
    // Mismatch causes black rectangles around semi-transparent/additive blend areas
    (spine4 as any).GLTexture.DISABLE_UNPACK_PREMULTIPLIED_ALPHA_WEBGL = true;

    if (!this.state.gl) {
      const glConfig: WebGLContextAttributes = { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true };
      this.state.gl = (this.state.canvas.getContext('webgl2', glConfig) || this.state.canvas.getContext('webgl', glConfig)) as WebGLRenderingContext;
    }
    const gl = this.state.gl;
    if (!gl) throw new Error('WebGL not supported');

    if (!this.state.renderer) this.state.renderer = new spine4.SceneRenderer(this.state.canvas, gl);

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
    }

    // Atlas
    const atlas = new spine4.TextureAtlas(files.atlasText);
    for (const page of atlas.pages) {
      const pageName = page.name;
      let tex = textures.get(pageName) || textures.get(pageName + '.png') || textures.get(pageName.replace(/\.png$/i, ''));
      if (!tex) {
        const pageBase = pageName.replace(/\.png$/i, '').toLowerCase();
        for (const [fname, ftex] of textures) {
          const fBase = fname.replace(/\.png$/i, '').toLowerCase();
          if (fBase === pageBase || fBase.endsWith(pageBase) || pageBase.endsWith(fBase)) { tex = ftex; break; }
        }
      }
      if (!tex && atlas.pages.length === 1) tex = textures.values().next().value;
      if (tex) page.setTexture(tex);
    }

    // Standalone PNGs
    const atlasPageNames = new Set(atlas.pages.map((p: any) => (p.name || '').replace(/\.png$/i, '').toLowerCase()));
    for (const [filename] of files.pngBlobs) {
      const base = filename.replace(/\.png$/i, '').toLowerCase();
      if (!atlasPageNames.has(base)) {
        const tex = textures.get(filename);
        if (tex) {
          const img = tex.getImage();
          const page = new spine4.TextureAtlasPage(filename) as any;
          page.width = img.width; page.height = img.height;
          page.setTexture(tex);
          atlas.pages.push(page);
          const existingIdx = atlas.regions.findIndex((r: any) => r.name === base || r.name === filename.replace(/\.png$/i, ''));
          if (existingIdx >= 0) atlas.regions.splice(existingIdx, 1);
          const region = new spine4.TextureAtlasRegion(page, base) as any;
          region.x = 0; region.y = 0; region.width = img.width; region.height = img.height;
          region.originalWidth = img.width; region.originalHeight = img.height;
          region.offsetX = 0; region.offsetY = 0;
          region.u = 0; region.v = 0; region.u2 = 1; region.v2 = 1;
          region.degrees = 0; region.texture = tex;
          atlas.regions.unshift(region);
        }
      }
    }

    // JSON conversion (3.x → 4.x)
    const jsonData = JSON.parse(files.jsonText);
    if (detectedMajor < 4) {
      if (jsonData.skins && !Array.isArray(jsonData.skins)) {
        const skinsArr: any[] = [];
        for (const [skinName, skinSlots] of Object.entries(jsonData.skins)) {
          skinsArr.push({ name: skinName, attachments: skinSlots });
        }
        jsonData.skins = skinsArr;
      }
      if (jsonData.skins && Array.isArray(jsonData.skins)) {
        for (const skin of jsonData.skins) {
          const attachments = skin.attachments || {};
          for (const slotAttachments of Object.values(attachments)) {
            if (!slotAttachments || typeof slotAttachments !== 'object') continue;
            for (const attData of Object.values(slotAttachments as Record<string, any>)) {
              if (!attData || typeof attData !== 'object') continue;
              const type = (attData as any).type;
              if (type === 'skinnedmesh' || type === 'weightedmesh') (attData as any).type = 'mesh';
              else if (type === 'weightedlinkedmesh') (attData as any).type = 'linkedmesh';
            }
          }
        }
      }
    }

    const atlasLoader = new spine4.AtlasAttachmentLoader(atlas);
    const jsonParser = new spine4.SkeletonJson(atlasLoader);
    const skeletonData = jsonParser.readSkeletonData(jsonData);

    const skeleton = new spine4.Skeleton(skeletonData);
    skeleton.setToSetupPose();
    const firstSkin = (skeletonData.skins?.length > 1 ? skeletonData.skins.find((s: any) => s.name?.toLowerCase() !== 'default') : null) || skeletonData.skins?.[0] || skeletonData.defaultSkin;
    if (firstSkin) { skeleton.setSkin(firstSkin); skeleton.setSlotsToSetupPose(); }

    // FX fix: hide rec slots
    for (let i = 0; i < skeleton.slots.length; i++) {
      const slot = skeleton.slots[i];
      const att = slot.getAttachment();
      if (slot.data.blendMode !== 0 && att?.name === 'rec') slot.color.a = 0;
      if (slot.data.blendMode === 0 && att?.name === 'frost_spike_big') slot.data.blendMode = 1;
    }

    try {
      skeleton.updateWorldTransform(spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0 as any);
    } catch { try { skeleton.updateWorldTransform(0 as any); } catch { /* ignore */ } }

    // Auto-fit
    try {
      const bounds = skeleton.getBoundsRect();
      this.state.scale = Math.min((this.state.canvas.height * 0.6) / (bounds.height || 400), 2);
    } catch { this.state.scale = 0.5; }

    const stateData = new spine4.AnimationStateData(skeletonData);
    stateData.defaultMix = 0.2;
    this.state.skeleton = skeleton;
    this.state.animState = new spine4.AnimationState(stateData);
  }

  // ── Control API ───────────────────────────────────────────────
  getAnimations(): string[] {
    return this.state?.skeleton?.data.animations.map((a: any) => a.name) ?? [];
  }

  getSkins(): string[] {
    return this.state?.skeleton?.data.skins.map((s: any) => s.name) ?? [];
  }

  getSkeletonInfo() {
    if (!this.state?.skeleton) return { bones: 0, slots: 0, anims: 0, skins: 0 };
    const d = this.state.skeleton.data;
    return { bones: d.bones.length, slots: d.slots.length, anims: d.animations.length, skins: d.skins.length };
  }

  playAnimation(name: string) {
    if (!this.state?.animState || !this.state?.skeleton) return;
    try {
      this.state.skeleton.setToSetupPose();
      for (let i = 0; i < this.state.skeleton.slots.length; i++) {
        const slot = this.state.skeleton.slots[i];
        const att = slot.getAttachment();
        if (slot.data.blendMode !== 0 && att?.name === 'rec') slot.color.a = 0;
      }
      this.state.animState.setAnimation(0, name, this.state.loop);
    } catch (e) { console.warn('playAnimation:', e); }
  }

  setSkin(name: string) {
    if (!this.state?.skeleton) return;
    try {
      this.state.skeleton.setSkinByName(name);
      this.state.skeleton.setSlotsToSetupPose();
      // Re-apply FX fixes after skin change
      for (let i = 0; i < this.state.skeleton.slots.length; i++) {
        const slot = this.state.skeleton.slots[i];
        const att = slot.getAttachment();
        if (slot.data.blendMode !== 0 && att?.name === 'rec') slot.color.a = 0;
      }
      // Update world transform to apply new skin geometry
      const spine4 = this._spine4;
      try {
        this.state.skeleton.updateWorldTransform(spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0 as any);
      } catch { try { this.state.skeleton.updateWorldTransform(0 as any); } catch { /* */ } }
    } catch (e) { console.warn('setSkin:', e); }
  }

  setSpeed(s: number) { if (this.state) this.state.speed = s; }
  setScale(s: number) { if (this.state) this.state.scale = s; }
  setViewZoom(z: number) { if (this.state) this.state.viewZoom = Math.max(0.1, Math.min(10, z)); }
  getViewZoom(): number { return this.state?.viewZoom ?? 1; }
  setPlaying(p: boolean) { if (this.state) this.state.playing = p; }
  setLoop(loop: boolean) {
    if (!this.state) return;
    this.state.loop = loop;
    if (this.state.animState) {
      const current = this.state.animState.getCurrent(0);
      if (current) current.loop = loop;
    }
  }
  setOffset(dx: number, dy: number) { if (this.state) { this.state.offsetX += dx; this.state.offsetY += dy; } }
  setBgOffset(dx: number, dy: number) { if (this.state) { this.state.bgOffsetX += dx; this.state.bgOffsetY += dy; } }
  resetOffset() { if (this.state) { this.state.offsetX = 0; this.state.offsetY = 0; } }
  setBgImage(img: HTMLImageElement | null) {
    if (!this.state) return;
    this.state.bgImage = img;
  }
  getBgState() {
    if (!this.state) return null;
    return {
      image: this.state.bgImage,
      offsetX: this.state.bgOffsetX,
      offsetY: this.state.bgOffsetY,
      scale: this.state.bgScale
    };
  }
  setBgState(config: { image: HTMLImageElement | null, offsetX: number, offsetY: number, scale: number }) {
    if (!this.state) return;
    this.state.bgImage = config.image;
    this.state.bgOffsetX = config.offsetX;
    this.state.bgOffsetY = config.offsetY;
    this.state.bgScale = config.scale;
  }
  getScale(): number { return this.state?.scale ?? 1; }
  isPlaying(): boolean { return this.state?.playing ?? false; }
  isLooping(): boolean { return this.state?.loop ?? true; }
  getSpeed(): number { return this.state?.speed ?? 1; }

  captureCanvasThumbnail(thumbSize = 200): string | null {
    if (!this.state?.canvas || this.state.canvas.width === 0) return null;
    try {
      const src = this.state.canvas;
      const thumb = document.createElement('canvas');
      const aspect = src.width / src.height;
      const tw = aspect >= 1 ? thumbSize : Math.round(thumbSize * aspect);
      const th = aspect >= 1 ? Math.round(thumbSize / aspect) : thumbSize;
      thumb.width = tw; thumb.height = th;
      thumb.getContext('2d')!.drawImage(src, 0, 0, tw, th);
      return thumb.toDataURL('image/png');
    } catch { return null; }
  }
}
