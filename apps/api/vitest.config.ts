import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Unit tests only by default (mocked repositories/prisma, no live
    // infra required). Integration tests (`*.integration.test.ts`) need
    // `docker compose up -d postgres redis` first and run via
    // `pnpm --filter api run test:integration`.
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts", "node_modules"],
    setupFiles: ["./src/test/setupEnv.ts"],
  },
});
