import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Where your E2E tests live
  testDir: "./e2e",

  // CI-friendly defaults
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: "html",

  // Shared options for tests
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },

  // Browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Slow-mo locally so you can “see” the flow; off on CI
        launchOptions: { slowMo: process.env.CI ? 0 : 3000 },
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit",  use: { ...devices["Desktop Safari"] } },
  ],

  // Start Next.js before tests, with env injected
  webServer: {
    command: "pnpm dev",                       // or 'pnpm start' if you prefer build+start
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      // If your app truly needs it at runtime server-side:
      // SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    },
  },
});
