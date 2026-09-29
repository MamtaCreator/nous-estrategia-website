import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { AutofillSync } from '../../shared/autofill-sync';
import { FieldError } from '../../shared/field-error';

const SPECIALS = /[!@#$%^&*]/;

function maxBytes(control: AbstractControl): ValidationErrors | null {
  return new TextEncoder().encode(control.value ?? '').length > 72 ? { maxBytes: true } : null;
}

// One rule per requirement so the checklist and the field error can never disagree.
const RULES = [
  { key: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { key: 'upper', label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'digit', label: 'A number', test: (v: string) => /[0-9]/.test(v) },
  { key: 'special', label: 'A special character (! @ # $ % ^ & *)', test: (v: string) => SPECIALS.test(v) },
];

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, FieldError, AutofillSync],
  templateUrl: './register.html',
  styleUrl: './login.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      organizationName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      password: ['', [Validators.required, ...RULES.map((r) => (c: AbstractControl): ValidationErrors | null => (r.test(c.value ?? '') ? null : { [r.key]: true })), maxBytes]],
      confirmPassword: ['', Validators.required],
    },
    { validators: (g) => (g.get('password')?.value === g.get('confirmPassword')?.value ? null : { passwordMismatch: true }) },
  );

  protected readonly organizationMessages = {
    required: 'Enter your organization’s name.',
    minlength: 'That name needs at least 2 characters.',
    maxlength: 'That name can be at most 200 characters.',
  };
  protected readonly nameMessages = {
    required: 'Enter your full name.',
    minlength: 'Your name needs at least 3 characters.',
    maxlength: 'Your name can be at most 100 characters.',
  };
  protected readonly emailMessages = {
    required: 'Enter your email address.',
    email: 'That does not look like an email address (for example name@company.com).',
    maxlength: 'That email address is too long.',
  };
  protected readonly passwordMessages = {
    required: 'Choose a password.',
    length: 'Your password needs at least 8 characters.',
    upper: 'Add an uppercase letter.',
    digit: 'Add a number.',
    special: 'Add a special character (! @ # $ % ^ & *).',
    maxBytes: 'That password is too long (72 bytes maximum).',
  };
  protected readonly confirmMessages = { required: 'Repeat your password.' };

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly checklist = computed(() => RULES.map((r) => ({ label: r.label, ok: r.test(this.passwordValue()) })));

  protected readonly mismatch = () => {
    const c = this.form.controls.confirmPassword;
    return c.value && this.form.hasError('passwordMismatch') ? 'Passwords do not match.' : '';
  };

  protected onSubmit(): void {
    if (this.isLoading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const { confirmPassword: _confirm, ...request } = this.form.getRawValue();
    this.auth.register(request).subscribe({
      next: () => {
        this.notifications.success('Account created.');
        this.router.navigateByUrl('/app');
      },
      error: () => this.isLoading.set(false),
    });
  }
}
