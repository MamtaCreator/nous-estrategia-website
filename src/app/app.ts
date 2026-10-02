import { Component, effect, inject, signal } from '@angular/core';
import { Seo } from './core/seo';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { I18n } from './core/i18n';
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
  private readonly router = inject(Router);
  private readonly seo = inject(Seo);
  private readonly currentUrl = signal(this.router.url);

  // The marketing site's chrome (language toggle, header, footer) only makes
  // sense on the wireframe pages — the CRM app (login/register/app) gets a clean host instead.
  protected readonly isCrmRoute = signal(this.matchesCrm(this.router.url));

  constructor() {
    effect(() => this.seo.applyRoute(this.currentUrl()));
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
        this.isCrmRoute.set(this.matchesCrm(event.urlAfterRedirects));
      }
    });
  }

  private matchesCrm(url: string): boolean {
    return CRM_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`));
  }
}
