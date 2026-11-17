<!-- coderabbit-ai-generated:v1 -->

# DotaScope — Dota 2 AI Match Tracker

MVP на Next.js 16 (App Router), React, строгом TypeScript, Tailwind CSS, Lucide и Recharts. Интерфейс на русском языке.

## Запуск

Требуется Node.js 20.9+ (проверено на Node 24) и npm.

```bash
npm install
cp .env.example .env.local
# Заполните .env.local
npm run dev
```

Откройте http://localhost:3000. Главная, `/player/demo` и `/match/demo` работают без ключей. Это явно обозначенные синтетические данные. Реальные открытые профили и матчи доступны через OpenDota без авторизации.

## Конфигурация

- `NEXT_PUBLIC_APP_URL`: точный публичный адрес приложения, без завершающего пути. Локально `http://localhost:3000`; в Preview и production укажите его внешний HTTPS URL. Используется для OpenID callback, issuer и проверки Origin для POST.
- `JWT_SECRET`: случайный секрет не короче 32 символов. Например, создайте `openssl rand -hex 32`. Нужен для входа; никогда не публикуйте.
- `STEAM_API_KEY`: необязателен. Добавляет Steam-аватар/ник и разрешение коротких ссылок `/id/name`. Числовые SteamID64 и AccountID работают без него.
- `STRATZ_API_TOKEN`: JWT STRATZ для основного GraphQL-источника. Без токена или при ошибке используется OpenDota.
- `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`: настройки OpenAI-совместимого Chat Completions API. По умолчанию Google Gemini (`gemini-2.5-flash`). Groq: `https://api.groq.com/openai/v1/`, модель `llama-3.3-70b-versatile`. OpenRouter: `https://openrouter.ai/api/v1/`, укажите доступную вам модель.

После изменения переменных перезапустите сервер. Все ключи используются только сервером. Авторизация Steam не требует Steam Web API key: браузер перенаправляется на официальный Steam OpenID. Callback проверяется повторным запросом к Steam; сессия хранится семь дней в подписанной httpOnly cookie.

## Возможности

- Поиск AccountID/SteamID64, Steam profile URL и Match ID. Для неоднозначных числовых ID выберите вкладку «Игрок» или «Матч».
- Профиль: ранг, общий винрейт, сигнатурные герои, сводка и последние 20 игр; инструкция при отсутствии публичной истории.
- Матч: вердикт, MVP, слабое звено, десять игроков, позиции, исходы линий, экономика, урон, лечение, варды, шесть слотов и нейтральный предмет, ключевые тайминги.
- Графики золота/опыта и сравнения импакта. STRATZ предматчевая минута удаляется при нормализации.
- AI-тренер: общая или персональная перспектива, компактная сводка вместо сырого JSON, этапы ожидания и Markdown-ответ. Демо тоже можно отправить в настроенный AI; в промпте оно обозначено синтетическим.
- Запрос парсинга через OpenDota и ручное обновление. Парсинг асинхронный: обновите данные через 1–2 минуты.
- Ограниченный серверный Map-кэш на две минуты. Обновление очищает соответствующий ключ. Ограничения частоты для AI и парсинга действуют внутри одного процесса.

## Структура

- `lib/dota-api.ts`: STRATZ/OpenDota, проверка схем Zod, нормализация, серверный кэш.
- `lib/impact-analyzer.ts`: MVP, 1v9, underperforming, ruiner и причины.
- `lib/steam-id.ts`, `lib/auth.ts`: идентификаторы и JWT.
- `lib/ai.ts`: компактная сводка и системный промпт.
- `app/api/auth/*`, `app/api/players/[id]`, `app/api/matches/[id]`, `app/api/analyze-match`: Route Handlers.
- `components/`: интерфейс, графики, состояния загрузки и ошибок.
- `lib/heroes.json`, `lib/items.json`: статические справочники OpenDota/dotaconstants и маппинг Steam CDN.

## Проверки

```bash
npm test
npm run typecheck
npm run build
npm audit
```

Тесты покрывают Steam ID, поиск, правила IMP, нормализацию обоих источников, компактную AI-сводку, подпись JWT, отклонение некорректного OpenID callback, успешный callback с синтетическим ответом Steam и AI-обработчик с синтетическим ответом провайдера. Синтетические ответы не подтверждают доступность реальных провайдеров.

## Ограничения MVP

- OpenDota не предоставляет STRATZ IMP. Локальная эвристика обозначается `≈`; неизвестные роли и исходы линий не выдумываются. Позиция мидера доступна по lane_role, остальные позиции требуют STRATZ.
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:6be369e62065702edb3091e48225bb3ac65c0a3daa404685000cbdfdf76b486d -->

- OpenDota возвращает число покупок вардов из purchase; STRATZ — число доступных событий покупки вардов. Для отсутствующих полей показано «—».

<!-- /coderabbit-ai-generated:v1 -->
- Отсутствующие GPM/XPM в краткой истории OpenDota показываются как «—». Детальная страница матча содержит эти показатели, если источник их предоставляет.
- Пустая история может означать скрытый профиль, отсутствие матчей или задержку индексации.
- Реальный STRATZ из sandbox не проверен: endpoint отвечает Cloudflare challenge, токен не предоставлен. Формат адаптера покрыт фикстурой, но возможны изменения внешней схемы.
- Реальный Steam-вход и генерация AI требуют настройки окружения и внешнего доступа; проверены локальные контракты с синтетическими ответами. Каталог CodeRabbit emulate v0.0.1 не содержит Steam OpenID, STRATZ, OpenDota и Chat Completions/Gemini.
- Для нескольких production-инстансов замените Map-кэш и лимиты общим Redis. Обновляйте статические справочники после игровых патчей.

## Источники и атрибуция

Powered by [STRATZ](https://stratz.com) & [OpenDota API](https://www.opendota.com). Справочники предметов — [odota/dotaconstants](https://github.com/odota/dotaconstants). Изображения героев, предметов и Phantom Assassin принадлежат Valve и загружаются со Steam CDN. Приложение не связано с Valve.
