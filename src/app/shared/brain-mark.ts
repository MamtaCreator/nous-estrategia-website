import { Component, input } from '@angular/core';

/**
 * The NOUS brain logo mark — the same mark that forms the "O" in the NOUS wordmark, so the two always
 * agree. It is a bitmap rather than inline SVG because this is the supplied brand artwork; the file is
 * transparent and square, and is drawn larger than any use on the site so it stays crisp.
 */
@Component({
  selector: 'app-brain-mark',
  template: `
    <img
      class="brain-mark"
      src="images/logo-brain.png"
      alt=""
      aria-hidden="true"
      decoding="async"
      [attr.width]="size()"
      [attr.height]="size()"
      [style.opacity]="opacity()"
    />`,
  styles: ':host{display:contents}',
})
export class BrainMark {
  readonly size = input(46);
  readonly opacity = input(1);
}
