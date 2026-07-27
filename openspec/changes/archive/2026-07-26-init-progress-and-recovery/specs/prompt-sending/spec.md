## MODIFIED Requirements

### Requirement: Закрытие opencode
Система SHALL предоставлять `quitOpencode`, закрывающую opencode отправкой команды `exit` в промпт, чтобы при следующем запуске команды и скиллы были перечитаны.

#### Scenario: Закрытие через отправку exit
- **WHEN** вызывается `quitOpencode`
- **THEN** промпт очищается, в него добавляется `exit` и выполняется отправка

#### Scenario: Нативная диспетчеризация не используется
- **WHEN** вызывается `quitOpencode`
- **THEN** `api.keymap.dispatchCommand("app.exit")` не выполняется – синхронный выход прерывал отрисовку и оставлял в терминале обрывок escape-последовательности
