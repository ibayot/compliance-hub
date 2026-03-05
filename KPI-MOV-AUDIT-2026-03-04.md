# KPI Requirement-to-App Audit (MoV + Quality Parameters)

Date: 2026-03-04  
Branch: `audit/kpi-mov-gap-assessment-2026-03-04`

## 1) Scope and Method

This audit is a **read-only assessment** of the current Compliance Hub implementation against the KPI table provided (Core Functions 70%), specifically:

1. Means of Verification (MoV) per KRA
2. Success Indicators (SI)
3. Efficiency (deadline/timeliness parameters)
4. Quality-column parameters (completeness + correctness thresholds)

Evidence sources used:

- Backend modules/entities/controllers/services
- Frontend pages and API clients
- Database schema and seeded behavior
- Existing project documentation and user manual content

No application code was changed in this stage.

---

## 2) Executive Summary

Overall, the app has **strong foundations** for:

- ICT legal/regulatory register management (Issuances)
- KPI monitoring and scorecard visualization
- ICT document inventory/review workflow

However, there are major gaps in the specific KPI requirements around:

- **deadline-based efficiency tracking** (on-time, 3/7/15/21+ late bands)
- **formal assessment artifacts workflow** (Assessment Plan/Schedule/Report/Checklist with owner acknowledgment)
- **action-plan and recommendation accountability** tied to process owners
- **quality-threshold scoring** aligned exactly to your KPI quality column

Result: **Partial alignment** to your KPI framework; the app is usable as a base but not yet fully auditable against your exact MoV and quality rubric.

---

## 3) KRA-by-KRA Audit Matrix

## KRA 1: Monitor and assess ICT systems/processes for legal-regulatory compliance

### Required MoV

1. Register of Legal/Regulatory Requirements for Information Security  
2. Legal Compliance Monitoring

### Current Coverage

**Implemented (Strong):**

- Issuances registry exists with rich legal metadata: issuance number, authority, category/type, effectivity, active/inactive, amendment linkage, ICT relevance notes.
- Mapping of compliant documents to issuances exists (many-to-many evidence traceability).
- Frontend includes filters, status handling, relevance modal, and attachment support.

**Evidence:**

- `backend/src/modules/references/entities/issuance.entity.ts`
- `backend/src/modules/references/controllers/issuance.controller.ts`
- `backend/src/modules/references/services/issuance.service.ts`
- `backend/src/database/schema.sql` (`issuances`, `document_issuances`)
- `frontend/src/app/dashboard/issuances/page.tsx`

### SI / E / Quality Fit

- SI (100% legal/regulatory requirements identified/documented): **Partially met** (register is present; completeness governance not system-enforced).
- E (update timeliness bands): **Not met** (no native tracking for on-time vs 3/7/15/21+ late update capture).
- Quality (percent-complete + accurate ICT impact/compliance implications): **Partially met** (fields exist for applicability/relevance, but no quality scoring engine against your threshold rubric).

### Audit Verdict

**Partial** — strong register foundation, missing KPI-grade timeliness and quality scoring controls.

---

## KRA 2: Plan and execute regular assessments for compliance and quality in ICT operations

### Required MoV

1. Assessment Plan  
2. Assessment Schedule  
3. Assessment Report  
4. Assessment Checklist

### Current Coverage

**Implemented (Limited/Indirect):**

- Generic document and reportorial document-type structures can store assessment-related files if manually configured.
- Reviews module supports manual compliance tagging and remarks.

**Not Implemented (Directly):**

- No dedicated assessment module/workflow with first-class entities for Plan/Schedule/Report/Checklist.
- No process-owner acknowledgment workflow for action plans.
- No semester-based assessment completion tracker.

**Evidence:**

- `backend/src/modules/documents/entities/reportorial-document-type.entity.ts`
- `backend/src/modules/documents/services/reportorial-doc-type.service.ts`
- `backend/src/modules/reviews/controllers/review.controller.ts`
- `backend/src/modules/reviews/services/review.service.ts`
- Targeted code search returned no implemented symbols for assessment plan/schedule/checklist workflow.

### SI / E / Quality Fit

- SI (100% scheduled assessments + formal action plans acknowledged): **Not met**.
- E (assessment timeliness bands): **Not met**.
- Quality (% of complete/verified/acknowledged plans/reports/action plans): **Not met**.

### Audit Verdict

**Low alignment** — framework can store artifacts, but required assessment governance workflow is absent.

---

## KRA 3: Monitor/analyze ICT KPIs and provide scorecards + recommendations

### Required MoV

1. Consolidated ICT KPI monitoring  
2. KPI scorecard

### Current Coverage

**Implemented (Strong):**

- Full KPI module with master, monitoring, thresholds/scoring rules, summary dashboard, unit drill-down, and time-series.
- Reports page includes KPI sections and “KPIs Requiring Attention” output.
- Role-scoped access and unit scoping are implemented.

**Evidence:**

- `backend/src/modules/kpi/controllers/kpi.controller.ts`
- `backend/src/modules/kpi/services/kpi.service.ts`
- `backend/src/modules/kpi/entities/*`
- `backend/src/database/schema.sql` (`kpi_master`, `kpi_monitoring`, `kpi_thresholds`, `kpi_scoring_rules`)
- `frontend/src/app/dashboard/kpi/page.tsx`
- `frontend/src/app/dashboard/reports/page.tsx`

### SI / E / Quality Fit

- SI (100% KPIs monitored/analyzed with consolidated scorecards): **Mostly met**.
- SI add-on (recommendation action plans to process owners): **Partially met** (attention list exists, but no explicit action-plan lifecycle and owner acknowledgment records).
- E (KPI timeliness bands): **Not met** (no on-time vs 3/7/15/21+ analysis for KPI completion/analysis cycle).
- Quality (scorecards + action plans clearly identifying gaps and specific recommendations): **Partially met** (gaps are identifiable; explicit recommendation authoring/tracking is not a dedicated feature).

### Audit Verdict

**Moderate-to-high alignment** for scorecarding, with governance/action-plan gaps.

---

## KRA 4: Ensure regular review/evaluation of ICT policies, procedures, and compliance documents

### Required MoV

1. Inventory list of ICT documents  
2. Document review report

### Current Coverage

**Implemented (Strong Foundation):**

- Documents module and repository provide inventory-like listing and filtering.
- Reviews module provides review history and evidence report endpoint.
- Pending-vs-ready queue split is in place.

**Evidence:**

- `backend/src/modules/documents/controllers/document.controller.ts`
- `backend/src/modules/documents/entities/document.entity.ts`
- `frontend/src/app/dashboard/documents/page.tsx`
- `frontend/src/app/dashboard/reviews/page.tsx`
- `frontend/src/app/dashboard/repository/page.tsx`
- `backend/src/modules/reviews/controllers/review.controller.ts` (`evidence-report`)

### SI / E / Quality Fit

- SI (100% policies/procedures inventoried + formal evaluation report): **Partially met** (inventory and review records exist; formal periodic relevance-validity report workflow is not explicit).
- E (review timeliness bands): **Not met**.
- Quality (inventory accuracy + comprehensive review report): **Partially met** (core evidence exists, but no explicit quality scoring against KPI thresholds).

### Audit Verdict

**Partial** — operational inventory/review exists, KPI-grade reporting controls are incomplete.

---

## 4) Quality-Column Parameter Assessment (Cross-Cutting)

Your quality column repeatedly requires percentage-based quality attainment (e.g., 100%, 80–99%, etc.) tied to completeness and correctness of outputs.

### Current State

- The app computes KPI scores for performance metrics and tracks document/review states.
- The app does **not yet implement a dedicated quality rubric engine** for your KRA artifacts (regulatory updates, assessments, action plans, review reports) with categorical scoring bands exactly matching your KPI table.

### Implication

The system can generate operational evidence, but it cannot yet produce your **exact KPI quality-grade outputs** without additional feature work.

---

## 5) Gap List (Action-Planning Input)

Priority-ordered gaps to close for full KPI alignment:

1. **Timeliness Tracker Engine** for all 4 KRAs
   - Capture due date, completion date, delay days
   - Auto-bucket into on-time / 3 / 7 / 15 / 21+ days late

2. **Assessment Governance Module**
   - First-class entities: Assessment Plan, Schedule, Report, Checklist, Action Plan
   - Process-owner acknowledgment and evidence attachment

3. **Legal Compliance Monitoring Layer**
   - Periodic review workflow over issuance register
   - Structured impact/implication fields with approval state

4. **Recommendation & Action Plan Workflow for KPI gaps**
   - Generate and track recommendations per KPI gap
   - Assign owner, target date, status, acknowledgment

5. **KPI Quality Rubric Scoring (your exact thresholds)**
   - Compute 100 / 80–99 / 60–79 / 40–59 / <40 style quality attainment for each KRA artifact family

6. **Formal Review Report Builder for ICT documents**
   - Relevance/validity report template with completeness checks

---

## 6) Suggested Planning Baseline (No-Code Stage)

To proceed safely in the next implementation stage:

1. Confirm canonical data model per KRA (entities + required fields + ownership).
2. Define a shared Timeliness + Quality scoring service reusable across modules.
3. Implement in thin vertical slices by KRA (starting with KRA 1 and KRA 2 gaps).
4. Add dashboard/report pages that expose MoV outputs exactly as evidence artifacts.
5. Add test scenarios mapped to each KPI quality band and efficiency threshold.

---

## 7) Overall Audit Conclusion

The app already contains a robust compliance platform and a mature KPI dashboard capability, but against your exact KPI table:

- **Fully aligned areas:** partial only (none fully complete across SI+E+Q+MoV end-to-end).
- **Most mature area:** KRA 3 (KPI monitoring/scorecard).
- **Largest gap area:** KRA 2 (assessment lifecycle artifacts and acknowledgment governance).
- **Common blocker across all KRAs:** absence of explicit efficiency/timeliness and quality-rubric engines tied to your KPI thresholds.

This means we now have a clear, evidence-backed baseline for planning the fix set in the next stage.

---

## 8) Addendum: Quality-First Clarifications (2026-03-04)

This addendum supersedes parts of the earlier framing for this stage:

- **Efficiency (E) is out of scope for this pass** based on your latest direction.
- The focus is now: **Do we have complete and usable MoVs, on a quarterly reporting cadence, with sufficient quality evidence?**
- This remains a **no-code stage** (documentation/planning only).

### A) Register of Legal, Regulatory Requirements for Information Security

#### Position on scope (your concern)

Your interpretation is correct.

If the KPI states **industry standards, regulations, and applicable requirements**, then the register should not be limited to laws/IRR/memorandum circulars/administrative orders only. It should include, where applicable to your institution and mandate:

- Laws and IRRs
- Administrative issuances (MC/AO/DC/department orders)
- Executive issuances (e.g., EO)
- National strategies/plans with compliance implications (e.g., NCSP 2023-2028)
- Standards/frameworks adopted as institutional baseline (e.g., ISO/IEC 27001 family, NIST CSF)
- Contractual or donor/audit-imposed requirements (if binding to your operations)

Recommended handling for audit defensibility:

- Add a **Binding Nature** field (`mandatory`, `adopted policy baseline`, `guidance/reference`).
- Add **Adoption Basis** (e.g., board/management directive, policy memo, risk committee resolution).

This avoids mixing legal force and management-adopted standards while preserving full ICT compliance context.

#### Recommended register table (improved)

Your current/observed fields are useful but incomplete for audit traceability. Recommended columns:

| Column | Purpose |
|---|---|
| Item No. | Stable tracking ID |
| Requirement ID/Code | Short code for cross-reference |
| Title | Requirement title |
| Requirement Family | Law / Regulation / Executive Issuance / Standard / Plan / Contractual |
| Issuing Entity | Authority/source |
| Date Issued | Baseline date |
| Effectivity/Review Date | Validity window |
| Applicable Provisions | Specific clauses/sections |
| **Applicability Scope** | National / Regional / Unit / Process scope |
| **Relevance Notes** | Why this applies to ICT operations |
| Compliance Obligations | What must be done |
| Required Evidence (MoV) | Evidence artifact list |
| Evidence Location/Link | Where evidence can be retrieved |
| Process Owner | Accountable office/person |
| Frequency/Cadence | Quarterly/annual/event-driven checks |
| Current Compliance Status | Compliant / Partial / Gap |
| Gap Summary | What is missing |
| Action Required | Corrective action needed |
| Target Date | Due date for closure |
| Last Review Date | Latest validation |
| Next Review Date | Scheduled reassessment |
| Binding Nature | Mandatory / Adopted baseline / Guidance |
| Adoption Basis | Policy memo/resolution reference |
| Remarks | Notes |

The app already supports key parts of this model through issuance metadata plus applicability/relevance fields; this structure provides a complete reporting-ready governance table.

### B) Assessment MoVs (Year 1 baseline + succeeding-year pattern)

Your Year 1 flow is strong and should be retained. Below is a structured version that can be tracked quarterly.

#### Year 1 Assessment Plan (recommended phases)

1. **Context & Governance Foundation**
   - Process identification by unit
   - Process documentation standards
   - Stakeholder mapping and RACI assignment
2. **Risk Baseline Establishment**
   - Technical, operational, compliance risk analysis
   - Risk mapping to ISO/IEC 27001 and internal QMS requirements
   - Risk register + scoring methodology
3. **Treatment & Capability Build**
   - Risk treatment plan
   - Initial controls and corrective actions
   - Awareness/training execution
4. **Validation & Audit Readiness**
   - Pilot audits/SOP validation
   - Effectiveness monitoring of risk treatment
   - Documentation adjustment for formal audit readiness

#### Succeeding years (simple maturity cycle)

- **Year 2:** Control optimization + evidence completeness hardening
- **Year 3:** Integration and automation of recurring controls/reports
- **Year 4+:** Continuous improvement, benchmark calibration, and resilience exercises

### C) Assessment Schedule (roadmap/Gantt approach)

Your point is correct: KPI monitoring frequency is not automatically the same as full assessment scheduling.

Recommended scheduling layers:

- **Quarterly:** KPI monitoring + MoV evidence consolidation
- **Semiannual:** Formal assessment execution checkpoints
- **Annual:** Comprehensive assessment report + next-cycle baseline refresh

A roadmap/Gantt representation is appropriate and recommended for management visibility.

### D) Assessment Report + Checklist

Your interpretation is correct: report should be based on **Plan + Schedule + Checklist + Evidence**.

Minimum Assessment Report sections:

1. Scope/objectives
2. Method and period covered
3. Plan execution summary (what was scheduled vs completed)
4. Checklist results and conformity rates
5. Key findings (technical/operational/compliance)
6. Risk and control effectiveness summary
7. Corrective/preventive action plan (owner, timeline)
8. Management acknowledgment/sign-off

Checklist note:

- KPI monitoring items can serve as checklist seeds, but they should be expanded into control-verification checkpoints with explicit pass/fail evidence criteria.

### E) KPI MoVs (strength + enhancement)

Current stance remains accurate:

- Consolidated KPI monitoring and scorecards are strong.
- Recommendation/action planning can be enhanced through semi-automated suggestion generation from KPI status, trend, and keyword context.

For no-code planning, define recommendation templates by KPI band and common gap types first.

### F) Review MoVs (National + Regional) and Template

Your concern is valid. To support both scopes, use one report format with explicit scope segmentation.

#### Template: ICT Document Review Report

```markdown
# ICT Document Review Report

## A. Report Metadata
- Reporting Period:
- Date Prepared:
- Prepared By:
- Reviewed By:
- Approved By:

## B. Scope
- National Scope Coverage:
- Regional Scope Coverage:
- Units/Offices Included:
- Document Types Included:

## C. Inventory Summary
- Total Documents in Inventory:
- Documents Due for Review:
- Documents Reviewed:
- Documents Not Reviewed (with reason):

## D. Review Method
- Review Criteria Used:
- Standards/Requirements Referenced:
- Sampling or Full Review Approach:
- Evidence Sources:

## E. Findings Summary
### E1. National-Level Findings
- Conformities:
- Nonconformities:
- Observations:

### E2. Regional-Level Findings
- Conformities:
- Nonconformities:
- Observations:

## F. Relevance and Validity Assessment
- Documents still relevant:
- Documents requiring update:
- Documents for retirement/merging:

## G. Risk and Impact Notes
- High-risk gaps:
- Operational impact:
- Compliance impact:

## H. Action Plan
| Issue | Scope | Owner | Action | Due Date | Status |
|---|---|---|---|---|---|

## I. Evidence Register
| Evidence ID | Document/Artifact | Location | Reviewer Note |
|---|---|---|---|

## J. Conclusion and Sign-off
- Overall Conclusion:
- Management Acknowledgment:
- Date Signed:
```

### G) Quality Column (operational interpretation for your workflow)

Per your direction, the system focus should be:

- Ensure complete MoV packages are assembled before quarterly deadlines.
- Preserve traceability from requirement → evidence → finding → action.
- Use quality thresholds as reporting judgment criteria, not necessarily as app auto-scoring logic in this stage.

### H) Readiness Summary (this stage)

- Register direction: **Aligned with your interpretation** (include ISO/NIST/EO/NCSP as applicable with binding/adoption clarity).
- Assessment artifacts: **Needs formal templates and annual roadmap discipline** (now documented above).
- KPI MoV: **Strong baseline** with optional recommendation-automation planning.
- Review MoV: **Template now provided** for national/regional reporting.

This addendum is the operative QA source for planning the next implementation stage.
