import type { OpenSpecSpec, Requirement, Scenario } from "./openspec"
import { stripSyntax } from "./spec-driven"

// A spec that matched, plus how many of its requirements matched on their own text — the row shows
// that count instead of the plain requirement total.
export interface SpecMatch {
  spec: OpenSpecSpec
  matchedRequirements: number
}

// The same one level down: a requirement that matched and how many of its scenarios did.
export interface RequirementMatch {
  req: Requirement
  matchedScenarios: number
}

// Every token has to match (AND), each one anywhere in the item — so "archive tasks" finds a spec
// with one word in Purpose and the other in a scenario.
function tokenize(query: string): string[] {
  return stripSyntax(query.toLowerCase()).split(/\s+/).filter(Boolean)
}

const matchesAll = (text: string, tokens: string[]) => tokens.every((t) => text.includes(t))

// Schema keywords and markdown are dropped from both sides: every spec has SHALL and WHEN in it, so
// matching on them would return the whole list.
const haystack = (...parts: string[]) => stripSyntax(parts.join("\n").toLowerCase())

const scenarioText = (sc: Scenario) => haystack(sc.name, ...sc.lines)
const requirementText = (req: Requirement) => haystack(req.name, req.description, ...req.scenarios.flatMap((sc) => [sc.name, ...sc.lines]))
const specText = (spec: OpenSpecSpec) => haystack(spec.name, spec.title, spec.purpose)

// Filter specs by `query`, searching every artifact. An empty query returns all specs unchanged.
export function searchSpecs(specs: readonly OpenSpecSpec[], query: string): SpecMatch[] {
  if (!query.trim()) return specs.map((spec) => ({ spec, matchedRequirements: 0 }))
  const tokens = tokenize(query)
  if (tokens.length === 0) return [] // the query was nothing but keywords or markdown

  const matches: SpecMatch[] = []
  for (const spec of specs) {
    const reqs = spec.requirements.map(requirementText)
    if (!matchesAll([specText(spec), ...reqs].join("\n"), tokens)) continue
    matches.push({ spec, matchedRequirements: reqs.filter((text) => matchesAll(text, tokens)).length })
  }
  return matches
}

// The requirements inside a spec, filtered by the same query the list view used.
export function searchRequirements(reqs: readonly Requirement[], query: string): RequirementMatch[] {
  if (!query.trim()) return reqs.map((req) => ({ req, matchedScenarios: 0 }))
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const matches: RequirementMatch[] = []
  for (const req of reqs) {
    if (!matchesAll(requirementText(req), tokens)) continue
    matches.push({ req, matchedScenarios: req.scenarios.filter((sc) => matchesAll(scenarioText(sc), tokens)).length })
  }
  return matches
}
