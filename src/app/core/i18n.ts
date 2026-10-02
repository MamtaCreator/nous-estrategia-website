import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { Lang, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'nous-lang';

@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly doc = inject(DOCUMENT);
  readonly lang = signal<Lang>(this.load());

  constructor() {
    effect(() => {
      const l = this.lang();
      this.doc.documentElement.lang = l;
      if (this.isBrowser) {
        try { localStorage.setItem(STORAGE_KEY, l); } catch { /* storage unavailable */ }
      }
    });
  }

  /** Reads the lang signal, so templates calling this re-render on language change. */
  t = (key: string): string => TRANSLATIONS[this.lang()][key] ?? TRANSLATIONS.en[key] ?? key;

  private load(): Lang {
    if (!this.isBrowser) return 'es';
    // A choice already made always wins.
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'en' || v === 'es') return v;
    } catch { /* storage unavailable */ }

    // Otherwise follow the browser. Starting everyone in English meant a Spanish-speaking visitor was
    // offered Chrome's machine translation instead of the site's own Spanish - which is how "Clientes"
    // reached the screen as "Clientela" and "Analítica de Datos" as "Análisis de datos". The wording here
    // is written; the translation was not.
    try {
      const preferred = navigator.languages?.[0] ?? navigator.language;
      if (preferred?.toLowerCase().startsWith('es')) return 'es';
    } catch { /* navigator unavailable, e.g. during server-side rendering */ }

    return 'en';
  }
}
