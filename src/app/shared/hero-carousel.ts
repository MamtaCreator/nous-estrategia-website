import { Component, ElementRef, computed, effect, inject, signal, viewChildren } from '@angular/core';
import { I18n } from '../core/i18n';
import { BrainMark } from './brain-mark';

export interface HeroSlide {
  video: string;
  poster: string;
}

/**
 * The homepage hero: the three films shown as a coverflow rather than stacked one below the other.
 *
 * Only the centre film plays. The others are paused on their poster, which keeps three simultaneous video
 * decodes off the main thread — the reason the stacked version was heavy on phones — and means the page
 * starts with one decode instead of three.
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
          <div class="corner-bracket" aria-hidden="true"></div>
          <h1 class="h1">{{ i18n.t('hero.title') }}</h1>
          <p class="hc-sub">{{ i18n.t('hero.sub') }}</p>
        </div>

        <div class="hc-stage">
          @for (s of slides; track s.video; let i = $index) {
            <div
              class="hc-slide"
              [style.transform]="transformFor(i)"
              [style.opacity]="i === active() ? 1 : 0.55"
              [style.zIndex]="zIndexFor(i)"
              [class.is-active]="i === active()"
              [attr.aria-hidden]="i === active() ? null : 'true'"
              [attr.role]="'group'"
              [attr.aria-roledescription]="'slide'"
              [attr.aria-label]="(i + 1) + ' / ' + slides.length"
              (click)="i === active() ? null : go(i)"
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
            </div>
          }

          <button type="button" class="hc-arrow prev" (click)="step(-1)" [attr.aria-label]="i18n.t('hero.prev')">
            <span aria-hidden="true">&#8249;</span>
          </button>
          <button type="button" class="hc-arrow next" (click)="step(1)" [attr.aria-label]="i18n.t('hero.next')">
            <span aria-hidden="true">&#8250;</span>
          </button>
        </div>

        <div class="hc-dots" role="tablist">
          @for (s of slides; track s.video; let i = $index) {
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
          <a class="hero-quick-link" href="#services" (click)="jump($event, 'services')">{{ i18n.t('hero.stories') }}</a>
          <a class="hero-quick-link" href="#contact" (click)="jump($event, 'contact')">{{ i18n.t('hero.contact') }}</a>
        </div>
      </div>

      <div class="scroll-cue" aria-hidden="true"><span></span></div>
    </section>
  `,
  styleUrl: './hero-carousel.css',
})
export class HeroCarousel {
  protected readonly i18n = inject(I18n);

  protected readonly slides: HeroSlide[] = [
    { video: 'videos/hero-city2.mp4', poster: 'images/hero-poster2.jpg' },
    { video: 'videos/about-dusk2.mp4', poster: 'images/about-dusk-poster2.jpg' },
    { video: 'videos/office.mp4', poster: 'images/office-poster.jpg' },
  ];

  protected readonly active = signal(0);
  private readonly videos = viewChildren<ElementRef<HTMLVideoElement>>('vid');
  private touchX = 0;

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
    return `translateX(${direction * (52 + (depth - 1) * 14)}%) rotateY(${-direction * 34}deg) scale(${1 - depth * 0.16})`;
  }

  constructor() {
    // Angular renders `muted` as an attribute but Chrome's autoplay policy reads the property, so it is
    // set in code. Without it the centre film stays frozen on its poster.
    effect(() => {
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

  /** Nearer the centre means nearer the viewer, so the fan overlaps the right way round. */
  protected zIndexFor(index: number): number {
    return 3 - Math.abs(this.offsetOf(index));
  }

  protected go(index: number): void {
    const count = this.slides.length;
    this.active.set(((index % count) + count) % count);
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
  }

  protected onTouchEnd(event: TouchEvent): void {
    const travelled = event.changedTouches[0].clientX - this.touchX;
    // Enough of a swipe to be deliberate rather than a tap that wandered.
    if (Math.abs(travelled) > 40) this.step(travelled < 0 ? 1 : -1);
  }

  protected jump(e: Event, id: string): void {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
