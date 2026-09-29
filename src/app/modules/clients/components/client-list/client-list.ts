import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ClientService } from '../../services/client.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-client-list',
  imports: [RouterLink, MatPaginatorModule],
  templateUrl: './client-list.html',
  styleUrl: './client-list.css',
})
export class ClientList {
  protected readonly clientService = inject(ClientService);
  protected readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly isLoading = signal(false);
  protected readonly loadFailed = signal(false);

  protected readonly canWrite = this.auth.canWrite;
  protected readonly canDelete = this.auth.isAdmin;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.clientService.loadClients({ page: this.page(), limit: this.limit() }).subscribe({
      next: () => this.isLoading.set(false),
      error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
    });
  }

  protected onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.load();
  }

  protected nextPage(): void {
    const pagination = this.clientService.pagination();
    if (!pagination || this.page() >= pagination.pages) return;
    this.page.update((p) => p + 1);
    this.load();
  }

  protected prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.load();
  }

  protected deleteClient(id: string, companyName: string): void {
    if (!confirm(`Delete ${companyName}? This cannot be undone.`)) return;
    this.clientService.deleteClient(id).subscribe({
      next: () => {
        this.notifications.success('Client deleted.');
        if (this.clientService.clients().length === 0 && this.page() > 1) this.page.update(page => page - 1);
        this.load();
      },
      error: () => {}, // The global interceptor reports the failure.
    });
  }
}
