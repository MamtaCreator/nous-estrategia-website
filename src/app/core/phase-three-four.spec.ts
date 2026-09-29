import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KpiService } from '../modules/kpis/services/kpi.service';
import { DashboardService } from '../modules/dashboards/services/dashboard.service';
import { Phase4Service } from '../modules/phase4/services/phase4.service';
import { AnalyticsDashboard } from '../shared/analytics-dashboard';
import { I18n } from './i18n';
import { environment } from '../../environments/environment';

const api = environment.apiUrl;
const ok = (data: unknown) => ({ success: true, data, error: null, pagination: null });

describe('KPI and dashboard HTTP contracts', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  it('lists KPIs with an optional category filter only when one is chosen', () => {
    const service = TestBed.inject(KpiService);
    service.list('c1').subscribe();
    http.expectOne(`${api}/kpi/client/c1`).flush(ok([]));
    service.list('c1', 'Financial').subscribe();
    http.expectOne(`${api}/kpi/client/c1?category=Financial`).flush(ok([]));
  });

  it('requests history for the chosen window and records manual values by POST', () => {
    const service = TestBed.inject(KpiService);
    service.history('k1', 90).subscribe();
    http.expectOne(`${api}/kpi/k1/history?days=90`).flush(ok({ values: [] }));
    service.recordValue('k1', { value: 42, notes: 'q1' }).subscribe();
    const req = http.expectOne(`${api}/kpi/k1/values`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ value: 42, notes: 'q1' });
    req.flush(ok({}));
  });

  it('creates catalog KPIs and recalculates through the client-scoped endpoints', () => {
    const service = TestBed.inject(KpiService);
    service.createDefaults('c1').subscribe();
    expect(http.expectOne(`${api}/kpi/client/c1/defaults`).request.method).toBe('POST');
    http.match(() => true).forEach((r) => r.flush(ok({ created: 1, alreadyPresent: 0, kpis: [] })));
    service.recalculate('c1').subscribe();
    expect(http.expectOne(`${api}/kpi/client/c1/recalculate`).request.method).toBe('POST');
  });

  it('turns an empty data envelope into an error instead of a value', () => {
    const service = TestBed.inject(KpiService);
    let failed = false;
    service.get('k1').subscribe({ error: () => (failed = true) });
    http.expectOne(`${api}/kpi/k1`).flush({ success: true, data: null, error: null, pagination: null });
    expect(failed).toBe(true);
  });

  it('loads dashboard data, filters by type and refreshes KPIs', () => {
    const service = TestBed.inject(DashboardService);
    service.data('d1').subscribe();
    http.expectOne(`${api}/dashboard/d1/data`).flush(ok({ kpis: [], widgets: [] }));
    service.list('c1', 'Finance').subscribe();
    http.expectOne(`${api}/dashboard/client/c1?type=Finance`).flush(ok([]));
    service.refreshKpis('d1').subscribe();
    expect(http.expectOne(`${api}/dashboard/d1/refresh-kpis`).request.method).toBe('POST');
  });
});

describe('Phase 4 HTTP contracts', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); vi.restoreAllMocks(); });

  it('sends the unread-only flag and the read actions to the right routes', () => {
    const service = TestBed.inject(Phase4Service);
    service.notifications('c1', true).subscribe();
    http.expectOne(`${api}/notifications/client/c1?unreadOnly=true`).flush(ok([]));
    service.markRead('n1').subscribe();
    expect(http.expectOne(`${api}/notifications/n1/read`).request.method).toBe('POST');
    service.markAllRead('c1').subscribe();
    expect(http.expectOne(`${api}/notifications/client/c1/read-all`).request.method).toBe('POST');
  });

  it('creates alerts with the KPIThreshold rule body and deletes by id', () => {
    const service = TestBed.inject(Phase4Service);
    service.createAlert({ clientId: 'c1', kpiId: 'k1', alertName: 'Low', alertType: 'KPIThreshold', severity: 'Warning', condition: 'LessThan', threshold: 40, upperThreshold: null, recipientEmails: [] }).subscribe();
    const req = http.expectOne(`${api}/alerts`);
    expect(req.request.body.condition).toBe('LessThan');
    req.flush(ok({}));
    service.deleteAlert('a1').subscribe();
    expect(http.expectOne(`${api}/alerts/a1`).request.method).toBe('DELETE');
  });

  it('generates insights by POST and marks one actioned', () => {
    const service = TestBed.inject(Phase4Service);
    service.generateInsights('c1').subscribe();
    expect(http.expectOne(`${api}/insights/client/c1/generate`).request.method).toBe('POST');
    service.actionInsight('i1').subscribe();
    expect(http.expectOne(`${api}/insights/i1/action`).request.method).toBe('POST');
  });

  it('filters the audit log by record type and searches with an optional client', () => {
    const service = TestBed.inject(Phase4Service);
    service.audit('c1', 'KPI').subscribe();
    http.expectOne(`${api}/audit/client/c1?entityType=KPI`).flush(ok([]));
    service.search('nps').subscribe();
    http.expectOne(`${api}/search?q=nps`).flush(ok({ query: 'nps', totalResults: 0, results: [] }));
    service.search('nps', 'c1').subscribe();
    http.expectOne(`${api}/search?q=nps&clientId=c1`).flush(ok({ query: 'nps', totalResults: 0, results: [] }));
  });

  it('downloads a generated report, using the server filename and the chosen format', () => {
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:test';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const service = TestBed.inject(Phase4Service);
    let name = '';
    service.downloadReport('r1', 'CSV').subscribe((n) => (name = n));
    const req = http.expectOne(`${api}/reports/r1/generate?format=csv`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['a,b']), { headers: { 'Content-Disposition': "attachment; filename=Exec-1.csv; filename*=UTF-8''Exec-1.csv" } });
    expect(name).toBe('Exec-1.csv');
    expect(click).toHaveBeenCalledOnce();
  });

  it('falls back to a generic filename when the server does not expose one', () => {
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:test';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const service = TestBed.inject(Phase4Service);
    let name = '';
    service.downloadReport('r1', 'Excel').subscribe((n) => (name = n));
    http.expectOne(`${api}/reports/r1/generate?format=excel`).flush(new Blob(['x']));
    expect(name).toBe('report.excel');
  });
});

describe('Public analytics dashboard (self-contained, interactive, bilingual)', () => {
  // The chart's figures now live in the app instead of coming from the API. The HTTP testing controller is
  // still installed on purpose: it is what proves the component makes no request at all any more.
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  function render() {
    const fixture = TestBed.createComponent(AnalyticsDashboard);
    fixture.detectChanges();
    return fixture;
  }

  const textOf = (fixture: { nativeElement: unknown }) => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('renders its figures without contacting the API at all', () => {
    const fixture = render();
    http.expectNone(() => true);   // nothing was requested, from any URL

    const text = textOf(fixture);
    expect(text).toContain('HR Spend Analysis Dashboard');
    expect(text).toContain('Base salary');
    expect(text).toContain('621,000');   // total budget
    expect(text).toContain('475,650');   // total spent
  });

  it('filters to a category when a bar is clicked and clears it on a second click, still with no requests', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('button.hbar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('button.hbar.active')).not.toBeNull();

    (el.querySelector('button.hbar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('button.hbar.active')).toBeNull();

    http.expectNone(() => true);
  });

  it('narrows the totals to a semester when its legend entry is clicked', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;
    expect(textOf(fixture)).toContain('475,650');

    (el.querySelector('.legend button') as HTMLButtonElement).click();
    fixture.detectChanges();

    // The first half-year is a strict subset, so the headline spend must come down.
    expect(textOf(fixture)).not.toContain('475,650');
    http.expectNone(() => true);
  });

  it('switches every label to Spanish when the language toggle changes', () => {
    const fixture = render();
    TestBed.inject(I18n).lang.set('es');
    fixture.detectChanges();

    const text = textOf(fixture);
    expect(text).toContain('Dashboard de Análisis de Gastos del Área de Recursos Humanos');
    expect(text).toContain('Sueldo base');
    expect(text).not.toContain('Base salary');
  });
});
