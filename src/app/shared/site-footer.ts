import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n';
import { NAV_LINKS } from '../core/nav';
import { CONTACT } from '../core/site';
import { WhatsappIcon } from './whatsapp-icon';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, WhatsappIcon],
  template: `
    <footer class="site-footer">
      <div class="inner">
        <div class="foot-grid">
          <div class="foot-col">
            <a class="logo" routerLink="/" aria-label="NOUS Estrategia — home">
              <span class="logo-chip"><img class="logo-img" src="images/logo-nous.png" alt="NOUS Estrategia" width="961" height="293"></span>
            </a>
            <p class="fine fine-light">{{ i18n.t('footer.tagline') }}</p>
            <img class="foot-badge" src="images/badge-wow.png" alt="¡WOW! Customer Service recognition badge" loading="lazy">
          </div>
          <div class="foot-col">
            <p class="kicker">{{ i18n.t('footer.navigation') }}</p>
            <ul class="foot-list">
              @for (l of links; track l.fragment) {
                <li><a class="foot-link" routerLink="/" [fragment]="l.fragment">{{ i18n.t(l.key) }}</a></li>
              }
            </ul>
          </div>
          <div class="foot-col">
            <p class="kicker">{{ i18n.t('footer.contact') }}</p>
            <ul class="foot-list">
              <li><a class="foot-link" [href]="contact.whatsappHref" target="_blank" rel="noopener">{{ i18n.t('footer.whatsappLine') }}</a></li>
              <li><a class="foot-link" [href]="'mailto:' + contact.email">{{ contact.email }}</a></li>
              <li><a class="foot-link" [href]="contact.mapsHref" target="_blank" rel="noopener">{{ i18n.t('footer.city') }}</a></li>
            </ul>
          </div>
          <div class="foot-col foot-wa">
            <p class="kicker">{{ i18n.t('footer.whatsapp') }}</p>
            <a class="whatsapp-link whatsapp-link-footer" [href]="contact.whatsappHref" target="_blank" rel="noopener" aria-label="WhatsApp">
              <app-whatsapp-icon [size]="52" />
            </a>
          </div>
        </div>
        <p class="fine fine-light foot-rights">{{ i18n.t('footer.rights') }}</p>
      </div>
    </footer>`,
  styles: ':host{display:contents}',
})
export class SiteFooter {
  protected readonly i18n = inject(I18n);
  protected readonly contact = CONTACT;
  protected readonly links = NAV_LINKS;
}
