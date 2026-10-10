import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    esbuild: {
        jsx: "automatic",
    },
    test: {
        environment: "jsdom",
        globals: false,
        setupFiles: ["./vitest.setup.ts"],
        // Slow PCs: default 5s timeouts flake under parallel collect thrash; CI keeps full workers.
        testTimeout: 20_000,
        hookTimeout: 20_000,
        maxWorkers: process.env.CI ? undefined : "50%",
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "**/__tests__/**",
                "**/*.test.{ts,tsx}",
                "**/*.d.ts",
            ],
        },
    },
});
