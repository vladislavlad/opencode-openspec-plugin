import { transformSync } from "@babel/core"
import { mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync } from "fs"

const outDir = "./dist"
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

// Transform every source module; opencode's TUI renders through @opentui/solid (a terminal renderer),
// so use universal codegen against that runtime rather than the default solid-js/web DOM.
for (const file of readdirSync("src").filter((f) => /\.tsx?$/.test(f))) {
  const result = transformSync(readFileSync(`src/${file}`, "utf8"), {
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
  writeFileSync(`${outDir}/${file.replace(/\.tsx?$/, ".js")}`, result.code)
}

console.log("Build complete:", outDir)
