import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
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
  private bgAspect = 1.5;

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
    });
    this.resizeObserver.observe(document.body);

    this.ngZone.runOutsideAngular(() => this.renderLoop());
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
        uBgTex:       { value: this.bgTexture },
        uBgAspect:    { value: this.bgAspect },
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

  /** Háttér textúra betöltése – minden regisztrált ablakhoz frissíti */
  loadBgTexture(url: string): void {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      this.bgTexture = tex;
      this.bgAspect = tex.image.width / tex.image.height;

      this.scene.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material as THREE.ShaderMaterial;
        if (mat?.uniforms?.['uBgTex']) {
          mat.uniforms['uBgTex'].value = tex;
          mat.uniforms['uBgAspect'].value = this.bgAspect;
        }
      });

      const bgEl = document.getElementById('bg') as HTMLDivElement;
      if (bgEl) bgEl.style.background = `url('${url}') center/cover no-repeat`;
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
