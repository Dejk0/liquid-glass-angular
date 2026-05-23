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

  dragXfront = 50;
  dragYfront = 50;
  dragXback = 50;
  dragYback = 50;

  private isDragging = false;
  private isDraggingFront = false;
  private isDraggingBack = false;
  private offsetX = 0;
  private offsetY = 0;

  constructor(private glassRenderer: GlassRendererService) {}

  ngAfterViewInit(): void {
    this.glassRenderer.loadBgTexture(this.defaultBgUrl);
  }

  ngOnDestroy(): void {
    this.isDragging = false;
  }

  onDragStart(event: MouseEvent, type: 'front' | 'back'): void {
    this.isDragging = true;
    if (type === 'front') {
      this.isDraggingFront = true;
      this.offsetX = event.clientX - this.dragXfront;
      this.offsetY = event.clientY - this.dragYfront;
    } else {
      this.isDraggingBack = true;
      this.offsetX = event.clientX - this.dragXback;
      this.offsetY = event.clientY - this.dragYback;
    }
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    if (this.isDraggingFront) {
      this.dragXfront = event.clientX - this.offsetX;
      this.dragYfront = event.clientY - this.offsetY;
    } else if (this.isDraggingBack) {
      this.dragXback = event.clientX - this.offsetX;
      this.dragYback = event.clientY - this.offsetY;
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.isDraggingFront = false;
      this.isDraggingBack = false;
      this.glassRenderer.captureBackground();
    }
  }
}

