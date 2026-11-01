import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// swc emits decorator metadata, which esbuild (vitest default) does not.
export default defineConfig({
  oxc: false,
  plugins: [swc.vite({ module: { type: "es6" } })],
});
