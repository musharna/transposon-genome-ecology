import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** Absolute path to a file beside this config. */
const here = (rel: string): string =>
  fileURLToPath(new URL(rel, import.meta.url));

/**
 * `root` is `web/`, so both entries are named relative to it and `outDir` is
 * relative to root as well. No `__dirname` here: this file is ESM, that
 * identifier does not exist in it, and nothing else in the repo defines one.
 *
 * The second entry is what Task 19's guard 7 loads. It is a real page in the
 * real bundle, built by this config from the same `sim/` sources the toy
 * imports, which is the whole point: the guard compares node against the
 * artifact the build actually emits, not against a separate compilation.
 */
export default defineConfig({
  root: "web",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: here("./web/index.html"),
        harness: here("./web/hash-harness.html"),
      },
    },
  },
});
