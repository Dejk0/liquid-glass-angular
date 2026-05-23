import {
  Component, AfterViewInit, OnDestroy, OnChanges,
  ContentChild, ElementRef, Input, SimpleChanges
} from '@angular/core';
import * as THREE from 'three';
import { GlassState, DEFAULT_STATE } from './glass-state';
import { GlassRendererService } from './glass-renderer.service';

@Component({
  selector: 'app-liquid-glass',
  standalone: true,
  templateUrl: './liquid-glass.component.html',
  styleUrls: ['./liquid-glass.component.scss'],
})
export class LiquidGlassComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ContentChild('glassEl') glassElRef!: ElementRef<HTMLDivElement>;

  @Input() state: GlassState = { ...DEFAULT_STATE };

  private material!: THREE.ShaderMaterial;
  private readonly syncFn = () => this.syncFromDom();

  constructor(private glassRenderer: GlassRendererService) {}

  ngAfterViewInit(): void {
    this.glassRenderer.init();
    this.material = this.glassRenderer.register(this.state, this.syncFn);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // state változásakor a shader uniform-ok a következő frame-ben frissülnek
  }

  ngOnDestroy(): void {
    this.glassRenderer.unregister(this.material, this.syncFn);
  }

  loadBgTexture(url: string): void {
    this.glassRenderer.loadBgTexture(url);
  }

  /** Olvassa a div DOM pozícióját és frissíti a saját material uniform-jait */
  syncFromDom(): void {
    if (!this.glassElRef || !this.material) return;
    const el = this.glassElRef.nativeElement;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const u = this.material.uniforms;

    // offsetWidth/Height: a CSS transform ELŐTTI tényleges méret
    const actualWidth  = el.offsetWidth;
    const actualHeight = el.offsetHeight;

    // Forgásszög kinyerése a CSS transform mátrixból ÉS a CSS rotate tulajdonságból (radián)
    let rotationRad = 0;
    const transform = style.transform;
    if (transform && transform !== 'none') {
      const m = transform.match(/matrix\(([^,]+),\s*([^,]+)/);
      if (m) rotationRad = Math.atan2(parseFloat(m[2]), parseFloat(m[1]));
    }
    // CSS `rotate:` egyéni tulajdonság (pl. rotate: 30deg) – nem kerül bele a transform mátrixba
    const rotateProp = (style as any)['rotate'];
    if (rotateProp && rotateProp !== 'none') {
      const deg  = rotateProp.match(/([\d.-]+)deg/);
      const rad  = rotateProp.match(/([\d.-]+)rad/);
      const turn = rotateProp.match(/([\d.-]+)turn/);
      if (deg)  rotationRad += parseFloat(deg[1])  * Math.PI / 180;
      else if (rad)  rotationRad += parseFloat(rad[1]);
      else if (turn) rotationRad += parseFloat(turn[1]) * 2 * Math.PI;
    }

    u['uResolution'].value.set(window.innerWidth, window.innerHeight);
    u['uGlassCenter'].value.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
    u['uGlassSize'].value.set(actualWidth, actualHeight);
    u['uRadius'].value    = parseFloat(style.borderRadius) || this.state.gr;
    u['uBezel'].value     = this.state.bezel;
    u['uThickness'].value = this.state.thick;
    u['uIOR'].value       = this.state.ior;
    u['uBlur'].value      = this.state.blur;
    u['uSpecular'].value  = this.state.spec;
    u['uTint'].value      = this.state.tint;
    u['uShadow'].value    = parseFloat(style.boxShadow.split(' ')[3]) || this.state.shadow;
    u['uRotation'].value  = rotationRad;
  }
}

