import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { I18n } from './i18n';

const SITE = 'https://nousestrategia.com';
const SITE_NAME = 'NOUS Estrategia';
const SHARE_IMAGE = `${SITE}/images/og-cover.png`;

export interface PageSeo {
  title: string;
  description: string;
  /** Path including the leading slash, e.g. "/finance". */
  path: string;
}

/**
 * Sets the title, description, canonical and share tags for the page being viewed.
 *
 * Public routes are rendered in Spanish at build time, including these tags. Browser navigation and
 * language changes then update the same tags. Non-public routes remain noindex.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly i18n = inject(I18n);
  private readonly organization = this.doc.querySelector('#organization-schema')?.textContent ?? '';

  applyRoute(route: string): void {
    const path = route.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    const key = path === '/' ? 'home' : path.slice(1);
    if (!['/', '/finance', '/marketing', '/process', '/ai'].includes(path)) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, follow' });
      this.doc.querySelector('link[rel="canonical"]')?.remove();
      this.doc.querySelector('#organization-schema')?.remove();
      this.meta.removeTag('name="description"');
      for (const tag of Array.from(this.doc.head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]'))) tag.remove();
      return;
    }
    this.apply({ title: this.i18n.t(`seo.${key}.title`), description: this.i18n.t(`seo.${key}.desc`), path });
    if (!this.doc.querySelector('#organization-schema') && this.organization) {
      const script = this.doc.createElement('script');
      script.id = 'organization-schema';
      script.type = 'application/ld+json';
      script.textContent = this.organization;
      this.doc.head.appendChild(script);
    }
  }

  apply(page: PageSeo): void {
    // Static hosts serve directory indexes, redirecting /finance to /finance/.
    const url = `${SITE}${page.path === '/' ? '/' : page.path + '/'}`;

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1' });
    this.meta.updateTag({ property: 'og:locale', content: this.i18n.lang() === 'es' ? 'es_CO' : 'en_US' });
    this.meta.updateTag({ property: 'og:locale:alternate', content: this.i18n.lang() === 'es' ? 'en_US' : 'es_CO' });

    // Open Graph and X read their own tags, so both sets have to be kept in step.
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: SHARE_IMAGE });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: SHARE_IMAGE });
    this.meta.updateTag({ name: 'twitter:image:alt', content: SITE_NAME });

    this.setCanonical(url);
  }

  /**
   * One canonical link, kept in place rather than appended to.
   *
   * Without this every navigation would add another, and a page advertising several canonical URLs is
   * treated as having none.
   */
  private setCanonical(url: string): void {
    const head = this.doc.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
