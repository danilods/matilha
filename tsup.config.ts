import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
    index: "src/index.ts",
    "scripts/port-methodology": "src/scripts/port-methodology.ts"
  },
  format: ["esm"],
  target: "node20",
  clean: true,
  dts: true,
  banner: ({ format }) => ({
    js: format === "esm" ? "#!/usr/bin/env node" : undefined
  }),
  shims: true
});
