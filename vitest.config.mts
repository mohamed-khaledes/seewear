import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/": `${root}src/`,
      // The real package throws outside a React Server Component on purpose.
      // Tests import server modules directly, so it becomes a no-op here.
      "server-only": `${root}tests/stubs/server-only.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    // The migration suite boots a real Postgres in WebAssembly.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
