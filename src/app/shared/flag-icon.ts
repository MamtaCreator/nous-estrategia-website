import { Component, computed, input } from '@angular/core';

let nextId = 0;

/**
 * A small flag for the language switch: the Union Jack for English, Colombia's for Spanish.
 *
 * Drawn as SVG rather than used as emoji, because Windows has no flag glyphs - 🇬🇧 renders there as the
 * letters "GB" and 🇨🇴 as "CO", which is exactly the audience this site is for. SVG also stays crisp and
 * costs no extra request.
 */
@Component({
  selector: 'app-flag',
  template: `
    @if (country() === 'gb') {
      <svg class="flag" viewBox="0 0 60 30" [attr.width]="width()" [attr.height]="height()" aria-hidden="true" focusable="false">
        <defs>
          <!-- Limits the red diagonals to one side of each arm, which is what gives the saltire its
               offset rather than a symmetrical X. -->
          <clipPath [attr.id]="clipId">
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
          </clipPath>
        </defs>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" [attr.clip-path]="'url(#' + clipId + ')'" stroke="#c8102e" stroke-width="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" stroke-width="6" />
      </svg>
    } @else {
      <!-- Colombia: the yellow band is half the height, the blue and red a quarter each. -->
      <svg class="flag" viewBox="0 0 60 30" [attr.width]="width()" [attr.height]="height()" aria-hidden="true" focusable="false">
        <rect width="60" height="15" fill="#fcd116" />
        <rect y="15" width="60" height="7.5" fill="#003893" />
        <rect y="22.5" width="60" height="7.5" fill="#ce1126" />
      </svg>
    }
  `,
  styles: `
    :host { display: inline-flex; }
    .flag {
      display: block;
      border-radius: 2px;
      /* A hairline keeps the white of the Union Jack from bleeding into a light header. */
      box-shadow: 0 0 0 1px rgba(24, 34, 54, 0.18);
    }
  `,
})
export class FlagIcon {
  readonly country = input.required<'gb' | 'co'>();
  readonly width = input(18);
  protected readonly height = computed(() => Math.round((this.width() / 2) * 10) / 10);
  protected readonly clipId = `flag-clip-${nextId++}`;
}
