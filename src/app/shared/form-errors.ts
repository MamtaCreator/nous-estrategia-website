import { Component, computed, effect, input, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-form-errors',
  template: `@if (visible()) {
    <div role="alert" class="validation-errors">
      <p>Please correct the following fields:</p>
      <ul>
        @for (message of messages(); track message) {
          <li>{{ message }}</li>
        }
      </ul>
    </div>
  }`,
  styles: `
    .validation-errors {
      color: #b42318;
      padding: 12px;
      background: #fff1f0;
      border-radius: 6px;
      margin-bottom: 16px;
    }
  `,
})
export class FormErrors {
  readonly form = input.required<FormGroup>();
  readonly labels = input<Record<string, string>>({});
  // touched/invalid are plain properties, so re-render on the form's own events (needed without zone.js).
  private readonly tick = signal(0);
  protected readonly visible = computed(() => { this.tick(); return this.form().touched && this.form().invalid; });
  constructor() {
    effect((onCleanup) => {
      const sub = this.form().events.subscribe(() => this.tick.update((n) => n + 1));
      onCleanup(() => sub.unsubscribe());
    });
  }
  protected messages(): string[] {
    this.tick();
    const messages = Object.entries(this.form().controls)
      .filter(([, control]) => control.invalid)
      .map(([key, control]) => {
        const name = this.labels()[key] ?? key.replace(/([A-Z])/g, ' $1');
      if (control.hasError('entries')) return `${name}: ${control.getError('entries')}`;
      if (control.hasError('required')) return `${name} is required.`;
        if (control.hasError('email')) return `${name} must be a valid email address.`;
        if (control.hasError('minlength'))
          return `${name} must have at least ${control.getError('minlength').requiredLength} characters.`;
        if (control.hasError('maxlength'))
          return `${name} must have at most ${control.getError('maxlength').requiredLength} characters.`;
        if (control.hasError('min'))
          return `${name} must be at least ${control.getError('min').min}.`;
        if (control.hasError('max'))
          return `${name} must be at most ${control.getError('max').max}.`;
        if (key === 'phone')
          return 'Phone must use international format, e.g. +551199999999 (no spaces).';
        if (key === 'website') return 'Website must be a valid http or https URL.';
        return `${name} is invalid.`;
      });
    if (this.form().hasError('dateOrder'))
      messages.push('End date must be on or after start date.');
    if (this.form().hasError('financial')) messages.push(this.form().getError('financial'));
    return messages;
  }
}
