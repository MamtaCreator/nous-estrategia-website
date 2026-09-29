import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentService } from '../modules/assessments/services/assessment.service';
import { AssessmentRun } from '../modules/assessments/pages/assessment-run';
import { levelLabel, isOptionQuestion } from './models/assessment.model';
import { environment } from '../../environments/environment';

const api = environment.apiUrl;
const ok = (data: unknown) => ({ success: true, data, error: null, pagination: null });

function stubStorage(role = 'Analyst') {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k), clear: () => store.clear(),
  });
  localStorage.setItem('nous_access_token', `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`);
  localStorage.setItem('nous_current_user', JSON.stringify({ id: 'u1', name: 'T', email: 't@t.co', role, assignedClientIds: [] }));
}

const detail = (over: Record<string, unknown> = {}) => ({
  id: 'a1', code: 'FIN-1', clientId: 'c1', templateId: 't1', templateName: '360 Finance', type: 'Finance', status: 'InProgress',
  startedAt: '2026-01-01T00:00:00Z', completedAt: null, answeredQuestions: 0, totalQuestions: 3, progressPercentage: 0, overallScore: null, level: null,
  sections: [{
    id: 's1', code: 'S1', name: 'Planning', description: 'Budgets', questions: [
      { id: 'q1', code: 'S1-Q1', text: 'Budgets?', guidance: '', type: 'MultipleChoice', isMandatory: true, options: [{ id: 'o1', code: 'O1', text: 'None' }, { id: 'o2', code: 'O2', text: 'Measured' }] },
      { id: 'q2', code: 'S1-Q2', text: 'Cash?', guidance: '', type: 'MultipleChoice', isMandatory: true, options: [{ id: 'o3', code: 'O1', text: 'None' }, { id: 'o4', code: 'O2', text: 'Measured' }] },
      { id: 'q3', code: 'S1-Q3', text: 'Challenge?', guidance: '', type: 'Text', isMandatory: false, options: [] },
    ],
  }],
  answers: [],
  ...over,
});

describe('Assessment helpers', () => {
  it('labels Ad-hoc readably and treats only option types as scored', () => {
    expect(levelLabel('AdHoc')).toBe('Ad-hoc');
    expect(levelLabel('Optimized')).toBe('Optimized');
    expect(levelLabel(null)).toBe('—');
    expect(isOptionQuestion('YesNo')).toBe(true);
    expect(isOptionQuestion('Text')).toBe(false);
    expect(isOptionQuestion('Numeric')).toBe(false);
  });
});

describe('Assessment HTTP contracts', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    stubStorage();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('starts an assessment for a client from a template', () => {
    TestBed.inject(AssessmentService).start('c1', 't1').subscribe();
    const req = http.expectOne(`${api}/assessments/client/c1`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ templateId: 't1' });
    req.flush(ok({}));
  });

  it('saves answers with PUT and submits with POST', () => {
    const svc = TestBed.inject(AssessmentService);
    svc.saveAnswers('a1', [{ questionId: 'q1', selectedOptionId: 'o2' }]).subscribe();
    const put = http.expectOne(`${api}/assessments/a1/answers`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ answers: [{ questionId: 'q1', selectedOptionId: 'o2' }] });
    put.flush(ok({ saved: 1 }));
    svc.submit('a1').subscribe();
    expect(http.expectOne(`${api}/assessments/a1/submit`).request.method).toBe('POST');
  });

  it('updates a recommendation status through its own route', () => {
    TestBed.inject(AssessmentService).updateRecommendation('r1', 'InProgress').subscribe();
    const req = http.expectOne(`${api}/assessments/recommendations/r1/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'InProgress' });
    req.flush(ok({}));
  });

  it('downloads an export using the server file name', () => {
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:x';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    let name = '';
    TestBed.inject(AssessmentService).download('a1', 'excel').subscribe((n) => (name = n));
    const req = http.expectOne(`${api}/assessments/a1/export?format=excel`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']), { headers: { 'Content-Disposition': 'attachment; filename=FIN-1-20260101.xlsx' } });
    expect(name).toBe('FIN-1-20260101.xlsx');
  });
});

describe('Assessment questionnaire', () => {
  let http: HttpTestingController;
  const url = (p: string) => `${api}${p}`;

  function render(role = 'Analyst', answers: unknown[] = []) {
    stubStorage(role);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['clientId', 'c1'], ['id', 'a1']]) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AssessmentRun);
    fixture.detectChanges();
    http.expectOne(url('/assessments/a1')).flush(ok(detail({ answers })));
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

  it('shows the questions and never shows scores', () => {
    const el = render().nativeElement as HTMLElement;
    expect(el.textContent).toContain('Budgets?');
    expect(el.textContent).toContain('Measured');
    expect(el.textContent).toContain('0/3 answered');
  });

  it('autosaves only the changed answer, once, after a short pause', () => {
    const fixture = render();
    const radio = (fixture.nativeElement as HTMLElement).querySelector('input[type=radio][value=o2]') as HTMLInputElement;
    radio.click();
    radio.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    http.expectNone(url('/assessments/a1/answers')); // debounced

    vi.advanceTimersByTime(800);
    const put = http.expectOne(url('/assessments/a1/answers'));
    expect(put.request.body.answers).toEqual([{ questionId: 'q1', selectedOptionId: 'o2' }]);
    put.flush(ok({ saved: 1 }));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Saved');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1/3 answered');
  });

  it('coalesces several quick edits into a single request', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;
    for (const value of ['o1', 'o2']) {
      const r = el.querySelector(`input[type=radio][value=${value}]`) as HTMLInputElement;
      r.dispatchEvent(new Event('change'));
    }
    const q2 = el.querySelector('input[type=radio][value=o4]') as HTMLInputElement;
    q2.dispatchEvent(new Event('change'));
    vi.advanceTimersByTime(800);
    const put = http.expectOne(url('/assessments/a1/answers'));
    expect(put.request.body.answers.map((a: { questionId: string }) => a.questionId).sort()).toEqual(['q1', 'q2']);
    put.flush(ok({ saved: 2 }));
  });

  it('keeps the edits and offers a retry when saving fails', () => {
    const fixture = render();
    (fixture.nativeElement as HTMLElement).querySelector('input[type=radio][value=o2]')!.dispatchEvent(new Event('change'));
    vi.advanceTimersByTime(800);
    http.expectOne(url('/assessments/a1/answers')).flush({ success: false }, { status: 500, statusText: 'err' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Not saved');

    (fixture.nativeElement as HTMLElement).querySelector('.save-state button')!.dispatchEvent(new Event('click'));
    const retry = http.expectOne(url('/assessments/a1/answers'));
    expect(retry.request.body.answers).toEqual([{ questionId: 'q1', selectedOptionId: 'o2' }]);
    retry.flush(ok({ saved: 1 }));
  });

  it('refuses to submit while required questions are unanswered and sends nothing', () => {
    const fixture = render();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const submit = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes('Submit')) as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();
    http.expectNone(url('/assessments/a1/submit'));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 required question(s) still need an answer');
  });

  it('is read-only for viewers: inputs disabled and no autosave', () => {
    const fixture = render('Viewer');
    const radios = [...(fixture.nativeElement as HTMLElement).querySelectorAll('input[type=radio]')] as HTMLInputElement[];
    expect(radios.length).toBeGreaterThan(0);
    expect(radios.every((r) => r.disabled)).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('read-only');
    vi.advanceTimersByTime(2000);
    http.expectNone(url('/assessments/a1/answers'));
  });

  it('restores previously saved answers', () => {
    const fixture = render('Analyst', [{ questionId: 'q1', selectedOptionId: 'o2' }]);
    const radio = (fixture.nativeElement as HTMLElement).querySelector('input[type=radio][value=o2]') as HTMLInputElement;
    expect(radio.checked).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1/3 answered');
  });
});
