import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import html2canvas from 'html2canvas';
import { vertexShader } from './shaders/vertex.glsl';
import { fragmentShader } from './shaders/fragment.glsl';
import { GlassState } from './glass-state';

@Injectable({ providedIn: 'root' })
export class GlassRendererService {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private animFrameId = 0;
  private resizeObserver!: ResizeObserver;
  private initialized = false;
  private bgTexture: THREE.Texture | null = null;
  private bgAspect = 1;
  /** html2canvas snapshot folyamatban van-e */
  private capturing = false;
  private scrollDebounceTimer = 0;

  constructor(private ngZone: NgZone) {}

  /** Egyszeri inicializálás – az első glass komponens hívja meg */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const canvas = document.getElementById('gl') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.resizeObserver = new ResizeObserver(() => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.captureBackground();
    });
    this.resizeObserver.observe(document.body);

    this.ngZone.runOutsideAngular(() => this.renderLoop());

    // Scroll eseményre debounce-olt újra-capture
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });

    // Első snapshot: egy frame-et várunk, hogy az Angular renderelés befejeződjön
    requestAnimationFrame(() => this.captureBackground());
  }

  private syncCallbacks: Array<() => void> = [];

  /** Regisztrál egy új glass ablakot – visszaadja a hozzá tartozó material-t */
  register(state: GlassState, syncFn: () => void): THREE.ShaderMaterial {
    this.syncCallbacks.push(syncFn);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uGlassCenter: { value: new THREE.Vector2(0, 0) },
        uGlassSize:   { value: new THREE.Vector2(state.gw, state.gh) },
        uRadius:      { value: state.gr },
        uBezel:       { value: state.bezel },
        uThickness:   { value: state.thick },
        uIOR:         { value: state.ior },
        uBlur:        { value: state.blur },
        uSpecular:    { value: state.spec },
        uTint:        { value: state.tint },
        uShadow:      { value: state.shadow },
        uRotation:    { value: (state.rotation ?? 0) * Math.PI / 180 },
        uBgTex:       { value: this.bgTexture },
        uBgAspect:    { value: this.bgAspect },
        // uBgRect: mindig a teljes viewport – a snapshot 1:1 lefedi a képernyőt
        uBgRect:      { value: new THREE.Vector4(0, 0, window.innerWidth, window.innerHeight) },
      },
      transparent: true,
      depthTest: false,
    });

    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    return material;
  }

  /** Törli a glass ablakot a scene-ből */
  unregister(material: THREE.ShaderMaterial, syncFn: () => void): void {
    this.syncCallbacks = this.syncCallbacks.filter(fn => fn !== syncFn);
    const mesh = this.scene.children.find(
      (c) => (c as THREE.Mesh).material === material
    ) as THREE.Mesh | undefined;
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
    }
  }

  private onScroll(): void {
    clearTimeout(this.scrollDebounceTimer);
    this.scrollDebounceTimer = window.setTimeout(() => this.captureBackground(), 150);
  }

  /**
   * html2canvas segítségével snapshot-ot készít az aktuálisan látható
   * viewport-ról (scroll pozíció figyelembevételével), a WebGL canvas nélkül.
   * Hívható kívülről is, ha az oldal tartalma megváltozik.
   */
  captureBackground(): void {
    if (this.capturing) return;
    this.capturing = true;
    const t0 = performance.now();

    const glCanvas = document.getElementById('gl') as HTMLCanvasElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    html2canvas(document.body, {
      useCORS: true,
      allowTaint: false,
      ignoreElements: (el: Element) =>
        el === glCanvas || el.tagName.toLowerCase() === 'app-liquid-glass',
      logging: false,
      // Csak a viewport látható területét fotózzuk
      x: scrollX,
      y: scrollY,
      width: vpW,
      height: vpH,
      windowWidth: vpW,
      windowHeight: vpH,
    }).then((snapshotCanvas) => {
      const oldTex = this.bgTexture;

      const tex = new THREE.CanvasTexture(snapshotCanvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      this.bgTexture = tex;
      this.bgAspect = snapshotCanvas.width / snapshotCanvas.height;

      const w = window.innerWidth;
      const h = window.innerHeight;

      this.scene.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material as THREE.ShaderMaterial;
        if (!mat?.uniforms) return;
        mat.uniforms['uBgTex'].value = tex;
        mat.uniforms['uBgAspect'].value = this.bgAspect;
        mat.uniforms['uBgRect'].value.set(0, 0, w, h);
      });

      oldTex?.dispose();
      console.log(`[GlassRenderer] captureBackground: ${(performance.now() - t0).toFixed(1)} ms`);
      this.capturing = false;
    }).catch(() => {
      console.warn(`[GlassRenderer] captureBackground failed after ${(performance.now() - t0).toFixed(1)} ms`);
      this.capturing = false;
    });
  }

  /** @deprecated – URL-alapú textúra helyett használd a captureBackground()-t */
  loadBgTexture(url: string): void {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      const oldTex = this.bgTexture;
      this.bgTexture = tex;
      this.bgAspect = tex.image.width / tex.image.height;

      const w = window.innerWidth;
      const h = window.innerHeight;

      this.scene.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material as THREE.ShaderMaterial;
        if (!mat?.uniforms) return;
        mat.uniforms['uBgTex'].value = tex;
        mat.uniforms['uBgAspect'].value = this.bgAspect;
        mat.uniforms['uBgRect'].value.set(0, 0, w, h);
      });

      oldTex?.dispose();
    });
  }

  private renderLoop(): void {
    this.animFrameId = requestAnimationFrame(() => this.renderLoop());
    this.syncCallbacks.forEach(fn => fn());
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
  }
}
