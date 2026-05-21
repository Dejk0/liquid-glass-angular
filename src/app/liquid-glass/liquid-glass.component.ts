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
    const rect = this.glassElRef.nativeElement.getBoundingClientRect();
    const u = this.material.uniforms;
    u['uResolution'].value.set(window.innerWidth, window.innerHeight);
    u['uGlassCenter'].value.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
    u['uGlassSize'].value.set(rect.width, rect.height);
    u['uRadius'].value    = this.state.gr;
    u['uBezel'].value     = this.state.bezel;
    u['uThickness'].value = this.state.thick;
    u['uIOR'].value       = this.state.ior;
    u['uBlur'].value      = this.state.blur;
    u['uSpecular'].value  = this.state.spec;
    u['uTint'].value      = this.state.tint;
    u['uShadow'].value    = this.state.shadow;
  }
}

