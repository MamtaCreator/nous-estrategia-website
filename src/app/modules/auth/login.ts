import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AutofillSync } from '../../shared/autofill-sync';
import { FieldError } from '../../shared/field-error';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, FieldError, AutofillSync],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isLoading = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.maxLength(200)]],
  });

  protected readonly emailMessages = { required: 'Enter your email address.', email: 'That does not look like an email address.' };
  protected readonly passwordMessages = { required: 'Enter your password.', maxlength: 'That password is too long.' };

  protected get email() {
    return this.form.controls.email;
  }

  protected get password() {
    return this.form.controls.password;
  }

  protected onSubmit(): void {
    if (this.isLoading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.notifications.success('Welcome back.');
        const requested = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
        const returnUrl = /^\/app(?:[/?#]|$)/.test(requested) ? requested : '/app';
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        // The error interceptor already surfaces the backend's message as a toast.
        this.isLoading.set(false);
      },
    });
  }
}
