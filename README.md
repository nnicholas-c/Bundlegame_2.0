# Configuring the Game

This project is meant to be tuned through JSON files, not through build tooling. The goal of this README is to show how every field in the active config affects the simulation.

## Required fields inside `src/config.json`

- **`name`** – Free-form label for the scenario (e.g., `"Phase 1 Lab Configuration"`). Appears only in data exports.
- **`timeLimit`** – Integer (seconds). Once the timer reaches this value the game ends, Firebase stats are saved, and Qualtrics codes appear.
- **`thinkTime`** – Integer (seconds). Amount of “free look” time before participants can select orders; the master timer pauses during this window.
- **`gridSize`** – Integer between 1–9. Sets the number of rows/columns in the in-store grid. Your store layouts (`locations`) must match this size.
- **`tips`** – Boolean toggle. When `true`, in-store payouts scale over time.
  - Each store file used by this config must include:
    - `tip`: array of percent increases (e.g., `[0, 10, 25]` means 0%, 10%, 25%).
    - `tipinterval`: seconds between entries in the `tip` array.
- **`waiting`** – Boolean. When `true`, prices can drift while the player is still on the order selection screen.
  - Requires every referenced store config to include:
    - `waiting`: array of percent adjustments to earnings.
    - `waitinginterval`: seconds between shifts.
- **`refresh`** – Boolean. Lets orders disappear and later respawn as new ones.
  - Requires:
    - `demand` inside each order (probability per second that the order vanishes).
    - `refresh` inside the store config (seconds before a replacement order is queued).
- **`expire`** – Boolean. Controls whether an order’s `expire` counter is enforced across refresh cycles. If `false`, orders behave as though `expire = 1` (single opportunity).
- **`conditions`** – Array of scenarios. Each object needs:
  - `name`: short label for analytics.
  - `order_file`: filename inside `src/lib/configs/` that lists orders.
  - `store_file`: matching store layout file in the same folder.
  - The loader increments a Firestore counter and assigns participants the next condition. If you only have one setup, keep this array length 1.
- **`auth`** – Boolean. Set to `true` when running real studies so `/login` gates the game behind a user ID + token. Set to `false` only for tutorials/demos.
- **`breakDuration`** (optional) – Seconds to wait before the next job arrives after finishing an order.
- **`companies`** – Array describing the incentive models shown on the homepage. Each entry needs:
  - `id`: stable key (also used in order files if you want company-specific queues).
  - `name` / `description`: text on the button.
  - `payment_type`: `"per_job"` or `"hourly"`.
  - `hourlyRate`: dollar amount per hour when `payment_type` is `"hourly"`.

## Example config

```json
{
  "name": "Phase 1 Lab Configuration",
  "timeLimit": 1200,
  "thinkTime": 10,
  "gridSize": 3,
  "tips": false,
  "waiting": false,
  "refresh": false,
  "expire": false,
  "conditions": [
    {
      "name": "Shorter cell distances",
      "order_file": "order.json",
      "store_file": "stores1.json"
    },
    {
      "name": "Longer cell distances",
      "order_file": "order.json",
      "store_file": "stores2.json"
    }
  ],
  "auth": true
}
```

For data analysis, condition index `0` corresponds to the first entry, and condition index `2` corresponds to the second entry (mirroring the naming convention used in the existing CSVs).

## Linking configs to data files

- **Order files (`src/lib/configs/order*.json`)**
  - Each object must include `id`, `name`, `store`, `city`, `earnings`, `items`, `expire`, and optionally `demand` + `companyId`.
  - If `refresh` is `true`, every order needs a `demand` probability so the disappearance logic can run.
- **Store files (`src/lib/configs/stores*.json`)**
  - Provide a `stores` array where each store defines `store`, `city`, `items`, `locations`, `Entrance`, and `cellDistance`.
  - Optional tuning fields (`tip`, `tipinterval`, `waiting`, `waitinginterval`, `refresh`) must be present when the matching global toggles are enabled.
  - `distances` maps every city to travel options, and `startinglocation` seeds the player’s first city.

## How the game uses these values

- During login/startup, the app imports `config.json`, loads the appropriate `order_file` + `store_file` pair for the assigned condition, and writes the condition index back to Firestore.
- `gridSize` dictates how many columns the in-store grid renders in `src/routes/bundlegame.svelte`; if the store’s `locations` array is larger/smaller, cells will misalign.
- `tips`, `waiting`, and `refresh` toggles simply enable or skip code paths—if the supporting arrays are missing, the game throws runtime errors. Always keep the arrays and intervals in lockstep with the toggle values.
- `conditions` alternate between users because the Firestore counter increments globally. If you prefer random assignment, change the logic inside `loadGame()` in `src/lib/bundle.js`.
- `auth` gates routes: when `true`, unauthenticated users are redirected to `/login`, and gameplay logs (`addAction`, `addOrder`) are written for every interaction.

## Editing workflow tips

1. Update `config.json` when changing global behavior (timer lengths, toggles, store/order pairings).
2. Add/modify order or store JSON files under `src/lib/configs/`, then point the condition entries at the new filenames.
3. Keep IDs stable so Firestore analytics remain consistent across sessions.
4. Exported data uses the numerical condition index (0, 2, ...). Note which scenario maps to which index before running studies so downstream analysis is correct.

This README intentionally focuses on gameplay configuration. Build instructions, dependency management, and deployment steps are omitted so you can concentrate on the variables that change how the simulation behaves.
