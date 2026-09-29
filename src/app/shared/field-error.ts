import { Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/**
 * One specific message for one field, shown only once the person has left the field (or tried to submit).
 * It re-renders from the control's own events, so it stays correct even though this app runs without zone.js.
 * `watch` lets a group-level rule (e.g. "passwords match") refresh it when a sibling field changes.
 */
@Component({
  selector: 'app-field-error',
  template: `@if (text(); as t) { <small class="error" role="alert">{{ t }}</small> }`,
  styles: `.error { display: block; color: #c62828; font-size: 12px; font-weight: 400; margin-top: 2px; }`,
})
export class FieldError {
  readonly control = input.required<AbstractControl>();
  /** Message per validator key, e.g. { required: 'Email is required.' }. The first matching key wins. */
  readonly messages = input<Record<string, string>>({});
  readonly watch = input<AbstractControl | null>(null);
  /** An extra message (from a group rule) that is shown when the field is touched and no field rule applies. */
  readonly extra = input<string>('');

  private readonly tick = signal(0);

  protected readonly text = computed(() => {
    this.tick();
    const c = this.control();
    if (!c.touched) return '';
    const errors = c.errors;
    if (errors) {
      const map = this.messages();
      const key = Object.keys(errors).find((k) => map[k]);
      return key ? map[key] : 'This value is not valid.';
    }
    return this.extra();
  });

  constructor() {
    effect((onCleanup) => {
      const subs = [this.control(), this.watch()]
        .filter((c): c is AbstractControl => !!c)
        .map((c) => c.events.subscribe(() => this.tick.update((n) => n + 1)));
      onCleanup(() => subs.forEach((s) => s.unsubscribe()));
    });
  }
}
