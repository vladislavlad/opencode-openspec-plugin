import { rmSync } from "fs"
import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin"

const outDir = "dist"
rmSync(outDir, { recursive: true, force: true })

// Bundle into a single ESM file. JSX is transformed with @opentui/solid's own Solid
// transform → universal codegen that imports the renderer from "@opentui/solid" (its main
// entry). opencode rewrites the bare "@opentui/solid" and "solid-js" specifiers to its own
// running instances at plugin load, so the plugin shares the host's single Solid runtime.
// (The "@opentui/solid/jsx-runtime" subpath is NOT rewritten — going through it gives the
// plugin a second Solid instance whose effects never flush, so we must avoid it.)
const result = await Bun.build({
  entrypoints: ["src/index.tsx"],
  outdir: outDir,
  target: "bun",
  format: "esm",
  external: ["@opencode-ai/*", "@opentui/*", "solid-js", "solid-js/*"],
  plugins: [createSolidTransformPlugin()],
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

console.log("Build complete:", outDir)
