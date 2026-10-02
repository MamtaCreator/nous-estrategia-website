import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n';
import { AuthService } from '../core/services/auth.service';
import { NAV_LINKS } from '../core/nav';
import { FlagIcon } from './flag-icon';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, FlagIcon],
  template: `
    <header class="site-header" id="top">
      <div class="header-inner">
        <a class="logo" routerLink="/" aria-label="NOUS Estrategia — home">
          <img class="logo-img" src="images/logo-nous-full.png" alt="NOUS Estrategia" width="297" height="150">
        </a>
        <nav class="nav">
          @for (l of links; track l.fragment) {
            <a class="nav-link" routerLink="/" [fragment]="l.fragment">{{ i18n.t(l.key) }}</a>
          }
        </nav>
        <div class="header-actions">
          <div class="lang-inline" role="group" aria-label="Language">
            <!-- The flag is decorative and the code is the label. No aria-label here on purpose: one
                 would replace "EN" as the button's name, and a name that does not contain the visible
                 text leaves anyone driving the page by voice saying "click EN" with nothing to hit.
                 The group's own label already supplies the context. -->
            <button type="button" [attr.aria-pressed]="i18n.lang() === 'en'" (click)="i18n.lang.set('en')">
              <app-flag country="gb" />EN
            </button>
            <span class="lang-sep">/</span>
            <button type="button" [attr.aria-pressed]="i18n.lang() === 'es'" (click)="i18n.lang.set('es')">
              <app-flag country="co" />ES
            </button>
          </div>
          <!-- Sign-in is hidden from the public navigation for now. Someone with a live session still gets
               their way back into the app; a visitor is offered no way in. The /login route itself is
               untouched and still reachable directly by URL. -->
          @if (auth.isAuthenticated()) {
            <a class="nav-link signin" routerLink="/app">{{ i18n.t('nav.app') }}</a>
          }
          <a class="btn btn-primary btn-sm" routerLink="/" fragment="contact">{{ i18n.t('nav.consult') }}</a>
          <button class="menu-btn" type="button" aria-label="Menu" aria-controls="mobile-panel"
                  [attr.aria-expanded]="menuOpen()" [class.open]="menuOpen()" (click)="menuOpen.set(!menuOpen())">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <nav class="mobile-panel" id="mobile-panel" [class.open]="menuOpen()" [attr.aria-hidden]="!menuOpen()">
        @for (l of links; track l.fragment) {
          <a class="mobile-link" routerLink="/" [fragment]="l.fragment" (click)="menuOpen.set(false)">{{ i18n.t(l.key) }}</a>
        }
        @if (auth.isAuthenticated()) {
          <a class="mobile-link" routerLink="/app" (click)="menuOpen.set(false)">{{ i18n.t('nav.app') }}</a>
        }
        <a class="btn btn-primary btn-sm" routerLink="/" fragment="contact" (click)="menuOpen.set(false)">{{ i18n.t('nav.consult') }}</a>
      </nav>
    </header>`,
  styles: ':host{display:contents}',
})
export class SiteHeader {
  protected readonly i18n = inject(I18n);
  protected readonly auth = inject(AuthService);
  protected readonly links = NAV_LINKS;
  protected readonly menuOpen = signal(false);
}
