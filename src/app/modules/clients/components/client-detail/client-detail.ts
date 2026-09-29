import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientService } from '../../services/client.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-client-detail',
  imports: [RouterLink],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.css',
})
export class ClientDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  protected readonly clientService = inject(ClientService);
  protected readonly auth = inject(AuthService);

  private readonly id = this.route.snapshot.paramMap.get('id')!;
  protected readonly isLoading = signal(true);

  protected readonly canWrite = this.auth.canWrite;
  protected readonly canDelete = this.auth.isAdmin;

  constructor() {
    this.clientService.getClient(this.id).subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }

  protected deleteClient(): void {
    const client = this.clientService.selectedClient();
    if (!client || !confirm(`Delete ${client.companyName}? This cannot be undone.`)) return;
    this.clientService.deleteClient(client.id).subscribe({
      next: () => {
        this.notifications.success('Client deleted.');
        this.router.navigateByUrl('/app/clients');
      },
    });
  }
}
