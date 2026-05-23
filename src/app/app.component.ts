import { Component, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { LiquidGlassComponent } from './liquid-glass/liquid-glass.component';
import { GlassRendererService } from './liquid-glass/glass-renderer.service';
import { GlassState, DEFAULT_STATE } from './liquid-glass/glass-state';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LiquidGlassComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  state: GlassState = { ...DEFAULT_STATE };

  readonly defaultBgUrl = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop';

  dragX = 50;
  dragY = 50;

  private isDragging = false;
  private offsetX = 0;
  private offsetY = 0;

  constructor(private glassRenderer: GlassRendererService) {}

  ngAfterViewInit(): void {
    this.glassRenderer.loadBgTexture(this.defaultBgUrl);
  }

  ngOnDestroy(): void {
    this.isDragging = false;
  }

  onDragStart(event: MouseEvent): void {
    this.isDragging = true;
    this.offsetX = event.clientX - this.dragX;
    this.offsetY = event.clientY - this.dragY;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.dragX = event.clientX - this.offsetX;
    this.dragY = event.clientY - this.offsetY;
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.glassRenderer.captureBackground();
    }
  }
}

