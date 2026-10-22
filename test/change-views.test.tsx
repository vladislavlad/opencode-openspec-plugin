import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { ChangeDetail } from "../src/components/changes"
import { Markdown, Paragraph } from "../src/components/primitives"
import type { ChangeDocs } from "../src/lib/change-docs"
import { parseTasks, type OpenSpecChange } from "../src/lib/openspec"

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
        { done: true, text: "1.1 Write the parser", depth: 0, marker: "x", number: "" },
        { done: false, text: "1.2 Wire the sections", depth: 0, marker: "", number: "" },
      ],
    },
    { title: "2. Tests", tasks: [{ done: false, text: "2.1 Cover the teaser", depth: 0, marker: "", number: "" }] },
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

test.each(["busy", "retry"])("final Delete follows an idle → %s → idle transition", async (state) => {
  const [status, setStatus] = createSignal("idle")
  const deleted: string[] = []
  let back = 0
  let blocked = 0
  const view = await testRender(() => (
    <ChangeDetail theme={theme} change={change} docs={docs()} onCommand={() => {}}
      onBack={() => { back++ }} onDelete={(name) => { deleted.push(name) }}
      gate={{ disabled: () => status() === "busy" || status() === "retry", onDisabledClick: () => { blocked++ } }} />
  ), { width: 60, height: 40 })
  const click = async (label: string) => {
    await view.flush()
    const rows = view.captureCharFrame().split("\n")
    const y = rows.findIndex((row) => row.includes(label))
    expect(y).toBeGreaterThanOrEqual(0)
    await view.mockMouse.click(rows[y].indexOf(label) + 1, y)
    await view.flush()
  }
  try {
    await click("Delete")
    expect(view.captureCharFrame()).toContain("Cancel")
    setStatus(state)
    await click("Delete")
    expect(blocked).toBe(1)
    expect(deleted).toEqual([])
    expect(back).toBe(0)
    expect(view.captureCharFrame()).toContain("Cancel")
    await click("Cancel")
    expect(view.captureCharFrame()).not.toContain("Cancel")
    expect(blocked).toBe(1)

    setStatus("idle")
    await click("Delete")
    setStatus(state)
    await click("Delete")
    setStatus("idle")
    await click("Delete")
    expect(deleted).toEqual(["my-change"])
    expect(back).toBe(1)
  } finally { view.renderer.destroy() }
})

test("a group title hangs at column zero while its tasks keep the marker column", async () => {
  const out = await lines(detail(docs()))
  expect(out).toContain("1. Implementation")
  expect(out).toContain("✓   1.1 Write the parser")
  expect(out).toContain("○   1.2 Wire the sections")
})

const taskDetail = (content: string) => () => {
  const parsed = parseTasks(content)
  return <ChangeDetail theme={theme} change={{ name: "task-fixture", totalTasks: parsed.total, completedTasks: parsed.completed, groups: parsed.groups }} docs={null} onBack={() => {}} onCommand={() => {}} onDelete={() => {}} gate={{}} />
}

test("nested unfinished tasks retain markers and keep Archive unavailable", async () => {
  const out = await lines(taskDetail("## Work\n1. [ x ] Parent\n  + [~] Child\n  - []\n2) [ ] Sibling"))
  expect(out).toContain("✓   1. Parent")
  expect(out).toContain("  [~] Child")
  expect(out).toContain("  ○   Untitled task")
  expect(out).toContain("○   2) Sibling")
  expect(out.join("\n")).toContain("1/4 tasks done")
  expect(out.join("\n")).toContain("Only ✓ tasks count as done.")
  expect(out.join("\n")).toContain("Apply")
  expect(out.join("\n")).not.toContain("Archive")
})

test("empty task lists are explicit and never offer Archive", async () => {
  const out = (await lines(taskDetail("## Planned work\nNo checkboxes yet."))).join("\n")
  expect(out).toContain("No tasks yet")
  expect(out).toContain("Active Change")
  expect(out).not.toContain("Archive")
})

test("completed lists offer Archive and remind the user to review", async () => {
  const out = (await lines(taskDetail("- [ x ] Done\n  1. [X] Also done"))).join("\n")
  expect(out).toContain("2/2 tasks done")
  expect(out).toContain("Archive")
  expect(out.replace(/\s+/g, " ")).toContain("Review before archiving.")
  expect(out).not.toContain("Apply")
})

test("deep task descriptions wrap within a narrow sidebar with bounded indentation", async () => {
  const out = await lines(taskDetail("- [ ] Parent\n  - [ ] Child\n    - [ ] Grandchild\n      - [ ] Third\n        - [~] A long description that stays readable"), 28)
  const row = out.findIndex((line) => line.includes("[~] A long"))
  expect(row).toBeGreaterThan(0)
  expect(out[row]).toStartWith("      [~] A long")
  expect(out[row + 1]).toStartWith("          ")
  expect(out.join("\n")).toContain("readable")
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
  const { flush, captureCharFrame, mockMouse } = await testRender(detail(docs()), { width: 44, height: 40 })
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
