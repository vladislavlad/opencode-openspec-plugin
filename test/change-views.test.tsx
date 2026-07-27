import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { ChangeDetail } from "../src/components/changes"
import { Markdown, Paragraph } from "../src/components/primitives"
import type { ChangeDocs } from "../src/lib/change-docs"
import type { OpenSpecChange } from "../src/lib/openspec"

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

// Lines trimmed right, so an indent is testable and a blank row reads as "". `flush` runs the
// layout to a fixed point – a single pass leaves wrapped text a row off.
async function lines(node: () => any, width = 44, height = 40): Promise<string[]> {
  const { flush, captureCharFrame, renderer } = await testRender(node, { width, height })
  await flush()
  const out = captureCharFrame()
    .split("\n")
    .map((l) => l.trimEnd())
  renderer.destroy()
  return out
}

// The same, but able to click a section header open first – that's the only way into the expanded
// state, since the folds start closed and own their state.
async function opened(node: () => any, labels: string[], width = 44, height = 60): Promise<string[]> {
  const { flush, captureCharFrame, renderer, mockMouse } = await testRender(node, { width, height })
  await flush()
  const rows = () => captureCharFrame().split("\n").map((l) => l.trimEnd())
  for (const label of labels) {
    const y = rows().findIndex((l) => l.includes(label))
    if (y < 0) throw new Error(`no row with ${label}`)
    await mockMouse.click(2, y)
    await flush()
  }
  const out = rows()
  renderer.destroy()
  return out
}

const change: OpenSpecChange = {
  name: "my-change",
  completedTasks: 1,
  totalTasks: 3,
  groups: [
    {
      title: "1. Implementation",
      tasks: [
        { done: true, text: "1.1 Write the parser" },
        { done: false, text: "1.2 Wire the sections" },
      ],
    },
    { title: "2. Tests", tasks: [{ done: false, text: "2.1 Cover the teaser" }] },
  ],
}

const docs = (over: Partial<ChangeDocs> = {}): ChangeDocs => ({
  hasProposal: true,
  parts: [
    {
      label: "Why",
      body: "Карточка показывает только задачи, контекста в ней нет никакого, и это чинится ровно двумя файлами рядом.\n\nВторой абзац.",
    },
    { label: "Goals", body: "- Первая цель" },
    { label: "Non-Goals", body: "- Не цель" },
  ],
  design: null,
  ...over,
})

const detail = (d: ChangeDocs | null) => () => (
  <ChangeDetail theme={theme} change={change} docs={d} onBack={() => {}} onCommand={() => {}} onDelete={() => {}} gate={{}} />
)

// ---- sections -------------------------------------------------------------

test("the card opens with Tasks expanded and Proposal collapsed", async () => {
  const out = (await lines(detail(docs()))).join("\n")
  expect(out).toContain("▶ Proposal")
  expect(out).toContain("▼ Tasks")
  expect(out).not.toContain("▼ Tasks:") // count moved to ProgressBar
  expect(out).toContain("1/3 tasks done") // counter in progress bar under name
  expect(out).toContain("1.1 Write the parser") // tasks are visible without a click
  expect(out).not.toContain("What Changes") // the proposal body is not
})

test("the task count lives in the ProgressBar, not in the section header", async () => {
  const out = await lines(detail(docs()))
  expect(out.join("\n")).toContain("1/3 tasks done")
  expect(out.some((l) => l.includes("Tasks:"))).toBe(false) // no count in section header
})

test("a collapsed Proposal teases the opening of Why and stops there", async () => {
  const out = (await lines(detail(docs()))).join("\n")
  expect(out).toContain("Карточка показывает только задачи")
  expect(out).toContain("…") // cut, so the teaser can't grow past a couple of rows
  expect(out).not.toContain("двумя файлами рядом")
  expect(out).not.toContain("Второй абзац")
})

test("without a proposal body there is nothing to tease", async () => {
  const out = (await lines(detail(docs({ parts: [] })))).join("\n")
  expect(out).toContain("▶ Proposal")
  expect(out).not.toContain("Карточка показывает")
})

test("the Design section appears only when the change has a design.md", async () => {
  expect((await lines(detail(docs()))).join("\n")).not.toContain("Design")
  const withDesign = (await lines(detail(docs({ design: "## Контекст\nПодробности." })))).join("\n")
  expect(withDesign).toContain("▶ Design")
  expect(withDesign).not.toContain("Подробности.") // collapsed, so the body stays hidden
})

test("while the artifacts are still being read no section claims a missing file", async () => {
  const out = (await lines(detail(null))).join("\n")
  expect(out).toContain("▶ Proposal")
  expect(out).toContain("▼ Tasks")
  expect(out).not.toContain("No proposal.md")
  expect(out).not.toContain("Design")
})

test("an expanded Proposal puts every part under its own label", async () => {
  const out = await opened(detail(docs()), ["▶ Proposal"])
  expect(out).toContain("Why")
  expect(out).toContain("Goals")
  expect(out).toContain("Non-Goals")
  expect(out).toContain("• Первая цель")
  expect(out).toContain("• Не цель")
})

test("an expanded Design keeps one blank row between its body and the next header", async () => {
  const out = await opened(detail(docs({ design: "## Контекст\n\nКороткий design.\n" })), ["▶ Design"])
  const body = out.indexOf("Короткий design.")
  expect(body).toBeGreaterThan(0)
  expect(out[body + 1]).toBe("") // the gap before Tasks
  expect(out[body + 2]).toContain("Tasks") // section header without count
})

// ---- task groups ----------------------------------------------------------

test("a group title hangs at column zero while its tasks keep the marker column", async () => {
  const out = await lines(detail(docs()))
  expect(out).toContain("1. Implementation")
  expect(out).toContain("✓ 1.1 Write the parser")
  expect(out).toContain("  1.2 Wire the sections")
})

// ---- Markdown -------------------------------------------------------------

test("markdown renders headings, bullets, code and prose", async () => {
  const out = await lines(() => (
    <Markdown theme={theme} text={"## Контекст\n\nОбычный текст.\n\n- буллет\n\n```\ncode --flag\n```"} />
  ))
  const joined = out.join("\n")
  expect(joined).toContain("Контекст")
  expect(joined).not.toContain("## Контекст") // the hashes are gone
  expect(joined).toContain("Обычный текст.")
  expect(joined).toContain("• буллет")
  expect(out).toContain("  code --flag") // fenced content is kept, the fences are not
  expect(joined).not.toContain("```")
})

test("a heading inside a fence is not treated as structure", async () => {
  const out = (await lines(() => <Markdown theme={theme} text={"```\n## not a heading\n```"} />)).join("\n")
  expect(out).toContain("## not a heading")
})

test("markdown strips ** from headings, bullets and prose", async () => {
  const out = await lines(() => (
    <Markdown theme={theme} text={"## **Bold** Heading\n- **жирный** буллет\nОбычный **текст** здесь."} />
  ))
  const joined = out.join("\n")
  expect(joined).toContain("Bold Heading")
  expect(joined).not.toContain("**")
})

test("paragraph strips ** from inline text", async () => {
  const out = await lines(() => <Paragraph theme={theme} text={"Это **жирный** текст и ещё **один**."} />)
  const joined = out.join("\n")
  expect(joined).toContain("жирный")
  expect(joined).not.toContain("**")
})

// ---- teaser click ---------------------------------------------------------

test("clicking the teaser expands the Proposal section", async () => {
  const { flush, captureCharFrame, renderer, mockMouse } = await testRender(detail(docs()), { width: 44, height: 40 })
  await flush()
  // Find the teaser line (contains "Карточка")
  const rows = () => captureCharFrame().split("\n").map((l) => l.trimEnd())
  const teaserY = rows().findIndex((l) => l.includes("Карточка"))
  expect(teaserY).toBeGreaterThan(0) // teaser exists below the header
  await mockMouse.click(4, teaserY) // click on the teaser text (not column 2 where indicator is)
  await flush()
  const out = rows().join("\n")
  expect(out).toContain("▼ Proposal") // section expanded
  expect(out).toContain("Why") // body visible
})
