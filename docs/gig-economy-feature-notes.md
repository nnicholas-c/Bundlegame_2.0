# Bundlegame Gig-Economy Feature Notes

## Purpose

Create an experimental branch of Bundlegame that lets subjects choose between gig platforms with distinct incentive schemes (per-job vs hourly guarantees) in order to probe multihoming behavior described in _Managing Multihoming Workers in the Gig Economy_.

The notes below capture the implementation work already completed, the handling logic that now drives the experience, and step-by-step guidance you can pass to another coding assistant to extend or maintain the feature set.

---

## High-Level Summary

- Added platform metadata (`companies`) and a configurable break window (`breakDuration`) to both `src/config.json` and `src/tutorialconfig.json`.
- Expanded `src/lib/bundle.js` to manage the active company, differentiate per-job vs hourly earnings, run 5-second cooldowns between jobs, and persist richer analytics in Firebase.
- Updated order queue generation in `src/lib/config.js` so each platform receives its own job feed (round-robin fallback when historical data lacks explicit company IDs).
- Extended Firebase scaffolding to record the worker's starting platform (`src/lib/firebaseDB.js`, `src/lib/tutorial.js`).
- Reworked the main Svelte page (`src/routes/+page.svelte`) to include company selection, break notifications, and a modal for switching platforms during cooldowns.
- Adjusted the gameplay Svelte components (`home.svelte`, `order.svelte`, `bundlegame.svelte`) so they respect the selected platform, pause during breaks, and apply the appropriate earnings logic.
- Installed Prettier and formatted the repository so the existing lint command succeeds.
- Split authentication into a dedicated login route (`src/routes/login/+page.svelte`) with a professional conference-ready UI, moving ID/token entry off the gameplay screen and wiring the state through shared stores.
- Cleaned up the main landing page (`src/routes/+page.svelte`) so authenticated users see their ID, while unauthenticated players are prompted to visit the login page.
- Modernized both production and tutorial order cards (`src/routes/order.svelte`, `src/routes/tutorial/order.svelte`) to use consistent Tailwind layouts, removed unused CSS selectors, and aligned event handlers with the latest Svelte syntax.

---

## Key Changes by File

### Configuration

- `src/config.json`, `src/tutorialconfig.json`
  - `breakDuration`: length of the post-job cooldown (seconds) used by the front-end timer.
  - `companies`: array of gig platforms. Each entry requires `id`, `name`, `payment_type` (`"per_job"` or `"hourly"`), optional `description`, and `hourlyRate`.
  - **Tip**: add more platforms by appending to this array—front-end selectors and stores react automatically.

### Core Stores & Logic (`src/lib/bundle.js`)

- New writable/derived stores:
  - `companies`, `currentCompany`, `breakDuration`.
  - `hourlyEarnings`, plus internal trackers for accumulated hourly pay and per-job totals.
  - Game state flags (`companySelected`, `waitingForNextJob`, `breakTimer`, `showCompanySwitchModal`).
- Helper functions added:
  - `recordPerJobPayout(amount, orderId)`: updates earnings/logging for per-job payouts.
  - `updateHourlyEarned()`, `finalizeCompanySession()`: compute hourly guarantees while users stay online.
  - `startBreakTimer()`: kicks off the cooldown between jobs and raises the switching modal prompt.
  - `switchCompany(newCompanyId)`: finalizes prior hourly sessions, loads the new queue, and logs the transition.
  - `resetEarningsState()`: clears per-job/hourly tallies at session start.
- `completeOrder(orderID, metadata)`: now logs company/payment metadata and uses the appropriate payout logic.
- `createNewUser(id, companyId)`: forwards the chosen company to Firebase.
- Logging safeguards prevent attempts before a user ID is set (guards around `logAction`/`logSystemEvent`).

### Order Queue Control (`src/lib/config.js`)

- `switchJob` accepts `companies` and prebuilds separate pools for each `companyId` when available.
- `queueNFixedOrders(count, companyId?)` pulls from the platform-specific pool; falls back to the legacy sequence if no pool exists.

### Firebase (`src/lib/firebaseDB.js`, `src/lib/tutorial.js`)

- User documents now carry a `company` property corresponding to the initial selection.
- Tutorial helpers match the new `createUser` signature.

### UI & Gameplay

- `src/routes/+page.svelte`
  - Company-picker displayed before gameplay starts and during cooldown windows.
  - Cooldown card shows remaining seconds and exposes the switch modal.
  - Hourly earnings appear when the active platform uses guaranteed pay.
  - Event handlers updated to the modern `onclick` syntax to satisfy the latest Svelte warnings.
  - Authentication inputs removed; the screen now surfaces the signed-in user ID, a start button guard, and redirect messaging for unauthenticated visitors.
- `src/routes/home.svelte`
  - Guards against starting orders while in a cooldown state.
  - Supplies `companyId` to `queueNFixedOrders` so the list reflects the active platform.
- `src/routes/order.svelte`
  - Replacement orders pulled from the selected platform’s pool.
  - Simplified markup uses Tailwind utility classes, accessible buttons, and cleans out legacy inline styles.
- `src/routes/bundlegame.svelte`
  - Exits trigger `startBreakTimer()`.
  - Checkout logic now delegates to `recordPerJobPayout`/`updateHourlyEarned` based on `payment_type`.
  - Bundled payouts split proportionally using the original order earnings.
- `src/routes/login/+page.svelte`
  - New dedicated login page with trimmed inputs, loading indicator, and minimal copy tailored for research conferences.
  - Redirects authenticated users back to the root route and disables submission until both credentials are provided.
- `src/routes/tutorial/order.svelte`
  - Mirrors the production order card layout updates for a consistent tutorial experience and removes unused CSS classes.

### Tooling

- Added Prettier as a dev dependency and formatted the repo (`npx prettier --write .`). Ensure `npm run lint` stays green after future edits.

---

## Gameplay Flow (Runtime Logic)

1. **Session Setup**
   - Player chooses a company (`currentCompany` set; `resetEarningsState()` clears old totals).
   - On authenticated start, `createNewUser` stores the company and `queueNFixedOrders(..., companyId)` seeds the first queue.
2. **Order Selection**
   - `Home` view filters orders to the active platform and prevents selection during cooldown (`$game.waitingForNextJob`).
3. **Store Interaction**
   - Completing orders calls `checkoutSingle`/`checkoutBundle`, which determine payout type:
     - `per_job`: call `recordPerJobPayout` per order; earnings update immediately.
     - `hourly`: call `updateHourlyEarned` to accumulate time-based pay.
4. **Cooldown & Switching**
   - `startBreakTimer` flips `waitingForNextJob`, counts down `breakTimer`, and lets users switch platforms.
   - Switching triggers `switchCompany`, which finalizes hourly pay, queues new jobs, and logs the transition.
5. **Logging & Analytics**
   - Every job completion logs metadata (`paymentType`, `companyId`, payouts) to Firebase.
   - Hourly updates log periodic snapshots with active rate and time online.

---

## Extending / Customizing the Experiment

1. **Add a New Platform**
   - Append to the `companies` array in both config files.
   - Supply `payment_type`, `hourlyRate` (if hourly), and descriptive text.
2. **Adjust Cooldown Duration**
   - Modify `breakDuration` in the config. The UI/logic read it directly; no code changes required.
3. **Inject Platform-Specific Orders**
   - Include `companyId` on order JSON objects to direct them to specific pools.
   - Without `companyId`, orders round-robin across platforms using array index.
4. **Instrument Additional Analytics**
   - Add fields to the metadata object passed into `completeOrder` or expand `logSystemEvent` payloads.
5. **Tweak UI Copy or Styling**
   - `+page.svelte` controls the selection screen and cooldown modal.
   - `bundlegame.svelte` handles checkout prompts; adjust messaging for the experiment.

---

## Operational Checklist

- **Install dependencies**: `npm install`
- **Run formatter**: `npx prettier --write .`
- **Lint check**: `npm run lint`
- **Dev server**: `npm run dev` (validate multi-platform flows manually).
- **Before deploying**: confirm Firebase rules accept the new `company` field and review analytics dashboards for the new action types (`job_completed_per_job`, `hourly_pay_update`, `company_switch`).

---

## Quick Prompts for Future Coding Assistants

Use or adapt the prompts below when handing this project to another AI agent:

- \*"Load the gig-economy mode in Bundlegame: ensure cooldowns, platform switching, and hourly vs per-job payouts work as documented in docs/gig-economy-feature-notes.md."
- _"Add a third company with hybrid incentives (base hourly + per-job bonus) following the conventions in docs/gig-economy-feature-notes.md."_
- _"Instrument additional Firebase analytics when players ignore the switch modal; see existing logging hooks described in docs/gig-economy-feature-notes.md."_

These notes should give any collaborator (human or AI) the context needed to understand the current system and extend it confidently.
