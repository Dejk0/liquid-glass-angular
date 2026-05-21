import { Component, AfterViewInit } from '@angular/core';
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
export class AppComponent implements AfterViewInit {
  state: GlassState = { ...DEFAULT_STATE };

  readonly defaultBgUrl = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop';

  constructor(private glassRenderer: GlassRendererService) {}

  ngAfterViewInit(): void {
    this.glassRenderer.loadBgTexture(this.defaultBgUrl);
  }
}

