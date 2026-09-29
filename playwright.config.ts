import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: '**/*.pw.ts', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://localhost:4300', browserName: 'chromium', channel: 'msedge', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'npm start -- --port 4300', url: 'http://localhost:4300', reuseExistingServer: false, timeout: 120000 },
});
