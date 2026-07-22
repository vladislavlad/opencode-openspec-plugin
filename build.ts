import { transformSync } from "@babel/core"
import { mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync } from "fs"
import { dirname, join, relative } from "path"

const srcDir = "src"
const outDir = "dist"
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

// Collect every .ts/.tsx under src/, recursing into subdirectories.
function sources(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sources(full))
    else if (/\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

// Transform every source module; opencode's TUI renders through @opentui/solid (a terminal renderer),
// so use universal codegen against that runtime rather than the default solid-js/web DOM.
for (const file of sources(srcDir)) {
  const result = transformSync(readFileSync(file, "utf8"), {
    filename: file,
    presets: [
      "@babel/preset-typescript",
      ["babel-preset-solid", { generate: "universal", moduleName: "@opentui/solid" }],
    ],
    configFile: false,
  })
  if (!result?.code) {
    console.error("Babel transformation failed:", file)
    process.exit(1)
  }
  // Mirror the src/ layout under dist/ so relative imports keep resolving.
  const outPath = join(outDir, relative(srcDir, file).replace(/\.tsx?$/, ".js"))
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, result.code)
}

console.log("Build complete:", outDir)
