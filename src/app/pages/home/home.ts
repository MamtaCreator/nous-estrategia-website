import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../../core/i18n';
import { PILLARS } from '../../core/pillars';
import { BRAND } from '../../core/site';
import { BrainMark } from '../../shared/brain-mark';
import { CtaSection } from '../../shared/cta-section';
import { HeroVideo } from '../../shared/hero-video';
import { Icon } from '../../shared/icon';
import { AutoplayVideo } from '../../shared/autoplay-video';
import { AnalyticsDashboard } from '../../shared/analytics-dashboard';
import { KpiAnalytics } from '../../shared/kpi-analytics';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [AnalyticsDashboard, KpiAnalytics, AutoplayVideo, RouterLink, BrainMark, CtaSection, HeroVideo, Icon],
  templateUrl: './home.html',
})
export class Home {
  protected readonly i18n = inject(I18n);
  protected readonly auth = inject(AuthService);

  // Three hero options stacked for side-by-side comparison (per the Canva review board).
  protected readonly heroes = [
    { video: 'videos/hero-city2.mp4', poster: 'images/hero-poster2.jpg', cue: true },
    { video: 'videos/about-dusk2.mp4', poster: 'images/about-dusk-poster2.jpg', cue: false },
    { video: 'videos/office.mp4', poster: 'images/office-poster.jpg', cue: false },
  ];

  protected readonly metrics = [
    { n: 1, color: BRAND.gold },
    { n: 2, color: BRAND.cyan },
    { n: 3, color: BRAND.blue },
    { n: 4, color: BRAND.violet },
  ];

  /** Service tiles reuse the pillar registry for slug / icon / colour; the first is the featured entry point. */
  protected readonly tiles = PILLARS.map((p) => ({ slug: p.slug, icon: p.icon, color: p.color, featured: p.num === 1 }));

  protected readonly analyticsChips = [1, 2, 3, 4];
  protected readonly why = [
    { n: 1, color: BRAND.blue },
    { n: 2, color: BRAND.cyan },
    { n: 3, color: BRAND.indigo },
    { n: 4, color: BRAND.violet },
  ];
  protected readonly clientSlots = [1, 2, 3, 4, 5, 6];

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
