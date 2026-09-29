import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormGroupDirective } from '@angular/forms';

/**
 * Browsers can put a saved or restored value into an input without firing any event, so the visible text and the
 * Angular form disagree (the field looks filled but validates as empty). This copies what is on screen into the
 * form: just before a submit, when a field gets focus or changes, right after load, and when the page is restored.
 */
@Directive({ selector: 'form[appAutofillSync]' })
export class AutofillSync implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLFormElement>>(ElementRef).nativeElement;
  private readonly group = inject(FormGroupDirective);
  private readonly timers: ReturnType<typeof setTimeout>[] = [];

  private readonly sync = (): void => {
    for (const input of Array.from(this.el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[formcontrolname]'))) {
      const control = this.group.form.get(input.getAttribute('formcontrolname') ?? '');
      if (!control || input.type === 'checkbox' || input.type === 'radio') continue;
      if (input.value !== '' && input.value !== control.value) {
        control.setValue(input.value);
        control.markAsDirty();
      }
    }
  };

  ngOnInit(): void {
    // Capture phase so it runs before Angular's own submit handler validates the form.
    this.el.addEventListener('submit', this.sync, true);
    this.el.addEventListener('focusin', this.sync);
    this.el.addEventListener('change', this.sync);
    window.addEventListener('pageshow', this.sync);
    for (const ms of [0, 250, 1000]) this.timers.push(setTimeout(this.sync, ms));
  }

  ngOnDestroy(): void {
    this.el.removeEventListener('submit', this.sync, true);
    this.el.removeEventListener('focusin', this.sync);
    this.el.removeEventListener('change', this.sync);
    window.removeEventListener('pageshow', this.sync);
    this.timers.forEach(clearTimeout);
  }
}
