import { test, expect } from '@playwright/test';

test('register: specific errors appear only after leaving a field and clear when fixed', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('.error')).toHaveCount(0); // nothing shouted at a fresh form

  await page.getByLabel('Full name').fill('Ma');
  await page.getByLabel('Full name').blur();
  await expect(page.getByText('Your name needs at least 3 characters.')).toBeVisible();
  await page.getByLabel('Full name').fill('Mamta');
  await expect(page.getByText('Your name needs at least 3 characters.')).toHaveCount(0);

  await page.getByLabel('Email').fill('mamta');
  await page.getByLabel('Email').blur();
  await expect(page.getByText(/does not look like an email/)).toBeVisible();
  await page.getByLabel('Email').fill('mamta.ya26@gmail.com');
  await expect(page.getByText(/does not look like an email/)).toHaveCount(0);
});

test('register: password checklist ticks live and the mismatch message is specific', async ({ page }) => {
  await page.goto('/register');
  const rules = page.getByRole('list', { name: 'Password requirements' });
  await expect(rules.locator('li.ok')).toHaveCount(0);

  const pw = page.locator('input[formcontrolname="password"]');
  await pw.fill('abcdefgh');
  await expect(rules.locator('li.ok')).toHaveCount(1); // length only
  await pw.fill('Abcdefg1');
  await expect(rules.locator('li.ok')).toHaveCount(3);
  await pw.fill('Abcdef1!');
  await expect(rules.locator('li.ok')).toHaveCount(4);

  const confirm = page.locator('input[formcontrolname="confirmPassword"]');
  await confirm.fill('Different1!');
  await confirm.blur();
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
  await confirm.fill('Abcdef1!');
  await expect(page.getByText('Passwords do not match.')).toHaveCount(0);
  await expect(page.locator('.error')).toHaveCount(0);
});

test('register: a valid form submits without any error messages and show/hide works', async ({ page }) => {
  await page.route('**/api/auth/register', (route) => route.fulfill({ json: { success: true, data: { token: 'h.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64') + '.s', user: { id: 'u1', name: 'Mamta', email: 'm@x.co', role: 'Analyst', assignedClientIds: [] } }, error: null, pagination: null } }));
  await page.goto('/register');
  await page.getByLabel('Organization name').fill('Acme Consulting');
  await page.getByLabel('Full name').fill('Mamta');
  await page.getByLabel('Email').fill('mamta.ya26@gmail.com');
  await page.locator('input[formcontrolname="password"]').fill('Abcdef1!');
  await page.locator('input[formcontrolname="confirmPassword"]').fill('Abcdef1!');
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(page.locator('input[formcontrolname="password"]')).toHaveAttribute('type', 'text');
  const request = page.waitForRequest((r) => r.url().endsWith('/api/auth/register'));
  await page.getByRole('button', { name: 'Create account' }).click();
  const body = (await request).postDataJSON();
  expect(body).toEqual({ organizationName: 'Acme Consulting', name: 'Mamta', email: 'mamta.ya26@gmail.com', password: 'Abcdef1!' });
});

test('register: submitting an empty form lists what is missing, one clear message each', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter your organization’s name.')).toBeVisible();
  await expect(page.getByText('Enter your full name.')).toBeVisible();
  await expect(page.getByText('Enter your email address.')).toBeVisible();
  await expect(page.getByText('Choose a password.')).toBeVisible();
  await expect(page.getByText('Repeat your password.')).toBeVisible();
});

test('login: messages are specific and password is not held to signup rules', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Enter your email address.')).toBeVisible();
  await expect(page.getByText('Enter your password.')).toBeVisible();
  await page.getByLabel('Email').fill('a@b.co');
  await page.locator('input[formcontrolname="password"]').fill('x');
  await expect(page.locator('.error')).toHaveCount(0);
});

test('autofilled values without events still submit', async ({ page }) => {
  let body: unknown = null;
  await page.route('**/api/auth/register', (route) => { body = route.request().postDataJSON(); return route.fulfill({ status: 200, json: { success: true, data: { token: 'h.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64') + '.s', user: { id: 'u', name: 'M', email: 'm@x.co', role: 'Analyst', assignedClientIds: [] } }, error: null, pagination: null } }); });
  await page.goto('/register');
  await page.locator('input[formcontrolname="name"]').waitFor();
  await page.waitForTimeout(1200); // let the initial sync passes finish so we test the submit path
  // Set values the way a browser restore/autofill does: no input events.
  await page.evaluate(() => {
    const set = (n: string, v: string) => { (document.querySelector(`input[formcontrolname="${n}"]`) as HTMLInputElement).value = v; };
    set('organizationName', 'Acme Consulting');
    set('name', 'Mamta Yadav'); set('email', 'mamta.ya26@gmail.com'); set('password', 'Abcdef1!'); set('confirmPassword', 'Abcdef1!');
  });
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect.poll(() => body).toEqual({ organizationName: 'Acme Consulting', name: 'Mamta Yadav', email: 'mamta.ya26@gmail.com', password: 'Abcdef1!' });
});
test('errors do not show for values that were autofilled', async ({ page }) => {
  await page.goto('/register');
  await page.locator('input[formcontrolname="name"]').waitFor();
  await page.evaluate(() => { (document.querySelector('input[formcontrolname="name"]') as HTMLInputElement).value = 'Mamta Yadav'; });
  await page.locator('input[formcontrolname="email"]').focus(); // focusin syncs the name field
  await page.locator('input[formcontrolname="name"]').focus();
  await page.locator('input[formcontrolname="email"]').focus();
  await expect(page.getByText('Enter your full name.')).toHaveCount(0);
});
