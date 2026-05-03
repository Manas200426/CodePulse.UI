# CodePulse — Frontend Product Specification

> **Version:** 1.0  
> **Status:** Design Phase  
> **Stack:** React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · React Router v7  
> **Backend:** ASP.NET Core 9 on `http://localhost:5084`

---

## 1. Product Vision

**CodePulse** is a real-time system intelligence dashboard — not just a monitoring tool.

The core promise to the user:

> *"You are looking at the heartbeat of your entire system. You know what is broken, where it started, and why — in under 30 seconds."*

Most monitoring dashboards answer "what is wrong?". CodePulse goes further and answers "**why** is it wrong, and **where did it start?**"

This distinction — from raw data to actionable intelligence — is the product's identity and its primary differentiator.

---

## 2. Core UX Philosophy

Every design decision should serve these three user questions, in order of priority:

1. **"What is broken right now?"** — Instant, glanceable system awareness.
2. **"Where did it start?"** — Root cause visibility through incident correlations.
3. **"How bad is it?"** — Severity, duration, and trend data without digging.

### Design Principles

| Principle | Meaning in practice |
|---|---|
| **Live, not stale** | Data should feel real-time. Pulsing indicators, animated counters, auto-refresh. |
| **Context over raw data** | Never show a number without meaning. 500ms is meaningless; "+4× baseline" is not. |
| **Progressive detail** | Overview → click → drill-down. Never overload the first view. |
| **Dark by default** | Professional monitoring tools live in dark mode. It reduces eye strain and makes status colors (green/red) pop. |
| **Micro-interactions** | Every state transition should be smooth — loading skeletons, hover reveals, animated badges. |

---

## 3. Global Layout

### Shell Structure

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (256px fixed)   │   Main Content Area          │
│                          │                              │
│  [CP] CodePulse          │   Top Bar                    │
│  ─────────────────       │   ────────────────────────── │
│  ● Dashboard             │                              │
│  ● Services              │   Page Content               │
│  ● Incidents             │                              │
│  ● Anomalies             │                              │
│  ● Insights              │                              │
│  ─────────────────       │                              │
│  ⚙  Setup               │                              │
└─────────────────────────────────────────────────────────┘
```

### Sidebar

- Fixed width, full height, never collapses on desktop.
- Logo: "CP" monogram in primary color + "CodePulse" wordmark.
- Nav items have icon + label. Active item has solid accent background.
- Bottom section has "Setup" separated by a divider.
- A live system health indicator dot at the bottom — green if all healthy, red if any service is down. Pulses when an active incident exists.

### Top Bar (per-page, inside main content)

- Page title on the left (bold, large).
- Optional subtitle/description below title.
- Action buttons on the right (e.g., "Add Service", "Run Check").
- Separated from page content by a bottom border.

### Color System

| Semantic role | Color | Usage |
|---|---|---|
| Healthy / Success | Green (`#22c55e`) | Uptime, resolved status, healthy services |
| Degraded / Warning | Yellow (`#eab308`) | Partially failing, anomaly badges |
| Down / Error | Red (`#ef4444`) | Down services, active incidents |
| Anomaly / Insight | Purple (`#a855f7`) | Anomaly type labels, insight panels |
| Neutral | Muted gray | Timestamps, secondary labels, dividers |

All colors must work in both light and dark mode via CSS variables.

---

## 4. Page Specifications

---

### 4.1 Dashboard — "Mission Control"

**Route:** `/`  
**API:** `GET /api/dashboard/summary`  
**Purpose:** Instant system-wide awareness. The most important page. First impression = everything.

---

#### Section A — System Pulse Strip (top)

A horizontal strip of animated summary counters, always visible at the top of the page.

```
┌────────────┬──────────────┬──────────────┬──────────────┬────────────┐
│  Total     │  Active      │  Active      │  Healthy     │  Down      │
│  Services  │  Incidents   │  Anomalies   │  Services    │  Services  │
│  ──────    │  ──────      │  ──────      │  ──────      │  ──────    │
│    8       │    2 🔴      │    3 ⚠       │    5 🟢      │   1 🔴     │
└────────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

- Each counter animates from 0 on page load (count-up animation, ~600ms).
- Red and yellow cards have a subtle tinted background to draw attention.
- Clicking "Active Incidents" navigates to `/incidents` filtered to Active.
- Clicking "Active Anomalies" navigates to `/anomalies` filtered to Active.

---

#### Section B — Service Health Grid (middle)

Replace the boring table with a **card grid**. Each service gets its own card.

```
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ ● Orders API       │  │ ● Auth API         │  │ ● Payment API      │
│ Status: Healthy    │  │ Status: Down       │  │ Status: Degraded   │
│ Latency: 120ms     │  │ Latency: —         │  │ Latency: 450ms     │
│ Errors:  0.2%      │  │ Errors:  100%      │  │ Errors:  12%       │
│ Checked: 2s ago    │  │ Checked: 5s ago    │  │ Checked: 3s ago    │
│                    │  │ ⚠ Active Incident  │  │ ⚠ Anomaly          │
└────────────────────┘  └────────────────────┘  └────────────────────┘
```

**Card details:**
- Status dot in the title pulses (CSS animation) when status is Down.
- Card border color matches status — green border for healthy, red for down, yellow for degraded.
- "Active Incident" badge is clickable → goes to that incident's detail.
- "Anomaly" badge is clickable → goes to anomalies filtered to that service.
- Card hover: subtle lift shadow + a "View Details →" link appears at the bottom.
- Clicking the card navigates to `/services/:id`.
- Responsive grid: 1 column mobile, 2 tablet, 3-4 desktop.

---

#### Section C — Live Activity Feed (right panel, desktop only)

A vertical scrolling feed of recent events, newest at top. Auto-refreshes every 10 seconds.

```
┌─────────────────────────────────┐
│  Live Activity                  │
│  ─────────────────────────────  │
│  🔴 10:32:25                    │
│     Incident opened             │
│     Orders API · High severity  │
│                                 │
│  ⚠  10:32:21                    │
│     Latency spike detected      │
│     Auth API · +3.4× baseline   │
│                                 │
│  🟢 10:31:55                    │
│     Payment API recovered       │
│     Incident resolved           │
└─────────────────────────────────┘
```

- Each feed item is a row: icon + timestamp + title + subtitle.
- New items animate in from the top with a slide-down effect.
- Feed is scrollable with a max-height.
- "See all incidents →" link at the bottom.

*Note: Initial implementation can populate this from the incidents and anomalies API response. True real-time streaming is a future enhancement.*

---

#### Section D — Trend Charts (bottom)

Two charts side-by-side, using data from service metrics:

1. **Average Latency Over Time** — Line chart, all services, color-coded.
2. **Error Rate Over Time** — Area chart, shows when incidents spiked.

*Note: Chart data will require a time-series endpoint on the backend. Initial version can show a placeholder or use mock data to demonstrate the concept.*

---

### 4.2 Services Page — "Deep Dive"

**Route:** `/services`  
**API:** `GET /api/monitoredservices`  
**Purpose:** Full management of all monitored services.

---

#### Layout: Master-Detail (on desktop)

```
┌─────────────────────┬────────────────────────────────────┐
│  Service List       │  Service Detail Panel              │
│  (left, 320px)      │  (right, fills remaining space)    │
│                     │                                    │
│  + Add Service      │  [Selected service shown here]     │
│  ─────────────────  │                                    │
│  ● Orders API       │                                    │
│  ● Auth API 🔴      │                                    │
│  ● Payment API ⚠   │                                    │
└─────────────────────┴────────────────────────────────────┘
```

On mobile, list and detail are separate routes.

**Left panel — Service list:**
- Search bar at top to filter services by name.
- Each row: status dot + name + status badge.
- Active selection is highlighted.
- "Add Service" button opens the form as a slide-over panel (or navigates to `/services/new`).

---

#### Service Detail Panel

Shown when a service is selected. Contains multiple sections:

**Header:**
```
Orders API                              [Edit] [Run Check] [Delete]
https://api.example.com/health
● Down  ·  Since 10:28 AM  ·  12 minutes ago
```

**Metrics bar (5 big numbers):**
```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Uptime   │ Avg      │ P95      │ P99      │ Error    │
│ 92.3%    │ 145ms    │ 340ms    │ 620ms    │ 8.4%     │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

- P95 and P99 highlighted with a subtle warning color if they exceed 2× the average.
- Error rate shown in red if above 5%.

**Latency Chart:**
- Line chart showing latency over the last 24 hours.
- X-axis: time. Y-axis: milliseconds.
- Hover tooltip shows exact timestamp + value.
- Horizontal dashed line at the P95 value as a reference line.
- Red zones on the X-axis where incidents were active.

**Configuration panel (collapsible):**
- Base URL, health endpoint, check interval, timeout, active status.
- "Edit" button opens inline editing.

**Active Issues panel:**
- If the service has an active incident: a red callout card linking to `/incidents/:id`.
- If the service has active anomalies: amber callout cards, one per anomaly.

---

#### Service Form (Add / Edit)

Accessed via `/services/new` or `/services/:id/edit`. Clean, focused form:

| Field | Input type | Validation |
|---|---|---|
| Name | Text | Required, max 100 chars |
| Base URL | URL | Required, valid URL format |
| Health Endpoint | Text | Required, must start with `/` |
| Check Interval | Number | Required, min 5 seconds |
| Timeout | Number | Required, min 1 second, max < interval |
| Active | Toggle/Checkbox | Default: true |

- "Save" button shows loading spinner while the API request is in flight.
- On success: redirect to the service detail page.
- On error: show inline error message below the form.

---

### 4.3 Incidents Page — "Root Cause Intelligence"

**Route:** `/incidents`  
**API:** `GET /api/incidents`  
**Purpose:** Timeline of all outages with deep drill-down into root causes.

---

#### Layout: Timeline List

```
┌──────────────────────────────────────────────────────────┐
│  Incidents                    [Filter: All / Active / Resolved] │
│  ──────────────────────────────────────────              │
│  🔴 Orders API Down                        High          │
│     Started 10:28 AM · 12 min ago · 5 failures           │
│     ⚠ Probable cause: Auth API failure                   │
│                                                          │
│  🟡 Auth API Degraded                      Medium        │
│     Started 10:27 AM · 13 min ago · 3 failures           │
│     ✅ No upstream correlation found                     │
└──────────────────────────────────────────────────────────┘
```

- Filter tabs at the top: All / Active / Resolved.
- Each row is clickable → expands to full detail OR navigates to `/incidents/:id`.
- Severity badge color: High = red, Medium = yellow, Low = blue.
- Status badge: Active = red pulsing dot, Resolved = green.
- "Probable cause" line shown when correlations exist for the incident.

---

#### Incident Detail Page (`/incidents/:id`)

The most technically impressive page. Combines:
`GET /api/incidents/{id}` + `GET /api/incidents/{id}/correlations`

**Header:**
```
Incident #14 — Orders API Down
🔴 Active · High Severity · 12 minutes
Reason: 5 consecutive health check failures
```

**Timeline section:**
A vertical timeline showing the sequence of events:
```
10:27:00  ─── Auth API: First failure detected
10:27:30  ─── Auth API: Consecutive failures (2/3)
10:28:00  ─── Auth API: Incident opened (3+ failures)
10:28:05  ─── Orders API: First failure detected
10:28:30  ─── Orders API: Incident opened
```

---

**Correlation Graph (the feature that wins):**

A visual dependency graph rendered using SVG or a simple layout algorithm:

```
     ┌──────────────┐
     │   Auth API   │  ← Root cause (upstream)
     │  🔴 Down     │
     └──────┬───────┘
            │ Caused (Confidence: 87%)
            ▼
     ┌──────────────┐
     │  Orders API  │  ← Impacted (downstream)
     │  🔴 Down     │
     └──────────────┘
```

- Each node in the graph is a service box: name + status.
- Edges show confidence score as a percentage label on the arrow.
- Higher confidence = thicker/brighter edge.
- Clicking a node navigates to that service's detail page.
- If no correlations: show "No upstream dependencies identified. This appears to be an independent failure."

**Correlation table (below graph):**

| Upstream Service | Upstream Incident | Confidence | Time difference |
|---|---|---|---|
| Auth API | #12 | 87% | 28 seconds |

Confidence bar rendered as a thin progress bar.

---

### 4.4 Anomalies Page — "Pattern Detection"

**Route:** `/anomalies`  
**API:** `GET /api/anomalies`  
**Purpose:** Show detected performance degradations grouped by type.

---

#### Layout: Grouped Cards

Anomalies are grouped into three sections based on their type:

**Latency Spikes**
**Error Rate Spikes**
**Consecutive Failures**

Each group has a header with a count badge and collapses if empty.

---

#### Anomaly Card

```
┌───────────────────────────────────────┐
│  ⚠ Orders API                         │
│  Latency Spike · Active               │
│                                       │
│  Current:   500ms                     │
│  Baseline:  120ms                     │
│  Deviation: +4.2×                     │
│                                       │
│  Detected: 10:32 AM · 8 minutes ago   │
└───────────────────────────────────────┘
```

- Card border color: purple for anomalies (distinct from red/yellow of incidents).
- "Deviation" is the most important number — display it large and bold.
- Active anomalies have a subtle pulsing border or glow.
- Resolved anomalies are visually muted (reduced opacity).
- Clicking the service name navigates to `/services/:id`.

---

#### Anomaly Insight line

Below the deviation, add one auto-generated insight sentence:

- Latency Spike: *"Response time is 4.2× above the recent baseline. This may indicate a dependency bottleneck or resource exhaustion."*
- Error Rate Spike: *"Error rate has risen sharply above baseline. Check for upstream dependency failures or recent deployments."*
- Consecutive Failures: *"Health checks are failing in sequence. The service may be unreachable or the health endpoint is misconfigured."*

This makes the anomaly card feel intelligent, not just data.

---

### 4.5 Insights Page — "The Differentiator"

**Route:** `/insights`  
**API:** Aggregates from multiple endpoints.  
**Purpose:** Auto-generated intelligence. Turns raw data into conclusions.

This page is what elevates CodePulse from "monitoring tool" to "intelligence platform."

---

#### Section A — System Health Score

A single large number at the top:

```
System Health Score

  87 / 100
  ─────────
  ● 6 services healthy
  ● 1 active incident
  ● 2 active anomalies
```

Score calculation (frontend only, derived from dashboard summary):
- Start at 100.
- −10 per active High-severity incident.
- −5 per active Medium-severity incident.
- −2 per active Low-severity incident.
- −3 per active anomaly.
- Clamp at 0.

Color: Green ≥80, Yellow 50–79, Red <50.

---

#### Section B — Most Problematic Services

Ranked list of services with the most incidents or anomalies:

```
🏆 Top Issues

  1. Auth API        → 3 incidents, 2 anomalies
  2. Orders API      → 2 incidents, 1 anomaly
  3. Payment API     → 0 incidents, 2 anomalies
```

Clicking a service goes to its detail page.

---

#### Section C — Root Cause Champion

Which single service is the upstream root cause of the most downstream incidents?

```
⚠ Root Cause Alert

  Auth API is the upstream source
  for 2 out of 3 active incidents.

  Fixing Auth API may resolve cascading failures.
```

This is derived from the correlation data — find the service that appears most as `upstreamServiceId`.

---

#### Section D — Dependency Map

A full system dependency graph showing all `ServiceDependency` relationships.

```
Auth API ──────┐
               ├──▶ Orders API
Payment API ───┘         │
                         └──▶ Notifications API
```

- Healthy services: green nodes.
- Degraded: yellow nodes.
- Down: red nodes.
- Clicking any node opens the service detail.
- This is a static layout (not force-directed) for simplicity — or can be SVG-based.

---

#### Section E — Anomaly Frequency Summary

```
In the last 24 hours:
  · 4 Latency Spikes
  · 1 Error Rate Spike
  · 2 Consecutive Failure streaks

Most affected: Orders API (3 anomalies)
```

---

### 4.6 Setup Page — "Control Panel"

**Route:** `/setup`  
**API:** `POST /api/setup/reset`  
**Purpose:** Developer utilities. Simple but important for demos and testing.

---

#### Layout

```
Setup & Developer Tools
───────────────────────

⚠ Database Reset
  Wipe all data and reseed with sample services.
  This cannot be undone.
  [Reset Database]

ℹ Backend Connection
  API URL: http://localhost:5084/api
  Status: ● Connected
```

- "Reset Database" button requires a confirmation dialog: *"This will delete all monitoring data. Are you sure?"*
- Connection status checks if the dashboard summary API returns successfully.
- Useful for demos: instantly reset and show fresh data.

---

## 5. Design System

### Typography

| Role | Size | Weight |
|---|---|---|
| Page title | 20px | Semibold (600) |
| Section heading | 14px | Semibold (600) |
| Body text | 14px | Regular (400) |
| Labels / metadata | 12px | Regular (400) |
| Monospace (IDs, URLs) | 12px | Mono font |

Font: **Geist Variable** (already configured).

---

### Component Library

All interactive components use shadcn/ui primitives (Radix-based). Do not build custom dropdowns, modals, or tooltips from scratch.

| Component | Used for |
|---|---|
| `Button` | All CTAs and actions |
| `Badge` | Status labels, severity |
| `Card` | Service cards, anomaly cards |
| `Dialog` | Confirmation prompts |
| `Tooltip` | Chart hover data, truncated text |
| `Skeleton` | Loading states |
| `Table` | Dense list data |
| `Tabs` | Filter controls (All/Active/Resolved) |

---

### Status Badge Spec

| Status | Background | Text | Dot |
|---|---|---|---|
| Healthy | Green-100 | Green-800 | bg-green-500 |
| Degraded | Yellow-100 | Yellow-800 | bg-yellow-500 |
| Down | Red-100 | Red-800 | bg-red-500 pulse |
| Active (incident) | Red-100 | Red-800 | bg-red-500 pulse |
| Resolved | Green-100 | Green-800 | bg-green-500 |
| Low (severity) | Blue-100 | Blue-800 | — |
| Medium | Yellow-100 | Yellow-800 | — |
| High | Red-100 | Red-800 | — |

---

### Loading States

Every data-fetching component must handle three states:

1. **Loading** — Skeleton placeholder that matches the shape of real content. Never show a spinner in the center of the page.
2. **Error** — A dismissible error callout with the error message and a "Retry" button.
3. **Empty** — A friendly empty state with an icon and a call to action (e.g., "No services yet. Add one →").

---

### Micro-interactions

| Interaction | Implementation |
|---|---|
| Status dot on "Down" services | CSS `animate-pulse` on the dot |
| Dashboard counter values | Count-up animation on mount (use a simple useEffect with requestAnimationFrame) |
| Card hover | `transition-shadow` + slight translate-up on hover |
| New feed items | Slide-in from top (`@keyframes slideDown`) |
| Run Check button | Spins icon while loading (`animate-spin`) |
| Form save button | Disabled + shows "Saving…" text |
| Route transitions | Subtle fade-in (`animate-fade-in` on page mount) |

---

## 6. API Integration Map

### Per-page API calls

| Page | API Calls | Refresh |
|---|---|---|
| Dashboard | `GET /dashboard/summary` | Every 15s (auto-poll) |
| Services list | `GET /monitoredservices` | On mount + after mutations |
| Service detail | `GET /monitoredservices/:id` + `GET /monitoredservices/:id/metrics` | On mount |
| Service form | `GET /monitoredservices/:id` (edit mode) | On mount |
| Incidents list | `GET /incidents` | On mount |
| Incident detail | `GET /incidents/:id` + `GET /incidents/:id/correlations` | On mount |
| Anomalies | `GET /anomalies` | On mount |
| Insights | `GET /dashboard/summary` + `GET /incidents` + `GET /anomalies` | On mount |
| Setup | `GET /dashboard/summary` (connection check) | On mount |

### API Base URL

Currently hardcoded to `http://localhost:5084/api`. This should be extracted into an environment variable:

```
VITE_API_BASE_URL=http://localhost:5084/api
```

---

## 7. Backend Changes Required

The following gaps were identified between the current backend and what the frontend needs:

| Needed | Current Status | Priority |
|---|---|---|
| `DashboardSummary` includes per-service `hasActiveIncident`, `hasActiveAnomaly`, `latestResponseMs`, `healthStatus` | Updated by user — confirmed ✅ | Done |
| Service-level latency chart data (time-series) | Not implemented | Medium |
| Live activity feed events (combined incidents + anomalies sorted by time) | Can be composed on frontend | Low |
| Dependency map data (`GET /api/services/dependencies`) | Not implemented | Medium |

---

## 8. Implementation Order

Build in this order to always have a working, demo-able state:

| Phase | What to build | Value unlocked |
|---|---|---|
| **1 — Foundation** | Layout shell, routing, API layer, design tokens | App navigates correctly |
| **2 — Dashboard** | System pulse strip, service cards, stat counters | Instant wow factor |
| **3 — Services** | List, detail (metrics), form (CRUD) | Core functionality complete |
| **4 — Incidents** | List + detail with correlation graph | Key differentiator visible |
| **5 — Anomalies** | Grouped cards with insight lines | Smart feel |
| **6 — Insights** | Health score, root cause, dependency map | Full intelligence layer |
| **7 — Polish** | Skeleton loaders, animations, empty states, error handling | Production feel |
| **8 — Setup** | Reset page, connection indicator | Demo-ready |

> Phases 1–3 are already complete. Work resumes at Phase 4 onward.

---

## 9. Open Questions / Decisions Pending

1. **Charts library** — No chart library is currently installed. Candidates: `recharts` (easiest), `chart.js` via `react-chartjs-2`, or `@visx/visx` (most customizable). Recommend **Recharts** for speed.

2. **Correlation graph renderer** — The incident correlation graph can be done with:
   - Plain SVG (full control, no dependency)
   - `react-flow` (drag-and-drop graph library, most impressive)
   - Manual CSS flexbox (simple but limited)
   Recommend **react-flow** for the visual impact.

3. **Auto-polling** — Dashboard auto-refreshes every 15s via `setInterval`. Should this be configurable in the UI? Recommend a "Refresh: Live / Off" toggle in the top bar.

4. **Mobile support** — Current design is desktop-first. The master-detail layout on Services degrades to stacked navigation on small screens. Needs verification.

---

*This document is the single source of truth for frontend design decisions. All implementation sessions should reference this spec before writing code.*
