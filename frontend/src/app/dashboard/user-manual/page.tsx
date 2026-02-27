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

type ManualRole = 'super_admin' | 'reviewer' | 'focal' | 'technician' | 'auditor' | 'section_head';

type ManualItem = {
  title: string;
  description: string;
  roles: ManualRole[];
  path: string;
  details: {
    purpose: string;
    inputs: Array<{ field: string; explanation: string }>;
    outputs: Array<{ field: string; explanation: string }>;
  };
};

const manualItems: ManualItem[] = [
  {
    title: 'Documents Upload and Tracking',
    description: 'Upload DOCX, monitor processing, review versions, and map references for ready/compliant documents.',
    roles: ['super_admin', 'reviewer', 'focal', 'technician', 'auditor'],
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
    roles: ['super_admin', 'reviewer'],
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
    description: 'Review pending documents with inline viewer and tag as compliant, non-compliant, or needs revision.',
    roles: ['super_admin', 'reviewer', 'auditor'],
    path: '/dashboard/reviews',
    details: {
      purpose:
        'Enable qualified reviewers and auditors to examine documents that have completed processing, read them inline in the Document Viewer, and record an official compliance determination. All review decisions are stored with the reviewer identity, timestamps, and supporting remarks.',
      inputs: [
        {
          field: 'Review Queue Selection',
          explanation:
            'The Reviews list shows all documents in "pending review" or "returned" status that are assigned to or accessible by the current user. Click a row to open the review dialog. Only documents that have completed extraction processing appear in the queue.',
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
    description: 'Manage issuances and map compliant documents to issuances through link/unlink actions.',
    roles: ['super_admin', 'reviewer'],
    path: '/dashboard/issuances',
    details: {
      purpose:
        'Maintain an authoritative registry of regulatory and policy issuances, and link each issuance to the supporting compliance documents that provide evidence of adherence. This module provides the traceability required for compliance audits.',
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
            'The classification type: Executive Order, Memorandum Circular, Administrative Order, Directive, Resolution, or Other. Used for filtering and aggregated reporting.',
        },
        {
          field: 'Effective and Expiry Dates',
          explanation:
            'The validity period of the issuance. Expiry dates are monitored and surfaced in the administration dashboard to warn about upcoming regulatory renewals.',
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
            'A paginated, filterable table of all issuances with code, title, category, date range, and compliance status indicator (fully mapped, partially mapped, no documents linked).',
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
    title: 'Issue Documentation Workflow',
    description: 'Create and track issues, update resolution steps/date, and monitor closure workflow.',
    roles: ['super_admin', 'reviewer', 'focal', 'technician', 'auditor'],
    path: '/dashboard/tickets',
    details: {
      purpose:
        'Capture non-compliance findings, operational deficiencies, and audit observations as trackable tickets. Drive each issue through a structured lifecycle from identification to closure, with documented corrective actions and resolution evidence.',
      inputs: [
        {
          field: 'Issue Type',
          explanation:
            'The primary category of the problem: Documentation Gap, Process Deficiency, Data Quality Issue, Audit Finding, Technical Issue, or Policy Violation. Issue Type is used to route the ticket to the correct team and for dashboard grouping.',
        },
        {
          field: 'Issue Category',
          explanation:
            'A secondary classification within the Issue Type that refines the problem label. Categories are defined by system administrators and aligned to the organization\'s compliance framework. If the appropriate category does not exist, notify the administrator to add it.',
        },
        {
          field: 'Issue Subject and Description',
          explanation:
            'The subject is a short one-line summary. The description is a full narrative of the observed problem: what was found, when, by whom, and what evidence supports it. Reference document titles, section numbers, or policy codes where applicable. A detailed description accelerates assignment and resolution.',
        },
        {
          field: 'Assigned Unit / Personnel',
          explanation:
            'The organizational unit or individual responsible for investigating and correcting the issue. Assignments trigger notifications. Reassignment is allowed and logged. Unassigned issues remain in a pending triage state.',
        },
        {
          field: 'Priority / Severity',
          explanation:
            'Indicates urgency: Critical (compliance breach with immediate risk), High (significant gap requiring prompt action), Medium (improvement needed within the reporting period), Low (minor or cosmetic finding). Priority affects dashboard sorting and escalation rules.',
        },
        {
          field: 'Resolution Remarks and Date',
          explanation:
            'When the assigned party has addressed the issue, enter detailed resolution remarks describing the corrective action taken, any policy updates made, and evidence produced (e.g., updated document version number). Enter the actual resolution date. This information is reviewed by the reopening authority before closure is accepted.',
        },
      ],
      outputs: [
        {
          field: 'Ticket Status Track',
          explanation:
            'Each issue moves through: Open (newly created)  Assigned (owner set)  In Progress (owner working)  Pending Review (resolution submitted)  Closed (reviewer accepts) or Returned (reviewer rejects  issue re-enters In Progress). Every transition is timestamped.',
        },
        {
          field: 'Action Trail / Audit Log',
          explanation:
            'A chronological list of every action taken on the ticket: creation, assignments, status changes, return remarks, and resolution notes. Each entry shows the actor name, role, timestamp, and the comment or action performed.',
        },
        {
          field: 'Closure Certificate Record',
          explanation:
            'When a ticket is closed, a closure record is stored with the final reviewer, closing timestamp, and resolution summary. This record is used in compliance audits to demonstrate systematic issue management.',
        },
        {
          field: 'Issue Dashboard Aggregates',
          explanation:
            'The dashboard shows open ticket count, average resolution time, overdue tickets (open beyond SLA), and breakdown by type, category, unit, and priority. These metrics are visible to super_admin and reviewer roles.',
        },
      ],
    },
  },
  {
    title: 'Unit Administration',
    description: 'Manage organizational units and structural metadata used in assignment and reporting workflows.',
    roles: ['super_admin'],
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
            'Once units are structured in a hierarchy, the Dashboard computes compliance percentages at each level. A parent unit\'s score is the weighted average of its child units\' document compliance rates.',
        },
      ],
    },
  },
  {
    title: 'Administration Metrics Dashboard',
    description: 'View compliance metrics, document completion rates, issue KPIs, and system-wide audit summaries.',
    roles: ['super_admin'],
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
            'Narrow all metrics to a specific unit or sub-tree. Useful for preparing unit-level compliance reports or investigating a specific office\'s performance.',
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
    description: 'Update your profile, change password, toggle theme, and manage system users and role definitions.',
    roles: ['super_admin', 'reviewer', 'focal', 'technician', 'auditor'],
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
            'The login email for the new account. Must be unique in the system. The user will log in with this email and the temporary password you set. Email cannot be changed after account creation  create a new account and deactivate the old one if needed.',
        },
        {
          field: 'New User: Temporary Password',
          explanation:
            'The initial password set by the administrator. Communicate this to the user through a secure channel. The user should change this password immediately using the Change Password form after their first login.',
        },
        {
          field: 'New User: Role',
          explanation:
            'Determines what the user can see and do. Assignable roles are: Focal (document submission and ticket handling for assigned units), Technician (technical issue resolution), Reviewer (compliance review decisions), and Auditor (read-only compliance audit access). Super Admin is reserved for system administrators and cannot be assigned through this form.',
        },
        {
          field: 'New User: Name and Position Fields',
          explanation:
            'First Name, Middle Name, Last Name, Suffix: form the user\'s display name shown in review records, ticket assignments, and audit logs. Position and Designation appear in official reports and correspondence. Staff ID is the optional HR/payroll reference number.',
        },
        {
          field: 'Change User Role (existing user)',
          explanation:
            'From the Existing Users table, click the Edit (pencil) icon next to any user to open the role-change dialog. Select the new role from the dropdown  each option shows the role name and its description. Save commits the change immediately; the user\'s access permissions update on their next page load.',
        },
        {
          field: 'Activate / Deactivate Account',
          explanation:
            'Deactivating an account prevents the user from logging in or performing any actions. Their historical records (reviews, ticket actions, document uploads) are preserved. Reactivate at any time by clicking the Activate button. Do not delete accounts  deactivation maintains audit integrity.',
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
            'A success toast includes the new user\'s email address. The new user immediately appears in the Existing Users table with Active status.',
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
    description: 'Track unit KPI targets, encode periodic actuals, and analyze performance through composite scoring and band classification.',
    roles: ['super_admin', 'reviewer', 'section_head', 'focal', 'technician', 'auditor'],
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
            'A line chart showing the composite score trajectory for the selected unit across the full period range. Each data point is a colored circle matching the performance band for that period. Monthly mode shows 2 points; Quarterly shows 4; Semestral shows 7; Annual shows 13 (including the prior December as a baseline). Null periods are shown as gaps, not zero values.',
        },
        {
          field: 'KPI Detail Table (Unit Detail)',
          explanation:
            'A per-KPI breakdown showing Actual, Target, Score (normalized), a mini sparkline Trend (prev vs. current period), and a color-block Band indicator. Use this to identify which specific indicators are dragging the composite score down.',
        },
        {
          field: 'Band Distribution Pie Chart',
          explanation:
            'A donut chart summarizing how many units fall into each performance band for the selected period. Useful for board-level reporting and trend analysis across reporting cycles.',
        },
      ],
    },
  },
];

export default function UserManualPage() {
  const { user } = useAuth();
  const [selectedManual, setSelectedManual] = useState<ManualItem | null>(null);

  const role = user?.role;
  const visibleItems = useMemo(
    () => manualItems.filter((item) => (role ? item.roles.includes(role as ManualRole) : false)),
    [role],
  );

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Manual
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Field-level guide for every module. Only modules accessible to your account role are shown. Click any card for detailed field explanations.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {visibleItems.map((item) => (
          <Grid item xs={12} md={6} key={item.title}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea sx={{ height: '100%' }} onClick={() => setSelectedManual(item)}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {item.description}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                    {item.roles.map((r) => (
                      <Chip key={r} label={r.replace('_', ' ')} size="small" variant="outlined" />
                    ))}
                  </Box>
                  <Typography variant="caption" color="primary.main">
                    {item.path}
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
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  <ListItem key={output.field} disableGutters alignItems="flex-start" sx={{ mb: 1 }}>
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

              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="primary.main">
                Module Path: {selectedManual.path}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
