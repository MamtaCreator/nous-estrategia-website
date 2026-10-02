import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../../core/i18n';
import { PILLAR_COPY } from '../../core/pillar-copy';
import { PILLARS, pillarBySlug } from '../../core/pillars';
import { CONTACT } from '../../core/site';
import { Seo } from '../../core/seo';
import { CtaSection } from '../../shared/cta-section';
import { Icon } from '../../shared/icon';
import { AutoplayVideo } from '../../shared/autoplay-video';

/** One template for all four pillar pages; the route's `:slug` (bound via withComponentInputBinding) picks the data. */
@Component({
  selector: 'app-pillar',
  imports: [AutoplayVideo, RouterLink, CtaSection, Icon],
  templateUrl: './pillar.html',
})
export class Pillar {
  protected readonly i18n = inject(I18n);
  protected readonly contact = CONTACT;

  readonly slug = input.required<string>();
  protected readonly pillar = computed(() => pillarBySlug(this.slug()));
  protected readonly copy = computed(() => PILLAR_COPY[this.slug()]?.[this.i18n.lang()]);
  protected readonly others = computed(() => PILLARS.filter((p) => p.slug !== this.slug()));

  private readonly seo = inject(Seo);

  constructor() {
    // Tracks both the slug and the language: one component serves all four pillars, so without this
    // every pillar page would carry whichever description happened to be set first.
    effect(() => {
      const slug = this.slug();
      this.seo.apply({
        title: this.i18n.t('seo.' + slug + '.title'),
        description: this.i18n.t('seo.' + slug + '.desc'),
        path: '/' + slug,
      });
    });
  }
}
