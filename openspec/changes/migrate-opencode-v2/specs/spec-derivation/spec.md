## ADDED Requirements

### Requirement: Derivation Delegation Choice Before Scan
Derivation SHALL prohibit subagents before an explicit execution choice. Before Scan, it SHALL ask once whether to use no subagents, one at a time or up to two at once (recommended), independently of Overview/Deep. An explicitly entered positive integer SHALL set a custom maximum. Without a usable answer, the parent SHALL proceed without subagents.

#### Scenario: Shared Init And Baseline Policy
- **WHEN** Init, Resume with unfinished specs or Baseline reaches Scan
- **THEN** the same delegation question is asked; a skipped or completed specs stage asks no delegation question

#### Scenario: Per-Run Choice
- **WHEN** the user chooses a mode or custom positive integer
- **THEN** it applies to this run only and is not written into project or global configuration

#### Scenario: No Delegation
- **WHEN** the user chooses no subagents
- **THEN** the parent scans and writes capabilities sequentially with the same depth, language, boundaries and verification rules

#### Scenario: Missing Choice
- **WHEN** no usable answer is available
- **THEN** the parent continues without subagents and reports that fallback, without inferring permission

#### Scenario: Choice Applies To Scan And Detail
- **WHEN** the user chooses a limit before Scan
- **THEN** that same limit applies to Scan and Detail and no second delegation question is asked

## MODIFIED Requirements

### Requirement: Derivation Fans Sub-Agents Out Within A Group And Waits For It
Derivation SHALL follow the chosen execution mode: sequential parent work without delegation, or batches bounded by the chosen maximum live children. Every batch SHALL finish before another starts. Work SHALL remain within one area until its verification is complete. Every writing child SHALL receive the confirmed boundary map, depth, language rule, specs rules and guardrails. Child failures SHALL be reported without abandoning remaining work.

#### Scenario: Group Runs In Parallel
- **WHEN** delegation is enabled with a limit greater than one and several capabilities are confirmed in one group
- **THEN** children may run alongside each other only within batches bounded by that limit

#### Scenario: Group Is Awaited Before The Next
- **WHEN** a group's children are in flight
- **THEN** all finish or fail before the next group starts

#### Scenario: Live Background Children And Nested Delegation
- **WHEN** delegation returns a background handle
- **THEN** that child counts toward the chosen maximum until finished; every child is instructed not to launch its own subagents

#### Scenario: Missing Delegation Tools
- **WHEN** a suitable tool/agent is unavailable or completion cannot be awaited reliably
- **THEN** the parent continues sequentially and reports the fallback

#### Scenario: Scope Of Enforcement
- **WHEN** the prompt describes its execution mode
- **THEN** it describes per-run prompt scheduling rather than a host-enforced or machine-wide concurrency limit

#### Scenario: Five Capabilities With Limit Two
- **WHEN** five capabilities in one group are delegated with a chosen maximum of two
- **THEN** batches contain two, two and one child, with a completion barrier between batches

#### Scenario: One At A Time
- **WHEN** the user chooses one child at a time
- **THEN** the next child is not started until the previous child has finished or failed

#### Scenario: The Group Never Spans Two Areas
- **WHEN** several areas are confirmed
- **THEN** live children belong to one area and its verification completes before the next area starts

#### Scenario: Every Sub-Agent Gets The Boundary Map
- **WHEN** a child writes a capability spec
- **THEN** it receives every confirmed capability's name and one-line purpose, its own paths, chosen depth, full language rule, specs rules and guardrails including no nested delegation

#### Scenario: Failure Does Not Drop Work Or Free A Live Slot
- **WHEN** a child fails or returns without a spec
- **THEN** its capability is reported as underived, pending children are still awaited and the remaining batches continue

#### Scenario: Failure Named
- **WHEN** a child fails or produces no spec
- **THEN** its capability is reported as underived with the known reason

#### Scenario: One Failure Does Not Abandon The Rest
- **WHEN** a child in a group fails
- **THEN** the rest of that group and the remaining areas are still carried out

#### Scenario: No Silent Skip
- **WHEN** the run reaches its summary
- **THEN** every confirmed capability is accounted for as derived or underived and the execution mode and limit are reported
