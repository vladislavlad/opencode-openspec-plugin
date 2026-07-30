// Rules every prompt has to follow, whatever capability it belongs to. Kept in one module so a new
// prompt imports them instead of restating them – both of these used to be copied by hand.

// Prepended to every prompt that talks to the user – asking or reporting. Without it a model
// answering a Russian user writes "пропазалы": the term transliterated instead of kept as `proposal`.
export const SPEAK_THE_USER_LANGUAGE =
  "Write questions, options and summaries in the language the user writes to you in. Keep OpenSpec terms in English – proposal, change, spec, requirement, scenario, task. Never transliterate them."

// Spelled out as an instruction, not a parenthetical "(multi-select)" – models read the remark as
// decoration and offer a single-choice question anyway.
export const MULTI_SELECT_RULE = "the user has to be able to pick several options at once, not one"

// The language policy for a spec, with two call sites that must not drift: `config-prompt` copies it
// into `context`, where it steers every artifact generated later, and `derive-prompt` hands it to each
// subagent that writes a spec – the subagent, not the parent, is the one holding the pen.
//
// The names after `Requirement:` and `Scenario:` are called out on purpose. They used to sit in a gap:
// the rule named "requirement statements" and "scenario text" as prose while listing `### Requirement:`
// among the markers to keep unchanged, and a model reading its own heading as structural left the name
// in English. One real project came out with five specs of thirty-five named entirely in English while
// their requirement bodies were Russian.
export const SPEC_LANGUAGE_RULE = [
  "Write every piece of prose in the spec language: the requirement statement, the requirement's own name after `Requirement:`, the scenario's name after `Scenario:`, the WHEN/THEN lines, the Purpose text – all of it.",
  "Keep unchanged only these: the markers `## Purpose`, `## Requirements`, `### Requirement:`, `#### Scenario:`; the keywords SHALL, WHEN, THEN; and code identifiers – class, function, file and field names, enum values, API terms.",
  "A marker is the marker alone. In `### Requirement: <name>` the part to keep is `### Requirement:` and `<name>` gets written in the spec language. Never leave a heading in English because the marker in front of it is English.",
].join("\n")
