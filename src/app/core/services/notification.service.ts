import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

// Shared toast store for both anonymous and authenticated pages.
// <app-toast-host/> renders `toasts()` and each toast self-dismisses after its timeout.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.push('success', message, 3000);
  }

  error(message: string): void {
    this.push('error', message, 6000);
  }

  warning(message: string): void {
    this.push('warning', message, 4000);
  }

  info(message: string): void {
    this.push('info', message, 3000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, message: string, timeoutMs: number): void {
    if (this.toasts().some(toast => toast.kind === kind && toast.message === message)) return;
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), timeoutMs);
  }
}
