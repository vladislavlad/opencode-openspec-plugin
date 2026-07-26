import { describe, expect, test } from "bun:test"
import { searchRequirements, searchSpecs } from "../src/lib/search"
import type { OpenSpecSpec } from "../src/lib/openspec"

function spec(overrides: Partial<OpenSpecSpec> & { name: string }): OpenSpecSpec {
  return {
    title: overrides.name,
    purpose: "",
    requirements: [],
    ...overrides,
  }
}

const specs: OpenSpecSpec[] = [
  spec({
    name: "change-tracking-ui",
    title: "Change tracking",
    purpose: "Показывать прогресс задач и список активных изменений",
    requirements: [
      {
        name: "Archive button",
        description: "Система SHALL показывать кнопку архивации",
        scenarios: [{ name: "Запуск архивации", lines: ["- **WHEN** пользователь нажимает Archive"] }],
      },
      {
        name: "Task progress",
        description: "",
        scenarios: [{ name: "Прогресс", lines: ["- **THEN** отображается progress bar"] }],
      },
    ],
  }),
  spec({
    name: "settings-view",
    title: "Settings",
    purpose: "Экран настроек: версии и обновления",
    requirements: [{ name: "Check versions", description: "Плагин SHALL спрашивать npm registry", scenarios: [] }],
  }),
]

const names = (query: string) => searchSpecs(specs, query).map((m) => m.spec.name)

describe("searchSpecs", () => {
  test("an empty query returns every spec in order", () => {
    expect(names("")).toEqual(["change-tracking-ui", "settings-view"])
    expect(names("   ")).toEqual(["change-tracking-ui", "settings-view"])
    expect(searchSpecs(specs, "").every((m) => m.matchedRequirements === 0)).toBe(true)
  })

  test("matches the capability name", () => {
    expect(names("settings-view")).toEqual(["settings-view"])
  })

  test("matches the title and Purpose", () => {
    expect(names("Change tracking")).toEqual(["change-tracking-ui"])
    expect(names("Экран настроек")).toEqual(["settings-view"])
    expect(names("прогресс задач")).toEqual(["change-tracking-ui"])
  })

  test("matches requirement name and description", () => {
    expect(names("archive button")).toEqual(["change-tracking-ui"])
    expect(names("npm registry")).toEqual(["settings-view"])
  })

  test("schema keywords and markdown are not searched", () => {
    for (const noise of ["shall", "SHALL", "must", "when", "then", "**", "**WHEN**", "- **THEN**"]) {
      expect(names(noise)).toEqual([])
    }
  })

  test("a query made only of keywords matches nothing", () => {
    expect(names("shall when")).toEqual([])
  })

  test("keywords around a real word are ignored, the word still matches", () => {
    expect(names("SHALL показывать")).toEqual(["change-tracking-ui"])
  })

  test("matches scenario names and body lines", () => {
    expect(names("запуск архивации")).toEqual(["change-tracking-ui"])
    expect(names("progress bar")).toEqual(["change-tracking-ui"])
  })

  test("ignores case", () => {
    expect(names("ARCHIVE")).toEqual(["change-tracking-ui"])
  })

  test("requires every token, possibly from different artifacts", () => {
    // "изменений" is in the spec's Purpose, "Archive" only in a scenario line.
    expect(names("изменений Archive")).toEqual(["change-tracking-ui"])
    expect(names("Archive настроек")).toEqual([])
  })

  test("counts requirements that match on their own text", () => {
    const [match] = searchSpecs(specs, "прогресс")
    expect(match.spec.name).toBe("change-tracking-ui")
    expect(match.matchedRequirements).toBe(1)
  })

  test("a spec-level match reports no matching requirements", () => {
    const [match] = searchSpecs(specs, "Экран настроек")
    expect(match.matchedRequirements).toBe(0)
  })

  test("returns nothing when no spec matches", () => {
    expect(names("несуществующий текст")).toEqual([])
  })
})

// The query carries into the spec detail view, where it filters that spec's requirements.
describe("searchRequirements", () => {
  const reqs = specs[0].requirements
  const reqNames = (query: string) => searchRequirements(reqs, query).map((m) => m.req.name)

  test("an empty query returns every requirement", () => {
    expect(reqNames("")).toEqual(["Archive button", "Task progress"])
  })

  test("matches the requirement name and description", () => {
    expect(reqNames("кнопку архивации")).toEqual(["Archive button"])
  })

  test("keywords don't match requirements either", () => {
    expect(reqNames("shall")).toEqual([])
    expect(reqNames("when")).toEqual([])
  })

  test("matches inside scenarios", () => {
    expect(reqNames("progress bar")).toEqual(["Task progress"])
    expect(reqNames("нажимает Archive")).toEqual(["Archive button"])
  })

  test("counts the scenarios that matched", () => {
    const [match] = searchRequirements(reqs, "progress bar")
    expect(match.matchedScenarios).toBe(1)
  })

  test("a name-only match reports no matching scenarios", () => {
    const [match] = searchRequirements(reqs, "кнопку архивации")
    expect(match.matchedScenarios).toBe(0)
  })

  test("returns nothing when no requirement matches", () => {
    expect(reqNames("настроек")).toEqual([])
  })
})
