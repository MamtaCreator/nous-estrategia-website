import { test, expect, Page } from '@playwright/test';

const kpi = { id: 'k1', clientId: 'c1', name: 'NPS', description: '', category: 'Customer', dataType: 'Numeric', targetValue: 50, minThreshold: null, maxThreshold: null, unit: 'pts', status: 'Red', isActive: true, metricKey: null, isCalculated: false, higherIsBetter: true, currentValue: 30, lastMeasuredAt: '2026-01-01T00:00:00Z', percentageToTarget: 60, trendDirection: -1, percentageChange: -10, updatedAt: '2026-01-01T00:00:00Z' };
const summary = { total: 1, green: 0, amber: 0, red: 1, notEvaluated: 0, byCategory: { Customer: 1 }, needsAttention: [kpi] };
const alertRow = { id: 'a1', clientId: 'c1', kpiId: 'k1', kpiName: 'NPS', alertName: 'NPS low', alertType: 'KPIThreshold', severity: 'Warning', condition: 'LessThan', threshold: 40, upperThreshold: null, recipientEmails: [], isActive: true, isBreaching: true, lastTriggeredAt: '2026-01-02T10:00:00Z', createdAt: '2026-01-01T00:00:00Z' };
const note = { id: 'n1', clientId: 'c1', title: 'Alert: NPS low', message: 'NPS is below 40.', type: 'Alert', relatedEntityType: 'Alert', relatedEntityId: 'a1', isRead: false, createdAt: '2026-01-02T10:00:00Z', readAt: null };
const client = { id: 'c1', companyName: 'Acme', industry: 'Tech', country: 'CO', email: 'a@a.co', subscriptionTier: 'Starter', status: 'Active', activeServices: { finance: false, marketing: false, processes: false, ai: false }, projectCount: 0, assignedConsultantIds: [] };

async function setup(page: Page, role = 'Analyst') {
  await page.addInitScript(({ role }) => {
    localStorage.setItem('nous_access_token', `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`);
    localStorage.setItem('nous_current_user', JSON.stringify({ id: 'u1', name: 'Test User', email: 't@example.com', role, assignedClientIds: ['c1'] }));
  }, { role });

  const state = { alerts: [] as unknown[], notes: [{ ...note }], requests: [] as string[] };
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    state.requests.push(`${method} ${path}${url.search}`);
    const json = (data: unknown) => route.fulfill({ json: { success: true, data, error: null, pagination: null } });

    if (path.endsWith('/notifications/summary')) return json({ unreadCount: state.notes.filter((n) => !n.isRead).length, recent: [] });
    if (path.endsWith('/notifications/client/c1')) return json(url.searchParams.get('unreadOnly') === 'true' ? state.notes.filter((n) => !n.isRead) : state.notes);
    if (path.endsWith('/notifications/n1/read')) { state.notes = state.notes.map((n) => ({ ...n, isRead: true })); return json({}); }
    if (path.endsWith('/clients') && method === 'GET') return route.fulfill({ json: { success: true, data: [client], error: null, pagination: { page: 1, limit: 100, total: 1, pages: 1 } } });
    if (path.endsWith('/kpi/client/c1')) return json([kpi]);
    if (path.endsWith('/kpi/client/c1/summary')) return json(summary);
    if (path.endsWith('/alerts/client/c1')) return json(state.alerts);
    if (path.endsWith('/alerts') && method === 'POST') { state.alerts = [alertRow]; return json(alertRow); }
    if (path.endsWith('/reports/client/c1')) return json([{ id: 'r1', clientId: 'c1', name: 'Exec pack', description: '', type: 'ExecutiveOverview', format: 'PDF', kpiIds: [], periodDays: 30, isScheduled: false, cronExpression: null, recipientEmails: [], lastGeneratedAt: null, nextScheduledAt: null, isActive: true, createdAt: '2026-01-01T00:00:00Z' }]);
    if (path.endsWith('/reports/r1/generate')) return route.fulfill({ status: 200, headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename=Exec-pack.csv', 'access-control-expose-headers': 'Content-Disposition' }, body: 'a,b\n1,2' });
    if (path.endsWith('/search')) return json({ query: url.searchParams.get('q'), totalResults: 1, results: [{ entityType: 'KPI', id: 'k1', clientId: 'c1', title: 'NPS', snippet: 'Customer' }] });
    if (path.endsWith('/audit/client/c1')) return json([]);
    return route.fulfill({ status: 404, json: { success: false, error: { message: 'Unexpected test endpoint: ' + path } } });
  });
  return state;
}

test('alerts: create a threshold rule and see it breaching', async ({ page }) => {
  await setup(page);
  await page.goto('/app/clients/c1/alerts');
  await expect(page.getByText('No alerts yet.')).toBeVisible();
  await page.getByRole('button', { name: '+ New alert' }).click();
  await page.locator('input[formcontrolname="alertName"]').fill('NPS low');
  await page.locator('select[formcontrolname="kpiId"]').selectOption({ label: 'NPS' });
  await page.locator('input[formcontrolname="threshold"]').fill('40');
  await page.getByRole('button', { name: 'Create alert' }).click();
  await expect(page.getByRole('cell', { name: 'NPS low' })).toBeVisible();
  await expect(page.getByText('Breaching')).toBeVisible();
});

test('notifications: bell shows the unread count and mark-read clears it', async ({ page }) => {
  await setup(page);
  await page.goto('/app');
  await expect(page.locator('.bell .count')).toHaveText('1');
  await page.locator('.bell').click();
  await expect(page.getByText('NPS is below 40.')).toBeVisible();
  await page.getByRole('button', { name: 'Mark read', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark read', exact: true })).toHaveCount(0);
});

test('reports: a saved report downloads with the server file name', async ({ page }) => {
  await setup(page);
  await page.goto('/app/clients/c1/reports');
  await expect(page.getByText('Exec pack')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('Exec-pack.csv');
});

test('search: the top-bar box opens grouped results that link to the record', async ({ page }) => {
  await setup(page);
  await page.goto('/app');
  await page.getByRole('searchbox', { name: 'Search' }).fill('NPS');
  await page.getByRole('searchbox', { name: 'Search' }).press('Enter');
  await expect(page).toHaveURL(/\/app\/search\?q=NPS/);
  await expect(page.getByRole('cell', { name: 'NPS' })).toBeVisible();
});

test('audit: non-admins are told it is restricted, admins see the log', async ({ page }) => {
  await setup(page, 'Analyst');
  await page.goto('/app/clients/c1/audit');
  await expect(page.getByText('Only an Admin can view the audit log.')).toBeVisible();
});

test('audit: an admin is allowed to load the log', async ({ page }) => {
  const state = await setup(page, 'Admin');
  await page.goto('/app/clients/c1/audit');
  await expect(page.getByText('No recorded changes.')).toBeVisible();
  expect(state.requests.some((r) => r.startsWith('GET /api/audit/client/c1'))).toBe(true);
});

test('KPI dashboard: signed-in overview reflects real KPI numbers', async ({ page }) => {
  await setup(page);
  await page.goto('/app');
  await expect(page.getByText('KPI analytics — Acme')).toBeVisible();
  await expect(page.getByText('Total KPIs')).toBeVisible();
});

test('public analytics: clicking a category filters locally, with no API call, and switches to Spanish', async ({ page }) => {
  // The chart's data now ships with the app. Nothing should be requested from the analytics endpoint.
  const requests: string[] = [];
  await page.route('**/api/public/sample-analytics*', async (route) => {
    requests.push(route.request().url());
    await route.abort();
  });

  await page.goto('/');
  const dash = page.locator('.dash');
  await dash.scrollIntoViewIfNeeded();
  await expect(dash.getByText('HR Spend Analysis Dashboard')).toBeVisible();
  // The real seeded totals, rendered straight from the bundled data.
  await expect(dash.getByRole('cell', { name: '475,650' })).toBeVisible();

  await dash.locator('button.hbar').first().click();
  await expect(dash.locator('button.hbar.active')).toHaveCount(1);

  await page.getByRole('button', { name: 'ES', exact: true }).first().click();
  await expect(dash.getByText('Dashboard de Análisis de Gastos del Área de Recursos Humanos')).toBeVisible();
  await expect(dash.getByText('Sueldo base').first()).toBeVisible();

  expect(requests, 'the chart must not call the analytics API any more').toEqual([]);
});
