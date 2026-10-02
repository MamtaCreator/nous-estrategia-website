import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../../core/i18n';
import { PILLARS } from '../../core/pillars';
import { BRAND } from '../../core/site';
import { BrainMark } from '../../shared/brain-mark';
import { CtaSection } from '../../shared/cta-section';
import { HeroCarousel } from '../../shared/hero-carousel';
import { Icon } from '../../shared/icon';
import { AutoplayVideo } from '../../shared/autoplay-video';
import { AnalyticsDashboard } from '../../shared/analytics-dashboard';
import { KpiAnalytics } from '../../shared/kpi-analytics';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [AnalyticsDashboard, KpiAnalytics, AutoplayVideo, RouterLink, BrainMark, CtaSection, HeroCarousel, Icon],
  templateUrl: './home.html',
})
export class Home {
  protected readonly i18n = inject(I18n);
  protected readonly auth = inject(AuthService);

  protected readonly metrics = [
    { n: 1, color: BRAND.gold },
    { n: 2, color: BRAND.cyan },
    { n: 3, color: BRAND.blue },
    { n: 4, color: BRAND.violet },
  ];

  /** Service tiles reuse the pillar registry for slug / icon / colour; the first is the featured entry point. */
  protected readonly tiles = PILLARS.map((p) => ({ slug: p.slug, icon: p.icon, color: p.color, featured: p.num === 1 }));

  protected readonly analyticsChips = [1, 2, 3, 4, 5];
  protected readonly why = [
    { n: 1, color: BRAND.blue },
    { n: 2, color: BRAND.cyan },
    { n: 3, color: BRAND.indigo },
    { n: 4, color: BRAND.violet },
  ];
  /**
   * Real client logos, replacing the six dashed placeholders.
   *
   * The name is carried alongside each file because it becomes the image's alt text: a logo conveys who
   * the client is, so a screen reader that announced nothing here would lose the point of the section.
   */
  protected readonly clients = [
    { name: 'Injured Workers Advocates', file: 'injured-workers-advocates.png' },
    { name: 'Naranja Internet', file: 'naranja-internet.png' },
    { name: 'Marshall', file: 'marshall.png' },
  ];

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
