import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { I18n } from './core/i18n';
import { Viewport } from './core/viewport';
import { SiteFooter } from './shared/site-footer';
import { SiteHeader } from './shared/site-header';
import { ToastHost } from './shared/toast-host';

const CRM_PREFIXES = ['/login', '/register', '/app'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, ToastHost],
  templateUrl: './app.html',
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly viewport = inject(Viewport);
  private readonly router = inject(Router);

  // The marketing site's review chrome (language/viewport toggles, header, footer) only makes
  // sense on the wireframe pages — the CRM app (login/register/app) gets a clean host instead.
  protected readonly isCrmRoute = signal(this.matchesCrm(this.router.url));

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isCrmRoute.set(this.matchesCrm(event.urlAfterRedirects));
      }
    });
  }

  private matchesCrm(url: string): boolean {
    return CRM_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`));
  }
}
