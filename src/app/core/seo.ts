import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

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
 * index.html carries a Spanish default for crawlers that do not run JavaScript. This replaces those
 * values for the ones that do - Google among them - so each page describes itself rather than every
 * page claiming to be the home page.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  apply(page: PageSeo): void {
    const url = `${SITE}${page.path === '/' ? '/' : page.path}`;

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });

    // Open Graph and X read their own tags, so both sets have to be kept in step.
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: SHARE_IMAGE });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: SHARE_IMAGE });

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
