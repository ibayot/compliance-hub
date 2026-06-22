'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import type { RoleCapabilityRecord } from '@/lib/api/users';



type ManualItem = {
  title: string;
  description: string;
  
  path: string;
  details: {
    purpose: string;
    inputs: Array<{ field: string; explanation: string }>;
    outputs: Array<{ field: string; explanation: string }>;
  };
  accessOnlyDetails?: {
    purpose: string;
    inputs: Array<{ field: string; explanation: string }>;
    outputs: Array<{ field: string; explanation: string }>;
  };
  managementCapabilityKey?: keyof RoleCapabilityRecord;
};

const manualItems: ManualItem[] = [
  {
    title: 'Documents Upload and Tracking',
    description:
      'Upload DOCX and track only pending-for-review submissions in the Documents work queue.',
    
    path: '/dashboard/documents',
    details: {
      purpose:
        'Store compliance documents (policies, procedures, guidelines, manuals), automatically extract their text and structured preview, and maintain a full version history so reviewers and auditors can trace every revision.',
      inputs: [
        {
          field: 'Title',
          explanation:
            'The official document name. This is the primary identifier shown in all document lists, review queues, and issuance mapping screens. Use the full formal title (e.g., "ICT Security Policy v3.0") so staff can identify the document at a glance without opening it.',
        },
        {
          field: 'Document Type',
          explanation:
            'Classifies the document into a compliance category: Policy, Procedure, Guideline, Manual, Report, or Circular. This classification controls which metric templates are automatically applied during extraction and which review workflows are triggered.',
        },
        {
          field: 'Unit / Owning Office',
          explanation:
            'The organizational unit responsible for maintaining this document. Used to filter documents in unit-specific dashboards, control which focal persons can edit or submit the document, and group documents for reporting by office.',
        },
        {
          field: 'Version Label',
          explanation:
            'A short version string (e.g., "v1.0", "Rev-2024-Q1"). If left blank the system assigns a sequential version number. Used in version history listings and review audit trails.',
        },
        {
          field: 'Effective and Expiry Dates',
          explanation:
            'The date range during which this document version is in force. Expiry dates trigger warnings in dashboards and are evaluated by date-check metric templates to flag overdue renewals.',
        },
        {
          field: 'File Upload (DOCX / PDF)',
          explanation:
            'The actual document file. DOCX files are preferred  the system uses the file content for full-text extraction, keyword and section analysis, and HTML-based inline preview. PDF files are accepted but preview quality depends on the file type. After upload the file is queued for background processing; the status changes from "queued" to "processing" to "completed" or "error".',
        },
        {
          field: 'Reference Number',
          explanation:
            'An optional alphanumeric identifier assigned by the issuing office (e.g., "DICT-MO-2024-001"). Useful for cross-referencing with official issuance codes or regulatory dockets.',
        },
      ],
      outputs: [
        {
          field: 'Processing Status Badge',
          explanation:
            'Displayed on each document row: queued (waiting in queue), processing (extraction running), completed (text and preview ready), or error (extraction failed  hover to see error details). You can retry a failed document from the document detail page.',
        },
        {
          field: 'Pending Review Queue (Documents page)',
          explanation:
            'The Documents module now acts as a pending-work queue. It lists only pending submissions that still require reviewer action. Once a document is marked compliant (ready), it is no longer listed here and is available in the Repository module.',
        },
        {
          field: 'Version History List',
          explanation:
            'All uploaded revisions for a document, ordered newest-first. Each entry shows the version label, uploader name, upload timestamp, file size, and processing status. Click any version row to view or download that specific revision.',
        },
        {
          field: 'Document Viewer (Inline Preview)',
          explanation:
            'An in-page viewer that renders the document content without requiring a separate application. DOCX files are converted to styled HTML and shown in a sandboxed frame that preserves headings, tables, and formatting. PDFs are displayed with page navigation. The viewer is also embedded in the Review screen.',
        },
        {
          field: 'Extracted Text',
          explanation:
            'The raw plain-text content derived from the uploaded file. Used internally by metric templates for keyword and section searches. Visible on the document detail page under the "Extracted Content" tab.',
        },
        {
          field: 'Metric Results',
          explanation:
            'Automatic compliance measurement results generated by all applicable templates at upload time. Shows pass/fail scores for section presence, keyword counts, numerical thresholds, and deadline adherence.',
        },
        {
          field: 'Download Button',
          explanation:
            'Downloads the original uploaded file with its correct filename and extension. The file is streamed directly from the database without requiring any file server configuration.',
        },
      ],
    },
  },
  {
    title: 'Metrics Template Builder',
    description: 'Create and maintain section, keyword, number extraction, and deadline templates.',
    
    path: '/dashboard/metrics',
    details: {
      purpose:
        'Define reusable, rule-based measurement templates so that every uploaded document produces consistent, comparable compliance data. Templates are applied automatically when documents are processed, eliminating the need for manual scoring.',
      inputs: [
        {
          field: 'Template Name and Description',
          explanation:
            'A unique human-readable name (e.g., "ICT Policy Section Compliance") and a description that explains what the template measures. The description appears in metric results and reports to help reviewers understand the scoring basis.',
        },
        {
          field: 'Metric Type: Section Check',
          explanation:
            'Validates that a document contains all specified sections by heading or keyword match. Input an ordered list of required section titles  one per line. The system searches extracted text for each title and records a pass (found) or fail (missing) result for each section. Use this for policy documents that must contain prescribed chapters.',
        },
        {
          field: 'Metric Type: Keyword Check',
          explanation:
            'Counts occurrences of compliance obligation phrases in the document text. Fields: Keywords list (one per line), Minimum Matches (minimum required count), Case Sensitive toggle (default off), and Word Boundary toggle (matches whole word only, default on). Returns pass if the keyword count meets or exceeds the minimum; returns fail with the actual count otherwise.',
        },
        {
          field: 'Metric Type: Property Check (Number Extraction)',
          explanation:
            'Extracts numeric values that appear near specified context keywords and evaluates them against a threshold. Fields: Extraction Keywords (words near the target number, e.g., "incident reports"), Comparison Operator (>=, <=, =, >, <), and Expected Numbers list. Use this for quantitative requirements such as "number of training hours >= 40" or "incident response incidents = 0".',
        },
        {
          field: 'Metric Type: Date Check',
          explanation:
            'Monitors document submission and deadline adherence. Fields: Submission Frequency (daily, weekly, monthly, quarterly, annually, custom), Deadline Day (day of month), Month Offset (how many months before end-of-period the deadline falls), Max Days Late (grace window before a late submission is flagged), and optional Custom Regex for non-standard period formats. Use this for recurring reports with regulatory due dates.',
        },
        {
          field: 'Applicability: Document Type',
          explanation:
            'Specifies which Document Type(s) this template applies to. When a document of the selected type is uploaded, this template is automatically included in its extraction run. Leave blank to apply to all document types.',
        },
        {
          field: 'Applicability: Unit',
          explanation:
            'Restricts the template to documents belonging to a specific organizational unit. Combine with Document Type for precise targeting  for example, applying a security metrics template only to IT unit policies.',
        },
        {
          field: 'Seeded Baseline Template Sets',
          explanation:
            'The baseline seed contains 12 templates total (3 per metric type): 4 global templates (apply to all), 4 IT-targeted templates (ICT Security Assessment), and 4 Finance-targeted templates (Finance Risk Report). This ensures each unit document can be evaluated by one section, one keyword, one number extraction, and one date rule, plus global checks.',
        },
      ],
      outputs: [
        {
          field: 'Saved Template Record',
          explanation:
            'The template is persisted and immediately available for the next document processing run. Templates can be edited or deactivated without affecting previously generated results.',
        },
        {
          field: 'Validation Errors on Save',
          explanation:
            'If a template has conflicting or incomplete rules (e.g., a date check with no submission frequency), the system returns specific validation errors that must be resolved before saving.',
        },
        {
          field: 'Metric Results on Documents',
          explanation:
            'After a document is processed, the Metrics tab on the document detail page lists one result row per applicable template. Each row shows the template name, type, pass/fail status, score, and the specific values extracted or checked.',
        },
        {
          field: 'Administration Metrics Dashboard',
          explanation:
            'Aggregated pass/fail rates across all documents for each template, visible to super_admin in the Administration > Metrics panel. Shows compliance trends by template type, document type, and unit.',
        },
      ],
    },
  },
  {
    title: 'Manual Compliance Reviews',
    description:
      'Review pending documents with inline viewer and tag as compliant, non-compliant, or needs revision.',
    
    path: '/dashboard/reviews',
    details: {
      purpose:
        'Enable qualified reviewers and auditors to examine documents that have completed processing, read them inline in the Document Viewer, and record an official compliance determination. All review decisions are stored with the reviewer identity, timestamps, and supporting remarks.',
      inputs: [
        {
          field: 'Review Queue Selection',
          explanation:
            'The Reviews list is synchronized with the pending queue from the Documents module and shows only pending items that require compliance tagging. Compliant/ready items are excluded from this queue and can be accessed from the Repository module.',
        },
        {
          field: 'Document Viewer (within Review Dialog)',
          explanation:
            'The inline Document Viewer is embedded in the review dialog so reviewers can read the full document content without leaving the page. DOCX files are shown as formatted HTML; PDFs are rendered paginated. Use the viewer to verify section presence, read policy language, and assess compliance before recording a decision.',
        },
        {
          field: 'Review Decision',
          explanation:
            'One of three outcomes: Compliant (document meets all applicable requirements), Non-Compliant (document fails one or more requirements  requires specific remarks), or Needs Revision (document is substantially correct but requires targeted changes before final approval  attach detailed revision guidance in remarks).',
        },
        {
          field: 'Reviewer Remarks',
          explanation:
            'A free-text field (required for Non-Compliant and Needs Revision decisions). Provide a specific explanation: cite the policy provision that was violated, describe the missing section or incorrect data, or list the exact changes the focal person must make. Remarks become part of the permanent compliance record and are visible to the document owner.',
        },
      ],
      outputs: [
        {
          field: 'Review Record',
          explanation:
            'A timestamped entry in the document review history containing: reviewer name and role, decision, remarks, and the document version reviewed. This record is immutable once saved.',
        },
        {
          field: 'Document Status Update',
          explanation:
            'Compliant decisions advance the document to "Approved/Compliant" status, making it eligible for issuance mapping. Non-Compliant sets the document to "Rejected". Needs Revision returns the document to the owner for correction and resubmission.',
        },
        {
          field: 'Review History Tab',
          explanation:
            'On the document detail page, the Review History tab lists every review decision made for each version, including all intermediate returns and resubmissions. Provides a full audit trail for inspectors.',
        },
        {
          field: 'Reviewer Dashboard Metrics',
          explanation:
            'The reviewer home dashboard updates counters for documents reviewed, pending queue length, and compliance rate for the current period.',
        },
      ],
    },
  },
  {
    title: 'Issuance and Mapping Management',
    description:
      'Manage issuances and map compliant documents to issuances through link/unlink actions.',
    
    path: '/dashboard/issuances',
    details: {
      purpose:
        'Maintain an authoritative registry of regulatory and policy issuances, and link each issuance to the supporting compliance documents that provide evidence of adherence. Seeded issuances include applicable laws, IRRs, standards (e.g., ISO/NIST), Executive Orders, DICT/NPC circular references, and national plan references relevant to ICT operations and administration.',
      inputs: [
        {
          field: 'Issuance Code',
          explanation:
            'A unique alphanumeric identifier for the issuance (e.g., "EO-001-2024", "DICT-MC-2024-05"). This code is used in all mapping references and audit reports. Duplicate codes are rejected.',
        },
        {
          field: 'Issuance Title',
          explanation:
            'The full official title of the issuance as it appears in the regulatory instrument. Shown in all mapping lists and compliance reports.',
        },
        {
          field: 'Issuance Category',
          explanation:
            'The classification type used by the Issuances category filter (e.g., law, circular, memorandum, IRR, standard, guideline, executive_order, plan). Used for filtering and aggregated reporting.',
        },
        {
          field: 'Issuance Status and Effectivity',
          explanation:
            'Tracks issuance lifecycle using active/inactive status and effectivity metadata. Inactive is used for superseded or withdrawn references while preserving historical mappings.',
        },
        {
          field: 'Amendment Metadata',
          explanation:
            'For amendment issuances, maintain Is Amendment, Amended Issuance Number, and ICT Related Amendment Notes to document ICT-specific legal and operational impact.',
        },
        {
          field: 'Document Mapping Selection',
          explanation:
            'In the issuance detail page, use the Link Documents button to browse and select compliant documents that serve as evidence for this issuance. Unlink removes the association but does not delete the document.',
        },
      ],
      outputs: [
        {
          field: 'Issuance Registry List',
          explanation:
            'A paginated, filterable table of all issuances with code, title, authority, category, status, and ICT Related Amendments context, plus mapping status indicator (fully mapped, partially mapped, no documents linked).',
        },
        {
          field: 'Mapped Document Set',
          explanation:
            'For each issuance, the detail page lists all linked documents with their approval status. Auditors can click into any linked document to view the full compliance review history.',
        },
        {
          field: 'Compliance Coverage Report',
          explanation:
            'The administration dashboard shows a coverage metric: percentage of active issuances that have at least one linked compliant document. This is the primary KPI for compliance managers.',
        },
      ],
    },
  },

  {
    title: 'Unit Administration',
    description:
      'Manage organizational units and structural metadata used in assignment and reporting workflows.',
    
    path: '/dashboard/units',
    details: {
      purpose:
        'Maintain the authoritative directory of organizational units that powers document ownership, issue assignment, issuance mapping scopes, and filtered reporting throughout the system. Units must be set up before focal users and documents can be properly assigned.',
      inputs: [
        {
          field: 'Unit Name',
          explanation:
            'The full official name of the unit as recognized in the organizational chart (e.g., "Information and Communications Technology Division"). Used as the display label in all assignment dropdowns and reports.',
        },
        {
          field: 'Unit Code',
          explanation:
            'A short, unique alphanumeric abbreviation (e.g., "ICTD", "HRD-001"). The code is used in automated issuance code prefixes, metric applicability lookups, and API filtering. Codes cannot be duplicated or changed after creation  choose carefully.',
        },
        {
          field: 'Parent Unit',
          explanation:
            'Optional hierarchical reference to group this unit under a parent office. Enables roll-up compliance reporting  a Director sees metrics for all child divisions. Leave blank for top-level offices.',
        },
        {
          field: 'Head / Contact Person',
          explanation:
            'The name and email of the unit head. Used for escalation notifications and appears in official compliance correspondence generated by the executive summary reports.',
        },
      ],
      outputs: [
        {
          field: 'Active Unit Directory',
          explanation:
            'A searchable, hierarchical list of all units. Active units appear in user assignment, document ownership, ticket assignment, and issuance applicability dropdowns throughout the system.',
        },
        {
          field: 'Duplicate Code Validation',
          explanation:
            'Immediate error if a unit code already exists. The system prevents duplicate codes at the API level; no two units can share a code even if their names differ.',
        },
        {
          field: 'Compliance Roll-Up Data',
          explanation:
            "Once units are structured in a hierarchy, the Dashboard computes compliance percentages at each level. A parent unit's score is the weighted average of its child units' document compliance rates.",
        },
      ],
    },
  },
  {
    title: 'Administration Metrics Dashboard',
    description:
      'View compliance metrics, document completion rates, issue KPIs, and system-wide audit summaries.',
    
    path: '/dashboard/administration',
    details: {
      purpose:
        'Provide executive-level insight into the overall compliance posture. Aggregates data from documents, reviews, issuances, issues, and metrics templates into a unified view for strategic decision-making and regulatory reporting.',
      inputs: [
        {
          field: 'Date Range Filter',
          explanation:
            'Select a reporting period (current month, quarter, year, or custom range). All KPIs on the dashboard recalculate to reflect only data from the selected period. Default is the current calendar year.',
        },
        {
          field: 'Unit Filter',
          explanation:
            "Narrow all metrics to a specific unit or sub-tree. Useful for preparing unit-level compliance reports or investigating a specific office's performance.",
        },
      ],
      outputs: [
        {
          field: 'Document Compliance Rate',
          explanation:
            'Percentage of submitted documents that received a "Compliant" review decision within the reporting period. Broken down by document type and unit. Targets are configurable by the administrator.',
        },
        {
          field: 'Metric Template Pass Rates',
          explanation:
            'For each active metric template, the percentage of documents that passed all rules. Identifies which templates are generating the most failures  a proxy for systemic compliance weaknesses.',
        },
        {
          field: 'Issue Closure Metrics',
          explanation:
            'Total open issues, average days to resolution, percentage closed within SLA, and overdue issue count. Segmented by type, category, and unit.',
        },
        {
          field: 'Issuance Coverage',
          explanation:
            'Count and percentage of active issuances that have at least one linked compliant document. Issuances with zero linked documents are flagged as "critical gap".',
        },
        {
          field: 'Upcoming Deadlines',
          explanation:
            'Calendar view of document expiry dates and recurring report deadlines within the next 90 days. Color-coded: green (on track), yellow (due within 30 days), red (overdue).',
        },
      ],
    },
  },
  {
    title: 'Settings and Role Management',
    description:
      'Update your profile, change password, toggle theme, and manage system users and role definitions.',
    
    path: '/dashboard/settings',
    details: {
      purpose:
        'Allow individual users to personalize their interface experience and update security credentials. Super administrators additionally provision new users, manage role assignments, activate/deactivate accounts, and view the system role definitions that govern access control.',
      inputs: [
        {
          field: 'Current / New / Confirm Password',
          explanation:
            'Three-field form to change your login password. Enter your existing password in Current Password for verification. New Password must be at least 8 characters  use a mix of uppercase, numbers, and symbols for security. Confirm New Password must match New Password exactly. Submit triggers server-side validation and hashes the password before storage.',
        },
        {
          field: 'Theme Toggle (Light / Dark)',
          explanation:
            'Switches the interface between light mode (white backgrounds, dark text) and dark mode (dark backgrounds, light text). The preference is stored in your browser session and applied on every subsequent login from the same device.',
        },
        {
          field: 'New User: Email Address',
          explanation:
            'The login email for the new account. Must be unique in the system. Type it manually (autofill and email suggestions have been disabled for security). The user will log in with this email and the temporary password you set. Email cannot be changed after account creation.',
        },
        {
          field: 'New User: Temporary Password',
          explanation:
            'The initial password set by the administrator. Communicate this to the user through a secure channel. Browser autofill is disabled here. The user should change this password immediately using the Change Password form after their first login.',
        },
        {
          field: 'New User: Role',
          explanation:
            'Determines what the user can see and do. Assignable roles are: Focal, Technician, Reviewer, and Auditor. Super Admin is reserved for system administrators. Regular "User" roles receive limited dashboards.',
        },
        {
          field: 'New User: Name and Position Fields',
          explanation:
            "First Name, Middle Name, Last Name, Suffix: form the user's display name. Position and Designation appear in official reports. Note: Helper texts have been removed from these fields to keep the UI clean. Staff ID is strictly for non-regular staff (disabled for basic users).",
        },
        {
          field: 'Change User Role (existing user)',
          explanation:
            'From the Existing Users table, click the Edit (pencil) icon next to any user to open the role-change dialog. Select the new role from the dropdown. Save commits the change immediately. Staff ID becomes editable only if you assign a staff role.',
        },
        {
          field: 'Activate / Deactivate Account',
          explanation:
            'Deactivating an account prevents the user from logging in. Historical records are preserved. Reactivate at any time by clicking the Activate button. Do not delete accounts.',
        },
      ],
      outputs: [
        {
          field: 'Password Change Confirmation',
          explanation:
            'A success toast confirms the password update. If the current password is wrong or the new password does not meet requirements, an error toast shows the specific problem.',
        },
        {
          field: 'User Created Confirmation',
          explanation:
            "A success toast includes the new user's email address. The new user immediately appears in the Existing Users table with Active status.",
        },
        {
          field: 'Role Definitions Reference Table',
          explanation:
            'The System Role Definitions card shows all system roles with their code, assignability flag, and a description of their access scope. Use this as a reference when deciding which role to assign to new staff.',
        },
        {
          field: 'Updated Existing Users Table',
          explanation:
            'The Existing Users table refreshes after every create, role change, or activate/deactivate action. Displays name, email, Staff ID, current role chip, and active status chip for all provisioned users with assignable roles.',
        },
      ],
    },
  },
  {
    title: 'KPI Monitoring & Dashboard',
    description:
      'Track unit KPI targets, encode periodic actuals, and analyze performance through composite scoring and band classification.',
    
    path: '/dashboard/kpi',
    details: {
      purpose:
        'The KPI module enables the organization to define performance indicators per unit, encode actual values for each monitoring period (Monthly, Quarterly, Semestral, or Annual), and automatically compute a composite score using weighted normalization. Each score is classified into a color-coded band (Green, Amber, Red, or Unclassified) according to configurable thresholds. The Dashboard tab visualizes overall and per-unit performance, including historical trend lines and KPI-level breakdowns, allowing managers and reviewers to identify underperforming units and individual indicators at a glance.',
      inputs: [
        {
          field: 'Period Year',
          explanation:
            'The calendar year for which KPI data is being viewed or encoded. Determines which monitoring records are loaded and which thresholds are applied.',
        },
        {
          field: 'Frequency (Monthly / Quarterly / Semestral / Annual)',
          explanation:
            'Selects the reporting frequency. Monthly shows a single month; Quarterly groups 3-month windows (Q1–Q4); Semestral groups 6-month windows (H1–H2); Annual covers the full calendar year. Each frequency mode affects which periods the trend chart displays.',
        },
        {
          field: 'KPI Code',
          explanation:
            'A short unique identifier for the KPI master record (e.g., KPI-001). Used as the primary key when linking monitoring rows to master definitions and displayed in breakdown tables.',
        },
        {
          field: 'KPI Name',
          explanation:
            'The full descriptive name of the KPI (e.g., "Document Compliance Rate"). Shown in master records and unit detail breakdowns.',
        },
        {
          field: 'Type (Measurement / Compliance / Qualitative)',
          explanation:
            'Classification of the KPI type. Measurement KPIs use numeric actual vs. target comparisons. Compliance KPIs evaluate yes/no or percentage-based compliance status. Qualitative KPIs accept descriptive ratings.',
        },
        {
          field: 'Direction (Higher is Better / Lower is Better)',
          explanation:
            'Determines the normalization formula. Higher-is-better KPIs score higher when actual values approach or exceed the target. Lower-is-better KPIs score higher when actuals are minimized relative to target.',
        },
        {
          field: 'Target Value',
          explanation:
            'The benchmark value for the KPI. Used in the normalized score formula: Score = (Actual / Target) × 100 for higher-is-better, or (Target / Actual) × 100 for lower-is-better. The result is clamped to 0–100.',
        },
        {
          field: 'Weight',
          explanation:
            'A numeric weighting factor applied when computing the composite unit score. Higher-weight KPIs contribute proportionally more to the overall unit score. Weights are normalized across all active KPIs in a unit.',
        },
        {
          field: 'Actual Value',
          explanation:
            'The measured or reported value for a specific KPI, unit, and period. Entered through the KPI Monitoring tab. A missing actual leaves that KPI unscored for the period.',
        },
        {
          field: 'Remarks',
          explanation:
            'Optional notes for a monitoring entry, such as data sources, caveats, or contextual information for reviewers.',
        },
      ],
      outputs: [
        {
          field: 'Overall KPI Score Card',
          explanation:
            'Displays the organization-wide composite KPI score for the selected period. The score is the weighted average of all unit scores. A progress bar shows relative attainment. No band color is shown here to maintain neutrality at the aggregate level.',
        },
        {
          field: 'Band Scale Legend',
          explanation:
            'Color-coded chips showing the numeric ranges for each performance band (e.g., 90–100, 75–89, 0–74). Thresholds are configurable by administrators. The chips use band colors (green, amber, red) without text labels for visual clarity.',
        },
        {
          field: 'Unit KPI Scores Table',
          explanation:
            'A sortable table listing each unit with its composite score, a color-block band indicator (full-cell background, no text), and the count of KPI entries. Click any row to open the Unit Detail panel.',
        },
        {
          field: 'Trend Line Chart (Unit Detail)',
          explanation:
            'A line chart showing composite trajectory for the selected unit. Monthly mode shows previous month → selected month (January uses 0 → January). Quarterly and Semestral include one boundary anchor point (Q1-3 or H1-6) before the selected range. Annual spans Jan–Dec with a 0 start anchor.',
        },
        {
          field: 'KPI Detail Table (Unit Detail)',
          explanation:
            'A per-KPI breakdown showing Direction (↑ higher is better / ↓ lower is better), Actual, Target, Score (normalized), and mini sparkline Trend with arrowhead. All KPI masters for the selected unit are listed even when period data is incomplete; incomplete rows show Score as "—".',
        },
        {
          field: 'Band Distribution Pie Chart',
          explanation:
            'A donut chart summarizing how many units fall into each performance band for the selected period. Useful for board-level reporting and trend analysis across reporting cycles.',
        },
      ],
    },
  },
  {
    title: 'Consolidated Reports',
    description:
      'Generate period reports combining KPI performance scores and document submissions for management review.',
    
    path: '/dashboard/reports',
    details: {
      purpose:
        'Produce a management-ready report for a selected period that combines KPI score cards, performance trend charts, a KPIs requiring attention alert table, and document submission tracking in one view. Designed for office heads who need a single-page compliance overview they can act on immediately.',
      inputs: [
        {
          field: 'Year',
          explanation:
            'The calendar year for the report. Determines which KPI monitoring records and document submissions are included.',
        },
        {
          field: 'Frequency (Monthly / Quarterly / Semestral / Annual)',
          explanation:
            'Reporting granularity. Combined with Year and Period, this selects the exact compliance snapshot to display.',
        },
        {
          field: 'Unit (optional)',
          explanation:
            'Filter the report to a single organizational unit. Leave blank to view the all-units consolidated report showing every unit on the same charts and summary tables.',
        },
      ],
      outputs: [
        {
          field: 'KPI Score Card',
          explanation:
            'Overall composite score with a band-colored progress bar, scope label (unit name or "All Units"), and count of KPIs monitored for the period.',
        },
        {
          field: 'KPI Scores Chart',
          explanation:
            'For all-units view: same chart content/line behavior as KPI module Unit KPI Scores. For single-unit view: same chart content as KPI module Unit Detail. Chart legends are intentionally hidden because the color-key table is shown directly below.',
        },
        {
          field: 'Direction + Trend Indicators',
          explanation:
            'Single-unit KPI tables now include Direction (↑/↓) to indicate whether higher or lower actual values are preferred. Trend sparkline lines include arrowheads so upward/downward movement is visually clear for each KPI and unit row.',
        },
        {
          field: 'KPIs Requiring Attention',
          explanation:
            'A highlighted alert table listing every KPI below acceptable thresholds. Shows unit, KPI name, code, color-coded score value, and actual value. Intended for immediate management action. Only appears when at least one underperforming KPI exists for the period.',
        },
        {
          field: 'Document Submissions Table',
          explanation:
            'All documents submitted in the selected year, listing title, unit, document type, status chip, overall compliance chip, and the number of metric templates applied. Sortable and filterable by unit and status.',
        },
      ],
    },
  },
  {
    title: 'Report Repository',
    description:
      'Browse all submitted compliance documents organized by year and period in a folder-style view.',
    
    path: '/dashboard/repository',
    details: {
      purpose:
        "Provides a folder-style view of compliant/ready documents grouped by Year → Period. Pending review documents are not shown here; they remain in the Documents and Reviews queues. Focal users see their own unit's compliant submissions; admins, reviewers, and auditors see all compliant units.",
      inputs: [
        {
          field: 'Year Accordion',
          explanation:
            'Click to expand a year and reveal all period buckets (monthly folders, quarterly folders, annual folder) that contain at least one document for that year.',
        },
        {
          field: 'Period Folder',
          explanation:
            'Click a period bucket (e.g., "Q1 (Jan–Mar)", "June 2025", "2025 Annual") to expand it and list all documents submitted for that period.',
        },
      ],
      outputs: [
        {
          field: 'Document Table',
          explanation:
            'For each open folder: document title, submitting unit, upload date, and actions. Repository entries are already compliant/ready outputs, so status/compliance chips are omitted to keep the table focused on retrieval and reuse.',
        },
        {
          field: 'View Action',
          explanation:
            'Opens an inline modal preview directly in the Repository module so users can review content without navigating away from folder context.',
        },
        {
          field: 'Download Action',
          explanation:
            'Downloads the latest version of the document directly from the repository. This supports reuse of prior compliant reports as a baseline for the next cycle update.',
        },
      ],
    },
  },
  // ── New items added in v0.6.2 ──────────────────────────────────────────────
  {
    title: 'Dashboard',
    description:
      'Your role-specific home screen showing key compliance metrics, ticket summaries, and quick-action shortcuts.',
    
    path: '/dashboard',
    details: {
      purpose:
        "The Dashboard is the first page you see after login. It is role-sensitive: what you see adapts to your assigned role so you only view metrics and actions relevant to your responsibilities. Admins see system-wide compliance health; focal staff see their unit's submission status; technicians see their assigned help desk tickets; regular users see their own ticket history.",
      inputs: [
        {
          field: 'No data entry — read-only view',
          explanation:
            'The dashboard is an aggregated read-only snapshot. All figures are automatically computed from data across Documents, Reviews, KPI, Tickets, and Attendance modules. You do not enter data here — navigate to the relevant module to create or update records.',
        },
      ],
      outputs: [
        {
          field: 'Compliance Health Summary (super_admin / reviewer)',
          explanation:
            'Document submission rate, pending review count, overdue items, and overall compliance score for the current period across all units.',
        },
        {
          field: 'Unit Snapshot (focal / technician)',
          explanation:
            'Submission status for your assigned unit: how many required documents are submitted, pending, or overdue for the current reporting period.',
        },
        {
          field: 'My Tickets (user / technician roles)',
          explanation:
            'Summary of your open, in-progress, and recently resolved help desk tickets. Includes a quick "New Ticket" shortcut so you can submit an issue directly from the dashboard.',
        },
        {
          field: 'Recent Activity Feed',
          explanation:
            'A time-ordered list of the most recent actions in your accessible modules (document uploads, ticket updates, review decisions). Helps you stay current without navigating separately to each module.',
        },
        {
          field: 'IT Help Desk Overview (super_admin / reviewer / main focal)',
          explanation:
            'A volume summary of all tickets grouped by status (Open, In Progress, Resolved, Closed), alongside a type breakdown covering IT Support, Desktop Support, and Pantawid ICT Support ticket volumes.',
        },
        {
          field: 'Quick-Action Shortcuts',
          explanation:
            'Role-appropriate buttons at the top of the dashboard (e.g., "Upload Document", "Submit Ticket", "Review Pending"). These route directly to the relevant module screen pre-filtered to your pending items.',
        },
      ],
    },
  },
  {
    title: 'IT Help Desk Ticketing',
    description:
      'Submit IT support or desktop support requests, track ticket status, and manage resolutions (technicians).',
    
    path: '/dashboard/tickets',
    details: {
      purpose:
        "The IT Help Desk Ticketing module is RICTMS's centralized system for managing all IT and desktop support requests. Any system user can submit a help desk ticket. Technicians receive automated assignment notifications and manage ticket lifecycle from Open to Resolved. Admins can override assignments, manage categories, and set keyword auto-routing rules. All ticket activity is logged for audit and performance tracking.",
      inputs: [
        {
          field: 'Support Type (IT Support / Desktop Support / Pantawid ICT Support)',
          explanation:
            'Select the nature of your issue. IT Support covers software, network, internet connectivity, email, user accounts, and system-level issues. Desktop Support covers hardware, printers, and physical equipment. Pantawid ICT Support is specific to Pantawid-related requests. Your selection determines which technician pool is assigned and which categories are available.',
        },
        {
          field: 'Category',
          explanation:
            'A specific problem group within the selected support type (e.g., "Email Issues", "Printer Problem", "Network Connectivity"). Categories help technicians triage and route tickets efficiently. Only active categories are shown. If your issue does not fit any category, leave blank and describe in the subject/description.',
        },
        {
          field: 'Subject',
          explanation:
            'A concise one-line description of the problem (e.g., "Cannot print to the 2nd floor Canon printer"). The subject is the primary identifier in all ticket lists and email notifications. Be specific — avoid generic subjects like "Technical Problem".',
        },
        {
          field: 'Description',
          explanation:
            'A detailed explanation of the issue: what happened, when it started, what steps you already tried, and what impact it is causing. The more detail you provide, the faster the technician can diagnose the problem without needing follow-up questions.',
        },
        {
          field: 'Priority',
          explanation:
            'Low (minor inconvenience, work continues), Medium (impacting work but a workaround exists), High (significantly impeding work, no workaround), Critical (complete work stoppage or data loss risk). Set this honestly — overusing Critical delays genuine emergencies.',
        },
      ],
      outputs: [
        {
          field: 'Ticket Number (TKT-YYYY-XXXXXX)',
          explanation:
            'A unique sequential reference number assigned immediately on submission (e.g., TKT-2026-000042). Use this number in all follow-up communications with IT staff. You receive a confirmation email with the ticket number when the ticket is created.',
        },
        {
          field: 'Email Confirmation (requester)',
          explanation:
            'An email is sent to your registered address with subject "Compliance Hub - Ticketing #TKT-... — [your subject]". The email includes ticket details, assigned technician name (if auto-assigned), and current status.',
        },
        {
          field: 'Assignment Notification (technician)',
          explanation:
            'If a technician is available and auto-assigned, they receive an email notification with the full ticket details. If no technician is available (all absent), the ticket remains open with an "Unassigned" label until manually assigned.',
        },
        {
          field: 'Keyword Auto-Routing',
          explanation:
            'The system applies keyword rules against the ticket subject at creation time. If the subject matches a configured keyword (e.g., "printer jam" → Desktop Support), the ticket type is automatically reclassified and routed to the correct support team — even if you initially selected the wrong type.',
        },
        {
          field: 'Ticket Status Lifecycle',
          explanation:
            'Open → In Progress (technician accepts) → Pending Resolution → Resolved → Closed. Each transition triggers an email notification. Reopening is possible if the resolution did not solve the problem.',
        },
        {
          field: 'My Tickets List',
          explanation:
            'All tickets you have submitted are listed in the Tickets page, filterable by status and type. You can see full ticket details, all technician notes, and the complete status history.',
        },
      ],
    },
  },
  {
    title: 'Ticket Settings',
    description:
      'Configure ticket categories, keyword auto-routing rules, and SMTP email settings for the Help Desk.',
    
    path: '/dashboard/ticket-settings',
    details: {
      purpose:
        'Super administrators use Ticket Settings to control how the IT Help Desk behaves: what categories are available in the ticket creation form, which keyword patterns trigger automatic ticket type reclassification, and whether the email notification system is correctly configured. Changes here affect all users immediately.',
      inputs: [
        {
          field: 'Category Name',
          explanation:
            'A human-readable label for the category shown in the ticket creation dropdown (e.g., "Printer Problem", "Account Access"). Keep names short and self-explanatory — users select these without guidance.',
        },
        {
          field: 'Support Type (for Category)',
          explanation:
            "Associates the category with IT Support or Desktop Support. Only categories matching the user's selected support type are shown in the ticket creation form. A category cannot span both types.",
        },
        {
          field: 'Active / Inactive Status (for Category)',
          explanation:
            'Active categories appear in the ticket creation dropdown. Inactive categories are hidden from users but preserved for historical ticket records. Use Inactive instead of deleting categories to maintain data integrity.',
        },
        {
          field: 'Keyword Rule: Keyword',
          explanation:
            'A word or phrase (case-insensitive) that, if found in a new ticket\'s subject line, triggers the auto-routing rule. Examples: "printer", "cannot print", "blue screen". Partial matches are supported (e.g., "print" matches "printing" and "printer").',
        },
        {
          field: 'Keyword Rule: Target Support Type',
          explanation:
            "When the keyword is detected, the ticket's support type is overridden to this value (IT Support or Desktop Support). This reroutes the ticket to the correct technician team even if the user selected the wrong type during submission.",
        },
        {
          field: 'Keyword Rule: Active / Inactive',
          explanation:
            'Only active rules are evaluated at ticket creation time. Inactive rules are ignored but preserved for re-activation. Deactivate a rule seasonally (e.g., during a printer upgrade period) without losing the configuration.',
        },
        {
          field: 'SMTP Test Email Recipient',
          explanation:
            'Enter your email address and click "Send Test Email" to verify the SMTP connection is working. A test message from "DSWD FO2 Compliance Hub" is sent immediately. If it does not arrive, check the SMTP configuration in the server .env file.',
        },
      ],
      outputs: [
        {
          field: 'Category List with Status Chips',
          explanation:
            'All categories (active and inactive) are shown in the management table. Each row shows the category name, support type badge, active/inactive status chip, and edit/delete actions.',
        },
        {
          field: 'Keyword Rules Table',
          explanation:
            'All configured keyword rules with their target support type, active status, and delete action. Rules are evaluated in creation order — the first matching rule wins.',
        },
        {
          field: 'Email Test Result',
          explanation:
            '"Test email sent successfully to [email]" confirms SMTP is working. If an error is returned, the SMTP error message is shown so the administrator can correct the configuration.',
        },
      ],
    },
  },
  {
    title: 'Ticket Reports',
    description:
      'View Help Desk analytics, SLA performance, and detailed user satisfaction ratings.',
    
    path: '/dashboard/ticket-reports',
    details: {
      purpose:
        'Provides comprehensive analytics on help desk operations. Ticket Admins and management can evaluate ticket volumes, technician workloads, SLA adherence, and end-user satisfaction ratings to improve service delivery.',
      inputs: [
        {
          field: 'Date Range & Filter Controls',
          explanation:
            'Select the reporting period (Year, and optionally Month, Quarter, or Semester). You can also filter by specific Technician or Support Type to drill down into the performance metrics.',
        },
        {
          field: 'Report Tabs (Overview / Detailed Ratings)',
          explanation:
            'Toggle between the high-level performance overview and the granular satisfaction ratings breakdown.',
        },
      ],
      outputs: [
        {
          field: 'Ticket Volume by Support Type',
          explanation:
            'A pie chart showing the distribution of all tickets across IT Support, Desktop Support, and Pantawid ICT Support (regardless of resolution status).',
        },
        {
          field: 'Technician Workload & Performance',
          explanation:
            'Bar charts detailing ticket resolution volume per technician and their corresponding average satisfaction rating scores.',
        },
        {
          field: 'Detailed Ratings Analysis',
          explanation:
            'Provides day-by-day and week-by-week average rating charts, alongside a tabular list of every rated ticket and its specific user comments.',
        },
      ],
    },
  },
  {
    title: 'Attendance Management',
    description:
      'Track office days, manage technician attendance, and review daily staff login activity.',
    
    path: '/dashboard/attendance',
    managementCapabilityKey: 'isAttendanceManage',
    details: {
      purpose:
        'The Attendance Management module has three integrated views: the Office Days Calendar for planning which days require full staffing, the Technician Attendance grid for recording daily presence/absence of IT and desktop support staff (used by the auto-assignment engine), and the Staff Login Activity log showing all RICTMS users who logged in on a given day.',
      inputs: [
        {
          field: 'Month / Year Navigator',
          explanation:
            'Use the left/right arrows to navigate to any month. All three tabs reflect the selected month for calendar and attendance data. The Staff Login Activity tab uses its own date selector.',
        },
        {
          field: 'Office Day Toggle (Office Days Calendar tab)',
          explanation:
            'Click any future date to toggle it between Office Day (green) and Non-Office Day (grey). Today and past dates cannot be changed — they are locked. Weekdays default to Office Day. Non-office days are excluded from ticket auto-assignment (no technicians are expected to be available).',
        },
        {
          field: 'Attendance Status (Technician Attendance tab)',
          explanation:
            'For each technician and each weekday, click the cell to cycle through: Present (✓ green), Absent (✗ red), Half Day (☀ yellow), Out of Office (✈ blue). The selected status determines whether the technician is included in the auto-assignment pool for that day.',
        },
        {
          field: 'Support Type Filter (Technician Attendance tab)',
          explanation:
            'Filter the attendance grid to show "All Technicians", "IT Support" only, or "Desktop Support" only. Default is All Technicians, showing all tech roles including custom roles with the Ticket Technician flag enabled.',
        },
        {
          field: 'Date Selector (Staff Login Activity tab)',
          explanation:
            'Select any date to view which RICTMS staff logged in on that day. Defaults to today. Shows login time, name, email, and role for each staff member who authenticated to the system.',
        },
      ],
      outputs: [
        {
          field: 'Office Days Calendar Grid',
          explanation:
            'A monthly calendar with color-coded cells: green = office day (tech availability expected), grey = non-office day. Today is highlighted with a blue border. Past dates are shown at reduced opacity.',
        },
        {
          field: 'Technician Attendance Grid',
          explanation:
            'A scrollable table with technicians as rows and weekdays as columns. Each cell shows the attendance status icon for that technician on that date. Empty cells indicate no record set — treated as Present by the auto-assignment engine.',
        },
        {
          field: 'Staff Login Activity Table (Staff Login Activity tab)',
          explanation:
            'A list of all staff who logged in on the selected date, sorted by login time (most recent first). Includes name, email, role, and exact login timestamp. Useful for supervisors to verify staff attendance and for security audits.',
        },
        {
          field: 'Auto-Assignment Impact',
          explanation:
            "Technician attendance status directly drives ticket auto-assignment. Only technicians marked Present or Half Day on the ticket's creation date are eligible for assignment. Absent and OOO technicians are bypassed. This ensures tickets are never silently assigned to unavailable staff.",
        },
      ],
    },
    accessOnlyDetails: {
      purpose:
        'The Attendance module gives access-level users visibility into office-day status and attendance outcomes that affect ticket operations, without exposing attendance administration actions.',
      inputs: [
        {
          field: 'Month / Year Navigator',
          explanation:
            'Use the left/right arrows to browse months and view attendance outcomes for each visible day in the selected period.',
        },
        {
          field: 'Support Type Filter (if visible to your role)',
          explanation:
            'Choose a support category to narrow the displayed attendance data and quickly check team availability by role group.',
        },
        {
          field: 'Date Selector (Staff Login Activity tab)',
          explanation:
            'Pick a specific date to review logged-in staff and validate observed daily activity without editing attendance records.',
        },
      ],
      outputs: [
        {
          field: 'Office Day Visibility',
          explanation:
            'You can view which dates are office days versus non-office days so you can interpret assignment and staffing behavior correctly.',
        },
        {
          field: 'Attendance Status Indicators',
          explanation:
            'You can see present, absent, half-day, and out-of-office states for relevant staff to understand operational availability.',
        },
        {
          field: 'Staff Login Activity',
          explanation:
            'You can review who logged in on a selected date, including role and login timestamp, for visibility and audit awareness.',
        },
        {
          field: 'Operational Impact Context',
          explanation:
            'Displayed attendance information explains why technicians may or may not be considered for assignment without requiring edit privileges.',
        },
      ],
    },
  },
];

export default function UserManualPage() {
  const { user, myCap } = useAuth();
  const [selectedManual, setSelectedManual] = useState<ManualItem | null>(null);

  const role = user?.role;
  const capabilityByPath: Partial<Record<string, keyof RoleCapabilityRecord>> = {
    '/dashboard/documents': 'isDocumentsAccess',
    '/dashboard/repository': 'isRepositoryAccess',
    '/dashboard/issuances': 'isIssuancesAccess',
    '/dashboard/metrics': 'isMetricsAccess',
    '/dashboard/reviews': 'isReviewsAccess',
    '/dashboard/kpi': 'isKpiAccess',
    '/dashboard/reports': 'isReportsAccess',
    '/dashboard/mov': 'isMovAccess',
    '/dashboard/attendance': 'isAttendanceAccess',
    '/dashboard/ticket-settings': 'isTicketSettingsFocal',
    '/dashboard/ticket-reports': 'isTicketSettingsFocal',
    '/dashboard/units': 'isTicketSettingsFocal',
  };

  const hasPathAccess = (path: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;

    if (
      path === '/dashboard' ||
      path === '/dashboard/tickets' ||
      path === '/dashboard/user-manual'
    ) {
      return true;
    }

    const capKey = capabilityByPath[path];
    if (capKey) {
      return Boolean(myCap?.[capKey]);
    }

    if (path === '/dashboard/units') {
      return user.role === 'section_head';
    }

    if (path === '/dashboard/settings') {
      return false;
    }

    return false;
  };

  const visibleItems = useMemo(
    () =>
      manualItems
        .filter((item) => (role ? hasPathAccess(item.path) : false))
        .map((item) => {
          if (
            !item.accessOnlyDetails ||
            !item.managementCapabilityKey ||
            user?.role === 'super_admin'
          ) {
            return item;
          }

          const canManage = Boolean(myCap?.[item.managementCapabilityKey]);
          if (canManage) {
            return item;
          }

          return {
            ...item,
            description: item.description.replace(
              'Track office days, manage technician attendance, and review daily staff login activity.',
              'View office days, attendance statuses, and daily staff login activity.',
            ),
            details: item.accessOnlyDetails,
          };
        }),
    [role, myCap, user?.role],
  );

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Manual
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Field-level guide for every module. Only modules accessible to your account role are
          shown. Click any card for detailed field explanations.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {visibleItems.map((item) => (
          <Grid item xs={12} md={6} key={item.title}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea sx={{ height: '100%' }} onClick={() => setSelectedManual(item)}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {visibleItems.length === 0 && (
        <Typography color="text.secondary">No manual sections available for your role.</Typography>
      )}

      <Dialog
        open={Boolean(selectedManual)}
        onClose={() => setSelectedManual(null)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {selectedManual?.title}
          <IconButton size="small" onClick={() => setSelectedManual(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedManual && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {selectedManual.description}
              </Typography>
              <Typography variant="body2" mb={2}>
                <strong>Purpose:</strong> {selectedManual.details.purpose}
              </Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Field Inputs
              </Typography>
              <List dense disablePadding>
                {selectedManual.details.inputs.map((input) => (
                  <ListItem key={input.field} disableGutters alignItems="flex-start" sx={{ mb: 1 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600} component="span">
                          {input.field}
                        </Typography>
                      }
                      secondary={input.explanation}
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                System Outputs
              </Typography>
              <List dense disablePadding>
                {selectedManual.details.outputs.map((output) => (
                  <ListItem
                    key={output.field}
                    disableGutters
                    alignItems="flex-start"
                    sx={{ mb: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600} component="span">
                          {output.field}
                        </Typography>
                      }
                      secondary={output.explanation}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
