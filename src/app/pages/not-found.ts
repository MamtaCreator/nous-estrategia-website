import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n';

@Component({
  imports: [RouterLink],
  template: `<main class="inner" style="padding-block:100px">
    <h1>{{ i18n.lang() === 'es' ? 'Página no encontrada' : 'Page not found' }}</h1>
    <a routerLink="/">{{ i18n.lang() === 'es' ? 'Volver al inicio' : 'Back to home' }}</a>
  </main>`,
})
export class NotFound { protected readonly i18n = inject(I18n); }
