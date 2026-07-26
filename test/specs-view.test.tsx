import { expect, test } from "bun:test"
import { createSignal } from "solid-js"
import { testRender } from "@opentui/solid"
import { ChangeDetail } from "../src/components/changes"
import { Divider } from "../src/components/primitives"
import { RequirementDetail, SpecDetail, SpecRow } from "../src/components/specs"
import type { OpenSpecSpec } from "../src/lib/openspec"
import type { CliRenderer, TuiThemeCurrent } from "@opencode-ai/plugin/tui"

const theme = () =>
  ({
    text: "#ffffff",
    textMuted: "#888888",
    accent: "#00aaff",
    secondary: "#aa88ff",
    success: "#00ff00",
    warning: "#ffaa00",
    error: "#ff0000",
    background: "#000000",
    borderSubtle: "#444444",
  }) as unknown as TuiThemeCurrent

// SearchField subscribes to the renderer; the component under test doesn't need real focus here.
const stubRenderer = { on: () => {}, off: () => {}, currentFocusedRenderable: null } as unknown as CliRenderer

// Frame as an array of trimmed-right lines, so blank rows are testable as "".
async function frame(node: () => any, width = 40, height = 20): Promise<string[]> {
  const { renderOnce, captureCharFrame, renderer } = await testRender(node, { width, height })
  await renderOnce()
  const lines = captureCharFrame()
    .split("\n")
    .map((l) => l.trimEnd())
  renderer.destroy()
  return lines
}

const spec: OpenSpecSpec = {
  name: "change-tracking-ui",
  title: "change-tracking-ui",
  purpose: "Интерфейс отслеживания изменений",
  requirements: [
    {
      name: "Archive button",
      description: "Система SHALL показывать кнопку архивации",
      scenarios: [
        { name: "Запуск архивации", lines: ["- **WHEN** пользователь нажимает Archive"] },
        { name: "Кнопка скрыта", lines: ["- **WHEN** завершённых изменений нет"] },
      ],
    },
    { name: "Task progress", description: "", scenarios: [{ name: "Прогресс", lines: ["- **THEN** progress bar"] }] },
  ],
}

const specDetail = (query: string) => () => (
  <SpecDetail
    theme={theme}
    spec={spec}
    renderer={stubRenderer}
    query={() => query}
    onQuery={() => {}}
    onOpenReq={() => {}}
    onBack={() => {}}
  />
)

// ---- Divider --------------------------------------------------------------

test("the divider fills the width and stays on one row when the sidebar is narrow", async () => {
  for (const width of [40, 36, 30]) {
    const lines = await frame(
      () => (
        <box>
          <text>OpenSpec</text>
          <Divider theme={theme} />
          <text>after</text>
        </box>
      ),
      width,
      6,
    )
    expect(lines[1]).toBe("─".repeat(width))
    expect(lines[2]).toBe("after") // no wrapped tail between the rule and the next row
  }
})

// ---- ChangeDetail ---------------------------------------------------------

test("the change screen has one blank line above the header and none under its divider", async () => {
  const lines = await frame(() => (
    <box>
      <text>OpenSpec</text>
      <Divider theme={theme} />
      <ChangeDetail
        theme={theme}
        change={{ name: "specs-search", completedTasks: 20, totalTasks: 24, groups: [] }}
        onBack={() => {}}
        onCommand={() => {}}
        onDelete={() => {}}
        gate={{}}
      />
    </box>
  ))
  expect(lines[2]).toBe("") // the single blank above the label, same as the Specification screen
  expect(lines[3]).toContain("Active Change")
  expect(lines[4]).toBe("─".repeat(40))
  expect(lines[5]).toBe("• specs-search") // straight after the rule, no gap
})

// ---- SpecDetail -----------------------------------------------------------

test("the spec detail shows the name and Purpose, without a title or description line", async () => {
  const lines = await frame(specDetail(""))
  expect(lines[1]).toContain("Specification")
  expect(lines[3]).toBe("▪ change-tracking-ui")
  expect(lines[4]).toBe("")
  expect(lines[5]).toBe("Purpose") // no repeated capability name in between
  expect(lines.filter((l) => l === "change-tracking-ui")).toHaveLength(0)
})

test("a query filters the requirements and counts the scenarios that matched", async () => {
  const lines = await frame(specDetail("archive"))
  expect(lines).toContain("Requirements: 1")
  expect(lines).toContain("› Archive button")
  expect(lines).toContain("  1 matching scenarios")
  expect(lines.some((l) => l.includes("Task progress"))).toBe(false)
})

test("a query nothing matches shows No matches instead of the list", async () => {
  const lines = await frame(specDetail("нетакого"))
  expect(lines).toContain("Requirements: 0")
  expect(lines).toContain("  No matches")
  expect(lines.some((l) => l.includes("Archive button"))).toBe(false)
})

// ---- RequirementDetail ----------------------------------------------------

test("the requirement detail highlights SHALL and the scenario keywords", async () => {
  const lines = await frame(
    () => (
      <RequirementDetail
        theme={theme}
        req={{
          name: "Archive button",
          description: "Система SHALL показывать кнопку архивации",
          scenarios: [{ name: "Запуск архивации", lines: ["- **WHEN** пользователь нажимает Archive"] }],
        }}
        onBack={() => {}}
      />
    ),
    60,
  )
  expect(lines).toContain("Система SHALL показывать кнопку архивации")
  expect(lines).toContain("Scenarios: 1")
  // Scenarios auto-open below four, and the bullet markup is consumed by the renderer.
  expect(lines.some((l) => l.includes("WHEN пользователь нажимает Archive"))).toBe(true)
  expect(lines.some((l) => l.includes("**"))).toBe(false)
})

// ---- SpecRow --------------------------------------------------------------

test("a spec row reports matching requirements when the search hit is inside them", async () => {
  const [hovered, setHovered] = createSignal<string | null>(null)
  const row = (matched?: number) => () => (
    <SpecRow
      theme={theme}
      spec={spec}
      hovered={hovered}
      setHovered={setHovered}
      onSelect={() => {}}
      matchedRequirements={matched}
    />
  )
  expect(await frame(row(), 40, 4)).toContain("  2 requirements")
  expect(await frame(row(0), 40, 4)).toContain("  2 requirements")
  expect(await frame(row(1), 40, 4)).toContain("  1 matching requirements")
})
