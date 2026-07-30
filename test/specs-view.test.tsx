import { expect, test } from "bun:test"
import { createSignal } from "solid-js"
import { testRender } from "@opentui/solid"
import { ChangeDetail } from "../src/components/changes"
import { Divider } from "../src/components/primitives"
import { RequirementDetail, SpecDetail, SpecNodeView, SpecRow, buildTree, findNode, parentArea } from "../src/components/specs"
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
        docs={null}
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

// ---- the specs tree -------------------------------------------------------

const named = (name: string, requirements = 1): OpenSpecSpec => ({
  name,
  title: name,
  purpose: "",
  requirements: Array.from({ length: requirements }, (_, i) => ({ name: `R${i}`, description: "", scenarios: [] })),
})

test("buildTree groups by path segment and counts specs at any depth", () => {
  const root = buildTree([
    named("project-config"),
    named("backend/auth"),
    named("backend/api"),
    named("area-1/area-1-a/deep"),
  ])
  expect(root.areas.map((a) => a.name)).toEqual(["area-1", "backend"]) // alphabetical
  expect(root.specs.map((s) => s.name)).toEqual(["project-config"])

  const backend = root.areas.find((a) => a.name === "backend")!
  expect(backend.path).toBe("backend")
  expect(backend.total).toBe(2)
  expect(backend.specs.map((s) => s.name)).toEqual(["backend/api", "backend/auth"])

  const areaOne = root.areas.find((a) => a.name === "area-1")!
  expect(areaOne.total).toBe(1) // counted through the sub-area
  expect(areaOne.specs).toEqual([])
  expect(areaOne.areas[0].path).toBe("area-1/area-1-a")
})

test("a flat list yields a root with no areas", () => {
  const root = buildTree([named("a"), named("b")])
  expect(root.areas).toEqual([])
  expect(root.specs).toHaveLength(2)
})

test("findNode walks a path and reports a missing area", () => {
  const root = buildTree([named("area-1/area-1-a/deep")])
  expect(findNode(root, "")).toBe(root)
  expect(findNode(root, "area-1/area-1-a")?.specs.map((s) => s.name)).toEqual(["area-1/area-1-a/deep"])
  expect(findNode(root, "gone")).toBeNull()
})

test("parentArea goes one level up, root only from the top level", () => {
  expect(parentArea("area-1/area-1-a")).toBe("area-1")
  expect(parentArea("area-1")).toBe("")
})

// The headings label groups. A flat project has no groups, so it stays the plain list it always was;
// once an area is in play – beside this level or around it – the labels appear with their counts.
test("groups are labelled once an area is in play, and not before", async () => {
  const [hovered, setHovered] = createSignal<string | null>(null)
  const view = (specs: OpenSpecSpec[], path = "") => () => (
    <SpecNodeView
      theme={theme}
      node={findNode(buildTree(specs), path)!}
      hovered={hovered}
      setHovered={setHovered}
      onSelectArea={() => {}}
      onSelectSpec={() => {}}
      onBack={() => {}}
    />
  )

  const divided = await frame(view([named("project-config"), named("backend/auth"), named("backend/api")]), 40, 12)
  expect(divided).toContain("Areas: 1")
  expect(divided).toContain("Capabilities: 1")
  expect(divided).toContain("▪ backend")
  expect(divided).toContain("  2 capabilities")
  expect(divided).toContain("▪ project-config")

  // Inside `backend`: no sub-areas, so no Areas heading – but its capabilities are still labelled,
  // and they read by leaf name because the area header above already named the area.
  const inside = await frame(view([named("backend/auth"), named("backend/api")], "backend"), 40, 12)
  expect(inside).not.toContain("Areas:")
  expect(inside).toContain("Capabilities: 2")
  expect(inside).toContain("▪ auth")
  expect(inside).toContain("▪ api")

  // A project with no areas at all: nothing to label, so it looks as it always did.
  const flat = await frame(view([named("a"), named("b")]), 40, 8)
  expect(flat).not.toContain("Areas:")
  expect(flat).not.toContain("Capabilities:")
})

// The header is drawn from the node, never from the path its caller asked for, so it can only name
// the area actually on screen. Files move between polls: an area that disappears mid-derive leaves
// its caller falling back to the root, and the root carries no header to announce a gone area.
test("the area header names the node rendered, so a vanished area leaves none behind", async () => {
  const [hovered, setHovered] = createSignal<string | null>(null)
  const tree = buildTree([named("backend/auth"), named("project-config")])
  // `?? tree` is the fallback the sidebar makes when the area it was showing is gone.
  const view = (path: string) => () => (
    <SpecNodeView
      theme={theme}
      node={findNode(tree, path) ?? tree}
      hovered={hovered}
      setHovered={setHovered}
      onSelectArea={() => {}}
      onSelectSpec={() => {}}
      onBack={() => {}}
    />
  )

  const inside = (await frame(view("backend"), 40, 12)).join("\n")
  expect(inside).toContain("← back")
  expect(inside).toContain("▪ backend") // the path, on its own row under the label
  expect(inside).toContain("Capabilities: 1")

  const vanished = (await frame(view("frontend"), 40, 12)).join("\n")
  expect(vanished).not.toContain("← back") // no area is open, so there is nothing to leave
  expect(vanished).toContain("Areas: 1") // the root's own content, drawn as usual
  expect(vanished).toContain("▪ project-config")
})

// Two areas can each hold an `auth`; a list drawn without a node around it has to say which is which.
test("a spec row shows its leaf in a node and its full path in a flat list", async () => {
  const [hovered, setHovered] = createSignal<string | null>(null)
  const row = (showPath?: boolean) => () => (
    <SpecRow
      theme={theme}
      spec={named("backend/auth")}
      hovered={hovered}
      setHovered={setHovered}
      onSelect={() => {}}
      showPath={showPath}
    />
  )
  expect(await frame(row(), 40, 4)).toContain("▪ auth")
  expect(await frame(row(true), 40, 4)).toContain("▪ backend/auth")
})
