import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Lang, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'nous-lang';

@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly doc = inject(DOCUMENT);
  readonly lang = signal<Lang>(this.load());

  constructor() {
    effect(() => {
      const l = this.lang();
      this.doc.documentElement.lang = l;
      try { localStorage.setItem(STORAGE_KEY, l); } catch { /* storage unavailable */ }
    });
  }

  /** Reads the lang signal, so templates calling this re-render on language change. */
  t = (key: string): string => TRANSLATIONS[this.lang()][key] ?? TRANSLATIONS.en[key] ?? key;

  private load(): Lang {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'en' || v === 'es') return v;
    } catch { /* storage unavailable */ }
    return 'en';
  }
}
