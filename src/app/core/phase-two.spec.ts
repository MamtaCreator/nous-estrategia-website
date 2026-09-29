import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FinanceService } from '../modules/pillars/finance/services/finance.service';
import { MarketingService } from '../modules/pillars/marketing/services/marketing.service';
import { ProcessService } from '../modules/pillars/processes/services/process.service';
import { AutomationService } from '../modules/pillars/ai/services/automation.service';
import { csvText, parseEntries, parseNumbers, ratio, financeDraftValidator } from './helpers/pillar-data';
import { automationMetrics, marketingMetrics } from './helpers/pillar-metrics';
import { Campaign } from './models/marketing.model';
import { Automation } from './models/automation.model';
import { environment } from '../../environments/environment';

describe('Pillar calculations and validation', () => {
  it('retains zero entries and rejects malformed, duplicate and non-finite amounts', () => {
    expect(parseNumbers('Email=0\nSocial=200')).toEqual({Email:0,Social:200});
    for (const text of ['bad row','A=Infinity','A=-1','A=1\nA=2','A=','A=1=2','A=0x20']) {
      expect(() => parseNumbers(text)).toThrow();
    }
    expect(() => parseNumbers('Email=1.5',true)).toThrow();
  });
  it('preserves equals signs in configuration values without changing object prototypes', () => {
    const entries = parseEntries('url=https://example.test?a=1\n__proto__=value');
    expect(entries['url']).toBe('https://example.test?a=1');
    expect(Object.getPrototypeOf(entries)).toBeNull();
  });
  it('uses null for ratios with no denominator', () => {
    expect(ratio(10,0)).toBeNull();
    expect(ratio(-10,100)).toBe(-0.1);
  });
  it('weights marketing ROI by spend', () => {
    const rows = [
      {spentBudget:100,roi:1,totalBudget:100,totalClicks:10,totalImpressions:100,status:'Running'},
      {spentBudget:900,roi:0,totalBudget:900,totalClicks:0,totalImpressions:900,status:'Paused'},
    ] as Campaign[];
    expect(marketingMetrics(rows).find(m=>m.label==='Weighted ROI')?.value).toBe(10);
    expect(marketingMetrics(rows).find(m=>m.label==='Click-through rate')?.value).toBe(1);
  });
  it('weights automation success by execution count', () => {
    const rows = [
      {totalExecutions:1,successfulExecutions:1,totalTimeAutomedMinutes:0,totalCostSavings:0,status:'Active'},
      {totalExecutions:9,successfulExecutions:0,totalTimeAutomedMinutes:0,totalCostSavings:0,status:'Testing'},
    ] as Automation[];
    expect(automationMetrics(rows).find(m=>m.label==='Success rate')?.value).toBe(10);
    expect(automationMetrics([]).find(m=>m.label==='Success rate')?.value).toBeNull();
  });
  it('escapes CSV text, neutralizes formulas and preserves numeric losses', () => {
    expect(csvText([['=SUM(A1)', 'a,"b"', -20, ' \t+cmd']])).toBe('"\'=SUM(A1)","a,""b""","-20","\' \t+cmd"');
  });
  it('rejects inconsistent finance breakdowns before submitting', () => {
    const form = new FormGroup({
      revenueByProduct:new FormControl('A=40'),totalRevenue:new FormControl(100),
      expensesByCategory:new FormControl(''),totalExpenses:new FormControl(0),
      fixedExpenses:new FormControl(0),variableExpenses:new FormControl(0),
      currentAssets:new FormControl(0),fixedAssets:new FormControl(0),
      currentLiabilities:new FormControl(0),longTermLiabilities:new FormControl(0),equity:new FormControl(0),
    },{validators:financeDraftValidator});
    expect(form.hasError('financial')).toBe(true);
    form.controls.revenueByProduct.setValue('A=100');
    expect(form.valid).toBe(true);
    form.controls.currentAssets.setValue(100);
    expect(form.hasError('financial')).toBe(true);
  });
});

describe('Pillar HTTP contracts', () => {
  let http: HttpTestingController;
  const ok = (data: unknown) => ({success:true,data,error:null,pagination:null});
  beforeEach(() => {
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });
  it('loads finance history using the supported 60-period limit', () => {
    const service = TestBed.inject(FinanceService);
    service.getHistory('c1',60).subscribe();
    http.expectOne(`${environment.apiUrl}/finance/client/c1/history?limit=60`).flush(ok([]));
    expect(service.history()).toEqual([]);
  });
  it('clears the previous financial period when a new period fails', () => {
    const service = TestBed.inject(FinanceService);
    service.getForClient('c1','2026-01').subscribe();
    http.expectOne(`${environment.apiUrl}/finance/client/c1?period=2026-01`).flush(ok({id:'old'}));
    service.getForClient('c1','2026-02').subscribe({error:()=>{}});
    http.expectOne(`${environment.apiUrl}/finance/client/c1?period=2026-02`).flush({}, {status:404,statusText:'Not Found'});
    expect(service.current()).toBeNull();
  });
  it('sends campaign metrics as a full snapshot via PATCH', () => {
    const service = TestBed.inject(MarketingService);
    const snapshot = {impressions:{Email:100},clicks:{Email:10},conversions:{Email:2},spentBudget:20,actualRevenue:40};
    service.updateMetrics('m1',snapshot).subscribe();
    const req=http.expectOne(`${environment.apiUrl}/marketing/campaigns/m1/metrics`);
    expect(req.request.method).toBe('PATCH'); expect(req.request.body).toEqual(snapshot);
    req.flush(ok({id:'m1',roi:1}));
    expect(service.selectedCampaign()?.roi).toBe(1);
  });
  it('launches and pauses using actual campaign lifecycle endpoints', () => {
    const service = TestBed.inject(MarketingService);
    service.launch('m1').subscribe();
    http.expectOne(`${environment.apiUrl}/marketing/campaigns/m1/launch`).flush(ok({id:'m1',status:'Running'}));
    expect(service.selectedCampaign()?.status).toBe('Running');
    service.pause('m1').subscribe();
    http.expectOne(`${environment.apiUrl}/marketing/campaigns/m1/pause`).flush(ok({id:'m1',status:'Paused'}));
    expect(service.selectedCampaign()?.status).toBe('Paused');
  });
  it('diagnoses a process and displays the returned bottlenecks', () => {
    const service = TestBed.inject(ProcessService);
    service.diagnose('p1').subscribe();
    const req=http.expectOne(`${environment.apiUrl}/process/p1/diagnose`);
    expect(req.request.method).toBe('POST');
    req.flush(ok({id:'p1',bottleneckCount:1}));
    expect(service.selectedProcess()?.bottleneckCount).toBe(1);
  });
  it('records an execution without pretending to run a job', () => {
    const service = TestBed.inject(AutomationService);
    const run={success:false,errorMessage:'Timeout',durationSeconds:4,timeAutomedMinutes:0,costSavings:0};
    service.logExecution('a1',run).subscribe();
    const req=http.expectOne(`${environment.apiUrl}/ai/automations/a1/executions`);
    expect(req.request.method).toBe('POST'); expect(req.request.body).toEqual(run);
    req.flush(ok({id:'e1',success:false}));
  });
  it('does not retain execution history after a failed reload', () => {
    const service=TestBed.inject(AutomationService);
    service.getExecutions('a1').subscribe();
    http.expectOne(`${environment.apiUrl}/ai/automations/a1/executions?limit=50`).flush(ok([{id:'e1'}]));
    service.getExecutions('a2').subscribe({error:()=>{}});
    http.expectOne(`${environment.apiUrl}/ai/automations/a2/executions?limit=50`).flush({}, {status:403,statusText:'Forbidden'});
    expect(service.executions()).toEqual([]);
  });
});
