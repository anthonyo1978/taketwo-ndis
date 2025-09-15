import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Where your E2E tests live
  testDir: "./e2e",

  // CI-friendly defaults
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 60000 : 30000, // Longer timeout in CI
  expect: {
    timeout: process.env.CI ? 10000 : 5000, // Longer expect timeout in CI
  },

  // Reporter
  reporter: "html",

  // Shared options for tests
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Handle cross-origin issues
    ignoreHTTPSErrors: true,
    // Add some stability for CI
    actionTimeout: process.env.CI ? 15000 : 10000,
    navigationTimeout: process.env.CI ? 30000 : 20000,
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
    command: "next dev -p 3000 --hostname localhost",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start server
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key",
      // If your app truly needs it at runtime server-side:
      // SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    },
  },
});
