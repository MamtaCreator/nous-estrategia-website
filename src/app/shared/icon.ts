import { Component, input } from '@angular/core';
import { IconName } from '../core/site';

/** Line icons from the wireframe. Stroke follows `color` (defaults to currentColor). */
@Component({
  selector: 'app-icon',
  template: `
    <svg class="icon" [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none"
         [attr.stroke]="color()" [attr.stroke-width]="strokeWidth()" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('chart') { <path d="M4 19V9M10 19V5M16 19V11M22 19V3" /> }
        @case ('megaphone') {
          <path d="M3 11v2a2 2 0 0 0 2 2h1l3 4V5L6 9H5a2 2 0 0 0-2 2Z"/><path d="M14 8a4 4 0 0 1 0 8M18 5a8 8 0 0 1 0 14"/>
        }
        @case ('process') {
          <circle cx="8" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><circle cx="8" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M10.5 9.5 14.5 14.5M14.5 9.5 10.5 14.5"/>
        }
        @case ('chip') {
          <rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>
        }
        @case ('check') { <path d="M4 12.5 9 17 20 6"/> }
        @case ('arrow') { <path d="M4 12h15M13 6l6 6-6 6"/> }
      }
    </svg>`,
  styles: ':host{display:contents}',
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(22);
  readonly color = input('currentColor');
  readonly strokeWidth = input(1.6);
}
