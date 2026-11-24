# Aurea Air

Aurea Air is the **PromptWars Challenge 6 · Urban Air Quality Assistant** for households and community organizers. It helps a user decide when a flexible errand fits the forecast, whether combining trips is feasible, and which indoor particle source they can address. It supports Delhi, Mumbai, Bengaluru, Kolkata, Chennai and Hyderabad.

[Try the public app](https://aurea-air-daily-planner.classyparrot1.chatgpt.site)

## Try a decision that changes

1. Select Delhi, Household and Car. Use a 15:00–19:00 flexible window. Enter “School pickup is fixed at 3 pm. The grocery shop closes at 2 pm. I have no extra travel budget.”
2. Generate the plan. Even without a model key, the planner recognizes the time conflict and suggests another collection arrangement.
3. Change only the closing time to 5:30 pm. The planner can now consider forecast hours before closing, conditional on travel time and opening hours.
4. Switch **Activity to schedule** to **Other outdoor activity** to compare hours for a separate outing. Shop closing times only constrain shopping errands.
5. Select the local advisory checkbox and generate again. Optional outdoor tasks are deferred even if a lower-pollution hour exists. The checkbox records an advisory the user has received.
6. Use **Air guide** to compare timings, explore an alternative or check the limitations of a regional estimate. Escape closes the guide and returns focus to its launcher.

## How the decision works

- **Forecast.** The forecast route requests regional PM2.5 estimates from Open-Meteo / CAMS for the selected city center. A successful response is cached for ten minutes per server instance. Concurrent requests for a city share one upstream fetch. Empty responses are retried after fifteen seconds. The visible browser polls every five minutes and can fetch the public forecast directly if the server has no usable hourly data.
- **Time and constraints.** The planner uses the next 24 hours in India Standard Time. It excludes elapsed hours and missing or negative concentrations, honors the flexible window and explicit shop closing times, and resolves a tie in favor of the earliest eligible hour. It displays the underlying concentration and an explicit date. Current model estimates expire after two hours.
- **Routine and impact.** The standard plan recognizes explicit pickup and shop-closing times and zero-extra-budget language. Ambiguous times stay conditional. For households, combining compatible errands can avoid one separate drive. Community plans consider shared collection. Indoor advice responds to the selected concern.
- **Generative AI.** When a server key is configured, Google Gemini receives the submitted routine, selected preferences and the computed suggestions. It writes a short explanation. Application code owns the forecast values, timing and travel recommendations. A completed response is labeled **Gemini-assisted plan**. Provider failure or limited capacity yields a **Standard plan**. The guide works independently of Gemini.

## Run locally

Use Node.js 22.14 or later and npm. From a clone of this repository:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To enable AI summaries, copy `.env.example` to `.env.local`, set your own `GEMINI_API_KEY`, and restart. `GEMINI_MODEL` optionally selects a supported model. The default is `gemini-3.5-flash-lite`.

## Verify the release

```sh
npm run format:check
npm run typecheck
npm test
npm run build
npm run package
npx playwright install chromium
npm run test:browser
```

The Node tests cover time-zone boundaries, feasible hours, ambiguous routines, user-reported advisories, unavailable providers, caching, request validation, Gemini success and fallback, and Worker HTTP behavior. Browser tests exercise the **packaged production Worker** with deterministic forecast fixtures at desktop and phone widths. They check keyboard navigation, focus restoration, validation, accessible names and common WCAG A/AA issues with axe. Browser tests use no external API keys. To run against an existing Chromium installation, set `CHROMIUM_PATH` to its executable. GitHub Actions runs the checks on pushes and pull requests. For a regular Next.js deployment, use `npm run build` followed by `npm start`.

## Source map

| Location                                              | Responsibility                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `app/`                                                | Accessible planner form, regional forecast display, guide dialog and client state |
| `lib/routine.mjs`, `lib/planner.mjs`, `lib/guide.mjs` | Explicit routine constraints, shared forecast comparison and recommendation logic |
| `lib/provider.mjs`, `lib/service.mjs`                 | Regional readings, request coordination, caching and API orchestration            |
| `lib/request-body.mjs`, `lib/gemini.mjs`              | Bounded input, allowlisted model context and provider deadlines                   |
| `hosting/`, `scripts/`                                | Build and serve the same application as a Sites Worker                            |
| `test/`, `e2e/`                                       | Decision, API, security, accessibility and browser regression tests               |

## Privacy and limitations

Routine text is sent to the configured Gemini provider when you request a plan. Leave out names, addresses and sensitive details. The app has no accounts or database, and its shared cache holds only regional forecast data. API credentials are server-only. The public planning endpoint validates its inputs, bounds the request body and limits optional model calls per running instance. Set provider quotas separately to cap total deployment spend.

Forecasts are regional estimates in µg/m³. A lower predicted concentration does not certify safe exposure. Official advisories and station measurements provide local context. The app has no automated local-alert feed, live shop hours, exact route times or fare data. All suggested travel changes depend on the stated routine and local feasibility.

[Open-Meteo forecast documentation and CAMS attribution](https://open-meteo.com/en/docs/air-quality-api) · [CPCB station observations](https://airquality.cpcb.gov.in/AQI_India/) · [EPA guidance on indoor particles](https://www.epa.gov/indoor-air-quality-iaq/sources-indoor-particulate-matter-pm)
