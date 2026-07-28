## ADDED Requirements

### Requirement: Кнопки Check Versions и Reload блокируются во время работы агента
Кнопка Check Versions SHALL быть заблокирована, когда агент занят. Нажатие на заблокированную кнопку SHALL не запускать проверку обновлений и SHALL показывать тост «Wait until the agent finishes working». Кнопка Reload SHALL быть заблокирована, когда агент занят. Нажатие на заблокированную кнопку SHALL не закрывать opencode и SHALL показывать тот же тост.

#### Scenario: Check Versions заблокирован
- **WHEN** агент занят и пользователь нажимает Check Versions в Settings
- **THEN** проверка обновлений не запускается, показывается тост «Wait until the agent finishes working»

#### Scenario: Reload заблокирован
- **WHEN** агент занят и пользователь нажимает Reload в Settings
- **THEN** opencode не закрывается, показывается тост «Wait until the agent finishes working»

#### Scenario: Кнопки разблокированы при простое
- **WHEN** агент свободен
- **THEN** обе кнопки активны и выполняют свои действия по нажатию
