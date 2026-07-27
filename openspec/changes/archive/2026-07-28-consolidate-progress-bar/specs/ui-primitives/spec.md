## MODIFIED Requirements

### Requirement: ProgressBar отображает прогресс или скрывается
Компонент SHALL отображать визуальный прогресс-бар с заполненными и пустыми блоками и процентом, когда total больше нуля; при total равном нулю компонент SHALL ничего не рендерить. При заданном пропсе `showNumberOfTasks` компонент SHALL дополнительно отображать строку "N/M tasks done" над баром цветом `muted`.

#### Scenario: Прогресс отображается при наличии Tasks
- **WHEN** total равен 10 и done равен 5
- **THEN** на экране показаны заполненные блоки (█), пустые блоки (░) и текст «50%»

#### Scenario: Прогресс скрыт при отсутствии Tasks
- **WHEN** total равен 0
- **THEN** компонент ничего не отображает

#### Scenario: Счётчик задач отображается при showNumberOfTasks
- **WHEN** total равен 10, done равен 3 и `showNumberOfTasks` равен true
- **THEN** над прогресс-баром отображается строка "3/10 tasks done" цветом muted

#### Scenario: Счётчик задач скрыт без showNumberOfTasks
- **WHEN** total равен 10, done равен 3 и `showNumberOfTasks` не задан или равен false
- **THEN** строка со счётчиком не отображается, виден только прогресс-бар
