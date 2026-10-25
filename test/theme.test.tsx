import { expect, test } from "bun:test"
import { createSignal } from "solid-js"
import { testRender } from "@opentui/solid"
import { migrateV1, resolveThemeDocument } from "@opencode/theme/tui"
import type { ThemeV1Json } from "@opencode/theme/tui/v1"
import { themeColors } from "../src/lib/theme"
import { InitScreen } from "../src/components/init-flow"
import { Button } from "../src/components/primitives"

// Exercise the actual host migration/resolver: native action foregrounds are neutral,
// even when the theme's interactive and accent palettes are colored.
function nativeTheme(mode: "dark" | "light", interactive = "#61afef", accent = "#c678dd") {
  const neutral = `border borderActive borderSubtle
    diffAdded diffRemoved diffContext diffHunkHeader diffHighlightAdded diffHighlightRemoved
    diffAddedBg diffRemovedBg diffContextBg diffLineNumber diffAddedLineNumberBg diffRemovedLineNumberBg
    markdownText markdownHeading markdownLink markdownLinkText markdownCode markdownBlockQuote
    markdownEmph markdownStrong markdownHorizontalRule markdownListItem markdownListEnumeration
    markdownImage markdownImageText markdownCodeBlock
    syntaxComment syntaxKeyword syntaxFunction syntaxVariable syntaxString syntaxNumber syntaxType
    syntaxOperator syntaxPunctuation`.split(/\s+/)
  const text = mode === "dark" ? "#eeeeee" : "#141414"
  const background = mode === "dark" ? "#141414" : "#ffffff"
  const theme = {
    ...Object.fromEntries(neutral.map((name) => [name, text])),
    primary: interactive, secondary: interactive, accent,
    text, textMuted: "#808080", background, backgroundPanel: background, backgroundElement: background,
    success: "#7fd88f", warning: "#f5a742", error: "#e06c75", info: interactive,
  } as ThemeV1Json["theme"]
  return resolveThemeDocument(migrateV1({ theme }), mode)
}

for (const mode of ["dark", "light"] as const) {
  test(`colored controls survive real ${mode} theme migration with neutral action text`, () => {
    const native = nativeTheme(mode)
    expect(native.text.action.secondary.base.equals(native.text.muted)).toBe(true)
    expect(native.text.action.primary.base.equals(native.text.base)).toBe(true)
    const colors = themeColors(native)
    expect(colors.primary).toEqual(native.hue.interactive[200])
    expect(colors.secondary).toEqual(native.hue.interactive[200])
    expect(colors.accent).toEqual(native.hue.accent[200])
    expect(colors.textMuted).toEqual(native.text.muted)
    expect(colors.success).toEqual(native.text.feedback.success.base)
    expect(colors.warning).toEqual(native.text.feedback.warning.base)
    expect(colors.error).toEqual(native.text.feedback.error.base)
  })
}

test("a deliberately neutral palette is respected instead of hardcoding blue", () => {
  const native = nativeTheme("dark", "#808080", "#808080")
  const colors = themeColors(native)
  expect(colors.secondary).toEqual(native.hue.interactive[200])
  expect(colors.accent).toEqual(native.hue.accent[200])
})

test("Init and all shared button colors follow the live palette while disabled actions remain muted", async () => {
  const [native, setNative] = createSignal(nativeTheme("dark"))
  const [busy, setBusy] = createSignal(false)
  const colors = () => themeColors(native())
  let calls = 0
  const view = await testRender(() => (
    <box flexDirection="column">
      <InitScreen theme={colors} aborted={() => false} onInit={() => { calls++ }} gate={{ disabled: busy }} />
      <Button theme={colors} label="Primary" color={colors().primary} onClick={() => {}} />
      <Button theme={colors} label="Accent" color={colors().accent} onClick={() => {}} />
      <Button theme={colors} label="Success" color={colors().success} onClick={() => {}} />
      <Button theme={colors} label="Warning" color={colors().warning} onClick={() => {}} />
      <Button theme={colors} label="Error" color={colors().error} onClick={() => {}} />
    </box>
  ), { width: 44, height: 14 })
  const span = (label: string) => view.captureSpans().lines.flatMap((line) => line.spans).find((part) => part.text.trim() === label)!
  try {
    await view.renderOnce()
    expect(span("Init").fg.equals(native().hue.interactive[200])).toBe(true)
    expect(span("Primary").fg.equals(native().hue.interactive[200])).toBe(true)
    expect(span("Accent").fg.equals(native().hue.accent[200])).toBe(true)
    for (const [label, kind] of [["Success", "success"], ["Warning", "warning"], ["Error", "error"]] as const) {
      expect(span(label).fg.equals(native().text.feedback[kind].base)).toBe(true)
    }
    setNative(nativeTheme("light", "#245ab5", "#a52a91"))
    await view.renderOnce()
    expect(span("Init").fg.equals(native().hue.interactive[200])).toBe(true)
    expect(span("Accent").fg.equals(native().hue.accent[200])).toBe(true)
    const row = view.captureCharFrame().split("\n").findIndex((line) => line.trim() === "Init")
    await view.mockMouse.moveTo(2, row)
    await view.renderOnce()
    expect(span("Init").bg.equals(native().hue.interactive[200])).toBe(true)
    expect(span("Init").fg.equals(native().background.base)).toBe(true)
    await view.mockMouse.moveTo(40, 13)
    setBusy(true)
    await view.renderOnce()
    expect(span("Init").fg.equals(native().text.muted)).toBe(true)
    await view.mockMouse.click(2, row)
    expect(calls).toBe(0)
  } finally {
    view.renderer.destroy()
  }
})
