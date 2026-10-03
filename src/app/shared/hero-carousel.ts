import { Component, ElementRef, afterRenderEffect, inject, signal, viewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { I18n } from '../core/i18n';
import { BrainMark } from './brain-mark';

/**
 * The homepage hero: one card per pillar, shown as a coverflow.
 *
 * Each card is labelled and is itself a link to its pillar, so the films are no longer four anonymous
 * clips: it is clear what each one refers to and a click anywhere on a card opens that service. The
 * arrows, dots, swipe and arrow keys are there for looking through them without leaving the page.
 *
 * Only the centre film plays; the rest hold on their poster. That keeps simultaneous video decodes off
 * the main thread, which is what made the earlier stacked version heavy on phones.
 */
@Component({
  selector: 'app-hero-carousel',
  imports: [BrainMark],
  template: `
    <section
      class="hero hero-carousel"
      role="region"
      aria-roledescription="carousel"
      [attr.aria-label]="i18n.t('hero.title')"
      (keydown)="onKey($event)"
      tabindex="0"
      (touchstart)="onTouchStart($event)"
      (touchend)="onTouchEnd($event)"
    >
      <div class="hero-motion" aria-hidden="true"></div>
      <app-brain-mark [size]="640" [opacity]="0.12" />

      <div class="hc-body">
        <div class="hc-copy">
          <h1 class="h1">{{ i18n.t('hero.title') }}</h1>
          <p class="hc-sub">{{ i18n.t('hero.sub') }}</p>
        </div>

        <div class="hc-stage">
          <div class="hc-track">
          @for (s of slides; track s.slug; let i = $index) {
            <!-- Only the cards faded right out are taken out of play, with inert. The two either side are
                 visible and now clickable, so marking them aria-hidden would hide a focusable link from a
                 screen reader while leaving it in the tab order; inert removes them from both. -->
            <div
              class="hc-slide"
              [style.transform]="transformFor(i)"
              [style.opacity]="opacityFor(i)"
              [class.is-far]="isFar(i)"
              [style.zIndex]="zIndexFor(i)"
              [class.is-active]="i === active()"
              [attr.inert]="isFar(i) ? '' : null"
              role="group"
              aria-roledescription="slide"
              [attr.aria-label]="(i + 1) + ' / ' + slides.length"
            >
              <video
                #vid
                class="hc-video"
                muted
                loop
                playsinline
                preload="metadata"
                [attr.poster]="s.poster"
                aria-hidden="true"
              >
                <source [src]="s.video" type="video/mp4" />
              </video>

              <!-- The whole card is the link, film included, so a click anywhere on it opens that
                   pillar. A real href rather than routerLink alone: it keeps middle-click and
                   open-in-new-tab working, survives with no JavaScript, and lets the handler drop a
                   click that was really the end of a swipe. -->
              <a
                class="hc-card"
                [href]="'/' + s.slug"
                (click)="openPillar($event, s.slug)"
              >
                <span class="hc-label">
                  @if (i === active()) {
                    <span class="hc-label-head">
                      <span class="hc-label-num" [style.color]="s.color">{{ pad(s.num) }}</span>
                      <span class="hc-label-title">{{ i18n.t('pillar.short.' + s.slug) }}</span>
                      <span class="hc-label-more">{{ i18n.t('tiles.more') }}</span>
                    </span>
                    <!-- The same one-line summary the service tiles use further down the page, so a card
                         says what the pillar actually does rather than only naming it. -->
                    <span class="hc-label-body">{{ i18n.t('tiles.' + s.slug + '.body') }}</span>
                  } @else {
                    <span class="hc-label-title dim">{{ i18n.t('pillar.short.' + s.slug) }}</span>
                  }
                </span>
              </a>
            </div>
          }
          </div>

          <button type="button" class="hc-arrow prev" (click)="step(-1)" [attr.aria-label]="i18n.t('hero.prev')">
            <span aria-hidden="true">&#8249;</span>
          </button>
          <button type="button" class="hc-arrow next" (click)="step(1)" [attr.aria-label]="i18n.t('hero.next')">
            <span aria-hidden="true">&#8250;</span>
          </button>
        </div>

        <div class="hc-dots" role="tablist">
          @for (s of slides; track s.slug; let i = $index) {
            <button
              type="button"
              class="hc-dot"
              role="tab"
              [class.on]="i === active()"
              [attr.aria-selected]="i === active()"
              [attr.aria-label]="(i + 1) + ' / ' + slides.length"
              (click)="go(i)"
            ></button>
          }
        </div>

        <div class="hero-quick-links">
          <a class="hero-quick-link" href="#about" (click)="jump($event, 'about')">{{ i18n.t('hero.who') }}</a>
          <a class="hero-quick-link" href="#clients" (click)="jump($event, 'clients')">{{ i18n.t('hero.stories') }}</a>
          <a class="hero-quick-link" href="#contact" (click)="jump($event, 'contact')">{{ i18n.t('hero.contact') }}</a>
        </div>
      </div>

      <div class="scroll-cue" aria-hidden="true"><span></span></div>
    </section>
  `,
  styleUrl: './hero-carousel.css',
})
export class HeroCarousel {
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18n);

  /**
   * One card per pillar, keeping the films already used on the home page and adding a fourth so that
   * Marketing and AI are represented too. They are all films, so every card behaves the same.
   */
  protected readonly slides = [
    // 01 the city buildings, and 03 the one with the printed charts, both as specified. 02 and 04 were
    // left open, so they take the creative session and the pair working at a screen.
    { slug: 'finance', num: 1, color: '#2E74C9', video: 'videos/hero-city2.mp4', poster: 'images/hero-poster2.jpg' },
    { slug: 'marketing', num: 2, color: '#6EC6E0', video: 'videos/collab-board2.mp4', poster: 'images/collab-poster2.jpg' },
    { slug: 'process', num: 3, color: '#4A4FA0', video: 'videos/office.mp4', poster: 'images/office-poster.jpg' },
    { slug: 'ai', num: 4, color: '#7C5AA6', video: 'videos/team-laptop.mp4', poster: 'images/team-laptop-poster.jpg' },
  ];

  protected readonly active = signal(0);
  private readonly videos = viewChildren<ElementRef<HTMLVideoElement>>('vid');
  private touchX = 0;
  /** Set by a swipe so the click the browser sends afterwards does not also open a pillar. */
  private swiped = false;

  /**
   * How far a slide sits from the centre, counted the short way round.
   *
   * Taken as a plain subtraction, the centre slide's two neighbours would both land on the same side —
   * with three films, showing the first would fan the other two off to the right and leave the left
   * empty. Wrapping keeps one film either side whichever is centred.
   */
  private offsetOf(index: number): number {
    const count = this.slides.length;
    const half = Math.floor(count / 2);
    let offset = index - this.active();
    if (offset > half) offset -= count;
    if (offset < -half) offset += count;
    return offset;
  }

  /** Slides fan out either side of the centre, turned away from the viewer and set back. */
  protected transformFor(index: number): string {
    const offset = this.offsetOf(index);
    if (offset === 0) return 'translateX(0) rotateY(0deg) scale(1)';
    const direction = offset < 0 ? -1 : 1;
    const depth = Math.min(Math.abs(offset), 2);
    // Pushed further out and turned harder than before: at 52% the neighbours sat across the centre card,
    // hiding its label and covering the arrows. They now clear it and read as cards behind, not on top.
    return `translateX(${direction * (72 + (depth - 1) * 16)}%) rotateY(${-direction * 42}deg) scale(${1 - depth * 0.2})`;
  }

  constructor() {
    // Angular renders `muted` as an attribute but Chrome's autoplay policy reads the property, so it is
    // set in code. Without it the centre film stays frozen on its poster.
    afterRenderEffect(() => {
      const current = this.active();
      this.videos().forEach((ref, i) => {
        const el = ref.nativeElement;
        el.muted = true;
        if (i === current) {
          const started = el.play();
          if (started) started.catch(() => undefined); // a blocked autoplay must not reject unhandled
        } else if (!el.paused) {
          el.pause();
        }
      });
    });
  }

  /**
   * Only the centre card and its two immediate neighbours are shown. With four cards the fourth would sit
   * behind a neighbour on the same side, which reads as clutter rather than depth - so it is faded out
   * entirely and waits its turn.
   */
  protected opacityFor(index: number): number {
    const depth = Math.abs(this.offsetOf(index));
    return depth === 0 ? 1 : depth === 1 ? 0.5 : 0;
  }

  /** A faded card must not be clickable, or it would catch clicks meant for what is visible. */
  protected isFar(index: number): boolean {
    return Math.abs(this.offsetOf(index)) > 1;
  }

  /** Nearer the centre means nearer the viewer, so the fan overlaps the right way round. */
  protected zIndexFor(index: number): number {
    return 3 - Math.abs(this.offsetOf(index));
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected go(index: number): void {
    const count = this.slides.length;
    this.active.set(((index % count) + count) % count);
  }

  /**
   * Opens the card's pillar.
   *
   * Left-click only, and never the click the browser sends at the end of a swipe: on a phone the cards
   * are the swipe surface, so without that guard flicking through them would navigate away instead.
   * Modified clicks are left alone so open-in-new-tab still works.
   */
  protected openPillar(event: MouseEvent, slug: string): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (this.swiped) {
      this.swiped = false;
      return;
    }
    this.router.navigateByUrl('/' + slug);
  }

  protected step(delta: number): void {
    this.go(this.active() + delta);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.step(1);
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchX = event.changedTouches[0].clientX;
    this.swiped = false;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const travelled = event.changedTouches[0].clientX - this.touchX;
    // Enough of a swipe to be deliberate rather than a tap that wandered.
    if (Math.abs(travelled) > 40) {
      this.swiped = true;
      this.step(travelled < 0 ? 1 : -1);
    }
  }

  protected jump(e: Event, id: string): void {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
