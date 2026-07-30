import { describe, expect, test } from "bun:test"
import { SPEC_BASELINE_PROMPT } from "../src/lib/derive-prompt"

describe("what derivation looks for", () => {
  // Stage 5 is a multi-select over the capability list; an empty list needs an exit, not a question.
  // The exit is narrow on purpose: a compose/manifest repo read it as "no application code" and bailed.
  test("only a truly empty directory exits the derive stages", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Skip the remaining stages only when the directory is empty or holds nothing but a README")
    expect(SPEC_BASELINE_PROMPT).toContain("config files, manifests and scripts are capabilities")
  })

  test("an infrastructure repo is in scope for derivation", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Not every project is an application")
    expect(SPEC_BASELINE_PROMPT).toContain("the declared setup is the behavior")
  })

  test("the confirm question asks about the listed capabilities, not extra ones", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("which of the capabilities you just listed should get specs")
  })

  // Agent type names differ per host – "general-purpose" is a Claude Code name and opencode rejects
  // it. The tool lists its own valid types, so the prompt must not name one.
  test("the detail stage names no agent type of its own", () => {
    expect(SPEC_BASELINE_PROMPT).not.toContain("general-purpose")
    expect(SPEC_BASELINE_PROMPT).toContain("Take the agent type from the list that tool itself offers")
    expect(SPEC_BASELINE_PROMPT).toContain("do not retry with a guessed type")
  })

  test("the checkpoint carve-out keeps changes and code off limits", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Edit `openspec/config.yaml` only where this prompt explicitly says to")
    expect(SPEC_BASELINE_PROMPT).toContain("Never move, rewrite or delete anything under `openspec/changes/`")
  })
})

describe("derive depth", () => {
  // Asked before anything is read: working out the capability list is already studying the code, so
  // the depth has to be settled first.
  test("/opsx-baseline asks for it ahead of the orientation pass", () => {
    expect(SPEC_BASELINE_PROMPT).toContain('header "Depth"')
    expect(SPEC_BASELINE_PROMPT).toContain("much slower and far more tokens")
    expect(SPEC_BASELINE_PROMPT.indexOf('header "Depth"')).toBeLessThan(SPEC_BASELINE_PROMPT.indexOf("**2. Orient**"))
  })

  test("steers the scan and the subagent that details a capability", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("instead of guessing capabilities from folder names")
    expect(SPEC_BASELINE_PROMPT).toContain("chosen depth")
    expect(SPEC_BASELINE_PROMPT).toContain('On "Overview" it reads entry points and main modules')
    expect(SPEC_BASELINE_PROMPT).toContain('on "Deep" it follows that capability\'s code paths end to end')
  })

  // "Deep" is a depth of reading, not a mandate to open everything in the repo.
  test("says outright that Deep is not every file", () => {
    expect(SPEC_BASELINE_PROMPT).toContain('"Deep" is not "open every file"')
    expect(SPEC_BASELINE_PROMPT).toContain("skip tests, fixtures, generated and vendored code")
  })

  // Orient sizes the project, Scan pays for the depth. Deciding structure in between means the
  // expensive read happens once, under the structure it will be confirmed in.
  test("the cheap pass precedes the structure question, the expensive one follows it", () => {
    const orient = SPEC_BASELINE_PROMPT.indexOf("**2. Orient**")
    const structure = SPEC_BASELINE_PROMPT.indexOf("**3. Structure**")
    const scan = SPEC_BASELINE_PROMPT.indexOf("**4. Scan**")
    expect(orient).toBeLessThan(structure)
    expect(structure).toBeLessThan(scan)
    expect(SPEC_BASELINE_PROMPT).toContain("Do NOT read at Deep here")
  })
})

describe("grounding before the first write", () => {
  // The prompt used to hardcode `openspec/specs/...` and tell the agent not to duplicate work
  // without telling it how to find out what exists.
  test("resolves the root and the inventory from the CLI", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("openspec context")
    expect(SPEC_BASELINE_PROMPT).toContain("openspec list --specs --json")
    expect(SPEC_BASELINE_PROMPT).toContain("an empty list means nothing exists yet")
  })

  // A command that fails is not a project with no specs. Conflating the two would strip the
  // anti-duplication guidance of the only thing it stands on, silently.
  test("keeps a failed lookup apart from an empty one, with a fallback for each", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Three different answers, don't conflate them")
    expect(SPEC_BASELINE_PROMPT).toContain("read `openspec/specs/` yourself")
    expect(SPEC_BASELINE_PROMPT).toContain("fall back to the `openspec/` directory of the project you are in")
    expect(SPEC_BASELINE_PROMPT).toContain("don't stop over it")
  })

  test("reads the specs rules once, and keeps them off the workflow and out of the output", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Read `rules.specs` from that same file, once, now")
    expect(SPEC_BASELINE_PROMPT).toContain("Absent or empty means no extra constraints, not a problem")
    expect(SPEC_BASELINE_PROMPT).toContain("its text never appears inside a spec or in your summary")
  })

  // Both need a `--change`, which derive hasn't got – they exit non-zero on CLI 1.7.0.
  test("references no change-scoped command", () => {
    expect(SPEC_BASELINE_PROMPT).not.toContain("openspec status")
    expect(SPEC_BASELINE_PROMPT).not.toContain("openspec instructions")
  })

  // The plugin fixes its root at `openspec/` with no alternates, so a store would derive into a
  // directory the sidebar never polls.
  test("says nothing about stores", () => {
    expect(SPEC_BASELINE_PROMPT).not.toContain("--store")
    expect(SPEC_BASELINE_PROMPT).not.toContain("store list")
  })
})

describe("areas mode", () => {
  // The setting only steers derive – the sidebar reads the structure off the files, so a stale
  // value can't make the two disagree about what exists.
  // Two values, no third: an "auto" that means "look at the files" is what stage 3a does anyway.
  test("reads specStructure with the rest of the context, absent meaning flat", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("`flat` or no such line means one level")
    expect(SPEC_BASELINE_PROMPT).not.toContain("`auto`")
  })

  // The setting can lag the files – a project already grouped must never be offered grouping.
  test("takes an already-grouped inventory as areas mode, whatever the setting says", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("an inventory that already holds `<area>/<capability>` ids")
    expect(SPEC_BASELINE_PROMPT).toContain("Never offer a project its own current layout")
  })

  test("offers areas by judgement, not by a capability count", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("no capability count decides it")
    expect(SPEC_BASELINE_PROMPT).not.toMatch(/more than \d+ capabilit/i)
  })

  // Grouping is a one-way door: ungrouping is nobody's idea of a derive.
  test("offers flat to areas and never the reverse", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("One direction only")
    expect(SPEC_BASELINE_PROMPT).toContain("don't propose flattening specs that are already grouped")
  })

  // The area set is a question in its own right; editing it invalidates the mapping it was built on.
  test("settles the area set first, and re-maps when the user edits it", () => {
    const areaSet = SPEC_BASELINE_PROMPT.indexOf("the area set, before any capability is chosen")
    const perArea = SPEC_BASELINE_PROMPT.indexOf("one question per confirmed area")
    expect(areaSet).toBeGreaterThan(-1)
    expect(areaSet).toBeLessThan(perArea)
    expect(SPEC_BASELINE_PROMPT).toContain("redo the mapping under the confirmed set")
    expect(SPEC_BASELINE_PROMPT).toContain("not by redistributing your old grouping")
  })

  test("drops an empty area, confirms the whole picture, and stops when nothing is confirmed", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("nothing selected is dropped")
    expect(SPEC_BASELINE_PROMPT).toContain("ask for one final confirmation")
    expect(SPEC_BASELINE_PROMPT).toContain("there is nothing to derive and stop")
  })

  test("fills one area at a time, out loud, and writes exactly one area level", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("announce it on a line of its own, exactly as `Area: **<name>** (<n> capabilities)`")
    expect(SPEC_BASELINE_PROMPT).toContain("Only that area is ever in play")
    expect(SPEC_BASELINE_PROMPT).toContain("`openspec/specs/<area>/<capability>/spec.md`")
    expect(SPEC_BASELINE_PROMPT).toContain("never an area inside an area")
  })

  test("reports the subagents that produced nothing without abandoning the rest", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Never pass over one silently")
    expect(SPEC_BASELINE_PROMPT).toContain("never let one failure abandon the rest")
  })
})

describe("subagents fan out within a group", () => {
  // Parallel inside an area, never across two: the area stays the unit of progress and of checking.
  test("the group runs alongside itself and is awaited before the next", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("let them run alongside each other")
    expect(SPEC_BASELINE_PROMPT).toContain("never have capabilities from two areas in flight at once")
    expect(SPEC_BASELINE_PROMPT).toContain("Wait for the whole group to finish before moving on")
  })

  // Subagents can't see each other, so the guard against writing one behavior into two specs is the
  // boundary map handed to all of them – not a running log of what the earlier ones produced.
  test("every subagent gets the whole confirmed list, not just its own entry", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Give every subagent the whole confirmed list")
    expect(SPEC_BASELINE_PROMPT).toContain("not only its own entry")
    expect(SPEC_BASELINE_PROMPT).toContain("Subagents can't see each other")
  })
})

describe("regrouping an existing flat project", () => {
  // A re-run that discovers nothing new used to raise no offer at all, which made grouping an
  // already-derived project impossible.
  test("moves existing specs rather than copying or rewriting them", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("don't rewrite it from scratch")
    expect(SPEC_BASELINE_PROMPT).toContain("leave nothing at the old path")
    expect(SPEC_BASELINE_PROMPT).toContain("A copy leaves two capabilities where the user asked for one")
  })

  // The delta's path is what maps it to its main spec, so a lone move splits the capability in two.
  test("skips a capability whose delta lives in an active change", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("`openspec/changes/*/specs/`")
    expect(SPEC_BASELINE_PROMPT).toContain("recreate the old path as a duplicate")
  })

  test("offers leftovers at the root a home, and leaves the unassigned alone", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("leftovers at the root is not settled business")
    expect(SPEC_BASELINE_PROMPT).toContain("leaves out of every area stays where it is")
  })
})

describe("rearranging areas", () => {
  // Place used to reach only capabilities sitting at the root, while the scan groups code capabilities
  // regardless of where their specs live – so a capability the picture moved between areas got a fresh
  // spec written at the new path and a duplicate left at the old one.
  test("relocation reaches a spec inside another area, not only the root", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("at the root or inside another area")
  })

  // The id is the path, so changing the area is a rename – which is why rename, split and merge need
  // no step of their own, and why writing a second spec is never the way to do it.
  test("states that the path is the identity, so a change of area is a move", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("A capability's path is its identity")
    expect(SPEC_BASELINE_PROMPT).toContain("never writing a second spec at the new path")
    expect(SPEC_BASELINE_PROMPT).toContain("renames that area, spread across two names splits it")
    expect(SPEC_BASELINE_PROMPT).toContain("A capability's path is its id.")
  })

  // The root can be left half-empty; an area cannot. Half a rename leaves both areas alive.
  test("blocked at the root skips alone, blocked in an area stops the area", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("the root is not something that can be left half-empty")
    expect(SPEC_BASELINE_PROMPT).toContain("stops that entire area")
    expect(SPEC_BASELINE_PROMPT).toContain("is worse than never starting")
  })

  // Without this, stage 7 would write at the picture's path and recreate the very duplicate the skip
  // was there to prevent.
  test("a capability that did not move is derived where it actually is", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("keeps its current path for the rest of this run")
    expect(SPEC_BASELINE_PROMPT).toContain("exactly the duplicate the skip was protecting against")
  })

  test("moves are shown before the final confirmation, and emptied areas are removed", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("frontend/auth-ui → backend-shared/auth-ui")
    expect(SPEC_BASELINE_PROMPT).toContain("The picture names destinations")
    expect(SPEC_BASELINE_PROMPT).toContain("remove the empty directory")
  })
})

describe("verify and report", () => {
  // `openspec validate --specs` says nothing about a file that never appeared, so a subagent that
  // wrote nothing used to pass as success.
  test("checks what was written, not only that it validates", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("openspec validate --specs")
    expect(SPEC_BASELINE_PROMPT).toContain("a clean validate is not evidence that a capability was written")
    expect(SPEC_BASELINE_PROMPT).toContain("confirm it is at its new path and gone from the old one")
  })

  // A live run reported 26 of 28 capability counts wrong: scenarios systematically low, requirements
  // adrift in both directions. The presence check passed while every number lied, because the numbers
  // came from mid-run subagent messages instead of the finished files.
  test("every reported count is taken from the files, not from memory", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("count its requirements and its scenarios")
    expect(SPEC_BASELINE_PROMPT).toContain("Every number that reaches your summary comes from this count")
    expect(SPEC_BASELINE_PROMPT).toContain("a subagent's message predates its last edit")
    expect(SPEC_BASELINE_PROMPT).toContain("every count taken from 8b, not from memory")
  })

  // The boundary map is handed out before the subagents run; this is the check that it was honoured.
  // Subagents write at the same time and never see each other, so nothing else would catch it.
  test("reads the specs back and looks for one behavior specified twice", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("look for one behavior specified in two places")
    expect(SPEC_BASELINE_PROMPT).toContain("together with the specs already beside them in the inventory")
    expect(SPEC_BASELINE_PROMPT).toContain("the overlap pass of 8c over that area's specs")
  })

  // Over-merging is the failure mode here: two specs may share a subject without duplicating a
  // behavior, and a requirement must never be deleted on a guess.
  test("judges behavior not subject, and refuses to delete on an unclear call", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Judge behavior, not subject")
    expect(SPEC_BASELINE_PROMPT).toContain("never delete a requirement you cannot confirm is a duplicate")
    expect(SPEC_BASELINE_PROMPT).toContain("Overlap unresolved:")
  })

  test("carries an output template that separates created from updated", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Output On Success")
    expect(SPEC_BASELINE_PROMPT).toContain("- Created:")
    expect(SPEC_BASELINE_PROMPT).toContain("- Updated:")
    expect(SPEC_BASELINE_PROMPT).toContain("- Not moved:")
  })

  // Guidance, not a rule with an absolute in it: an idempotent refining pass has to be able to fix
  // a spec that no longer matches the code.
  test("states anti-duplication as judgement, allowing a correction", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Don't duplicate existing capabilities and areas")
    expect(SPEC_BASELINE_PROMPT).toContain("Correcting a spec that no longer matches the code is fine")
    expect(SPEC_BASELINE_PROMPT).not.toContain("never delete correct content")
  })
})

describe("stage layout", () => {
  // The areas paths used to trail their stages as `Phase 2 in areas mode – …`, which read as an
  // afterthought. Each stage now carries both paths in place.
  test("no mode instruction trails a stage", () => {
    expect(SPEC_BASELINE_PROMPT).not.toMatch(/Phase \d+ in areas mode/)
    expect(SPEC_BASELINE_PROMPT).toContain("Each says what to do in flat mode and in areas mode")
  })
})
