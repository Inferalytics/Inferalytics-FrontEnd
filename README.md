# Inferalytics — Decision-Formation Workspace

A high-fidelity interactive prototype of the Inferalytics platform — a decision-formation workspace where business data, AI reasoning, and human judgment converge. Built for FP&A leads, CFOs, and ops directors who need to model decisions, not just visualise them.

> **This is not a dashboard. It is not a chatbot.**
> It is a shared interactive canvas — the workflow is **conversation → computation → conversation**.

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | React | 19 |
| Language | TypeScript | 5 |
| Bundler | Vite | 6 |
| Styling | Tailwind CSS | 4 |
| Routing | React Router DOM | 7 |
| State | Zustand | 5 |
| Auth | Clerk | 5 |
| Data Fetching | TanStack Query | 5 |
| HTTP | Axios | 1 |
| Icons | Lucide React | latest |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

Requires a `.env` file with your Clerk publishable key:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

---

## Product Concept

Inferalytics helps decision-makers build a **world model** of their business — a graph of dimensions, parameters, and relationships — and then run optimisations, forecasts, and scenarios against it.

### User Journey — 3 Phases, 7 Screens

| Phase | Screens | What happens |
|---|---|---|
| **Define** | 01 Talk → 02 Setup | Frame the decision in plain language. AI extracts dimensions, parameters, time horizon, and segments. |
| **Construct** | 03 Build → 04 Batch | AI drafts relationships and a data table. User confirms. Dimension cards land on the canvas. |
| **Optimise** | 05 Optimise → 06 Results → 07 Compare | Pin baselines, run Newton-Raphson, view results as canvas objects, compare scenarios side-by-side. |

---

## Screen Reference

### 01 — Talk
Conversation-first entry point. Full-bleed, no side panels. An animated two-column layout slides in after load — left side frames the objective, right side is a live chat thread.

- AI opens with a greeting and suggested prompts
- User describes the decision (e.g. "raise Enterprise prices by 8–12%")
- AI builds a **world model summary sheet**: Decision, Objective, Levers, Dimensions, Inputs, Method
- CTA transitions to Setup

### 02 — Setup
Step 1 of 3 in the guided setup wizard.

- **General Config tab**: Focal point, time granularity, customer segments, parameters — all toggle-selectable with AI suggestions
- **Data Sources tab**: Lists uploaded files with field counts and row counts. Each source expands to show full column definitions (name, type, sample value)

### 03 — Build
Step 2 of 3. Two subtabs:

- **Dimensions & Vectors**: Four dimension cards (Quarter, Revenue, Region, Product Line) connected by animated SVG bezier curves to the vectorisation mapping panel. Marching orange lines = active data pipelines.
- **Baseline Rates & Rules**: Pre-calculated growth rates table (5 segments, Q1–Q4 + YoY) alongside a drafted relationships card where the user confirms each data connection (e.g. `Quarter → Revenue`).

### 04 — Batch
Free-canvas upload view. Dimension cards are placed at absolute positions with SVG connectors linking them. A "linking..." pulse badge overlays the active connection.

### 05 — Optimise
Step 3 of 3. A floating controls bar lets the user set the EGR target and fire the Newton-Raphson solver. Seven pinned dimension cards are laid out on the canvas with structured SVG connector paths. Pinned cards (Region, Gross Margin) show amber styling.

### 06 — Results
Two subtabs:

- **Optimisation Summary**: Circular EGR gauge (target vs achieved) + result card showing Revenue, Cost Centre, and Quarter deltas with directional badges.
- **Scenario Projections**: Two floating scenario cards (Baseline / Optimised) with sparkline charts. Checking both "Compare Scenario" boxes auto-navigates to Compare after 300ms.

### 07 — Compare
Full trade-off table: Scenario A vs B across 5 metrics (EGR, Revenue, Cost Allocation, YoY Growth, EGR Gap) plus sparkline trajectory rows. Footer recommends Scenario B and offers Export / Select Scenario B actions.

---

## Project Structure

```
src/
├── api/
│   └── axiosClient.ts              # Axios instance
├── components/
│   └── layout/
│       ├── CenterPanel.tsx         # Thin orchestrator — routes to the right panel
│       ├── Header.tsx
│       ├── LeftPanel.tsx
│       ├── RightPanel.tsx
│       ├── Shell.tsx
│       ├── AuthLayout.tsx
│       └── panels/                 # One file per screen
│           ├── TalkPanel.tsx       # Screen 01 — animated hero + chat
│           ├── SetupPanel.tsx      # Screen 02 — config + data sources
│           ├── BuildPanel.tsx      # Screen 03 — dimensions + relationships
│           ├── BatchPanel.tsx      # Screen 04 — free canvas upload
│           ├── OptimisePanel.tsx   # Screen 05 — run solver
│           ├── ResultsPanel.tsx    # Screen 06 — gauge + scenarios
│           ├── ComparePanel.tsx    # Screen 07 — trade-off table
│           └── bezierUtils.ts      # SVG cubic bezier path helpers
├── pages/
│   └── DashboardPage.tsx
├── store/
│   └── useStore.ts                 # Zustand global store
├── types/
│   └── index.ts                    # Shared TypeScript interfaces
├── App.tsx
├── index.css
└── main.tsx
```

---

## State Management

Global state lives in a single Zustand store (`src/store/useStore.ts`). Each panel reads only what it needs via `useStore()` — no prop drilling.

### Key State Shape

```ts
{
  screen: number;                      // Active screen (1–7)
  setup: SetupState;                   // Focal point, segments, parameters, sources
  relationships: Relationship[];       // Drafted data connections
  growthRates: GrowthRate[];           // Pre-calculated segment growth table
  dimensions: DimensionCard[];         // Canvas cards (position, type, status)
  egrTarget: number;                   // User-set EGR % target
  scenarios: Scenario[];               // A/B scenario data
  optimisationResult: OptimisationResult | null;
}
```

### Key Actions

| Action | What it does |
|---|---|
| `setScreen(n)` | Transitions to screen n, rebuilds dimension card layout, appends AI message to conversation thread |
| `runOptimisation(cb)` | Simulates 1.2s solver run → sets screen 6, populates result rows |
| `toggleScenarioChecked(id)` | Checks scenario A or B; if both checked, auto-navigates to screen 7 after 300ms |
| `toggleRelationshipConfirmed(i)` | Confirms or un-confirms a drafted relationship in Build |
| `setFocalPoint(val)` | Updates the focal point field in Setup |
| `resetAll()` | Resets all state back to initial values |

---

## Routing

URL-based routing coexists with screen-number state for direct in-panel transitions.

```
/dashboard/talk
/dashboard/setup                  → SetupPanel — General Config
/dashboard/setup/sources          → SetupPanel — Data Sources
/dashboard/build                  → BuildPanel — Dimensions & Vectors
/dashboard/build/relationships    → BuildPanel — Baseline Rates & Rules
/dashboard/results                → ResultsPanel — Optimisation Summary
/dashboard/results/scenarios      → ResultsPanel — Scenario Projections
```

Screens 1, 4, 5, and 7 are reached via `setScreen()` calls from buttons inside the panels.

---

## Design Principles

- **Canvas-first, not form-first** — content floats on a warm off-white gradient, never in hard-edged page containers
- **Generous whitespace** — Figma-style layout, nothing crammed
- **Monospace for data** — all numbers, field names, and code values use `font-mono`
- **Semantic colour system** — Sage for success/confirmed, Peach/Indigo for AI and brand accents, Amber for pinned/review states
- **No modals** — all transitions happen inline on the canvas

---

## Branches

| Branch | Description |
|---|---|
| `main` | Current active development |
| `old-frontend` | Previous frontend baseline |
