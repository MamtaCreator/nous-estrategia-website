import { Injectable, effect, signal } from '@angular/core';

export type ViewMode = 'desktop' | 'mobile';
const STORAGE_KEY = 'nous-view';

/** Wireframe viewport simulator: 'mobile' narrows the page frame to 390px. */
@Injectable({ providedIn: 'root' })
export class Viewport {
  readonly mode = signal<ViewMode>(this.load());

  constructor() {
    effect(() => {
      try { localStorage.setItem(STORAGE_KEY, this.mode()); } catch { /* storage unavailable */ }
    });
  }

  private load(): ViewMode {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'desktop' || v === 'mobile') return v;
    } catch { /* storage unavailable */ }
    return 'desktop';
  }
}
