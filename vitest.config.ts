import { coverageConfigDefaults , defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // The real 'obsidian' package isn't Vite-resolvable; stub it for tests.
      obsidian: path.resolve(here, "src/tests/obsidianStub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        'esbuild.config.mjs',
        // Unit test sources/helpers shouldn't affect production coverage
        'src/tests/**',
        // Type-only modules (no runtime JS to execute)
        'src/core/handleEvents/types.ts',
        'src/core/render/renderTypes.ts',
        'src/core/render/translate/models.ts',
      ]
    }
  },
  
});
