import { Component, inject, input } from '@angular/core';
import { I18n } from '../core/i18n';
import { BrainMark } from './brain-mark';
import { AutoplayVideo } from './autoplay-video';

/** One homepage hero option: looping background video plus the shared headline. */
@Component({
  selector: 'app-hero-video',
  imports: [AutoplayVideo, BrainMark],
  template: `
    <section class="hero">
      <div class="hero-motion" aria-hidden="true"></div>
      <video appAutoplay class="hero-video" autoplay muted loop playsinline preload="auto" [attr.poster]="poster()" aria-hidden="true">
        <source [src]="video()" type="video/mp4">
      </video>
      <div class="hero-scrim"></div>
      <app-brain-mark [size]="640" [opacity]="0.12" />
      <div class="hero-body">
        <div class="hero-copy">
          <div class="corner-bracket" aria-hidden="true"></div>
          <h1 class="h1">{{ i18n.t('hero.title') }}</h1>
          <p class="hero-sub">{{ i18n.t('hero.sub') }}</p>
        </div>
        <div class="hero-quick-links">
          <a class="hero-quick-link" href="#about" (click)="jump($event, 'about')">{{ i18n.t('hero.who') }}</a>
          <a class="hero-quick-link" href="#services" (click)="jump($event, 'services')">{{ i18n.t('hero.stories') }}</a>
          <a class="hero-quick-link" href="#contact" (click)="jump($event, 'contact')">{{ i18n.t('hero.contact') }}</a>
        </div>
      </div>
      @if (cue()) {
        <div class="scroll-cue" aria-hidden="true"><span></span></div>
      }
    </section>`,
  // display:contents keeps the wireframe's `.hero .brain-mark` / `.hero + .hero` selectors matching
  styles: ':host{display:contents}',
})
export class HeroVideo {
  protected readonly i18n = inject(I18n);
  readonly video = input.required<string>();
  readonly poster = input.required<string>();
  readonly cue = input(false);

  protected jump(e: Event, id: string): void {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
