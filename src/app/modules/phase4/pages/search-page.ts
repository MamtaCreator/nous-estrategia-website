import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Phase4Service } from '../services/phase4.service';
import { SearchResponse, SearchResult } from '../../../core/models/phase4.model';

@Component({
  selector: 'app-search-page',
  imports: [RouterLink],
  styleUrl: '../../kpis/kpis.css',
  template: `
    <h1>Search</h1>
    @if ((q() ?? '').trim().length < 2) { <p class="hint">Type at least 2 characters in the search box above.</p> }
    @else if (loading()) { <p class="hint">Searching…</p> }
    @else if (failed()) { <p role="alert">Search failed. Try again.</p> }
    @else if (result(); as r) {
      <p class="hint">{{ r.totalResults }} result(s) for “{{ r.query }}”</p>
      <table>
        <thead><tr><th>Type</th><th>Match</th><th>Detail</th></tr></thead>
        <tbody>
          @for (x of r.results; track x.entityType + x.id) {
            <tr class="link" [routerLink]="link(x)">
              <td><span class="badge">{{ x.entityType }}</span></td>
              <td class="name">{{ x.title }}</td>
              <td>{{ x.snippet ?? '' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class SearchPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Phase4Service);

  readonly q = input<string | undefined>();
  protected readonly result = signal<SearchResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      const term = (this.q() ?? '').trim();
      if (term.length < 2) { this.result.set(null); return; }
      this.loading.set(true);
      this.failed.set(false);
      this.api.search(term).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (r) => { this.result.set(r); this.loading.set(false); },
        error: () => { this.loading.set(false); this.failed.set(true); },
      });
    });
  }

  protected link(x: SearchResult): string[] {
    const base = ['/app/clients', x.clientId];
    switch (x.entityType) {
      case 'Client': return ['/app/clients', x.id];
      case 'Project': return [...base, 'projects', x.id];
      case 'KPI': return [...base, 'kpis', x.id];
      case 'Dashboard': return [...base, 'dashboards', x.id];
      case 'Report': return [...base, 'reports'];
      case 'Insight': return [...base, 'insights'];
      default: return base;
    }
  }
}
