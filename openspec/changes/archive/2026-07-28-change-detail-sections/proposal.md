## Why

The change card only shows `tasks.md`; `proposal.md` and `design.md` are not visible.

## What Changes

- The body of the change card is split into three collapsible sections: **Proposal**, **Design**, **Tasks** – in the order a change is read
- `Tasks` is open by default; `Proposal` and `Design` are collapsed
- `Proposal` shows a teaser – the beginning of `## Why`, truncated to two lines, in muted color
- Clicking the Proposal teaser also expands the section
- `Design` does not render if `design.md` is missing; when `proposal.md` is absent, the section remains with a file-missing message
- All sections of `proposal.md` are rendered in file order under their own headings; the set of sections is not hardcoded
- `**` characters are stripped from displayed text
- The task count moves to the section header (`Tasks: done/total`); the separate count line is removed, the progress bar remains
- Task group heading – on column zero, tasks remain in the `✓` marker column
- Artifacts are read once when opening a change, not in the three-second poll

## Non-goals

- **Spec deltas** – will become a fourth section `Spec changes` in a separate change
- The `## Capabilities` section from `proposal.md` is not rendered: it is a list of deltas, which belongs in the future delta section
- Artifact validation and judgments about their completeness – requires an agent turn
- Editing artifacts from the panel: sections are read-only
- Remembering section expanded state between sessions via `kv`
- Full markdown: tables, links, nested lists are not supported
