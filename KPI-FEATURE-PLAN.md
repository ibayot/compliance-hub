# KPI Monitoring & Dashboard Plan (For Validation)

## 1) Objective

Introduce a KPI module that lets Compliance Officers encode periodic KPI data, computes normalized scores, and presents role-based dashboards:

- Focal: sees only own unit KPIs
- Compliance Officer (Reviewer): sees all units
- Section Head: sees all units (same visibility as Compliance Officer)
- Super Admin: full admin visibility and configuration

This design extends the current app without breaking existing Metrics/Document scoring.

---

## 2) Core Functional Scope

### A. KPI Master
Master list of KPIs with targets and weights.

Fields:
- `code` (unique)
- `name`
- `description`
- `category` (Compliance, Timeliness, Quality, etc.)
- `unit_of_measure` (% / count / ratio / hours)
- `direction` (`higher_is_better` | `lower_is_better`)
- `target_value`
- `min_value` / `max_value` (optional clamps)
- `weight` (for weighted score)
- `frequency` (`monthly` default)
- `active`

### B. KPI Monitoring (Data Input)
Monthly/periodic entry screen where Compliance Officers input actual KPI values by unit.

Fields:
- `kpi_master_id`
- `unit_id`
- `period_year`
- `period_month`
- `actual_value`
- `remarks` (optional)
- `entered_by`
- `submitted_at`
- `status` (`draft` | `submitted` | `locked`)

### C. Score Calculation Engine
Compute normalized KPI scores per unit and period.

### D. KPI Dashboard
Visual KPI summary with role-based visibility and unit constraints.

### E. Lookup Tables
- KPI categories
- Threshold bands
- Scoring rules (global defaults + per-KPI override)

---

## 3) Proposed Scoring Logic (Simple & Auditable)

### Per-KPI Normalized Score (0 to 100)

For `higher_is_better`:

$$
raw = \frac{actual}{target} \times 100
$$

For `lower_is_better`:

$$
raw = \frac{target}{actual} \times 100
$$

Then clamp:

$$
normalized = \min(100, \max(0, raw))
$$

### Weighted Score Contribution

$$
weighted = normalized \times \frac{weight}{\sum weight}
$$

### Unit Composite KPI Score

$$
unit\_score = \sum weighted
$$

### Status Banding (default)
- Green: `>= 90`
- Amber: `>= 75 and < 90`
- Red: `< 75`

This keeps logic explainable and easy to QA.

---

## 4) Role Visibility Matrix

| Role | KPI Master | KPI Input | KPI Dashboard | Scope |
|---|---|---|---|---|
| Super Admin | Full CRUD | Full CRUD | Full | All units |
| Reviewer (Compliance Officer) | View + Edit (as approved) | Create/Edit/Submit | Full | All units |
| Section Head | View | Optional Approve/Lock | Full | All units |
| Focal | View assigned KPI list | Optional draft assist | View only | Assigned unit(s) |
| Technician/Auditor | View only (optional) | No | Limited/none | Assigned/defined |

---

## 5) Backend Plan (NestJS + TypeORM)

### New Entities
1. `kpi_master`
2. `kpi_input`
3. `kpi_score`
4. `kpi_threshold`
5. `kpi_scoring_rule`

### New Module
- `backend/src/modules/kpi/`
  - `kpi.module.ts`
  - `controllers/kpi-master.controller.ts`
  - `controllers/kpi-input.controller.ts`
  - `controllers/kpi-dashboard.controller.ts`
  - `services/kpi-master.service.ts`
  - `services/kpi-input.service.ts`
  - `services/kpi-score.service.ts`
  - `entities/*.entity.ts`
  - `dto/*.dto.ts`

### API Endpoints
- `GET /kpi/master`
- `POST /kpi/master`
- `PATCH /kpi/master/:id`
- `GET /kpi/input?year=&month=&unit_id=`
- `POST /kpi/input`
- `PATCH /kpi/input/:id`
- `POST /kpi/input/:id/submit`
- `POST /kpi/input/:id/lock` (Section Head/Super Admin)
- `GET /kpi/dashboard/summary?year=&month=`
- `GET /kpi/dashboard/unit/:unitId?year=&month=`
- `GET /kpi/dashboard/trend?unit_id=&kpi_id=&months=`

### Access Control
Use existing JWT + roles guard; enforce unit filtering server-side for focal users.

---

## 6) Frontend Plan (Vite + React + MUI)

### New Pages
- `frontend/src/app/dashboard/kpi/master/page.tsx`
- `frontend/src/app/dashboard/kpi/monitoring/page.tsx`
- `frontend/src/app/dashboard/kpi/dashboard/page.tsx`

### New API Clients
- `frontend/src/lib/api/kpi.ts`

### UI Behavior
- KPI Master: table + create/edit dialogs
- KPI Monitoring: monthly grid entry (units x KPI list), submit/lock actions
- KPI Dashboard:
  - Summary cards (overall score, on-track KPIs, at-risk KPIs)
  - Unit leaderboard (for all-unit roles)
  - Trend chart per KPI per unit
  - Unit filter disabled/hidden for focal users (auto scoped)

---

## 7) Integration With Current App

- Reuse existing `units` table and user-unit mapping.
- Reuse existing role model and guards.
- Keep existing `metrics` module separate (document quality checks).
- Add KPI feature as a parallel business-performance module.

---

## 8) Delivery Phases

### Phase 1 (MVP)
1. KPI Master CRUD
2. KPI Monitoring input + submit
3. Score calculation job/service
4. Basic dashboard (cards + table)
5. Role/unit visibility enforcement

### Phase 2
1. Lock/approval workflow
2. Trend charts and drill-downs
3. Threshold admin and scoring-rule overrides

### Phase 3
1. Export (Excel/PDF)
2. Historical comparisons and benchmarks
3. Notifications for missing/late KPI submissions

---

## 9) Acceptance Criteria (MVP)

1. Compliance Officer can enter monthly KPI actuals per unit.
2. Focal user can only view dashboard data for assigned unit(s).
3. Reviewer/Section Head can view consolidated all-unit KPI dashboard.
4. Scores are reproducible from stored target/actual/weight.
5. Dashboard updates when monitoring data is submitted.
6. Unauthorized roles cannot edit KPI master or all-unit records.

---

## 10) Open Validation Questions

1. Should Focal users be allowed to encode draft KPI data, or strictly Compliance Officer only?
2. Should Section Head be approval-only, or full editor for KPI input?
3. Do you want one global scoring rule for all KPIs, or per-KPI rule overrides from day 1?
4. Should KPI dashboard be monthly only in MVP, or month + quarter rollup?
5. Preferred first KPI categories and initial KPI list count for seed data?
