/**
 * Spine Viewer Engine — Class-based wrapper for React integration
 * Dual Runtime: Spine 3.x (Canvas2D via spine-canvas) + Spine 4.x (WebGL via @esotericsoftware/spine-webgl)
 * 
 * Ported from legacy viewer.ts with these changes:
 * - Class-based instead of module-level state (supports multiple instances)
 * - Container element passed as parameter (no DOM queries)
 * - dispose() method for cleanup
 */

import { convertAtlas4xTo3x } from './atlas-converter';

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
  baseScale: number;
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
  skeletonCenterX: number;
  skeletonCenterY: number;
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
  private shapeRenderer: any = null;
  private ghostingEnabled: boolean = false;
  private trackedBoneName: string | null = null;
  private trailPoints: {x: number, y: number}[] = [];
  private _capturingThumbnail = false;
  private _thumbnailMatteMode = false;
  private _thumbnailBoundsCanvas: HTMLCanvasElement | null = null;
  private _setupPoseMode = false;
  private _dpr = window.devicePixelRatio || 1;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  // ── Init ──────────────────────────────────────────────────────
  init(): ViewerState {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    this._dpr = dpr;

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
      playing: true, loop: true, speed: 1, scale: 1, baseScale: 1, viewZoom: 1,
      bgColor: '#1a1a2e',
      bgImage: null,
      bgOffsetX: 0, bgOffsetY: 0, bgScale: 1,
      lastTime: performance.now() / 1000,
      offsetX: 0, offsetY: 0,
      runtimeVersion: '3.x',
      skeletonCenterX: 0, skeletonCenterY: 0,
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
    if (this.shapeRenderer) {
      if (this.shapeRenderer.dispose) this.shapeRenderer.dispose();
      this.shapeRenderer = null;
    }
    this.ghostingEnabled = false;
    this.trailPoints = [];
    this.state = null;
  }

  // ── Canvas sync ───────────────────────────────────────────────
  private syncCanvasSize() {
    if (!this.state) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = this._dpr;
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
      // Save current view state
      const savedScale = this.state.scale;
      const savedOffsetX = this.state.offsetX;
      const savedOffsetY = this.state.offsetY;
      const savedViewZoom = this.state.viewZoom;
      // Reset to auto-fit defaults so full content is visible on canvas
      this.state.scale = 1;
      this.state.viewZoom = 1;

      // Switch to Setup Pose for consistent thumbnail (instead of random animation frame)
      const { skeleton, animState } = this.state;
      // Save current track info to restore later
      const savedTrack = animState.getCurrent(0);
      const savedTrackTime = savedTrack ? savedTrack.trackTime : 0;
      const savedTrackName = savedTrack?.animation?.name || null;

      // Only reset bones (not slots) — preserves slot colors, blend modes, and FX fixes
      skeleton.setBonesToSetupPose();
      this._setupPoseMode = true;
      if (this.state.runtimeVersion === '4.x') {
        try {
          skeleton.updateWorldTransform(this._spine4?.Physics?.update ?? this._spine4?.Physics?.none ?? 0 as any);
        } catch { try { skeleton.updateWorldTransform(0 as any); } catch {} }
      } else {
        skeleton.updateWorldTransform();
      }

      // Pass 1: Transparent render to find content bounds
      this._capturingThumbnail = true;
      if (this.state.runtimeVersion === '3.x') {
        this.renderCanvas2D(0);
      } else {
        this.renderWebGL(0);
      }
      this._thumbnailBoundsCanvas = document.createElement('canvas');
      this._thumbnailBoundsCanvas.width = this.state.canvas.width;
      this._thumbnailBoundsCanvas.height = this.state.canvas.height;
      this._thumbnailBoundsCanvas.getContext('2d')!.drawImage(this.state.canvas, 0, 0);
      this._capturingThumbnail = false;

      // Pass 2: Render on solid dark background for final thumbnail
      this._thumbnailMatteMode = true;
      if (this.state.runtimeVersion === '3.x') {
        this.renderCanvas2D(0);
      } else {
        this.renderWebGL(0);
      }
      this._thumbnailMatteMode = false;

      // Restore animation state after capture
      this._setupPoseMode = false;
      if (savedTrackName) {
        animState.setAnimation(0, savedTrackName, savedTrack?.loop ?? true);
        const restoredTrack = animState.getCurrent(0);
        if (restoredTrack) restoredTrack.trackTime = savedTrackTime;
        animState.apply(skeleton);
        if (this.state.runtimeVersion === '4.x') {
          try {
            skeleton.updateWorldTransform(this._spine4?.Physics?.update ?? this._spine4?.Physics?.none ?? 0 as any);
          } catch { try { skeleton.updateWorldTransform(0 as any); } catch {} }
        } else {
          skeleton.updateWorldTransform();
        }
      }

      // Restore user's view state
      this.state.scale = savedScale;
      this.state.offsetX = savedOffsetX;
      this.state.offsetY = savedOffsetY;
      this.state.viewZoom = savedViewZoom;

      const cb = this._captureResolve;
      this._captureResolve = null;
      cb('');
    }
  };

  private _captureResolve: ((dataUrl: string) => void) | null = null;
  captureThumbnail(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.state?.skeleton || !this.state.canvas) {
        resolve('');
        return;
      }
      // Timeout safety — resolve with empty if render loop doesn't pick up in 3s
      const timeout = setTimeout(() => {
        if (this._captureResolve) {
          this._captureResolve = null;
          resolve('');
        }
      }, 3000);
      // Schedule capture in render loop — it will re-render with transparent bg
      this._captureResolve = () => {
        clearTimeout(timeout);
        try {
          const src = this.state!.canvas;
          const boundsSrc = this._thumbnailBoundsCanvas || src;
          const THUMB_SIZE = 300;

          // Read pixels from transparent render to find actual skeleton content bounds
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = boundsSrc.width;
          tmpCanvas.height = boundsSrc.height;
          const tmpCtx = tmpCanvas.getContext('2d')!;
          tmpCtx.drawImage(boundsSrc, 0, 0);
          const imageData = tmpCtx.getImageData(0, 0, boundsSrc.width, boundsSrc.height);
          const px = imageData.data;

          let minX = boundsSrc.width, minY = boundsSrc.height, maxX = 0, maxY = 0;
          // Sample every 2nd pixel for speed
          for (let y = 0; y < boundsSrc.height; y += 2) {
            for (let x = 0; x < boundsSrc.width; x += 2) {
              if (px[(y * boundsSrc.width + x) * 4 + 3] > 5) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (maxX <= minX || maxY <= minY) {
            resolve('');
            return;
          }

          // Add padding around content
          const contentW = maxX - minX;
          const contentH = maxY - minY;
          const pad = Math.max(contentW, contentH) * 0.08;
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(src.width, maxX + pad);
          maxY = Math.min(src.height, maxY + pad);

          // Make square crop centered on content
          const finalW = maxX - minX;
          const finalH = maxY - minY;
          const cropSize = Math.max(finalW, finalH);
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          let sx = centerX - cropSize / 2;
          let sy = centerY - cropSize / 2;
          // Clamp to canvas bounds
          if (sx < 0) sx = 0;
          if (sy < 0) sy = 0;
          if (sx + cropSize > src.width) sx = Math.max(0, src.width - cropSize);
          if (sy + cropSize > src.height) sy = Math.max(0, src.height - cropSize);

          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = THUMB_SIZE;
          thumbCanvas.height = THUMB_SIZE;
          const tctx = thumbCanvas.getContext('2d')!;
          tctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);
          // Crop from matte canvas (solid dark bg), not transparent one
          tctx.drawImage(src, sx, sy, cropSize, cropSize, 0, 0, THUMB_SIZE, THUMB_SIZE);

          resolve(thumbCanvas.toDataURL('image/webp', 0.85));
        } catch (e) {
          console.warn('[captureThumbnail] Error:', e);
          resolve('');
        } finally {
          this._thumbnailBoundsCanvas = null;
        }
      };
    });
  }

  // ── Canvas2D Rendering (Spine 3.x) ───────────────────────────
  private renderCanvas2D(delta: number) {
    if (!this.state?.ctx2d) return;
    const { canvas, ctx2d, skeleton, animState } = this.state;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;

    ctx2d.globalCompositeOperation = 'source-over';
    ctx2d.globalAlpha = 1;
    ctx2d.save();
    if (this._capturingThumbnail) {
      // Transparent background for clean bounds detection
      ctx2d.clearRect(0, 0, w, h);
    } else if (this._thumbnailMatteMode) {
      // Solid dark background for thumbnail (no checkerboard)
      ctx2d.fillStyle = '#1c1a38';
      ctx2d.fillRect(0, 0, w, h);
    } else {
      if (!this.checkerPattern) {
        const sz = 20;
        const pc = document.createElement('canvas');
        pc.width = sz * 2; pc.height = sz * 2;
        const pctx = pc.getContext('2d')!;
        pctx.fillStyle = '#24243a';
        pctx.fillRect(0, 0, sz * 2, sz * 2);
        pctx.fillStyle = '#30304a';
        pctx.fillRect(0, 0, sz, sz);
        pctx.fillRect(sz, sz, sz, sz);
        this.checkerPattern = ctx2d.createPattern(pc, 'repeat');
      }
      ctx2d.fillStyle = this.checkerPattern || '#2e2e2e';
      ctx2d.fillRect(0, 0, w, h);
    }

    const vz = this.state.viewZoom;
    ctx2d.translate(w / 2, h / 2);
    ctx2d.scale(vz, vz);
    ctx2d.translate(-w / 2, -h / 2);

    if (this.state.bgImage && !this._capturingThumbnail && !this._thumbnailMatteMode) {
      const bgDisplayScale = this.state.baseScale * this.state.bgScale;
      const imgW = this.state.bgImage.naturalWidth * bgDisplayScale;
      const imgH = this.state.bgImage.naturalHeight * bgDisplayScale;
      const bgOriginX = w / 2 + this.state.offsetX;
      const bgOriginY = h / 2 + this.state.offsetY;
      const bx = bgOriginX - imgW / 2 + this.state.bgOffsetX * this.state.baseScale;
      const by = bgOriginY - imgH / 2 + this.state.bgOffsetY * this.state.baseScale;
      ctx2d.drawImage(this.state.bgImage, bx, by, imgW, imgH);
    }

    // Crosshair (Origin) — skip when capturing thumbnail
    if (!this._capturingThumbnail && !this._thumbnailMatteMode) {
      const originX = w / 2 + this.state.offsetX;
      const originY = h / 2 + this.state.offsetY;
      const ext = Math.max(w, h) / vz + 2000;
      
      ctx2d.lineWidth = 1 / vz;
      // X Axis (Red)
      ctx2d.strokeStyle = 'rgba(255, 0, 0, 0.35)';
      ctx2d.beginPath(); ctx2d.moveTo(originX - ext, originY); ctx2d.lineTo(originX + ext, originY); ctx2d.stroke();
      // Y Axis (Green)
      ctx2d.strokeStyle = 'rgba(0, 180, 0, 0.35)';
      ctx2d.beginPath(); ctx2d.moveTo(originX, originY - ext); ctx2d.lineTo(originX, originY + ext); ctx2d.stroke();
    }

    ctx2d.translate(w / 2 + this.state.offsetX, h / 2 + this.state.offsetY);
    ctx2d.scale(this.state.baseScale * this.state.scale, -this.state.baseScale * this.state.scale);
    ctx2d.translate(-this.state.skeletonCenterX, -this.state.skeletonCenterY);

    if (this.state.playing && !this._setupPoseMode) {
      animState.update(delta * this.state.speed);
      if (this.state.speed < 0 && this.state.loop) {
        const track = animState.getCurrent(0);
        if (track && track.trackTime < 0 && track.animation.duration > 0) {
          track.trackTime += track.animation.duration;
        }
      }
    }
    
    const track = animState.getCurrent(0);
    const originalAlpha = skeleton.color.a;
    const currentTime = track ? track.trackTime : 0;
    
    // Draw Ghosting (Canvas2D)
    if (this.ghostingEnabled && track && this.state.playing && !this._setupPoseMode) {
      const numGhosts = 3;
      const interval = 0.05; // 50ms apart
      
      for (let i = numGhosts; i >= 1; i--) {
        let ghostTime = currentTime - (i * interval * Math.sign(this.state.speed || 1));
        if (ghostTime < 0) {
          if (track.loop && track.animation.duration > 0) ghostTime += track.animation.duration;
          else continue;
        }
        track.trackTime = ghostTime;
        animState.apply(skeleton);
        skeleton.updateWorldTransform();
        skeleton.color.a = originalAlpha * (0.1 + 0.1 * (numGhosts - i + 1));
        
        try { this.state.renderer.draw(skeleton); } catch(e) {}
      }
      
      // Restore for real render
      track.trackTime = currentTime;
      skeleton.color.a = originalAlpha;
    }

    if (!this._setupPoseMode) {
      animState.apply(skeleton);
      skeleton.updateWorldTransform();
    }

    try { this.state.renderer.draw(skeleton); } catch(e: any) {
      if (!this.renderErrorLogged) { this.renderErrorLogged = true; console.error('[RENDER-ERR]', e); }
    }

    // Draw Trail (Canvas2D)
    if (this.trackedBoneName) {
      const bone = skeleton.findBone(this.trackedBoneName);
      if (bone) {
        if (this.state.playing) {
          this.trailPoints.push({ x: bone.worldX, y: bone.worldY });
          if (this.trailPoints.length > 50) this.trailPoints.shift();
        }
        if (this.trailPoints.length > 1) {
          ctx2d.beginPath();
          ctx2d.strokeStyle = '#00f0ff';
          ctx2d.lineWidth = 2.5 / (this.state.baseScale * this.state.scale);
          ctx2d.lineCap = 'round';
          ctx2d.lineJoin = 'round';
          for (let i = 0; i < this.trailPoints.length; i++) {
            if (i === 0) ctx2d.moveTo(this.trailPoints[i].x, this.trailPoints[i].y);
            else ctx2d.lineTo(this.trailPoints[i].x, this.trailPoints[i].y);
          }
          ctx2d.stroke();
        }
      }
    }

    ctx2d.restore();
  }

  // ── WebGL Rendering (Spine 4.x) ──────────────────────────────
  private renderWebGL(delta: number) {
    if (!this.state?.gl) return;
    const { gl, canvas, skeleton, animState } = this.state;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const vz = this.state.viewZoom;

    const s = this.state.baseScale * this.state.scale;
    skeleton.x = w / 2 + this.state.offsetX;
    skeleton.y = h / 2 - this.state.offsetY;
    skeleton.scaleX = s;
    skeleton.scaleY = s;

    // Advance skeleton internal time — required for Physics constraints in Spine 4.2+
    skeleton.update(delta);

    if (this.state.playing && !this._setupPoseMode) {
      animState.update(delta * this.state.speed);
      if (this.state.speed < 0 && this.state.loop) {
        const track = animState.getCurrent(0);
        if (track && track.trackTime < 0 && track.animation.duration > 0) {
          track.trackTime += track.animation.duration;
        }
      }
    }
    const spine4 = this._spine4;
    if (!this._setupPoseMode) {
      animState.apply(skeleton);

      try {
        skeleton.updateWorldTransform(spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0 as any);
      } catch { try { skeleton.updateWorldTransform(0 as any); } catch { /* ignore */ } }
    }

    // Camera centers on canvas center
    this.state.renderer.camera.position.x = w / 2;
    this.state.renderer.camera.position.y = h / 2;
    this.state.renderer.camera.viewportWidth = w / vz;
    this.state.renderer.camera.viewportHeight = h / vz;
    this.state.renderer.camera.update();


    // Reset batcher blend to Normal before BG draw to prevent blend contamination
    const batcher = (this.state.renderer as any).batcher;
    if (batcher) {
      batcher.srcColorBlend = gl.SRC_ALPHA;
      batcher.srcAlphaBlend = gl.ONE;
      batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }

    this.state.renderer.begin();

    // Background: checkerboard for viewer, solid dark for thumbnail matte
    if (!this._capturingThumbnail) {
      if (this._thumbnailMatteMode) {
        // Solid dark background for thumbnail (no checkerboard)
        if (spine4) {
          if (!(this as any)._solidBgTex || (this as any)._solidBgW !== w || (this as any)._solidBgH !== h) {
            (this as any)._solidBgTex?.dispose?.();
            const pc = document.createElement('canvas');
            pc.width = w; pc.height = h;
            const pctx = pc.getContext('2d')!;
            pctx.fillStyle = '#1c1a38'; pctx.fillRect(0, 0, w, h);
            (this as any)._solidBgTex = new spine4.GLTexture(gl, pc as any);
            (this as any)._solidBgW = w;
            (this as any)._solidBgH = h;
          }
          if ((this as any)._solidBgTex) {
            const camW = w / vz, camH = h / vz;
            this.state.renderer.drawTexture((this as any)._solidBgTex, w / 2 - camW / 2, h / 2 - camH / 2, camW, camH);
          }
        }
      } else {
        // Normal checkerboard for viewer
        const checkerSz = 20;
        if (!this.checkerGlTexture || (this.checkerGlTexture as any)._w !== w || (this.checkerGlTexture as any)._h !== h) {
          if (this.checkerGlTexture) this.checkerGlTexture.dispose?.();
          this.checkerGlTexture = null;
          if (spine4) {
            const pc = document.createElement('canvas');
            pc.width = w; pc.height = h;
            const pctx = pc.getContext('2d')!;
            pctx.fillStyle = '#24243a'; pctx.fillRect(0, 0, w, h);
            pctx.fillStyle = '#30304a';
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
      }
    }

    // Crosshair (Origin) — skip when capturing thumbnail
    if (!this._capturingThumbnail && !this._thumbnailMatteMode) {
      if (!this.crosshairGlTexture && spine4) {
        const pc = document.createElement('canvas'); pc.width = 1; pc.height = 1;
        const pctx = pc.getContext('2d')!;
        pctx.fillStyle = 'rgba(255, 0, 0, 0.35)'; pctx.fillRect(0, 0, 1, 1);
        this.crosshairGlTexture = new spine4.GLTexture(gl, pc as any);

        const pcY = document.createElement('canvas'); pcY.width = 1; pcY.height = 1;
        const pctxY = pcY.getContext('2d')!;
        pctxY.fillStyle = 'rgba(0, 180, 0, 0.35)'; pctxY.fillRect(0, 0, 1, 1);
        (this as any).crosshairGlTextureY = new spine4.GLTexture(gl, pcY as any);
      }
    }

    // Background image — skip when capturing thumbnail
    if (this.state.bgImage && spine4 && !this._capturingThumbnail && !this._thumbnailMatteMode) {
      if (!this.bgGlTexture || this.bgImageSrc !== this.state.bgImage.src) {
        this.bgGlTexture?.dispose();
        this.bgGlTexture = new spine4.GLTexture(gl, this.state.bgImage);
        this.bgImageSrc = this.state.bgImage.src;
      }
      if (this.bgGlTexture) {
        const bgDisplayScale = this.state.baseScale * this.state.bgScale;
        const imgW = this.state.bgImage.naturalWidth * bgDisplayScale;
        const imgH = this.state.bgImage.naturalHeight * bgDisplayScale;
        const bgOriginX = w / 2 + this.state.offsetX;
        const bgOriginY = h / 2 - this.state.offsetY;
        const bx = bgOriginX - imgW / 2 + this.state.bgOffsetX * this.state.baseScale;
        const by = bgOriginY - imgH / 2 - this.state.bgOffsetY * this.state.baseScale;
        this.state.renderer.drawTexture(this.bgGlTexture, bx, by, imgW, imgH);
      }
    }

    // Crosshair lines — skip when capturing thumbnail
    if (this.crosshairGlTexture && !this._capturingThumbnail && !this._thumbnailMatteMode) {
      const lineW = 1 / vz;
      const ox = w / 2 + this.state.offsetX, oy = h / 2 - this.state.offsetY;
      const camW = w / vz, camH = h / vz;
      const vpLeft = w / 2 - camW / 2, vpTop = h / 2 - camH / 2;
      // X axis (horizontal line -> red)
      this.state.renderer.drawTexture(this.crosshairGlTexture, vpLeft, oy - lineW / 2, camW, lineW);
      // Y axis (vertical line -> green)
      const texY = (this as any).crosshairGlTextureY || this.crosshairGlTexture;
      this.state.renderer.drawTexture(texY, ox - lineW / 2, vpTop, lineW, camH);
    }
    this.state.renderer.end();


    
    const track = animState.getCurrent(0);
    const originalAlpha = skeleton.color.a;
    const currentTime = track ? track.trackTime : 0;
    
    // Draw Ghosting (WebGL)
    if (this.ghostingEnabled && track && this.state.playing) {
      const numGhosts = 4;
      const interval = 0.05; // 50ms apart
      
      for (let i = numGhosts; i >= 1; i--) {
        let ghostTime = currentTime - (i * interval * Math.sign(this.state.speed || 1));
        if (ghostTime < 0) {
          if (track.loop && track.animation.duration > 0) ghostTime += track.animation.duration;
          else continue;
        }
        track.trackTime = ghostTime;
        animState.apply(skeleton);
        try {
          skeleton.updateWorldTransform(spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0 as any);
        } catch { try { skeleton.updateWorldTransform(0 as any); } catch { /* ignore */ } }
        
        skeleton.color.a = originalAlpha * (0.05 + 0.1 * (numGhosts - i));
        
        // Reset batcher before ghost draw
        if (batcher) {
          batcher.srcColorBlend = gl.SRC_ALPHA;
          batcher.srcAlphaBlend = gl.ONE;
          batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
        }
        this.state.renderer.begin();
        try { this.state.renderer.drawSkeleton(skeleton, false); } catch(e) {}
        this.state.renderer.end();
      }
      
      // Restore for real render
      track.trackTime = currentTime;
      skeleton.color.a = originalAlpha;
      animState.apply(skeleton);
      try {
        skeleton.updateWorldTransform(spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0 as any);
      } catch { try { skeleton.updateWorldTransform(0 as any); } catch { /* ignore */ } }
    }

    // Reset batcher to Normal blend before skeleton draw
    if (batcher) {
      batcher.srcColorBlend = gl.SRC_ALPHA;
      batcher.srcAlphaBlend = gl.ONE;
      batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }

    this.state.renderer.begin();
    try { this.state.renderer.drawSkeleton(skeleton, false); } catch(e: any) {
      if (!this.renderErrorLogged) { this.renderErrorLogged = true; console.error('[RENDER-ERR]', e); }
    }
    this.state.renderer.end();

    // Force-reset batcher after skeleton draw for next frame
    if (batcher) {
      batcher.srcColorBlend = gl.SRC_ALPHA;
      batcher.srcAlphaBlend = gl.ONE;
      batcher.dstBlend = gl.ONE_MINUS_SRC_ALPHA;
    }

    // Draw Trail (WebGL)
    if (this.trackedBoneName && spine4) {
      const bone = skeleton.findBone(this.trackedBoneName);
      if (bone) {
        if (this.state.playing) {
          this.trailPoints.push({ x: bone.worldX, y: bone.worldY });
          if (this.trailPoints.length > 50) this.trailPoints.shift();
        }

        if (this.trailPoints.length > 1) {
          if (!this.shapeRenderer) {
            this.shapeRenderer = new spine4.ShapeRenderer(gl);
          }
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          this.shapeRenderer.begin(this.state.renderer.camera);
          this.shapeRenderer.setColor(0, 0.94, 1, 1); // #00f0ff (Cyan)
          for (let i = 1; i < this.trailPoints.length; i++) {
             const p1 = this.trailPoints[i - 1];
             const p2 = this.trailPoints[i];
             // Optional fade logic could be implemented by changing alpha per segment
             this.shapeRenderer.line(p1.x, p1.y, p2.x, p2.y);
          }
          this.shapeRenderer.end();
        }
      }
    }


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
    // Canvas2D (3.x) needs higher DPR to hide clip() seam artifacts; WebGL (4.x) doesn't
    this._dpr = detectedMajor < 4 ? Math.max(window.devicePixelRatio || 1, 2) : (window.devicePixelRatio || 1);
    const dpr = this._dpr;
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
    this.crosshairGlTexture = null;
    (this as any).crosshairGlTextureY = null;

    // Reset viewport state for new character
    this.state.viewZoom = 1;
    this.state.offsetX = 0;
    this.state.offsetY = 0;
    this.state.scale = 1;
    this.state.skeletonCenterX = 0;
    this.state.skeletonCenterY = 0;

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

    // Parse atlas (convert 4.x atlas format to 3.x if needed)
    const atlasTextCompat = convertAtlas4xTo3x(files.atlasText);
    const atlas = new spine.TextureAtlas(atlasTextCompat, (path: string) => {
      let img = images.get(path) || images.get(path + '.png') || images.get(path.replace(/\.png$/i, ''));
      if (!img) {
        for (const [k, v] of images) {
          if (k.toLowerCase().includes(path.toLowerCase().replace(/\.png$/i, ''))) { img = v; break; }
        }
      }
      if (!img) img = images.values().next().value;
      if (!img) throw new Error(`Missing PNG texture for atlas: ${path}`);
      return { getImage: () => img, setFilters: () => {}, setWraps: () => {} };
    });

    // Parse JSON
    const atlasLoader = new spine.AtlasAttachmentLoader(atlas);

    // Patch: return null for missing regions instead of throwing
    // spine-canvas-3.8 SkeletonJson already checks `if (region == null) return null;`
    const origNewRegion = atlasLoader.newRegionAttachment.bind(atlasLoader);
    atlasLoader.newRegionAttachment = (skin: any, name: string, path: string) => {
      try { return origNewRegion(skin, name, path); }
      catch { console.warn(`[SPINE] Missing region: ${path}`); return null; }
    };
    const origNewMesh = atlasLoader.newMeshAttachment.bind(atlasLoader);
    atlasLoader.newMeshAttachment = (skin: any, name: string, path: string) => {
      try { return origNewMesh(skin, name, path); }
      catch { console.warn(`[SPINE] Missing mesh region: ${path}`); return null; }
    };

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

    // FX fix: hide pure-FX "rec" rectangle slots with non-Normal blend (Canvas2D can't render Additive/Screen correctly)
    // and convert specific transparent glow PNGs to Additive
    for (let i = 0; i < skeleton.slots.length; i++) {
      const slot = skeleton.slots[i];
      const att = slot.getAttachment();
      // Hide white rectangle FX placeholders that use Additive/Screen
      if (slot.data.blendMode !== 0 && att?.name === 'rec') slot.color.a = 0;
      // Transparent glow PNGs need Additive, not Normal — otherwise they overlay with black rect
      if (slot.data.blendMode === 0 && att?.name === 'frost_spike_big') slot.data.blendMode = 1;
    }
    const rendererCtx = this.state.ctx2d!;
    const stateRef = this.state;
    // Off-screen canvas for RGB tinting (reused across calls)
    let tintCanvas: HTMLCanvasElement | null = null;
    let tintCtx: CanvasRenderingContext2D | null = null;

    // Monkey-patch drawTriangles to store current slot tint color before triangle calls
    const originalDrawTriangles = this.state.renderer.drawTriangles.bind(this.state.renderer);
    this.state.renderer.drawTriangles = function (skeleton: any) {
      const drawOrder = skeleton.drawOrder;
      const ctx = (this as any).ctx;
      const renderer = this as any;
      let vertices: Float32Array | number[] = renderer.vertices;
      const QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0];

      for (let i = 0, n = drawOrder.length; i < n; i++) {
        const slot = drawOrder[i];
        const attachment = slot.getAttachment();
        let texture: any = null;
        let region: any = null;
        let triangles: number[] | null = null;

        if (attachment instanceof (window as any).spine.RegionAttachment) {
          vertices = renderer.computeRegionVertices(slot, attachment, false);
          triangles = QUAD_TRIANGLES;
          region = attachment.region;
          texture = region.texture.getImage();
        } else if (attachment instanceof (window as any).spine.MeshAttachment) {
          vertices = renderer.computeMeshVertices(slot, attachment, false);
          triangles = attachment.triangles;
          texture = attachment.region.renderObject.texture.getImage();
        } else {
          continue;
        }

        if (texture != null) {
          const skeletonColor = slot.bone.skeleton.color;
          const slotColor = slot.color;
          const attachmentColor = attachment.color;
          const alpha = skeletonColor.a * slotColor.a * attachmentColor.a;
          const color = renderer.tempColor;
          color.set(
            skeletonColor.r * slotColor.r * attachmentColor.r,
            skeletonColor.g * slotColor.g * attachmentColor.g,
            skeletonColor.b * slotColor.b * attachmentColor.b,
            alpha
          );

          // Store tint for drawTriangle to use
          renderer._currentTintR = color.r;
          renderer._currentTintG = color.g;
          renderer._currentTintB = color.b;

          // Resolve blend mode
          let slotBlendMode = slot.data.blendMode;
          let blendModeNum = slotBlendMode;
          if (typeof slotBlendMode === 'object' || typeof slotBlendMode === 'string') {
            const bmStr = String(slotBlendMode).toLowerCase();
            if (bmStr.indexOf('additive') >= 0 || bmStr === '1') blendModeNum = 1;
            else if (bmStr.indexOf('multiply') >= 0 || bmStr === '2') blendModeNum = 2;
            else if (bmStr.indexOf('screen') >= 0 || bmStr === '3') blendModeNum = 3;
            else blendModeNum = 0;
          }

          ctx.globalAlpha = color.a;
          if (blendModeNum === 1) ctx.globalCompositeOperation = "lighter";
          else if (blendModeNum === 2) ctx.globalCompositeOperation = "multiply";
          else if (blendModeNum === 3) ctx.globalCompositeOperation = "screen";
          else ctx.globalCompositeOperation = "source-over";

          for (let j = 0; j < triangles!.length; j += 3) {
            const t1 = triangles![j] * 8, t2 = triangles![j + 1] * 8, t3 = triangles![j + 2] * 8;
            const x0 = vertices[t1], y0 = vertices[t1 + 1], u0 = vertices[t1 + 6], v0 = vertices[t1 + 7];
            const x1 = vertices[t2], y1 = vertices[t2 + 1], u1 = vertices[t2 + 6], v1 = vertices[t2 + 7];
            const x2 = vertices[t3], y2 = vertices[t3 + 1], u2 = vertices[t3 + 6], v2 = vertices[t3 + 7];
            renderer.drawTriangle(texture, x0, y0, u0, v0, x1, y1, u1, v1, x2, y2, u2, v2);
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

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
      const globalScale = Math.abs((stateRef?.baseScale ?? 1) * (stateRef?.scale ?? 1) * (stateRef?.viewZoom ?? 1));
      const expand = 0.4 / globalScale;
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

      // Check if tinting is needed (RGB != white)
      const renderer = stateRef.renderer as any;
      const tR = renderer._currentTintR ?? 1;
      const tG = renderer._currentTintG ?? 1;
      const tB = renderer._currentTintB ?? 1;
      const needsTint = tR < 0.99 || tG < 0.99 || tB < 0.99;

      if (needsTint) {
        // Use off-screen canvas to apply RGB tint via multiply composite
        const iw = img.width, ih = img.height;
        if (!tintCanvas || tintCanvas.width < iw || tintCanvas.height < ih) {
          tintCanvas = document.createElement('canvas');
          tintCanvas.width = iw;
          tintCanvas.height = ih;
          tintCtx = tintCanvas.getContext('2d')!;
        }
        tintCtx!.clearRect(0, 0, iw, ih);
        // Draw original texture
        tintCtx!.globalCompositeOperation = 'source-over';
        tintCtx!.drawImage(img, 0, 0);
        // Multiply with tint color
        tintCtx!.globalCompositeOperation = 'multiply';
        tintCtx!.fillStyle = `rgb(${Math.round(tR * 255)}, ${Math.round(tG * 255)}, ${Math.round(tB * 255)})`;
        tintCtx!.fillRect(0, 0, iw, ih);
        // Restore alpha from original (multiply destroys transparent areas)
        tintCtx!.globalCompositeOperation = 'destination-in';
        tintCtx!.drawImage(img, 0, 0);

        rendererCtx.save(); rendererCtx.clip(); rendererCtx.transform(a, b, c, d, e, f);
        rendererCtx.drawImage(tintCanvas!, 0, 0);
        rendererCtx.restore();
      } else {
        rendererCtx.save(); rendererCtx.clip(); rendererCtx.transform(a, b, c, d, e, f);
        rendererCtx.drawImage(img, 0, 0);
        rendererCtx.restore();
      }
    };

    // Auto-fit: use actual bounds to scale+center content within canvas
    // MUST be done after animation is applied so bounds reflect animation pose
    try {
      const stateData = new spine.AnimationStateData(skeletonData);
      stateData.defaultMix = 0.2;
      this.state.skeleton = skeleton;
      this.state.animState = new spine.AnimationState(stateData);
      // Apply first animation frame to get accurate bounds
      const anims = skeletonData.animations;
      if (anims.length > 0) {
        this.state.animState.setAnimation(0, anims[0], true);
        this.state.animState.update(0);
        this.state.animState.apply(skeleton);
        skeleton.updateWorldTransform();
      }
      const offset = new spine.Vector2(), size = new spine.Vector2();
      skeleton.getBounds(offset, size, []);
      let bW = size.x, bH = size.y;
      if (!bW || bW <= 0 || !bH || bH <= 0) {
        bW = skeletonData.width || 400;
        bH = skeletonData.height || 400;
        offset.x = -bW / 2;
        offset.y = -bH / 2;
      }
      const ch = this.state.canvas.height;
      const cw = this.state.canvas.width;
      this.state.baseScale = Math.min((cw * 0.85) / bW, (ch * 0.85) / bH, 3);
      this.state.scale = 1;
      this.state.skeletonCenterX = offset.x + bW / 2;
      this.state.skeletonCenterY = offset.y + bH / 2;
      this.state.offsetX = 0;
      this.state.offsetY = 0;
    } catch { this.state.baseScale = 0.5; this.state.scale = 1; }
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

    // Patch: return null for missing regions instead of throwing
    const origNewRegion4 = atlasLoader.newRegionAttachment.bind(atlasLoader);
    (atlasLoader as any).newRegionAttachment = (skin: any, name: string, path: string, sequence: any) => {
      try { return origNewRegion4(skin, name, path, sequence); }
      catch { console.warn(`[SPINE] Missing region: ${path}`); return null; }
    };
    const origNewMesh4 = atlasLoader.newMeshAttachment.bind(atlasLoader);
    (atlasLoader as any).newMeshAttachment = (skin: any, name: string, path: string, sequence: any) => {
      try { return origNewMesh4(skin, name, path, sequence); }
      catch { console.warn(`[SPINE] Missing mesh region: ${path}`); return null; }
    };

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

    // Auto-fit: scale to fit content within canvas
    // Use max of skeletonData and bounds to prevent clipping
    try {
      const stateData = new spine4.AnimationStateData(skeletonData);
      stateData.defaultMix = 0.2;
      this.state.skeleton = skeleton;
      this.state.animState = new spine4.AnimationState(stateData);
      // Apply first animation frame for bounds
      const anims = skeletonData.animations;
      if (anims.length > 0) {
        this.state.animState.setAnimation(0, anims[0].name, true);
        this.state.animState.update(0);
        this.state.animState.apply(skeleton);
        try {
          skeleton.updateWorldTransform(spine4?.Physics?.update ?? spine4?.Physics?.none ?? 0 as any);
        } catch { try { skeleton.updateWorldTransform(0 as any); } catch {} }
      }
      const bounds = skeleton.getBoundsRect();
      const bW = bounds.width || 0, bH = bounds.height || 0;
      const sdW = skeletonData.width || 0, sdH = skeletonData.height || 0;
      // Use the larger dimension to prevent clipping
      const refW = Math.max(bW, sdW) || 400;
      const refH = Math.max(bH, sdH) || 400;
      const ch = this.state.canvas.height;
      const cw = this.state.canvas.width;
      this.state.baseScale = Math.min((cw * 0.85) / refW, (ch * 0.85) / refH, 3);
      this.state.scale = 1;
      this.state.skeletonCenterX = 0;
      this.state.skeletonCenterY = 0;
      // Center bounds content by adjusting offset
      if (bW > 0 && bH > 0) {
        const cx = bounds.x + bW / 2;
        const cy = bounds.y + bH / 2;
        this.state.offsetX = -cx * this.state.baseScale;
        this.state.offsetY = cy * this.state.baseScale;
      } else {
        this.state.offsetX = 0;
        this.state.offsetY = 0;
      }
    } catch { this.state.baseScale = 0.5; this.state.scale = 1; }
  }

  // ── Control API ───────────────────────────────────────────────
  getBones(): string[] {
    return this.state?.skeleton?.data.bones.map((b: any) => b.name) ?? [];
  }

  setGhostingEnabled(enabled: boolean) {
    this.ghostingEnabled = enabled;
  }

  setTrackedBone(boneName: string | null) {
    this.trackedBoneName = boneName;
    this.trailPoints = [];
  }

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
  getBaseScale(): number { return this.state?.baseScale ?? 1; }
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
  setBgScale(scale: number) {
    if (this.state) { this.state.bgScale = scale; }
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
