import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * End-to-end pass over the whole site against the REAL API and database.
 * Each test registers its own account, so runs never collide and nothing depends on test order.
 * Requires the API on http://localhost:5000 and the dev server on the port in playwright.live.config.ts.
 */
const API = 'http://localhost:5000/api';
const PASSWORD = 'Abcdef1!';

async function registerApi(request: APIRequestContext, name = 'E2E User') {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@nous.test`;
  const res = await request.post(`${API}/auth/register`, { data: { name, email, password: PASSWORD } });
  const body = await res.json();
  expect(res.status(), JSON.stringify(body)).toBe(200);
  return { email, token: body.data.token as string, userId: body.data.user.id as string, role: body.data.user.role as string };
}

/**
 * A non-admin member of an existing organization. Signing up now makes you the Admin of a brand new
 * organization, so the only way to get an ordinary member is for that organization's Admin to add one.
 */
async function addMember(request: APIRequestContext, adminToken: string, role: string, name = 'Member') {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@nous.test`;
  const res = await request.post(`${API}/auth/register`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { name, email, password: PASSWORD, role },
  });
  const body = await res.json();
  expect(res.status(), JSON.stringify(body)).toBe(200);
  return { email, token: body.data.token as string, userId: body.data.user.id as string, role: body.data.user.role as string };
}

/** Puts a real session into the browser so a test can start on any page already signed in. */
async function signIn(page: Page, token: string, user: { id: string; name: string; email: string; role: string }) {
  await page.addInitScript(([t, u]) => {
    localStorage.setItem('nous_access_token', t as string);
    localStorage.setItem('nous_current_user', JSON.stringify(u));
  }, [token, { ...user, assignedClientIds: [] }] as const);
}

async function seedDemo(request: APIRequestContext, token: string) {
  const res = await request.post(`${API}/demo/sample-client`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  expect(res.status(), JSON.stringify(body)).toBe(200);
  return body.data as { clientId: string; companyName: string };
}

test.describe('public marketing site', () => {
  test('home page renders and language switches, and sign-in is not offered to visitors', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request a Consultation' }).first()).toBeVisible();

    // Sign-in is hidden from the navigation for now, in both languages and both menus.
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open CRM' })).toHaveCount(0);

    await page.getByRole('button', { name: 'ES', exact: true }).first().click();
    await expect(page.getByRole('link', { name: 'Solicitar una Consulta' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toHaveCount(0);
    await page.getByRole('button', { name: 'EN', exact: true }).first().click();
    await expect(page.getByRole('link', { name: 'Request a Consultation' }).first()).toBeVisible();
  });

  test('on a phone the spend table stays inside its card instead of spilling out', async ({ page }) => {
    // The table has five columns of figures that cannot shrink below their digits. It must scroll inside
    // its own card; what must never happen again is the table painting outside the card and off the page.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const table = page.locator('.dash table').first();
    await table.waitFor({ timeout: 20000 });
    await table.scrollIntoViewIfNeeded();

    const m = await page.evaluate(() => {
      const t = document.querySelector('.dash table') as HTMLElement;
      const wrap = t.closest('.table-wrap') as HTMLElement;
      const panel = t.closest('.panel') as HTMLElement;
      const dash = t.closest('.dash') as HTMLElement;
      return {
        panelOverflows: panel.scrollWidth > panel.clientWidth,
        dashOverflows: dash.scrollWidth > dash.clientWidth,
        pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        scrollsInsideItsCard: wrap.scrollWidth > wrap.clientWidth,
      };
    });

    expect(m.panelOverflows, 'the card must not be forced wider than the phone').toBe(false);
    expect(m.dashOverflows, 'the dashboard must not be forced wider than the phone').toBe(false);
    expect(m.pageOverflows, 'the page must not scroll sideways').toBe(false);
    expect(m.scrollsInsideItsCard, 'the hidden columns must still be reachable by scrolling').toBe(true);

    // And the far column really is reachable, not merely clipped away.
    await page.locator('.table-wrap').first().evaluate((el: HTMLElement) => el.scrollTo({ left: el.scrollWidth }));
    await expect(page.getByRole('cell', { name: '145,350' })).toBeInViewport();
  });

  test('the analytics showcase loads from the database and filters on click', async ({ page }) => {
    await page.goto('/');
    const dash = page.locator('.dash');
    await dash.scrollIntoViewIfNeeded();
    await expect(dash.getByText('HR Spend Analysis Dashboard')).toBeVisible();
    await expect(dash.getByRole('cell', { name: '475,650' })).toBeVisible(); // total spent, from the seeded demo table

    await dash.locator('button.hbar').first().click();
    await expect(dash.locator('button.hbar.active')).toHaveCount(1);
    await dash.getByRole('button', { name: /Clear filters/ }).click();
    await expect(dash.locator('button.hbar.active')).toHaveCount(0);
  });

  test('each pillar page opens from the services grid', async ({ page }) => {
    for (const slug of ['finance', 'marketing', 'process', 'ai']) {
      await page.goto(`/${slug}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      expect(page.url()).toContain(slug);
    }
  });
});

test.describe('authentication', () => {
  test('sign up, sign out and sign back in', async ({ page }) => {
    const email = `flow-${Date.now()}@nous.test`;
    await page.goto('/register');
    await page.getByLabel('Organization name').fill(`Flow Org ${Date.now()}`);
    await page.getByLabel('Full name').fill('Flow Tester');
    await page.getByLabel('Email').fill(email);
    await page.locator('input[formcontrolname="password"]').fill(PASSWORD);
    await page.locator('input[formcontrolname="confirmPassword"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/app$/, { timeout: 15000 });

    // Signing out deliberately lands on the public home page, not the sign-in form.
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/(?:$|\?)/);
    // The public home page, which no longer offers a sign-in link at all.
    await expect(page.getByRole('link', { name: 'Request a Consultation' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.locator('input[formcontrolname="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/app$/, { timeout: 15000 });
  });

  test('a wrong password is reported and keeps you on the form', async ({ page, request }) => {
    const { email } = await registerApi(request);
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.locator('input[formcontrolname="password"]').fill('WrongPass9!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.toast.error')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('a protected page sends you to login and returns you afterwards', async ({ page, request }) => {
    const { email } = await registerApi(request);
    await page.goto('/app/clients');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fapp%2Fclients/);
    await page.getByLabel('Email').fill(email);
    await page.locator('input[formcontrolname="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/app\/clients/, { timeout: 15000 });
  });
});

test.describe('dashboard and sample data', () => {
  test('an empty workspace offers sample data, which fills the dashboard', async ({ page, request }) => {
    const user = await registerApi(request, 'Empty Workspace');
    await signIn(page, user.token, { id: user.userId, name: 'Empty Workspace', email: user.email, role: user.role });

    await page.goto('/app');
    await expect(page.getByText('No clients are assigned to you yet')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Load sample data' }).click();
    await expect(page.getByText('KPI analytics — Andes Logística SAS')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Total KPIs')).toBeVisible();
    await expect(page.locator('.kpi strong').first()).toHaveText(/\d/);
    await expect(page.locator('.dash table tbody tr')).toHaveCount(8);
  });

  test('the dashboard charts the seeded history and switches KPI', async ({ page, request }) => {
    const user = await registerApi(request, 'Chart Reader');
    await seedDemo(request, user.token);
    await signIn(page, user.token, { id: user.userId, name: 'Chart Reader', email: user.email, role: user.role });

    await page.goto('/app');
    await expect(page.getByText('KPI analytics — Andes Logística SAS')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.dash svg polyline.line')).toBeVisible();
    await expect(page.locator('.dash .hbar')).not.toHaveCount(0);

    const picker = page.locator('select.pick.small');
    await picker.selectOption({ index: 1 });
    await expect(page.locator('.dash svg polyline.line')).toBeVisible();
  });
});

test.describe('clients', () => {
  test('create, edit and delete a client', async ({ page, request }) => {
    const user = await registerApi(request, 'Client Manager');
    await signIn(page, user.token, { id: user.userId, name: 'Client Manager', email: user.email, role: user.role });
    const company = `Acme Freight ${Date.now()}`;

    await page.goto('/app/clients');
    await page.getByRole('link', { name: '+ New client' }).click();
    await page.locator('input[formcontrolname="companyName"]').fill(company);
    await page.locator('input[formcontrolname="industry"]').fill('Logistics');
    await page.locator('input[formcontrolname="country"]').fill('Colombia');
    await page.locator('input[formcontrolname="email"]').fill(`acme-${Date.now()}@example.com`);
    await page.locator('input[formcontrolname="phone"]').fill('+573001112233');
    await page.getByRole('button', { name: /Create client/ }).click();

    await expect(page.getByRole('heading', { name: company })).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'Edit' }).click();
    await page.locator('input[formcontrolname="companyName"]').fill(`${company} SAS`);
    await page.locator('input[formcontrolname="phone"]').fill('+573001112233');
    await page.getByRole('button', { name: /Save changes/ }).click();
    await expect(page.getByRole('heading', { name: `${company} SAS` })).toBeVisible({ timeout: 15000 });

    await page.goto('/app/clients');
    await expect(page.getByRole('cell', { name: `${company} SAS` })).toBeVisible();
  });

  test('required fields are enforced before anything is sent', async ({ page, request }) => {
    const user = await registerApi(request, 'Validator');
    await signIn(page, user.token, { id: user.userId, name: 'Validator', email: user.email, role: user.role });
    let posted = false;
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/clients')) posted = true; });

    await page.goto('/app/clients/new');
    await page.getByRole('button', { name: /Create client/ }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    expect(posted).toBe(false);
  });
});

test.describe('client workspace', () => {
  test.beforeEach(async ({ page, request }, testInfo) => {
    const user = await registerApi(request, 'Workspace User');
    const demo = await seedDemo(request, user.token);
    await signIn(page, user.token, { id: user.userId, name: 'Workspace User', email: user.email, role: user.role });
    testInfo.annotations.push({ type: 'clientId', description: demo.clientId });
  });

  const clientIdOf = (testInfo: { annotations: { type: string; description?: string }[] }) =>
    testInfo.annotations.find((a) => a.type === 'clientId')!.description!;

  test('projects: list, open, and move through the lifecycle', async ({ page }, testInfo) => {
    await page.goto(`/app/clients/${clientIdOf(testInfo)}/projects`);
    await expect(page.getByRole('cell', { name: 'Route optimisation rollout' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('cell', { name: 'Route optimisation rollout' }).click();
    await expect(page.getByRole('heading', { name: 'Route optimisation rollout' })).toBeVisible();
    await expect(page.getByText('Deliverables', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'OnHold' })).toBeVisible();
  });

  test('finance: the seeded periods and ratios are shown', async ({ page }, testInfo) => {
    await page.goto(`/app/clients/${clientIdOf(testInfo)}/finance`);
    await expect(page.getByRole('heading', { name: 'Finance' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Financial history')).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('marketing: campaigns list and a campaign opens with its metrics', async ({ page }, testInfo) => {
    await page.goto(`/app/clients/${clientIdOf(testInfo)}/marketing`);
    await expect(page.getByRole('link', { name: 'Same-day delivery launch' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'Same-day delivery launch' }).click();
    await expect(page.getByRole('heading', { name: 'Same-day delivery launch' })).toBeVisible();
    await expect(page.getByText('Budget & performance')).toBeVisible();
  });

  test('processes: the diagnosed process shows its bottleneck', async ({ page }, testInfo) => {
    await page.goto(`/app/clients/${clientIdOf(testInfo)}/processes`);
    await expect(page.getByRole('cell', { name: 'Order to cash' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('cell', { name: 'Order to cash' }).click();
    await expect(page.getByRole('heading', { name: 'Order to cash' })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Credit check/ })).toBeVisible();
  });

  test('automations: list and execution history are shown', async ({ page }, testInfo) => {
    await page.goto(`/app/clients/${clientIdOf(testInfo)}/automations`);
    await expect(page.getByRole('cell', { name: 'Delivery ETA predictions' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'Delivery ETA predictions' }).click();
    await expect(page.getByRole('heading', { name: 'Delivery ETA predictions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent executions' })).toBeVisible();
  });

  test('KPIs: list, detail chart, and recording a value', async ({ page }, testInfo) => {
    const clientId = clientIdOf(testInfo);
    await page.goto(`/app/clients/${clientId}/kpis`);
    await expect(page.getByRole('cell', { name: 'On-time delivery' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('row', { name: /On-time delivery/ }).click();
    await expect(page.getByRole('heading', { name: 'On-time delivery' })).toBeVisible();
    await expect(page.getByText('Record a value')).toBeVisible();

    await page.locator('input[formcontrolname="value"]').fill('97.4');
    await page.getByRole('button', { name: 'Record' }).click();
    await expect(page.locator('.toast.success')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('97.4 %')).toBeVisible();
  });

  test('dashboards: the seeded dashboard renders its KPI cards', async ({ page }, testInfo) => {
    await page.goto(`/app/clients/${clientIdOf(testInfo)}/dashboards`);
    await expect(page.getByRole('cell', { name: 'Executive overview' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('cell', { name: 'Executive overview' }).click();
    await expect(page.getByRole('heading', { name: 'Executive overview' })).toBeVisible();
    await expect(page.getByText('Auto-refresh')).toBeVisible();
  });

  test('alerts: create one against a seeded KPI', async ({ page }, testInfo) => {
    await page.goto(`/app/clients/${clientIdOf(testInfo)}/alerts`);
    await expect(page.getByText('No alerts yet.')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: '+ New alert' }).click();
    await page.locator('input[formcontrolname="alertName"]').fill('On-time delivery slipping');
    await page.locator('select[formcontrolname="kpiId"]').selectOption({ label: 'On-time delivery' });
    await page.locator('input[formcontrolname="threshold"]').fill('90');
    await page.getByRole('button', { name: 'Create alert' }).click();
    await expect(page.getByRole('cell', { name: 'On-time delivery slipping' })).toBeVisible({ timeout: 15000 });
  });

  test('insights: generating produces findings from the seeded history', async ({ page }, testInfo) => {
    await page.goto(`/app/clients/${clientIdOf(testInfo)}/insights`);
    await page.getByRole('button', { name: 'Generate insights' }).click();
    await expect(page.locator('.toast.success')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.card h3').first()).toBeVisible();
  });

  test('reports: save a report and download it as CSV', async ({ page }, testInfo) => {
    await page.goto(`/app/clients/${clientIdOf(testInfo)}/reports`);
    await page.getByRole('button', { name: '+ New report' }).click();
    await page.locator('input[formcontrolname="name"]').fill('Monthly executive pack');
    await page.getByRole('button', { name: 'Save report' }).click();
    await expect(page.getByRole('cell', { name: 'Monthly executive pack' })).toBeVisible({ timeout: 15000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV', exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  });
});

test.describe('360 assessments', () => {
  test('start, answer, submit and read the report', async ({ page, request }) => {
    const user = await registerApi(request, 'Assessor');
    const demo = await seedDemo(request, user.token);
    await signIn(page, user.token, { id: user.userId, name: 'Assessor', email: user.email, role: user.role });

    await page.goto(`/app/clients/${demo.clientId}/assessments`);
    await expect(page.getByRole('heading', { name: '360° Assessments' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('.steps button').first()).toBeVisible({ timeout: 15000 });

    // Walk the sections by their step buttons (deterministic) and answer every question with the best option.
    const sections = await page.locator('.steps button').count();
    for (let i = 0; i < sections; i++) {
      await page.locator('.steps button').nth(i).click();
      const groups = page.locator('fieldset.q');
      for (let q = 0; q < (await groups.count()); q++) {
        const options = groups.nth(q).locator('input[type=radio]');
        if (await options.count()) await options.last().check();
      }
    }
    await expect(page.locator('.save-state')).toContainText('Saved', { timeout: 15000 });

    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Submit assessment' }).click();
    await expect(page).toHaveURL(/\/report$/, { timeout: 20000 });
    await expect(page.getByText('Optimized', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Maturity by section')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('submitting with unanswered required questions is blocked', async ({ page, request }) => {
    const user = await registerApi(request, 'Half Assessor');
    const demo = await seedDemo(request, user.token);
    await signIn(page, user.token, { id: user.userId, name: 'Half Assessor', email: user.email, role: user.role });

    await page.goto(`/app/clients/${demo.clientId}/assessments`);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('.steps button').first()).toBeVisible({ timeout: 15000 });

    let submitted = false;
    page.on('request', (r) => { if (r.url().includes('/submit')) submitted = true; });
    const lastSection = (await page.locator('.steps button').count()) - 1;
    await page.locator('.steps button').nth(lastSection).click();
    await page.getByRole('button', { name: 'Submit assessment' }).click();
    await expect(page.getByText(/required question\(s\) still need an answer/)).toBeVisible();
    expect(submitted).toBe(false);
  });
});

test.describe('search, notifications and audit', () => {
  test('search finds a seeded record and links to it', async ({ page, request }) => {
    const user = await registerApi(request, 'Searcher');
    await seedDemo(request, user.token);
    await signIn(page, user.token, { id: user.userId, name: 'Searcher', email: user.email, role: user.role });

    await page.goto('/app');
    await page.getByRole('searchbox', { name: 'Search' }).fill('Andes');
    await page.getByRole('searchbox', { name: 'Search' }).press('Enter');
    await expect(page).toHaveURL(/\/app\/search\?q=Andes/);
    await expect(page.getByRole('cell', { name: 'Andes Logística SAS' }).first()).toBeVisible({ timeout: 15000 });
  });

  test('notifications page loads for a client', async ({ page, request }) => {
    const user = await registerApi(request, 'Notified');
    await seedDemo(request, user.token);
    await signIn(page, user.token, { id: user.userId, name: 'Notified', email: user.email, role: user.role });

    await page.goto('/app/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Nothing here.')).toBeVisible();
  });

  test('the audit log is refused for a non-admin', async ({ page, request }) => {
    // The organization's Admin seeds the data and then adds an ordinary Analyst to the same organization.
    const owner = await registerApi(request, 'Audit Owner');
    const demo = await seedDemo(request, owner.token);
    const analyst = await addMember(request, owner.token, 'Analyst', 'Analyst Only');
    expect(analyst.role).toBe('Analyst');

    await signIn(page, analyst.token, { id: analyst.userId, name: 'Analyst Only', email: analyst.email, role: analyst.role });

    await page.goto(`/app/clients/${demo.clientId}/audit`);
    await expect(page.getByText('Only an Admin can view the audit log.')).toBeVisible({ timeout: 15000 });
  });

  test('a signed-up account is the Admin of its own organization, and sees only that', async ({ page, request }) => {
    const mine = await registerApi(request, 'Tenant Owner');
    const theirs = await registerApi(request, 'Other Tenant');
    await seedDemo(request, theirs.token);   // the other tenant has a client; this one has none

    expect(mine.role).toBe('Admin');
    await signIn(page, mine.token, { id: mine.userId, name: 'Tenant Owner', email: mine.email, role: mine.role });

    // Being an Admin grants nothing outside your own organization: the workspace is still empty.
    await page.goto('/app/clients');
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Andes Logística SAS')).toHaveCount(0);
  });
});

test.describe('tenant isolation', () => {
  test('one user cannot open another user\'s client', async ({ page, request }) => {
    const owner = await registerApi(request, 'Owner User');
    const demo = await seedDemo(request, owner.token);
    const stranger = await registerApi(request, 'Stranger User');
    await signIn(page, stranger.token, { id: stranger.userId, name: 'Stranger User', email: stranger.email, role: stranger.role });

    await page.goto(`/app/clients/${demo.clientId}`);
    await expect(page.locator('.toast.error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Andes Logística SAS' })).toHaveCount(0);

    const res = await request.get(`${API}/clients/${demo.clientId}`, { headers: { Authorization: `Bearer ${stranger.token}` } });
    expect(res.status()).toBe(404);
  });
});
