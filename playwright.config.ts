import { defineConfig } from "@playwright/test";

const MOCK_PORT = 3099;
const APP_PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    headless: true,
  },
  webServer: [
    {
      command: "npx tsx tests/mock-mxroute.ts",
      port: MOCK_PORT,
      reuseExistingServer: true,
      env: { MOCK_PORT: String(MOCK_PORT) },
    },
    {
      command: "npm run dev",
      port: APP_PORT,
      reuseExistingServer: true,
      env: {
        MXROUTE_SERVER: "test-server",
        MXROUTE_USERNAME: "test-user",
        MXROUTE_API_KEY: "test-api-key-12345678",
        MXROUTE_BASE_URL: `http://localhost:${MOCK_PORT}`,
        ADMIN_PASSWORD: "test-password-12345",
        SESSION_SECRET: "test-session-secret-at-least-32-chars!!",
        PORT: String(APP_PORT),
        HOSTNAME: "localhost",
      },
    },
  ],
});
