# Aurea Air

A daily air-quality assistant for the PromptWars **Challenge 6 · Urban Air Quality Assistant** vertical. Families and community organizers in six Indian cities can compare times for flexible errands, keep fixed commitments, and choose a practical change indoors.

[Open the deployed app](https://aurea-air-daily-planner.classyparrot1.chatgpt.site)

## Try the school pickup scenario

1. Select Delhi and Household. Enter “Pickup is fixed at 3 pm. The grocery shop closes at 2 pm. I have no extra travel budget.”
2. Choose your flexible time window, usual travel mode and indoor concern. Select **Create my plan**.
3. The plan displays a timing suggestion, transport alternative and indoor action. When Gemini responds, its summary accounts for the written constraints. When it is unavailable, the app labels the rules-based result **Standard plan**.
4. Open **Air guide**, choose **Find a travel alternative**, then **The shop closes early**. The guide offers another option without requiring a model call.

## Approach and logic

The Next.js interface calls two server routes. The forecast route queries Open-Meteo for regional fine-particle concentrations and caches a successful result for ten minutes. The planning route validates the city, preferences, time window and routine length. It compares forecast hours inside the chosen window over the next 24 hours, chooses the earliest minimum on ties, and selects transport and indoor actions from household or community preferences.

When configured, the server sends the submitted routine, selected options and standard plan to Google Gemini. The prompt asks for one feasible change respecting fixed times, opening hours and budget. The key stays on the server. Avoid entering names, addresses or sensitive personal details in the routine. A timeout or missing provider response leaves the standard plan available.

## Run locally

Use Node.js 22 and npm. Clone this repository, enter its directory and run:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To enable AI summaries, copy `.env.example` to `.env.local`, set `GEMINI_API_KEY` to your own key and restart. Set `GEMINI_MODEL` to select a supported model. The default is `gemini-2.5-flash`.

## Verify and build

```sh
npm test
npm run build
npm start
```

The Node test suite covers forecast window selection, missing data, expired readings, invalid input, fixed appointments, and community and indoor alternatives. The optional Sites packaging script runs after the Next.js production build with `node scripts/package-worker.mjs`.

## Structure

- `app/` contains the planner form, keyboard-accessible guided assistant and HTTP routes.
- `lib/planner.mjs` and `lib/guide.mjs` contain the decision rules.
- `lib/service.mjs` handles input validation, forecast retrieval, caching and Gemini requests.
- `test/` holds reproducible decision-rule tests that run without network access or API keys.

## Assumptions and limits

All times use India Standard Time. The six supported city centers represent regional conditions. PM2.5 values are model forecasts in µg/m³. A lower predicted value does not establish safe exposure or conditions on a specific street. The standard plan uses structured selections and leaves free-text interpretation to Gemini. The app has no live shop hours, transit fares or route data, so travel alternatives remain conditional.

[Forecast documentation and CAMS attribution](https://open-meteo.com/en/docs/air-quality-api) · [EPA guidance on indoor particles](https://www.epa.gov/indoor-air-quality-iaq/sources-indoor-particulate-matter-pm)

