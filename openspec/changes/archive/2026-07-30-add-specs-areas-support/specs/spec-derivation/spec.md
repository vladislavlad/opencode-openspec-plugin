## ADDED Requirements

### Requirement: Derivation Reads The Spec Structure Setting
Derivation prompt SHALL read `specStructure` from `openspec/config.yaml` together with the rest of the context, before reading any code, and follow it. The value is `flat` or `hierarchical`; a missing value SHALL be read as `flat`. Where the setting and the layout on disk disagree, the layout wins — a project whose specifications are already grouped is in areas mode whatever the setting says.

#### Scenario: Flat Or Missing
- **WHEN** `specStructure` is `flat` or absent and no specification is grouped
- **THEN** derivation runs the existing capability workflow and writes `specs/<capability>/spec.md`

#### Scenario: Hierarchical
- **WHEN** `specStructure` is `hierarchical`
- **THEN** derivation runs areas mode

#### Scenario: Layout Outranks A Stale Setting
- **WHEN** the setting reads `flat` but specifications already sit inside areas
- **THEN** derivation treats the project as hierarchical rather than writing flat specs beside the existing areas

### Requirement: Derivation Offers Areas Mode When Grouping Would Help
Derivation prompt SHALL let the agent offer a switch to areas mode after the overview pass, when the capability list it just assembled is large enough that grouping would help and the project is not already grouped. The offer SHALL be a judgment made from the list in hand, not a fixed capability count, and SHALL state why areas help. Declining SHALL leave the run flat, and the setting on disk SHALL change only if the user accepts.

#### Scenario: Offer After Overview
- **WHEN** the overview pass produces a capability list long enough that one flat list would be unwieldy, and the project is not already grouped
- **THEN** the agent asks whether to group them into areas before going further

#### Scenario: No Offer For A Short List
- **WHEN** the capability list is short
- **THEN** derivation proceeds flat and does not raise the question

#### Scenario: Declined Offer
- **WHEN** the user declines the switch
- **THEN** derivation continues flat and `specStructure` in config is left as it was

#### Scenario: Already Hierarchical
- **WHEN** the setting is already `hierarchical`
- **THEN** no offer is made — derivation goes straight to areas mode

### Requirement: Areas Confirmed With The User Before Filling
In areas mode, derivation prompt SHALL propose the areas it derived from the capability list and confirm them with the user through a multi-select question with multiple selection turned on, allowing areas typed by the user. Only confirmed areas SHALL be filled.

#### Scenario: Areas Proposed With Their Capabilities
- **WHEN** derivation enters areas mode after the overview pass
- **THEN** each proposed area is shown with the capabilities it would hold, and the user picks which ones to derive

#### Scenario: User Adds An Area
- **WHEN** the area question is asked
- **THEN** the user may type areas of their own in addition to picking from the proposal

#### Scenario: Nothing Selected
- **WHEN** the user confirms no area at all
- **THEN** derivation reports that there is nothing to derive and stops, instead of falling back to a flat run

### Requirement: Areas Filled One At A Time With Sub-Agents
In areas mode, derivation SHALL complete one area before starting the next, and within an area SHALL spawn a sub-agent per capability under the same rules that govern sub-agents in the flat workflow. The agent SHALL never hold more than the current area's capability list.

#### Scenario: Sequential Areas
- **WHEN** several areas are confirmed
- **THEN** each is finished before the next begins

#### Scenario: Sub-Agent Per Capability
- **WHEN** a confirmed area holds several capabilities
- **THEN** a sub-agent is spawned per capability, receiving the area, the capability, its paths, the language, the depth and the guardrails

### Requirement: Derivation Writes Exactly One Area Level
Derivation prompt SHALL write hierarchical specs as `openspec/specs/<area>/<capability>/spec.md` and SHALL NOT create areas inside areas, whatever depth the project's own directories suggest.

#### Scenario: One Level Written
- **WHEN** derivation writes a spec in areas mode
- **THEN** the path holds exactly one area segment between `specs/` and the capability directory

#### Scenario: Deep Structure Not Reproduced
- **WHEN** the project's source tree is nested several levels deep
- **THEN** areas stay one level and the nesting is reflected in area naming, not in extra directories
