import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, concatMap, debounceTime, of, tap } from 'rxjs';
import { AssessmentService } from '../services/assessment.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AssessmentDetail, AssessmentQuestion, SavedAnswer, isOptionQuestion } from '../../../core/models/assessment.model';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-assessment-run',
  imports: [RouterLink],
  styleUrl: '../../kpis/kpis.css',
  template: `
    <a class="back" [routerLink]="['/app/clients', clientId, 'assessments']">← Back to assessments</a>

    @if (loading()) { <p class="hint">Loading…</p> }
    @else if (failed()) { <p role="alert">Could not load this assessment. <button type="button" (click)="load()">Try again</button></p> }
    @else if (detail(); as d) {
      <div class="header">
        <div>
          <h1>{{ d.templateName }}</h1>
          <p class="hint">{{ d.code }} · {{ answered() }}/{{ total() }} answered</p>
        </div>
        <div class="save-state" role="status" aria-live="polite">
          @switch (saveState()) {
            @case ('saving') { Saving… }
            @case ('saved') { ✓ Saved }
            @case ('error') { <span class="err">Not saved — <button type="button" (click)="retrySave()">retry</button></span> }
          }
        </div>
      </div>

      <div class="bar" role="progressbar" [attr.aria-valuenow]="progress()" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="progress()"></span></div>

      @if (!canWrite()) { <p class="notice">You have read-only access; answers are shown but cannot be changed.</p> }

      <nav class="steps" aria-label="Sections">
        @for (s of d.sections; track s.id; let i = $index) {
          <button type="button" [class.active]="i === step()" (click)="goTo(i)">
            {{ i + 1 }}. {{ s.name }} <small>{{ sectionAnswered(i) }}/{{ s.questions.length }}</small>
          </button>
        }
      </nav>

      @if (d.sections[step()]; as section) {
        <section class="card wide">
          <h3>{{ section.name }}</h3>
          <p class="hint">{{ section.description }}</p>
          @for (q of section.questions; track q.id; let n = $index) {
            <fieldset class="q" [class.missing]="showMissing() && isMissing(q)">
              <legend>{{ n + 1 }}. {{ q.text }} @if (q.isMandatory) { <span class="req" title="Required">*</span> }</legend>
              @if (q.guidance) { <p class="guide">{{ q.guidance }}</p> }

              @if (isOption(q)) {
                @for (o of q.options; track o.id) {
                  <label class="opt">
                    <input type="radio" [name]="q.id" [value]="o.id" [checked]="answerOf(q.id)?.selectedOptionId === o.id"
                      [disabled]="!canWrite()" (change)="pick(q, o.id)" />
                    <span>{{ o.text }}</span>
                  </label>
                }
              } @else if (q.type === 'Text') {
                <textarea rows="3" maxlength="2000" [value]="answerOf(q.id)?.textResponse ?? ''" [disabled]="!canWrite()"
                  (input)="setText(q, $any($event.target).value)"></textarea>
              } @else {
                <input type="number" [value]="answerOf(q.id)?.numericResponse ?? ''" [disabled]="!canWrite()"
                  (input)="setNumber(q, $any($event.target).value)" />
              }

              @if (isOption(q) && canWrite()) {
                <details class="note">
                  <summary>{{ answerOf(q.id)?.notes ? 'Edit note' : 'Add a note' }}</summary>
                  <textarea rows="2" maxlength="2000" placeholder="Evidence or context (optional)" [value]="answerOf(q.id)?.notes ?? ''"
                    (input)="setNotes(q, $any($event.target).value)"></textarea>
                </details>
              }
              @if (showMissing() && isMissing(q)) { <p class="err">Please answer this question.</p> }
            </fieldset>
          }
        </section>
      }

      <div class="nav-row">
        <button type="button" class="btn" (click)="goTo(step() - 1)" [disabled]="step() === 0">← Previous</button>
        @if (step() < d.sections.length - 1) {
          <button type="button" class="btn primary" (click)="goTo(step() + 1)">Next →</button>
        } @else if (canWrite()) {
          <button type="button" class="btn primary" (click)="submit()" [disabled]="submitting()">{{ submitting() ? 'Submitting…' : 'Submit assessment' }}</button>
        }
      </div>
      @if (showMissing() && missingCount() > 0) {
        <p class="err" role="alert">{{ missingCount() }} required question(s) still need an answer.</p>
      }
    }
  `,
  styles: `
    .bar { height: 8px; background: #e6e9f0; border-radius: 4px; overflow: hidden; margin: 6px 0 16px; }
    .bar span { display: block; height: 100%; background: #2b5fb0; transition: width .3s; }
    .save-state { font-size: 13px; color: #1e8e4a; min-height: 20px; }
    .err { color: #c62828; font-size: 13px; margin: 6px 0 0; }
    .steps { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .steps button { border: 1px solid #d0d5dd; background: #fff; border-radius: 8px; padding: 8px 12px; font-size: 13px; cursor: pointer; }
    .steps button.active { background: #2b5fb0; color: #fff; border-color: #2b5fb0; }
    .steps small { opacity: .75; margin-left: 4px; }
    .card.wide { max-width: 860px; }
    .q { border: 1px solid #e6e9f0; border-radius: 8px; padding: 14px 16px; margin: 14px 0; }
    .q.missing { border-color: #c62828; background: #fff8f8; }
    .q legend { font-weight: 600; font-size: 14px; padding: 0 6px; }
    .req { color: #c62828; }
    .guide { color: #667085; font-size: 12px; margin: 0 0 8px; }
    .opt { display: flex; align-items: center; gap: 10px; flex-direction: row; padding: 6px 4px; font-weight: 400; font-size: 13px; cursor: pointer; }
    .note { margin-top: 8px; font-size: 12px; }
    .note textarea, .q textarea { width: 100%; box-sizing: border-box; margin-top: 6px; }
    .nav-row { display: flex; justify-content: space-between; max-width: 860px; margin-top: 8px; }
  `,
})
export class AssessmentRun {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AssessmentService);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  private readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly detail = signal<AssessmentDetail | null>(null);
  protected readonly answers = signal<Map<string, SavedAnswer>>(new Map());
  protected readonly step = signal(0);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly submitting = signal(false);
  protected readonly saveState = signal<SaveState>('idle');
  protected readonly showMissing = signal(false);
  protected readonly isOption = (q: AssessmentQuestion) => isOptionQuestion(q.type);
  protected readonly canWrite = this.auth.canWrite;

  private readonly dirty = new Set<string>();
  private readonly changed$ = new Subject<void>();

  protected readonly total = computed(() => this.detail()?.sections.reduce((n, s) => n + s.questions.length, 0) ?? 0);
  protected readonly answered = computed(() => {
    let n = 0;
    for (const s of this.detail()?.sections ?? []) for (const q of s.questions) if (this.hasAnswer(q)) n++;
    return n;
  });
  protected readonly progress = computed(() => (this.total() ? Math.round((this.answered() * 100) / this.total()) : 0));
  protected readonly missingCount = computed(() => {
    let n = 0;
    for (const s of this.detail()?.sections ?? []) for (const q of s.questions) if (this.isMissing(q)) n++;
    return n;
  });

  constructor() {
    this.load();
    // Autosave: batches edits made within 700 ms into one request, one request at a time.
    this.changed$.pipe(debounceTime(700), concatMap(() => this.flush().pipe(catchError(() => of(null)))), takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.get(this.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => {
        if (d.status === 'Completed') { this.router.navigate(['/app/clients', this.clientId, 'assessments', this.id, 'report'], { replaceUrl: true }); return; }
        this.detail.set(d);
        this.answers.set(new Map(d.answers.map((a) => [a.questionId, a])));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }

  protected answerOf(questionId: string): SavedAnswer | undefined { return this.answers().get(questionId); }

  private hasAnswer(q: AssessmentQuestion): boolean {
    const a = this.answers().get(q.id);
    if (!a) return false;
    if (isOptionQuestion(q.type)) return !!a.selectedOptionId;
    if (q.type === 'Text') return !!a.textResponse?.trim();
    return a.numericResponse !== null && a.numericResponse !== undefined;
  }

  protected isMissing(q: AssessmentQuestion): boolean { return q.isMandatory && !this.hasAnswer(q); }

  protected sectionAnswered(i: number): number {
    return this.detail()?.sections[i]?.questions.filter((q) => this.hasAnswer(q)).length ?? 0;
  }

  private update(q: AssessmentQuestion, patch: Partial<SavedAnswer>): void {
    if (!this.canWrite()) return;
    const next = new Map(this.answers());
    next.set(q.id, { ...next.get(q.id), questionId: q.id, ...patch });
    this.answers.set(next);
    this.dirty.add(q.id);
    this.saveState.set('saving');
    this.changed$.next();
  }

  protected pick(q: AssessmentQuestion, optionId: string): void { this.update(q, { selectedOptionId: optionId }); }
  protected setText(q: AssessmentQuestion, value: string): void { this.update(q, { textResponse: value }); }
  protected setNotes(q: AssessmentQuestion, value: string): void { this.update(q, { notes: value }); }
  protected setNumber(q: AssessmentQuestion, value: string): void {
    const n = value === '' ? null : Number(value);
    this.update(q, { numericResponse: n !== null && Number.isFinite(n) ? n : null });
  }

  protected goTo(i: number): void {
    const max = (this.detail()?.sections.length ?? 1) - 1;
    this.step.set(Math.min(Math.max(0, i), max));
    this.flush().pipe(catchError(() => of(null))).subscribe();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected retrySave(): void { this.flush().pipe(catchError(() => of(null))).subscribe(); }

  /** Sends only the answers that changed since the last successful save. */
  private flush(): Observable<unknown> {
    if (this.dirty.size === 0) return of(null);
    const ids = [...this.dirty];
    this.dirty.clear();
    const payload = ids.map((qid) => this.answers().get(qid)!).filter(Boolean);
    this.saveState.set('saving');
    return this.api.saveAnswers(this.id, payload).pipe(
      tap({
        next: () => { if (this.dirty.size === 0) this.saveState.set('saved'); },
        error: () => { ids.forEach((i) => this.dirty.add(i)); this.saveState.set('error'); },
      }),
    );
  }

  protected submit(): void {
    this.showMissing.set(true);
    if (this.missingCount() > 0) {
      const first = this.detail()!.sections.findIndex((s) => s.questions.some((q) => this.isMissing(q)));
      if (first >= 0) this.step.set(first);
      return;
    }
    if (!confirm('Submit this assessment? You will not be able to change your answers afterwards.')) return;
    this.submitting.set(true);
    this.flush().pipe(
      concatMap(() => this.api.submit(this.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.notifications.success('Assessment submitted.');
        this.router.navigate(['/app/clients', this.clientId, 'assessments', this.id, 'report']);
      },
      error: () => this.submitting.set(false),
    });
  }
}
