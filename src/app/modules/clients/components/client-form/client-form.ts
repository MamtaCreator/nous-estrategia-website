import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientService } from '../../services/client.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CreateClientRequest, SubscriptionTier } from '../../../../core/models/client.model';
import { FormErrors } from '../../../../shared/form-errors';

@Component({
  selector: 'app-client-form',
  imports: [ReactiveFormsModule, RouterLink, FormErrors],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
})
export class ClientForm {
  private readonly fb = inject(FormBuilder);
  private readonly clientService = inject(ClientService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly clientId = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = this.clientId !== null;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly loadFailed = signal(false);

  protected readonly tiers: SubscriptionTier[] = ['Starter', 'Professional', 'Enterprise'];

  protected readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    industry: ['', [Validators.required, Validators.maxLength(100)]],
    country: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{1,14}$/)]],
    website: ['', [Validators.maxLength(2048), control => {
      if (!control.value) return null;
      try { return ['http:', 'https:'].includes(new URL(control.value).protocol) ? null : { url: true }; }
      catch { return { url: true }; }
    }]],
    subscriptionTier: this.fb.nonNullable.control<SubscriptionTier>('Starter'),
    finance: [false],
    marketing: [false],
    processes: [false],
    ai: [false],
  });

  constructor() {
    if (this.clientId) {
      this.isLoading.set(true);
      this.clientService.getClient(this.clientId).subscribe({
        next: (client) => {
          this.form.patchValue({
            companyName: client.companyName,
            industry: client.industry,
            country: client.country,
            email: client.email,
            subscriptionTier: client.subscriptionTier,
            finance: client.activeServices.finance,
            marketing: client.activeServices.marketing,
            processes: client.activeServices.processes,
            ai: client.activeServices.ai,
          });
          this.isLoading.set(false);
        },
        error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
      });
    }
  }

  protected onSubmit(): void {
    if (this.isSaving() || this.isLoading() || this.loadFailed()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: CreateClientRequest = {
      companyName: value.companyName,
      industry: value.industry,
      country: value.country,
      email: value.email,
      phone: value.phone,
      website: value.website || undefined,
      subscriptionTier: value.subscriptionTier,
      activeServices: {
        finance: value.finance,
        marketing: value.marketing,
        processes: value.processes,
        ai: value.ai,
      },
    };

    this.isSaving.set(true);
    const save$ = this.isEdit
      ? this.clientService.updateClient(this.clientId!, request)
      : this.clientService.createClient(request);

    save$.subscribe({
      next: (client) => {
        this.notifications.success(this.isEdit ? 'Client updated.' : 'Client created.');
        this.router.navigate(['/app/clients', client.id]);
      },
      error: () => this.isSaving.set(false),
    });
  }
}
