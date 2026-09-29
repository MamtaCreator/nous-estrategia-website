import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/**
 * Angular renders the `muted` attribute but not the `muted` property, so Chrome's autoplay policy
 * blocks the video and only the poster shows. Set the property in code, then start playback.
 */
@Directive({ selector: 'video[appAutoplay]' })
export class AutoplayVideo implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLVideoElement>>(ElementRef).nativeElement;

  ngAfterViewInit(): void {
    this.el.muted = true;
    this.el.defaultMuted = true;
    this.el.play().catch(() => { /* autoplay blocked (e.g. data saver); poster stays visible */ });
  }
}
