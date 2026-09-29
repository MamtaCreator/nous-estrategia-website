import { Injectable, computed, signal } from '@angular/core';

// Tracks in-flight HTTP requests so the app can show a single global spinner.
// Incremented/decremented by the loading interceptor, not called directly by feature code.
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly requestCount = signal(0);
  readonly isLoading = computed(() => this.requestCount() > 0);

  start(): void {
    this.requestCount.update((n) => n + 1);
  }

  stop(): void {
    this.requestCount.update((n) => Math.max(0, n - 1));
  }
}
