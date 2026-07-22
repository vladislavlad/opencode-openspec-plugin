## Context

Текущий init flow в `src/lib/prompts.ts`:
- `OPENSPEC_INIT_PROMPT` → run init command → ask user about specs → if yes, run `SPEC_BASELINE_PROMPT`
- `SPEC_BASELINE_PROMPT` → Step 1: config (if not set) + Step 2: derive specs

Проблема: config вложен внутрь baseline. Если пользователь пропустит baseline или запустит только init, конфиг останется пустым.

## Goals / Non-Goals

**Goals:**
- Config выполняется всегда сразу после успешного init
- Baseline (derivation specs) — отдельный опциональный шаг после config

**Non-Goals:**
- Не меняем логику config и baseline внутри промптов
- Не трогаем slash commands `/opsx-config`, `/opsx-baseline`

## Decisions

1. **Разделить `SPEC_BASELINE_PROMPT` на два этапа**: config выносится в отдельный блок, который вызывается сразу после init; baseline содержит только derivation specs.
2. **Обновить `OPENSPEC_INIT_PROMPT`**: последовательность → init command → config (always) → ask about deriving specs (optional).
3. **Создать константу `CONFIG_SETUP_PROMPT`** — обёртка вокруг `CONFIG_PROMPT`, которая не проверяет наличие context, а всегда запускает настройку.

## Risks / Trade-offs

- [Риск] Пользователь может захотеть пропустить config → Mitigation: config idempotent и быстрый; при повторном запуске подхватывает существующий конфиг
- [Trade-off] Увеличивается количество шагов в init flow с 2 до 3 (init → config → optional baseline)
