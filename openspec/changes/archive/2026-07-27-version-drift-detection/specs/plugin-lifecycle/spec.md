## ADDED Requirements

### Requirement: Remembering last launched plugin version
The system SHALL store the previously launched plugin version in `kv` under key `openspec.lastVersion` and provide reading and writing of this value.

#### Scenario: Reading saved version
- **WHEN** `readLastVersion(api)` is called and a string exists in `kv` under key `openspec.lastVersion`
- **THEN** that string is returned

#### Scenario: No entry yet
- **WHEN** `readLastVersion(api)` is called and no value exists under the key
- **THEN** `null` is returned

#### Scenario: Corrupted value
- **WHEN** a non-string value exists under the key
- **THEN** `readLastVersion` returns `null` – a corrupted entry is equivalent to its absence

#### Scenario: Recording current version
- **WHEN** `recordVersion(api)` is called
- **THEN** the build constant `VERSION` is written in `kv` under key `openspec.lastVersion`

### Requirement: Detecting version change between launches
The system SHALL compute a pending migration range from the saved version: a range is returned only when the saved version is strictly lower than the loaded one.

#### Scenario: Plugin updated past the button
- **WHEN** saved version is `0.3.0` and loaded version is `0.4.0`
- **THEN** range `{ old: "0.3.0", new: "0.4.0" }` is returned

#### Scenario: First launch of a build with this mechanism
- **WHEN** no saved version exists
- **THEN** `null` is returned – where the user came from is unknown, and showing release notes retroactively isn't allowed

#### Scenario: Version didn't change
- **WHEN** saved version matches loaded version
- **THEN** `null` is returned

#### Scenario: Rollback to an earlier version
- **WHEN** saved version is higher than loaded version
- **THEN** `null` is returned – migrations apply forward only

### Requirement: Migration display decision folds both sources in one place
The system SHALL compute the post-update banner decision with a single function independent of the reactive layer, and SHALL receive the "are there migration entries in range" check as a parameter rather than an import. The decision takes the flag from config.yaml, the saved version, and the loaded version, and returns one of three: show migration (with a flag indicating whether to remove the flag), ask for restart, or show nothing (with a flag indicating whether to record the version).

#### Scenario: Decision is testable without UI
- **WHEN** behavior needs to be verified for any combination of sources
- **THEN** the function is called directly with those values – no live TUI or `kv` write required

#### Scenario: Migration entry check is passed as parameter
- **WHEN** decision is computed in a test
- **THEN** the presence-of-entries check is supplied by the caller, so the test doesn't depend on migration table content that changes every release

#### Scenario: Flag takes priority over saved version
- **WHEN** both flag and saved version drift exist
- **THEN** range from the flag is used – it alone knows the exact version you left from

#### Scenario: Version isn't recorded during unfinished update
- **WHEN** flag is present, regardless of whether its new version matches loaded
- **THEN** decision doesn't ask to record version – otherwise the range would be lost before migration completion

#### Scenario: Recording version when there's nothing to show
- **WHEN** no flag and no banner to show, but saved version differs from loaded
- **THEN** decision asks to record the loaded version so the check stays silent until next change
