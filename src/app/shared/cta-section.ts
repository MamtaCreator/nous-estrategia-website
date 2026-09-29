import { Component, inject } from '@angular/core';
import { I18n } from '../core/i18n';
import { CONTACT } from '../core/site';
import { Icon } from './icon';
import { WhatsappIcon } from './whatsapp-icon';

/** Closing call-to-action band with a diagnosis request email draft. */
@Component({
  selector: 'app-cta-section',
  imports: [Icon, WhatsappIcon],
  template: `
    <section class="cta-band" id="contact">
      <div class="inner cta-grid">
        <div class="cta-copy">
          <div class="tick"></div>
          <h2 class="h2 h2-light">{{ i18n.t('cta.title') }}</h2>
          <p class="lede lede-light">{{ i18n.t('cta.lede') }}</p>
          <div class="contact-channels">
            <a class="whatsapp-link" [href]="contact.whatsappHref" target="_blank" rel="noopener" aria-label="WhatsApp">
              <app-whatsapp-icon [size]="46" />
              <span>{{ i18n.t('cta.whatsapp') }}</span>
            </a>
            <a class="channel-link" [href]="contact.phoneHref">
              <app-icon name="arrow" [size]="15" color="#6EC6E0" [strokeWidth]="1.7" />
              <span>{{ i18n.t('cta.phone') }}</span>
            </a>
          </div>
          <p class="fine fine-light cta-footnote">{{ i18n.t('cta.note') }}</p>
        </div>
        <form class="diag-form" [attr.aria-label]="i18n.t('cta.formTitle')"
          (submit)="requestDiagnosis($event, name.value, company.value, email.value)">
          <p class="diag-form-title">{{ i18n.t('cta.formTitle') }}</p>
          <label class="field-label">{{ i18n.t('form.name') }}
            <input #name class="field-box" name="name" type="text" autocomplete="name" required maxlength="120" pattern=".*[^ ].*" />
          </label>
          <label class="field-label">{{ i18n.t('form.company') }}
            <input #company class="field-box" name="company" type="text" autocomplete="organization" required maxlength="160" pattern=".*[^ ].*" />
          </label>
          <label class="field-label">{{ i18n.t('form.email') }}
            <input #email class="field-box" name="email" type="email" autocomplete="email" required maxlength="254" />
          </label>
          <button type="submit" class="btn btn-cta-submit" aria-describedby="diagnosis-email-note">{{ i18n.t('cta.submit') }}</button>
          <p id="diagnosis-email-note" class="fine fine-light">{{ i18n.t('cta.emailNote') }}</p>
        </form>
      </div>
    </section>`,
  styles: ':host{display:contents}',
})
export class CtaSection {
  protected readonly i18n = inject(I18n);
  protected readonly contact = CONTACT;
  protected requestDiagnosis(event: Event, name: string, company: string, email: string): void {
    event.preventDefault();
    const body = [
      this.i18n.t('cta.formTitle'),
      '',
      `${this.i18n.t('form.name')}: ${name.trim()}`,
      `${this.i18n.t('form.company')}: ${company.trim()}`,
      `${this.i18n.t('form.email')}: ${email.trim()}`,
    ].join('\n');
    window.location.href = `mailto:${this.contact.email}?subject=${encodeURIComponent(this.i18n.t('cta.formTitle'))}&body=${encodeURIComponent(body)}`;
  }
}
