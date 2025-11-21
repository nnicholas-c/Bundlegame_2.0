# Critical Analysis: Adapting BundleGame for Game A & B Research Design

**Date**: October 31, 2025
**Analyst**: Research Engineering Assessment
**Context**: Evaluating new research requirements against existing BundleGame architecture

---

## Executive Summary

The existing BundleGame has **significant overlap** with the proposed Game B (Order Bundling Optimization) but requires **substantial redesign** to support both Game A (Multihoming Wage Choice) and the stricter experimental controls outlined in the new instructions. The current system has valuable infrastructure (Firebase logging, multi-platform support, SvelteKit foundation) but also critical mismatches in complexity, UI design, and data models.

**Recommendation**: **Hybrid approach** — refactor core systems while preserving authentication, logging infrastructure, and multi-platform architecture. Build new simplified UI and round-based structure alongside existing game for backward compatibility.

---

## Alignment Analysis

### ✅ Strong Existing Capabilities

| New Requirement | Current Implementation | Gap Assessment |
|----------------|----------------------|----------------|
| **Multi-platform choice** | ✅ Companies X/Y with per-job vs hourly payment | **Perfect match** — already implemented |
| **Switching overhead** | ✅ 5-second break between jobs | **Good match** — configurable `breakDuration` |
| **Bundling mechanics** | ✅ Select 1-2 orders from same store/city | **Partial match** — limited to 2 orders, needs ≤4 |
| **Earnings tracking** | ✅ Per-job + hourly accumulation, Firebase logging | **Perfect match** — comprehensive tracking |
| **Authentication** | ✅ Token-based auth with Firebase | **Perfect match** — reusable system |
| **Time-based gameplay** | ✅ 20-minute sessions with timer | **Good match** — configurable `timeLimit` |
| **A/B testing** | ✅ Condition assignment via Firebase counter | **Perfect match** — existing infrastructure |
| **Data logging** | ✅ Every interaction logged with timestamps | **Perfect match** — exceeds requirements |

### ⚠️ Moderate Mismatches

| New Requirement | Current Implementation | Issues |
|----------------|----------------------|--------|
| **≤4 cards per round** | Shows 4 orders in queue | ✅ Matches, but queue is continuous not round-based |
| **Round-based structure** | Continuous gameplay with order queue | ❌ **Major redesign needed** — no discrete rounds |
| **Simple card UI** | Order cards exist (`order.svelte`) | ⚠️ Cards are simple but embedded in complex game flow |
| **Bundle size 2-4** | Only supports bundling 2 orders | ❌ **Code change needed** — hardcoded limit |
| **Platform recommendations** | No recommendation system | ❌ **New feature needed** |
| **Computed hourly rate display** | Shows earnings, not rate calculations | ⚠️ Partial — needs explicit $/hr computation per choice |

### 🚨 Critical Gaps

| New Requirement | Current State | Severity |
|----------------|--------------|----------|
| **Game A: Stochastic arrival rates** | Orders are deterministic pre-generated | 🔴 **HIGH** — requires new simulation model |
| **Game A: Service time variance** | Navigation time is deterministic (grid-based) | 🔴 **HIGH** — no stochastic elements |
| **Game A: Tip distributions** | Tips increase linearly over time (if enabled) | 🔴 **MEDIUM** — not stochastic per-order |
| **Optimal strategy calibration** | No optimal baseline computed | 🔴 **HIGH** — B0-B4 scenarios require precise tuning |
| **Travel time matrix** | City distances exist, but no pickup/dropoff nodes | 🔴 **HIGH** — need node-based routing |
| **In-store collection gameplay** | Grid navigation + typing items | 🔴 **CRITICAL** — **too complex for new design** |
| **Round-by-round structure** | Continuous 20-min session | 🔴 **HIGH** — need discrete rounds with feedback |

---

## Deep-Dive Critical Issues

### 1. **Gameplay Complexity Mismatch** 🔴 CRITICAL

**Current State**:
- Players navigate 3×3 grid stores
- Type item names and quantities manually
- Collect items in virtual bags
- Time spent = manhattan distance × `cellDistance` + typing time
- Verification at checkout (can fail and retry)

**New Requirements**:
- "Keep UI simple (cards)"
- "Show ≤4 items per round"
- Focus on **decision-making**, not execution skill

**Problem**: The existing in-store gameplay adds **skill-based variance** that confounds learning measurements. Typing speed, memory, and navigation errors introduce noise unrelated to optimization strategy.

**Critical Assessment**:
- ❌ Current grid navigation is **orthogonal to research goals**
- ❌ Typing task is a **confound** for studying bundling decisions
- ❌ Makes Game A impossible (no "same job, different pay" abstraction)
- ✅ Works as a **realistic task representation** for ecological validity

**Recommendation**:
- **For Game A & B**: **Remove grid gameplay entirely**. Abstract service time as `service_time_min` with optional variance.
- **For existing game**: Keep grid gameplay as a separate "realistic simulation" mode.
- **Bridge**: Create `execution_mode: "simulated" | "interactive"` config flag.

---

### 2. **Round-Based vs Continuous Structure** 🔴 HIGH

**Current State**:
```
[Think 10s] → [Select orders] → [Travel] → [Navigate store] → [Break 5s] → [Repeat until 20 min]
```
- No discrete "rounds"
- Orders refresh continuously (4-order queue)
- No per-round feedback or reset
- Total earnings shown continuously

**New Requirements**:
```
Round 1: [View 4 cards] → [Make choice] → [See outcome & hourly rate] → [Next round]
Round 2: ...
```
- 8 rounds per game (Game A: W1-W8, Game B: B0-B4 + extras)
- Per-round feedback on earnings and hourly rate
- Opportunity for learning between rounds
- Potentially different "time windows" per round (Game A: off-peak vs peak)

**Critical Assessment**:
- ❌ Current continuous structure doesn't allow **between-round learning** measurement
- ❌ No clear "regret per round" metric
- ❌ Can't implement calibrated scenarios (B0-B4) in continuous flow
- ❌ Makes simulated agent comparison difficult (no episode boundaries)

**Recommendation**:
- **Add round-based mode** to config:
  ```json
  {
    "game_mode": "continuous" | "round_based",
    "rounds": [/* array of round configs */]
  }
  ```
- Each round is self-contained: choice → simulated outcome → feedback → next
- Keep continuous mode for backward compatibility

---

### 3. **Data Model Incompatibility** 🔴 HIGH

**Current Order Schema**:
```json
{
  "name": "Alexander",
  "store": "Sprouts Farmers Market",
  "city": "Oakland",
  "earnings": 20,
  "items": {"grape": 4, "orange": 1},
  "amount": 5
}
```

**Required Game A Schema** (Platform/Wage Choice):
```json
{
  "id": "option_A1",
  "platform_id": "A",
  "pay_scheme": "hourly",
  "base_wage_per_hr": 22,
  "arrival_rate_per_hr": null,
  "service_time_mean_min": null
}
```

**Required Game B Schema** (Order Bundling):
```json
{
  "order_id": "order_1",
  "pickup_node": "store_1",
  "dropoff_node": "customer_A",
  "base_fee": 6,
  "tip_mean": 2,
  "tip_std": 1,
  "service_time_min": 15,
  "size_units": 1
}
```

**Critical Assessment**:
- ❌ Current schema **cannot represent** Game A stochastic parameters
- ❌ No `pickup_node`/`dropoff_node` structure for routing optimization
- ❌ No tip distributions (only fixed or linear increase)
- ❌ Missing `service_time` (currently computed from grid navigation)
- ⚠️ `earnings` field is fixed, not computed from base + tip realization

**Recommendation**:
- **Create unified schema** with game type discriminator:
  ```json
  {
    "game_type": "wage_choice" | "bundling_optimization",
    "variant": "multihoming" | "grocery",
    "options": [/* game-specific schemas */]
  }
  ```
- **Extend** existing order schema with optional fields for backward compatibility
- **Add** `recommendation` field at round level

---

### 4. **Missing Stochastic Simulation Engine** 🔴 HIGH

**Current State**:
- Order earnings are **fixed** (only change via tips over time)
- Store navigation is **deterministic** (fixed grid, fixed cell times)
- No arrival rate simulation
- No service time variance
- No cancel probability

**New Requirements (Game A)**:
- Simulate order arrivals via Poisson process (`arrival_rate_per_hr`)
- Sample service times from normal distribution (`service_time_mean_min`, `service_time_std_min`)
- Sample tips from distributions (`tip_mean`, `tip_std`)
- Compute **expected** hourly rate vs **realized** hourly rate

**Critical Assessment**:
- ❌ **Missing entire simulation module**
- ❌ No statistical sampling infrastructure
- ❌ Can't compute "expected" vs "actual" outcomes for learning models
- ❌ Makes Game A impossible without major additions

**Recommendation**:
- **Build new module**: `src/lib/simulation.js`
  ```typescript
  function simulateWageChoice(option, time_window_min, rng) {
    const arrivals = poissonProcess(option.arrival_rate_per_hr, time_window_min);
    const outcomes = arrivals.map(t => ({
      service_time: normalSample(option.service_time_mean_min, option.service_time_std_min),
      tip: normalSample(option.tip_mean, option.tip_std),
      earnings: option.pay_per_order + tip
    }));
    return { total_earnings, total_time, hourly_rate };
  }
  ```
- Use **seeded RNG** for reproducibility
- Store both **expected** (computed) and **realized** (sampled) outcomes

---

### 5. **Calibration & Optimal Strategy Computation** 🔴 HIGH

**Current State**:
- No optimal baseline
- Existing `optimal.json` and `possibilities.json` appear to be researcher notes, not algorithmic output
- No verification that scenarios realize intended dominant strategies

**New Requirements**:
- **B0**: Single orders dominate (bundle penalty > bundle savings)
- **B2**: Bundle-2 dominates singles and larger bundles
- **B3**: Bundle-3 dominates despite rec=2
- **B4**: Bundle-4 dominates despite rec=2
- Must be **verifiable** and **numerically consistent**

**Critical Assessment**:
- ❌ **No tooling** to verify scenarios realize intended optima
- ❌ Current order generation scripts (`src/lib/scripts/`) are heuristic, not optimization-based
- ❌ No travel time matrix (only city-to-city distances)
- ❌ No automated regret calculation

**Recommendation**:
- **Create calibration tool**: `scripts/calibrate_rounds.py`
  - Input: Desired optimal strategy (B0-B4)
  - Output: JSON config that realizes this optimum
  - Verification: Enumerate all bundle combinations, compute hourly rates
- **Add tests**: `tests/scenarios.test.js` that verify each round's dominant strategy
- **Provide notebook**: `analysis/scenario_verification.ipynb` with visualizations

---

### 6. **Recommendation System** ❌ NEW FEATURE

**Current State**: None. Players choose freely.

**New Requirements**:
- Platform recommends bundle size (default: 2)
- Track `rec_accept` vs `rec_override` events
- UI must **visually highlight** recommended choice
- Study: "How should AI recommendations improve decisions without encouraging suboptimal habits?"

**Critical Assessment**:
- ❌ **Entirely new feature** — no existing infrastructure
- ⚠️ Requires UI changes (highlight recommended cards)
- ⚠️ Requires logging schema extensions
- ✅ Fits well with existing Firebase action logging

**Recommendation**:
- **Add recommendation field** to round config:
  ```json
  {"recommendation": {"type": "bundle", "size": 2, "order_ids": ["order1", "order2"]}}
  ```
- **UI component**: `<RecommendationBadge>` overlay on cards
- **Log events**:
  - `recommendation_shown`
  - `recommendation_accepted` (selected exactly the recommended bundle)
  - `recommendation_overridden` (selected different choice)
- **Analysis metric**: Override rate by round, correlation with regret

---

### 7. **Agent Baselines & Simulation Requirements** 🔴 HIGH

**Current State**: None. No agent simulation infrastructure.

**New Requirements**:
- **Risk-neutral** agent (maximize expected value)
- **Risk-averse** agents (CARA, CRRA utility functions)
- **Exploration algorithms**: ε-greedy, UCB1, Thompson Sampling
- **Output**: Learning curves, regret over rounds, convergence time

**Critical Assessment**:
- ❌ **No Python simulation code**
- ❌ No regret calculation infrastructure
- ❌ No agent-vs-human comparison tooling
- ⚠️ Requires **parameter estimation** from human data

**Recommendation**:
- **Create Python package**: `sim/agents/`
  ```
  sim/
  ├── agents/
  │   ├── risk_neutral.py
  │   ├── risk_averse.py (CARA, CRRA)
  │   ├── bandits.py (ε-greedy, UCB, Thompson)
  │   └── base.py (Agent interface)
  ├── environment.py (Game A/B state machines)
  ├── metrics.py (regret, convergence, learning curves)
  └── report.ipynb (plots & analysis)
  ```
- **Input**: Same JSON configs as web app
- **Output**: Agent trajectories, benchmark stats, comparison plots

---

### 8. **UI Simplification Required** 🔴 MEDIUM

**Current UI Complexity**:
- Full-screen game with timer, earnings counter, order queue
- In-store view with grid, bags, item lists
- Multiple modals (company selection, break screen, game over)
- Tutorial system with guided prompts

**New Requirements**:
- "Keep UI simple (cards)"
- "≤4 items per round"
- "Minimal web prototype"
- Focus on **decision interface**, not game immersion

**Critical Assessment**:
- ⚠️ Current UI is **over-engineered** for new research goals
- ⚠️ Complex UI may **intimidate participants** in short pilot (30-45 min)
- ⚠️ Hard to A/B test UI elements (e.g., recommendation highlighting)
- ✅ Current card design (`order.svelte`) is clean and reusable

**Recommendation**:
- **Build simplified UI mode**: `src/routes/experiment/+page.svelte`
  - Single screen: round number, cards (≤4), recommendation badge, submit button
  - Post-round: feedback screen with earnings, hourly rate, optimal comparison
  - Progress bar (round X/8)
  - No grid navigation, no timer countdown (round-based is self-paced with RT tracking)
- **Preserve existing UI** as `src/routes/bundlegame.svelte` (realistic simulation mode)
- **Theme switcher**: Multihoming vs Grocery language

---

### 9. **Global Parameter Order Standardization** ✅ LOW PRIORITY

**Current State**: Each JSON file has implicit schema, no enforced order.

**New Requirements**: Consistent field order across all configs:
```
round_id → variant → time_window_min → recommendation → options →
constraints → stochastic_params → costs → scoring
```

**Critical Assessment**:
- ✅ **Low impact** — field order doesn't affect functionality
- ⚠️ **Readability benefit** for researchers editing JSON manually
- ✅ Easy to implement with JSON schema + linter

**Recommendation**:
- **Add JSON schema**: `schemas/round_config.schema.json`
- **Add pre-commit hook**: Validate and auto-format JSON to standard order
- **Low priority** — implement after core functionality

---

### 10. **Pilot Timeline (Nov 3-7, 2025)** ⚠️ TIMELINE RISK

**New Requirements**:
- Pilot starts **in 3 days** (Nov 3)
- Need: Experiment spec, 8 rounds per game, prototype, agent baselines, analysis plan, pilot materials

**Current State**:
- Existing game is functional but **not adapted**
- No Game A implementation
- No round-based structure
- No recommendation system
- No agent simulation code

**Critical Assessment**:
- 🔴 **HIGH RISK** — 3 days is **very tight** for scope outlined
- 🔴 Implementing both games from scratch = **2-3 weeks** realistically
- ⚠️ **Minimum viable pilot**: Could run **Game B only** with simplified existing architecture
- ⚠️ Agent baselines can be developed **during** pilot (not blocking)

**Recommendation**: **Phased approach**

**Phase 0 (Nov 1, Today)**: Scoping & critical path
- [ ] Finalize which game(s) to pilot (B only? Both?)
- [ ] Define absolute minimum features for pilot
- [ ] Assess if existing game can be adapted vs new build

**Phase 1 (Nov 1-2)**: Core infrastructure
- [ ] Implement round-based structure
- [ ] Remove grid gameplay (simulated service times)
- [ ] Add recommendation system
- [ ] Calibrate B0-B4 scenarios

**Phase 2 (Nov 2-3)**: UI & materials
- [ ] Build simplified card UI
- [ ] Write participant instructions
- [ ] Create comprehension checks
- [ ] Deploy pilot build

**Phase 3 (During pilot, Nov 3-7)**: Analysis prep
- [ ] Develop agent baselines in parallel
- [ ] Real-time data monitoring
- [ ] Prepare analysis scripts

**Phase 4 (Post-pilot, Nov 8+)**: Full implementation
- [ ] Implement Game A (if not in pilot)
- [ ] Full agent suite
- [ ] Publication-ready analysis

---

## Architectural Recommendations

### Option A: **Refactor Existing Game** ⚠️ Medium Risk, Medium Effort

**Approach**: Adapt current BundleGame to support both modes (continuous + round-based)

**Pros**:
- ✅ Reuse authentication, Firebase, logging infrastructure
- ✅ Preserve existing game for future studies
- ✅ Leverage SvelteKit architecture

**Cons**:
- ❌ Technical debt from dual-mode support
- ❌ Risk of regressions in existing game
- ❌ May still require substantial rewrites (grid removal, stochastic engine)

**Estimated effort**: 4-6 days

---

### Option B: **Build New Standalone Experiment App** ✅ Lower Risk, Clear Scope

**Approach**: Create `src/routes/experiment-v2/` with clean implementation of Game A/B

**Pros**:
- ✅ No risk to existing game
- ✅ Clean architecture aligned with requirements
- ✅ Faster development (no legacy constraints)
- ✅ Easier to maintain and extend

**Cons**:
- ❌ Duplicate some infrastructure (auth, Firebase client)
- ❌ Two codebases to maintain
- ⚠️ Lose some existing features (tutorial, complex timing)

**Estimated effort**: 3-4 days (faster due to no refactoring)

---

### Option C: **Minimum Viable Pilot (Game B Only)** ✅ RECOMMENDED for Nov 3 deadline

**Approach**: Adapt existing bundling mechanics, defer Game A

**Pros**:
- ✅ **Feasible in 3 days**
- ✅ Game B is closer to existing implementation
- ✅ Focuses scope on one research question
- ✅ Can add Game A post-pilot

**Cons**:
- ⚠️ Doesn't deliver full spec
- ⚠️ Requires stakeholder buy-in on reduced scope

**Estimated effort**: 2-3 days

**Minimum changes**:
1. Remove grid navigation → use fixed `service_time_min` per order
2. Add round structure (8 rounds, B0-B4 + 4 fillers)
3. Add recommendation badge to UI
4. Calibrate B0-B4 scenarios manually
5. Write participant instructions
6. Deploy

---

## Specific Technical Debt & Risks

### 1. **Grid Navigation Removal** 🔴
- Current: Core gameplay loop in `bundlegame.svelte` (300+ lines)
- Change: Replace with `setTimeout(service_time_min * 60 * 1000, completeOrder)`
- Risk: **Breaks tutorial, existing study data comparability**

### 2. **Bundle Size Limit** 🔴
- Current: Hardcoded max 2 orders (`bundle.js:15` and UI logic)
- Change: Make `maxBundleSize` configurable, update UI to show 1-4 cards side-by-side
- Risk: **UI layout breaks**, validation logic needs updates

### 3. **Recommendation UI** 🟡
- Current: None
- Change: Add `<RecommendationBadge>` component with highlighting
- Risk: **Low** — additive change

### 4. **Travel Time Matrix** 🔴
- Current: Only city-to-city distances
- Change: Need `pickup_node → dropoff_node` matrix with N×N times
- Risk: **Medium** — requires new data structure, routing algorithm

### 5. **Stochastic Simulation** 🔴
- Current: Deterministic
- Change: Add `src/lib/simulation.js` with statistical sampling
- Risk: **Medium** — need seeded RNG, testing, validation against analytical expectations

### 6. **Hourly Rate Display** 🟡
- Current: Shows cumulative earnings
- Change: Add "Expected: $X/hr" for each option before choice
- Risk: **Low** — UI-only change

---

## Data Schema Proposal

### Unified Round Configuration

```json
{
  "round_id": "W1_offpeak",
  "game_type": "wage_choice",
  "variant": "multihoming",
  "time_window_min": 60,
  "recommendation": null,
  "options": [
    {
      "id": "platform_A",
      "platform_id": "A",
      "pay_scheme": "hourly",
      "base_wage_per_hr": 22,
      "arrival_rate_per_hr": null,
      "service_time_mean_min": null,
      "service_time_std_min": null,
      "cancel_prob": 0
    },
    {
      "id": "platform_B",
      "platform_id": "B",
      "pay_scheme": "piece",
      "pay_per_order": 6,
      "tip_mean": 2,
      "tip_std": 2,
      "arrival_rate_per_hr": 2,
      "service_time_mean_min": 15,
      "service_time_std_min": 5,
      "cancel_prob": 0.05
    }
  ],
  "constraints": {
    "can_switch_mid_round": false
  },
  "stochastic_params": {
    "seed": 12345
  },
  "costs": {
    "switch_overhead_min": 5
  },
  "scoring": {
    "show_expected_earnings": true,
    "show_realized_earnings": true,
    "show_optimal_comparison": true
  }
}
```

### Bundling Round Configuration

```json
{
  "round_id": "B2_optimal",
  "game_type": "bundling_optimization",
  "variant": "grocery",
  "time_window_min": null,
  "recommendation": {
    "type": "bundle",
    "size": 2,
    "order_ids": ["order_1", "order_2"]
  },
  "options": [
    {
      "order_id": "order_1",
      "pickup_node": "store_oaktown",
      "dropoff_node": "customer_A",
      "base_fee": 6,
      "tip_mean": 2,
      "tip_std": 1,
      "prep_time_min": 3,
      "service_time_min": 12,
      "earliest_pickup_min": 0,
      "latest_dropoff_min": 60,
      "size_units": 1,
      "items": ["apple", "orange"]
    },
    {
      "order_id": "order_2",
      "pickup_node": "store_oaktown",
      "dropoff_node": "customer_B",
      "base_fee": 6,
      "tip_mean": 2,
      "tip_std": 1,
      "prep_time_min": 3,
      "service_time_min": 10,
      "earliest_pickup_min": 0,
      "latest_dropoff_min": 60,
      "size_units": 1,
      "items": ["grape"]
    }
  ],
  "constraints": {
    "capacity_limit": 4,
    "max_bundle_size": 4
  },
  "stochastic_params": {
    "tip_distribution": "normal",
    "seed": 67890
  },
  "costs": {
    "bundle_overhead_min_per_extra": 3
  },
  "travel_time_matrix_min": {
    "store_oaktown": {"customer_A": 8, "customer_B": 7},
    "customer_A": {"customer_B": 5}
  },
  "scoring": {
    "show_hourly_rate": true,
    "show_optimal_bundle": false
  }
}
```

---

## Missing Deliverables Checklist

### 📄 Experiment Spec
- [ ] Participant instructions (Game A & B)
- [ ] Comprehension checks with passing criteria
- [ ] Payoff logic explanation
- [ ] Informed consent language

### 🗂️ Configuration Files
- [ ] `configs/game_a/W1-W8.json` (8 wage choice rounds)
- [ ] `configs/game_b/B0-B4.json` (5 bundling scenarios)
- [ ] `configs/game_b/fillers.json` (3 additional rounds)
- [ ] JSON schema validation files

### 💻 Web Prototype
- [ ] Round-based game loop
- [ ] Card rendering (≤4 per round)
- [ ] Recommendation highlighting
- [ ] Hourly earnings computation
- [ ] Choice logging with RT
- [ ] Post-round feedback screen
- [ ] Multihoming vs Grocery theme toggle

### 🐍 Agent Simulation
- [ ] `sim/agents/risk_neutral.py`
- [ ] `sim/agents/risk_averse.py` (CARA, CRRA)
- [ ] `sim/agents/bandits.py` (ε-greedy, UCB, Thompson)
- [ ] `sim/environment.py` (Game A/B state)
- [ ] `sim/metrics.py` (regret, learning curves)
- [ ] `sim/report.ipynb` (plots)

### 📊 Analysis Plan
- [ ] Per-round regret metric definition
- [ ] Convergence time metric
- [ ] Recommendation acceptance rate
- [ ] Earnings distribution analysis
- [ ] Mixed-effects model specification
- [ ] Sample size calculation

### 🧪 Pilot Materials
- [ ] 30-45 min session outline
- [ ] Success criteria (data quality, completion rate)
- [ ] Debrief survey (5-8 questions)
- [ ] Recruitment materials
- [ ] Compensation structure

---

## Priority Recommendations for Nov 3 Pilot

### 🔴 CRITICAL PATH (Must have)
1. ✅ **Decide scope**: Game B only OR both games
2. ✅ **Remove grid navigation** → simulated service times
3. ✅ **Implement round structure** (8 rounds, discrete)
4. ✅ **Calibrate B0-B4** scenarios with verification
5. ✅ **Add recommendation UI** (highlight bundle-2)
6. ✅ **Write participant instructions** + comprehension checks
7. ✅ **Deploy & test** end-to-end

### 🟡 HIGH PRIORITY (Should have)
8. ✅ **Choice logging** with RT and override detection
9. ✅ **Post-round feedback** (earnings, hourly rate)
10. ✅ **Debrief survey** integration
11. ⚠️ **Game A rounds** (if in scope)

### 🟢 MEDIUM PRIORITY (Nice to have)
12. ⚠️ **Agent baselines** (can develop during pilot)
13. ⚠️ **Travel time matrix** (can simplify for pilot)
14. ⚠️ **Theme toggle** (multihoming vs grocery)

### ⚪ LOW PRIORITY (Post-pilot)
15. ⚪ **Full stochastic simulation** with all distributions
16. ⚪ **Comprehensive analysis notebook**
17. ⚪ **JSON schema enforcement**

---

## Final Verdict

### Can the Nov 3 pilot happen with full spec?
**No.** The gap between current implementation and requirements is **too large** for 3 days.

### What's feasible by Nov 3?
**Game B pilot only** with simplified architecture:
- Round-based bundling decisions (B0-B4 + fillers)
- Simple card UI with recommendations
- Manual service time simulation (no grid)
- Basic logging and feedback
- Participant materials

### What needs to be deferred?
- Game A (wage choice with stochastic arrivals)
- Full agent simulation suite
- Travel time matrix optimization
- Publication-ready analysis pipeline
- Multihoming/grocery theme variants

### What's the critical blocker?
**Grid navigation removal** — this is the single biggest architectural change. Everything else can be incremental. Estimate: **1 day** to refactor, test, and verify no regressions.

---

## Action Items

### For Research Team:
1. **Confirm scope** for Nov 3 pilot (Game B only? Both?)
2. **Review B0-B4 scenarios** — provide target optimal strategies
3. **Approve UI simplification** (remove grid gameplay for pilot)
4. **Prepare recruitment** materials and compensation budget

### For Engineering:
1. **Branch protection**: Create `pilot-nov3` branch for changes
2. **Implement round-based mode** (Option C: minimum viable)
3. **Calibration tool** for B0-B4 verification
4. **Deploy test build** by Nov 2 EOD

### For Both:
1. **Daily standups** (Nov 1-3) to track progress
2. **Go/no-go decision** by Nov 2 evening
3. **Contingency plan**: Delay pilot to Nov 10-14 if needed

---

**End of Analysis**
