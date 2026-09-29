import { test, expect, Page } from '@playwright/test';

const campaign = {id:'m1',clientId:'c1',name:'Email launch',type:'Email',objective:'Sales',status:'Draft',totalBudget:1000,spentBudget:100,channels:['Email'],totalImpressions:1000,totalClicks:100,totalConversions:10,ctr:.1,conversionRate:.1,cpc:1,cpa:10,roi:1,roas:2,startDate:'2026-01-01',endDate:'2026-12-31',launchedAt:null};
const process = {id:'p1',clientId:'c1',name:'Lead handling',description:'Review leads',category:'Sales',status:'Analyzed',steps:[{id:'s1',sequence:1,name:'Review',description:'Check the lead',owner:'Analyst',durationMinutes:30,costPerExecution:20,isBottleneck:true},{id:'s2',sequence:2,name:'Assign',description:'Assign owner',owner:null,durationMinutes:5,costPerExecution:5,isBottleneck:false}],totalDurationMinutes:35,totalCostPerCycle:25,efficiency:50,bottleneckCount:1,bottleneckSteps:['Review'],optimizationRecommendations:['Shorten review'],totalPotentialSavingsPerCycle:10};
const automation = {id:'a1',clientId:'c1',name:'Lead routing',description:'Route incoming leads',type:'Workflow',triggerType:'Event',triggerCondition:'New lead',status:'Testing',totalExecutions:2,successfulExecutions:1,failedExecutions:1,successRate:50,totalTimeAutomedMinutes:10,totalCostSavings:20,accuracyScore:0,deployedAt:null};
const finance = {id:'f1',clientId:'c1',period:'2026-01',totalRevenue:1000,totalExpenses:600,netIncome:400,profitMargin:.4,operatingMargin:.4,roe:null,roa:null,currentRatio:null,debtToEquity:null,totalAssets:0,totalLiabilities:0,equity:0,operatingCashFlow:400,investingCashFlow:0,financingCashFlow:0,netCashFlow:400,revenueByProduct:{Service:1000},expensesByCategory:{Payroll:600},revenueProjections:{},expenseProjections:{},profitProjections:{},updatedAt:'2026-01-31'};

async function setup(page: Page, role = 'Analyst') {
  await page.addInitScript(({role}) => {
    localStorage.setItem('nous_access_token',`header.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.signature`);
    localStorage.setItem('nous_current_user',JSON.stringify({id:'u1',name:'Test Analyst',email:'test@example.com',role,assignedClientIds:['c1']}));
  },{role});
  let currentCampaign = {...campaign};
  let currentAutomation = {...automation};
  const executions = [{id:'e1',executedAt:'2026-01-01T10:00:00Z',success:true,errorMessage:null,durationSeconds:2}];
  await page.route('**/api/**', async route => {
    const request=route.request(); const path=new URL(request.url()).pathname; const method=request.method();
    let data: unknown;
    if (path.endsWith('/notifications/summary')) data={unreadCount:0,recent:[]};
    else if (path.endsWith('/finance/client/c1/history')) data=[finance];
    else if (path.endsWith('/finance/client/c1')) data=finance;
    else if (path.endsWith('/finance/import')) data=finance;
    else if (path.endsWith('/finance/projections')) data={revenue:{'2026-02':1050},expenses:{'2026-02':618},profit:{'2026-02':432}};
    else if (path.endsWith('/marketing/campaigns/c1')) data=[currentCampaign];
    else if (path.endsWith('/marketing/campaigns/m1/details')) data=currentCampaign;
    else if (path.endsWith('/marketing/campaigns/m1/launch')) data=currentCampaign={...currentCampaign,status:'Running'};
    else if (path.endsWith('/marketing/campaigns/m1/pause')) data=currentCampaign={...currentCampaign,status:'Paused'};
    else if (path.endsWith('/process/c1')) data=[process];
    else if (path.endsWith('/process/p1/details') || path.endsWith('/process/p1/diagnose')) data=process;
    else if (path.endsWith('/process') && method==='POST') data=process;
    else if (path.endsWith('/ai/automations/c1')) data=[currentAutomation];
    else if (path.endsWith('/ai/automations/a1/details')) data=currentAutomation;
    else if (path.endsWith('/ai/automations/a1/deploy')) data=currentAutomation={...currentAutomation,status:'Active'};
    else if (path.endsWith('/ai/automations/a1/executions')) {
      if (method==='POST') { const body=request.postDataJSON(); executions.push({id:'e2',executedAt:'2026-01-02T10:00:00Z',...body}); data=executions.at(-1); }
      else data=executions;
    } else { await route.fulfill({status:404,json:{success:false,error:{message:'Unexpected test endpoint: '+path}}}); return; }
    await route.fulfill({json:{success:true,data,error:null,pagination:null}});
  });
}

test('finance dashboard charts, filtered CSV download and validation', async ({page}) => {
  await setup(page); await page.goto('/app/clients/c1/finance');
  await expect(page.getByRole('heading',{name:'Revenue, expenses and net income'})).toBeVisible();
  const download=page.waitForEvent('download'); await page.getByRole('button',{name:'Export CSV',exact:true}).click();
  expect((await download).suggestedFilename()).toBe('finance-c1.csv');
  await page.getByRole('button',{name:'+ Import / update period'}).click();
  await page.getByLabel('Revenue by product').fill('Invalid amount');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('enter name=value');
});

test('marketing search and lifecycle update the rendered state', async ({page}) => {
  await setup(page); await page.goto('/app/clients/c1/marketing');
  await expect(page.getByRole('link',{name:'Email launch'})).toBeVisible();
  await page.getByLabel('Search by name').fill('missing');
  await expect(page.getByText('No campaigns match this selection.')).toBeVisible();
  await page.getByRole('button',{name:'Clear filters'}).click();
  await page.getByRole('link',{name:'Email launch'}).click();
  await page.getByRole('button',{name:'Launch',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await expect(page.getByRole('button',{name:'Launch',exact:true})).toBeVisible();
});

test('process visualization exposes bottleneck details using keyboard controls', async ({page}) => {
  await setup(page); await page.goto('/app/clients/c1/processes/p1');
  await page.getByRole('button',{name:/Step 1 Review/}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Check the lead')).toBeVisible();
  await expect(page.getByRole('button',{name:/Step 1 Review/})).toHaveAttribute('aria-pressed','true');
});

test('process remove and add submits unique ordered steps', async ({page}) => {
  await setup(page); await page.goto('/app/clients/c1/processes');
  await page.getByRole('button',{name:'+ New process'}).click();
  await page.locator('input[formControlName="name"]').first().fill('Test process');
  await page.getByLabel('Category',{exact:true}).fill('Sales');
  await page.getByRole('button',{name:'+ Add step'}).click();
  await page.getByRole('button',{name:'+ Add step'}).click();
  await page.locator('.remove').nth(1).click();
  await page.getByRole('button',{name:'+ Add step'}).click();
  for (let i=0;i<3;i++) await page.getByLabel('Step name',{exact:true}).nth(i).fill(`Step ${i+1}`);
  const request=page.waitForRequest(r=>r.method()==='POST' && r.url().endsWith('/api/process'));
  await page.getByRole('button',{name:'Create',exact:true}).click();
  expect((await request).postDataJSON().steps.map((step:{sequence:number})=>step.sequence)).toEqual([1,2,3]);
});

test('automation deploy and log execution refresh history', async ({page}) => {
  await setup(page); await page.goto('/app/clients/c1/automations/a1');
  await page.getByRole('button',{name:'Deploy',exact:true}).click();
  await expect(page.getByRole('button',{name:'Deploy',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Log execution',exact:true}).click();
  await page.getByLabel('Duration (seconds)',{exact:true}).fill('3');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.locator('.executions li')).toHaveCount(2);
});

test('viewer can inspect every dashboard without mutation controls', async ({page}) => {
  await setup(page,'Viewer');
  for (const path of ['finance','marketing','processes','automations']) {
    await page.goto(`/app/clients/c1/${path}`);
    await expect(page.locator('app-pillar-kpis')).toBeVisible();
    await expect(page.getByRole('button',{name:/New campaign|New process|New automation|Import \/ update/})).toHaveCount(0);
  }
});

test('mobile pillar dashboard fits the viewport', async ({page}) => {
  await setup(page); await page.setViewportSize({width:390,height:844});
  await page.goto('/app/clients/c1/marketing');
  await expect(page.getByRole('heading',{name:'Campaign ROI'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
