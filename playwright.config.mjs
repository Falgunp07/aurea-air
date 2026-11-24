import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.mjs',
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4287',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 850 } } },
    { name: 'mobile', use: { viewport: { width: 360, height: 780 }, hasTouch: true } },
  ],
  webServer: {
    command: 'node e2e/server.mjs',
    url: 'http://127.0.0.1:4287',
    reuseExistingServer: false,
  },
})
