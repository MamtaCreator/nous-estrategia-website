import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Phase4Service } from '../services/phase4.service';
import { ClientService } from '../../clients/services/client.service';
import { Client } from '../../../core/models/client.model';
import { AppNotification } from '../../../core/models/phase4.model';

@Component({
  selector: 'app-notifications-page',
  styleUrl: '../../kpis/kpis.css',
  template: `
    <div class="header">
      <h1>Notifications</h1>
      <div class="actions">
        @if (clients().length > 1) {
          <select aria-label="Client" (change)="pickClient($any($event.target).value)">
            @for (c of clients(); track c.id) { <option [value]="c.id" [selected]="c.id === clientId()">{{ c.companyName }}</option> }
          </select>
        }
        <label class="check"><input type="checkbox" [checked]="unreadOnly()" (change)="unreadOnly.set($any($event.target).checked); load()" /> Unread only</label>
        <button type="button" class="btn" (click)="readAll()" [disabled]="!items().length">Mark all read</button>
      </div>
    </div>

    <!-- Loading and failure come first: until the client list arrives there is nothing to conclude from an empty one. -->
    @if (loading()) { <p class="hint">Loading…</p> }
    @else if (failed()) { <p role="alert">Could not load notifications. <button type="button" (click)="load()">Try again</button></p> }
    @else if (!clientId()) { <p class="hint">No clients are assigned to you yet.</p> }
    @else if (items().length === 0) { <p class="hint">Nothing here.</p> }
    @else {
      <div class="cards">
        @for (n of items(); track n.id) {
          <div class="card" [style.opacity]="n.isRead ? 0.65 : 1">
            <h3>{{ n.title }} <span class="badge" [class.red]="n.type === 'Alert' || n.type === 'ReportFailed'">{{ n.type }}</span></h3>
            <p>{{ n.message }}</p>
            <div class="meta">{{ n.createdAt.slice(0, 16).replace('T', ' ') }}</div>
            @if (!n.isRead) { <button type="button" class="btn" (click)="read(n)">Mark read</button> }
          </div>
        }
      </div>
    }
  `,
})
export class NotificationsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Phase4Service);
  private readonly clientService = inject(ClientService);

  protected readonly clients = signal<Client[]>([]);
  protected readonly clientId = signal<string | null>(null);
  protected readonly items = signal<AppNotification[]>([]);
  protected readonly unreadOnly = signal(false);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  constructor() {
    this.clientService.loadClients({ page: 1, limit: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => { this.clients.set(rows); this.clientId.set(rows[0]?.id ?? null); rows.length ? this.load() : this.loading.set(false); },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }

  protected pickClient(id: string): void { this.clientId.set(id); this.load(); }

  protected load(): void {
    const id = this.clientId();
    if (!id) return;
    this.loading.set(true);
    this.failed.set(false);
    this.api.notifications(id, this.unreadOnly()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.items.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }

  protected read(n: AppNotification): void {
    this.api.markRead(n.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.load() });
  }

  protected readAll(): void {
    const id = this.clientId();
    if (id) this.api.markAllRead(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.load() });
  }
}
