import { Injectable, signal } from '@angular/core';

const KEY = 'nous_workspace_name';

/**
 * Who is using the workspace, for this browser session only.
 *
 * This is deliberately not authentication and does not pretend to be. The workspace runs entirely in the
 * browser: the spreadsheet a person opens is read on their own machine and never sent anywhere, so there
 * is no data here belonging to anyone else and nothing for a password to protect. Asking for a name is
 * only so the page can address them and label what they export.
 *
 * sessionStorage rather than localStorage, so closing the tab ends it - on a shared machine the next
 * person starts clean rather than inheriting someone else's name.
 */
@Injectable({ providedIn: 'root' })
export class SessionName {
  private readonly nameSignal = signal<string | null>(read());
  readonly name = this.nameSignal.asReadonly();

  set(value: string): void {
    const trimmed = value.trim().slice(0, 60);
    if (!trimmed) return;
    this.nameSignal.set(trimmed);
    try {
      sessionStorage.setItem(KEY, trimmed);
    } catch {
      // Private windows and blocked site data throw here. The name still works for this page view;
      // it simply will not survive a reload, which is a fair trade for not breaking entirely.
    }
  }

  clear(): void {
    this.nameSignal.set(null);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Nothing to recover from: the signal is already cleared, which is what the UI reads.
    }
  }
}

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
