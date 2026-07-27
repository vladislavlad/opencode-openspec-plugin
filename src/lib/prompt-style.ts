// Rules every prompt has to follow, whatever capability it belongs to. Kept in one module so a new
// prompt imports them instead of restating them – both of these used to be copied by hand.

// Prepended to every prompt that talks to the user – asking or reporting. Without it a model
// answering a Russian user writes "пропазалы": the term transliterated instead of kept as `proposal`.
export const SPEAK_THE_USER_LANGUAGE =
  "Write questions, options and summaries in the language the user writes to you in. Keep OpenSpec terms in English – proposal, change, spec, requirement, scenario, task. Never transliterate them."

// Spelled out as an instruction, not a parenthetical "(multi-select)" – models read the remark as
// decoration and offer a single-choice question anyway.
export const MULTI_SELECT_RULE = "the user has to be able to pick several options at once, not one"
