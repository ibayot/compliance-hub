-- RICTMS Compliance Hub Seed Data (v1.1.2 Clean Baseline)
-- Aligned with actual MariaDB schema (auto-detected column names).

USE rictms_compliance;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE ticket_comments;
TRUNCATE TABLE tickets;
TRUNCATE TABLE document_issuances;
TRUNCATE TABLE version_comparisons;
TRUNCATE TABLE manual_reviews;
TRUNCATE TABLE metric_results;
TRUNCATE TABLE metric_applicability;
TRUNCATE TABLE metric_templates;
TRUNCATE TABLE kpi_monitoring;
TRUNCATE TABLE kpi_master;
TRUNCATE TABLE kpi_thresholds;
TRUNCATE TABLE kpi_scoring_rules;
TRUNCATE TABLE role_definitions;
TRUNCATE TABLE document_versions;
TRUNCATE TABLE documents;
TRUNCATE TABLE issuances;
TRUNCATE TABLE user_unit_access;
TRUNCATE TABLE units;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users: column is `active` (not is_active)
INSERT INTO users (id, email, passwordHash, first_name, last_name, role, active, created_at, updated_at) VALUES
(1, 'admin@rictms.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'System', 'Admin', 'super_admin', 1, NOW(), NOW()),
(2, 'reviewer@rictms.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'QA', 'Reviewer', 'reviewer', 1, NOW(), NOW()),
(3, 'focal@rictms.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'Unit', 'Focal', 'focal', 1, NOW(), NOW());

-- Units: id is auto_increment int; columns: id, name, description, active, created_at
INSERT INTO units (id, name, description, active, created_at) VALUES
(1, 'Information Technology Unit', 'Handles ICT compliance and digital services.', 1, NOW()),
(2, 'Finance Unit', 'Handles financial compliance and reporting.', 1, NOW());

-- user_unit_access: user_id int, unit_id int
INSERT INTO user_unit_access (user_id, unit_id) VALUES
(1, 1), (1, 2),
(2, 1), (2, 2),
(3, 1);

INSERT INTO role_definitions (`value`, `label`, `description`, `assignable`, `is_system`, `created_at`, `updated_at`) VALUES
('super_admin', 'Super Admin', 'Full system access including user and security administration.', 0, 1, NOW(), NOW()),
('reviewer', 'Reviewer / Compliance Officer', 'Consolidated compliance oversight and KPI monitoring input.', 1, 1, NOW(), NOW()),
('focal', 'Focal Person', 'Unit-level dashboard visibility and document operations.', 1, 1, NOW(), NOW()),
('technician', 'Technician', 'Operational support role with limited visibility.', 1, 1, NOW(), NOW()),
('auditor', 'Auditor', 'Read-only compliance and KPI access for audit.', 1, 1, NOW(), NOW());

-- Issuances: is_active is correct for this table
INSERT INTO issuances (id, issuance_number, title, description, issuing_authority, issue_date, effectivity_date, source_url, is_active, created_at, updated_at) VALUES
('issuance-001', 'RA-10173', 'Data Privacy Act of 2012', 'Personal data protection law.', 'Congress of the Philippines', '2012-08-15', '2012-09-08', 'https://www.officialgazette.gov.ph/2012/08/15/republic-act-no-10173/', 1, NOW(), NOW());

-- Documents: unit_id is int referencing units.id
INSERT INTO documents (id, title, document_type, period, year, status, current_version, extracted_text, unit_id, uploaded_by, is_deleted, created_at, updated_at) VALUES
('doc-001', 'ICT Compliance Narrative', 'Narrative Report', 'Q1', '2024', 'ready', 1, 'Seeded text for ICT compliance narrative. Introduction. Findings. Recommendations.', 1, 1, 0, NOW(), NOW()),
('doc-002', 'Finance Compliance Memo', 'Memo', 'Q1', '2024', 'ready', 1, 'Seeded text for finance compliance memo. Introduction. Findings. Recommendations.', 2, 1, 0, NOW(), NOW());

-- Minimal PDF binary blob (used as file_blob placeholder for seeded docs)
SET @pdf_blob = UNHEX('255044462D312E340A25E2E3CFD30A');

-- HTML preview blobs (rendered inline in DocumentViewer via iframe)
SET @preview_html_1 = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;line-height:1.7;color:#222;}h1{color:#1a237e;border-bottom:2px solid #1a237e;padding-bottom:8px;}h2{color:#283593;}p{margin:0.6em 0 1em;}.hdr{background:#e8eaf6;border-left:4px solid #3949ab;padding:12px 16px;margin-bottom:24px;border-radius:0 4px 4px 0;}</style></head><body><div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">ICT_Compliance_Q1_2024.pdf</div></div><h1>ICT Compliance Narrative - Q1 2024</h1><h2>Introduction</h2><p>This report presents the ICT compliance status for Q1 2024. It covers key compliance indicators, policy adherence metrics, and findings from internal monitoring activities.</p><h2>Findings</h2><p>All critical ICT systems maintained uptime above the 99.5% threshold. Security patch compliance reached 97%. Two minor observations were logged related to backup verification procedures.</p><h2>Recommendations</h2><p>Strengthen the backup verification checklist and assign ownership per system. A follow-up review is scheduled for Q2 2024.</p></body></html>';

SET @preview_html_2 = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;line-height:1.7;color:#222;}h1{color:#1a237e;border-bottom:2px solid #1a237e;padding-bottom:8px;}h2{color:#283593;}p{margin:0.6em 0 1em;}.hdr{background:#e8eaf6;border-left:4px solid #3949ab;padding:12px 16px;margin-bottom:24px;border-radius:0 4px 4px 0;}</style></head><body><div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Compliance_Q1_2024.pdf</div></div><h1>Finance Compliance Memo - Q1 2024</h1><h2>Introduction</h2><p>This memo documents Finance Unit compliance status for Q1 2024, covering regulatory adherence, budget utilization, and financial reporting accuracy.</p><h2>Findings</h2><p>Budget utilization was within approved levels at 94.2%. All financial reports were submitted within deadlines. One observation noted regarding procurement documentation completeness.</p><h2>Recommendations</h2><p>Complete the procurement document checklist review by end of Q2 2024. A compliance training refresher for finance staff is recommended before the next reporting cycle.</p></body></html>';

INSERT INTO document_versions (id, document_id, version_number, file_name, file_path, file_blob, mime_type, file_size, checksum, preview_path, preview_blob, preview_mime_type, extracted_text, change_notes, uploaded_by, created_at) VALUES
('ver-001', 'doc-001', 1, 'ICT_Compliance_Q1_2024.pdf', 'documents/seed-ict-q1-2024.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL, @preview_html_1, 'text/html', 'Seeded extracted text for document 1. Introduction. Findings. Recommendations.', 'Initial seed version', 1, NOW()),
('ver-002', 'doc-002', 1, 'Finance_Compliance_Q1_2024.pdf', 'documents/seed-fin-q1-2024.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL, @preview_html_2, 'text/html', 'Seeded extracted text for document 2. Introduction. Findings. Recommendations.', 'Initial seed version', 1, NOW());

INSERT INTO document_issuances (issuance_id, document_id) VALUES
('issuance-001', 'doc-001'),
('issuance-001', 'doc-002');

-- ──────────────────────────────────────────────────────────────────────────────
-- Sample documents for testing Repository, Metrics, and Reports functionality.
-- These documents contain all required metric-check content:
--   metric-001 (section check): Introduction + Findings + Recommendations sections
--   metric-002 (keyword check): "compliance", "regulation", "policy" keywords
--   metric-003 (incident count): "Total incidents: 5" extraction point
--   metric-004 (date check): submitted within monthly deadline
-- ──────────────────────────────────────────────────────────────────────────────

-- Shared extracted text that satisfies all metric rules
SET @sample_text = 'Introduction. This report covers compliance activities for the reporting period. All policies and regulations were reviewed. Findings. Three observations noted regarding ICT security compliance. One regulation update was implemented. Total incidents: 5 reported incidents were logged. Policy adherence stands at 97%. Recommendations. Strengthen compliance controls. Update regulation tracking. Review security policy quarterly.';

-- Shared HTML preview template (used for all new sample docs via per-doc override)
SET @html_base = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#222;}h1{color:#1a237e;border-bottom:2px solid #1a237e;padding-bottom:6px;}h2{color:#283593;}p{margin:0.5em 0 0.9em;}.hdr{background:#e8eaf6;border-left:4px solid #3949ab;padding:10px 14px;margin-bottom:20px;border-radius:0 4px 4px 0;}</style></head><body>';

INSERT INTO documents (id, title, document_type, period, year, status, current_version, extracted_text, unit_id, uploaded_by, is_deleted, created_at, updated_at) VALUES
-- IT Unit — Q2 2025 quarterly report
('doc-003', 'IT Compliance Quarterly Report Q2 2025', 'Quarterly Report', '2025Q2', '2025', 'ready', 1, @sample_text, 1, 1, 0, '2025-07-05 09:00:00', '2025-07-05 09:00:00'),
-- Finance Unit — Q2 2025 quarterly report
('doc-004', 'Finance Compliance Report Q2 2025', 'Quarterly Report', '2025Q2', '2025', 'ready', 1, @sample_text, 2, 1, 0, '2025-07-06 10:00:00', '2025-07-06 10:00:00'),
-- IT Unit — June 2025 monthly report
('doc-005', 'ICT Monthly Status Report June 2025', 'Monthly Report', '202506', '2025', 'ready', 1, @sample_text, 1, 1, 0, '2025-07-04 08:00:00', '2025-07-04 08:00:00'),
-- Finance Unit — 2025 Annual Review
('doc-006', 'Finance Annual Compliance Review 2025', 'Annual Review', '2025', '2025', 'ready', 1, @sample_text, 2, 1, 0, '2026-01-10 09:00:00', '2026-01-10 09:00:00'),
-- IT Unit — Q1 2026 quarterly report
('doc-007', 'IT Compliance Quarterly Report Q1 2026', 'Quarterly Report', '2026Q1', '2026', 'ready', 1, @sample_text, 1, 1, 0, '2026-04-04 09:00:00', '2026-04-04 09:00:00'),
-- Finance Unit — Q1 2026 quarterly report
('doc-008', 'Finance Compliance Report Q1 2026', 'Quarterly Report', '2026Q1', '2026', 'pending', 1, @sample_text, 2, 1, 0, '2026-04-05 10:00:00', '2026-04-05 10:00:00'),
-- IT Unit — January 2026 monthly incident report
('doc-009', 'IT Unit Incident Summary January 2026', 'Incident Report', '202601', '2026', 'ready', 1, @sample_text, 1, 1, 0, '2026-02-03 08:30:00', '2026-02-03 08:30:00'),
-- Finance Unit — February 2026 monthly compliance memo
('doc-010', 'Finance Compliance Memo February 2026', 'Compliance Report', '202602', '2026', 'pending', 1, @sample_text, 2, 1, 0, '2026-03-04 11:00:00', '2026-03-04 11:00:00');

INSERT INTO document_versions (id, document_id, version_number, file_name, file_path, file_blob, mime_type, file_size, checksum, preview_path, preview_blob, preview_mime_type, extracted_text, change_notes, uploaded_by, created_at) VALUES
('ver-003', 'doc-003', 1, 'IT_Compliance_Q2_2025.pdf', 'documents/seed-it-q2-2025.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">IT_Compliance_Q2_2025.pdf</div></div><h1>IT Compliance Quarterly Report — Q2 2025</h1><h2>Introduction</h2><p>This report documents the ICT Unit compliance status for Q2 2025 (April–June). All policies and regulations were reviewed and updated as required.</p><h2>Findings</h2><p>Compliance rate reached 98.7%. Two regulation updates were implemented on schedule. Total incidents: 5 minor security incidents were recorded and resolved. Policy adherence metrics met all targets.</p><h2>Recommendations</h2><p>Continue quarterly compliance reviews. Update the ICT security policy by end of Q3. Reinforce regulation tracking procedures.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 1, '2025-07-05 09:00:00'),
('ver-004', 'doc-004', 1, 'Finance_Compliance_Q2_2025.pdf', 'documents/seed-fin-q2-2025.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Compliance_Q2_2025.pdf</div></div><h1>Finance Compliance Report — Q2 2025</h1><h2>Introduction</h2><p>This report covers financial compliance activities for Q2 2025. All regulatory obligations and internal policies were monitored throughout the period.</p><h2>Findings</h2><p>Budget utilization at 91.3%. Compliance with fiscal regulation requirements maintained at 100%. Total incidents: 2 procurement documentation gaps were identified. Policy sign-off turnaround averaged 3 days.</p><h2>Recommendations</h2><p>Expedite procurement policy updates. Conduct regulation awareness sessions for new finance staff. Strengthen compliance reporting intervals.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 1, '2025-07-06 10:00:00'),
('ver-005', 'doc-005', 1, 'ICT_Monthly_Jun_2025.pdf', 'documents/seed-ict-mon-202506.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">ICT_Monthly_Jun_2025.pdf</div></div><h1>ICT Monthly Status Report — June 2025</h1><h2>Introduction</h2><p>Monthly status covering ICT compliance activities for June 2025. Highlights include system uptime, incident resolution, and policy compliance review.</p><h2>Findings</h2><p>System uptime: 99.8%. Compliance with all regulation requirements confirmed. Total incidents: 3 incidents reported, all resolved within SLA. Security policy review completed on schedule.</p><h2>Recommendations</h2><p>Maintain current uptime monitoring cadence. Renew the ICT regulation compliance checklist for H2 2025. Document all policy exception approvals.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 1, '2025-07-04 08:00:00'),
('ver-006', 'doc-006', 1, 'Finance_Annual_2025.pdf', 'documents/seed-fin-annual-2025.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Annual_2025.pdf</div></div><h1>Finance Annual Compliance Review — 2025</h1><h2>Introduction</h2><p>This annual review summarizes the Finance Unit compliance performance across all periods of 2025. All policies, fiscal regulations, and internal controls are assessed herein.</p><h2>Findings</h2><p>Annual compliance score: 94.1% GREEN band. All regulatory submissions completed on time. Total incidents: 8 procurement incidents logged over the year, 7 resolved. Three policy updates implemented from regulatory guidance.</p><h2>Recommendations</h2><p>Develop a 2026 compliance roadmap. Refresh fiscal regulation training for all staff. Automate policy tracking with the Compliance Hub.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 1, '2026-01-10 09:00:00'),
('ver-007', 'doc-007', 1, 'IT_Compliance_Q1_2026.pdf', 'documents/seed-it-q1-2026.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">IT_Compliance_Q1_2026.pdf</div></div><h1>IT Compliance Quarterly Report — Q1 2026</h1><h2>Introduction</h2><p>Q1 2026 ICT compliance report covering January–March. Regulatory requirements, security policy reviews, and incident tracking are documented.</p><h2>Findings</h2><p>ICT systems fully compliant with current regulations. Uptime: 99.9%. Total incidents: 2 minor incidents resolved within 4 hours. All policy controls validated in January review.</p><h2>Recommendations</h2><p>Prepare for Q2 2026 regulation update cycle. Conduct mid-year compliance policy audit. Expand incident response capacity.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 1, '2026-04-04 09:00:00'),
('ver-008', 'doc-008', 1, 'Finance_Compliance_Q1_2026.pdf', 'documents/seed-fin-q1-2026.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Compliance_Q1_2026.pdf</div></div><h1>Finance Compliance Report — Q1 2026</h1><h2>Introduction</h2><p>Q1 2026 financial compliance covering January–March. Budget utilization, fiscal regulation adherence, and policy compliance are assessed.</p><h2>Findings</h2><p>Budget: 88% utilized. All fiscal regulation deadlines met. Total incidents: 1 documentation gap found in procurement. Policy sign-off completed within SLA.</p><h2>Recommendations</h2><p>Strengthen procurement documentation compliance. Conduct regulation review workshops in Q2. Update finance compliance policy checklist.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 1, '2026-04-05 10:00:00'),
('ver-009', 'doc-009', 1, 'IT_Incident_Jan_2026.pdf', 'documents/seed-it-incident-202601.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">IT_Incident_Jan_2026.pdf</div></div><h1>IT Unit Incident Summary — January 2026</h1><h2>Introduction</h2><p>This summary documents all ICT incidents for January 2026. Incidents are tracked against our security policy and applicable regulations.</p><h2>Findings</h2><p>Total incidents: 5 incidents logged in January. All incidents were resolved within SLA. Policy compliance maintained at 100%. No regulation violations recorded. Security controls effective.</p><h2>Recommendations</h2><p>Continue monthly incident tracking. Align incident categories with updated regulation references. Review compliance thresholds before Q1 close.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 1, '2026-02-03 08:30:00'),
('ver-010', 'doc-010', 1, 'Finance_Compliance_Feb_2026.pdf', 'documents/seed-fin-compliance-202602.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Compliance_Feb_2026.pdf</div></div><h1>Finance Compliance Memo — February 2026</h1><h2>Introduction</h2><p>February 2026 compliance memo covering fiscal regulation updates and internal policy adherence for the Finance Unit.</p><h2>Findings</h2><p>All compliance obligations met. One new regulation issued by oversight body — policy update in progress. Total incidents: 0 incidents in February. Budget compliance at 93%.</p><h2>Recommendations</h2><p>Complete policy update for new regulation by March 15. Schedule compliance training refresher. Prepare for Q1 2026 close compliance audit.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 1, '2026-03-04 11:00:00');

-- Metric templates (all 4 types)
INSERT INTO metric_templates (id, name, description, metric_type, rule_config, pass_criteria, weight, is_active, created_at, updated_at) VALUES
('metric-001', 'Introduction Section Check', 'Verifies the document contains required section headings.', 'section_check', JSON_OBJECT('required_sections', JSON_ARRAY('Introduction', 'Findings', 'Recommendations')), JSON_OBJECT('all_present', TRUE), 2, 1, NOW(), NOW()),
('metric-002', 'Compliance Keyword Presence', 'Verifies key compliance terms appear in the document body.', 'keyword_check', JSON_OBJECT('keywords', JSON_ARRAY('compliance', 'regulation', 'policy'), 'min_matches', 2, 'case_sensitive', FALSE, 'whole_word', FALSE), JSON_OBJECT('min_matches', 2), 1, 1, NOW(), NOW()),
('metric-003', 'Incident Count Extraction', 'Extracts and validates the reported incident count meets the minimum threshold.', 'property_check', JSON_OBJECT('extraction_keywords', JSON_ARRAY('total incidents', 'reported incidents'), 'comparison', '>=', 'expected_values', JSON_ARRAY(1)), JSON_OBJECT('comparison', '>=', 'threshold', 1), 1, 1, NOW(), NOW()),
('metric-004', 'Monthly Submission Deadline Check', 'Validates document submitted before the monthly deadline.', 'date_check', JSON_OBJECT('submission_frequency', 'monthly', 'deadline_day', 5, 'deadline_month_offset', 1, 'max_days_late', 0), JSON_OBJECT('on_time', TRUE), 2, 1, NOW(), NOW());

-- metric_applicability: unit_id is int nullable
INSERT INTO metric_applicability (id, metric_id, unit_id, document_type) VALUES
('map-001', 'metric-001', NULL, NULL),
('map-002', 'metric-002', NULL, NULL),
('map-003', 'metric-003', NULL, NULL),
('map-004', 'metric-004', NULL, NULL);

INSERT INTO kpi_master (`code`, `name`, `description`, `unit_id`, `type`, `unit_of_measure`, `direction`, `target_value`, `weight`, `frequency`, `active`, `created_at`, `updated_at`) VALUES
-- IT Unit KPIs
('KPI-IT-001', 'System Uptime', 'Percentage of time systems are operational', 1, 'measurement', 'percent', 'higher_is_better', 99.9, 3, 'monthly', 1, NOW(), NOW()),
('KPI-IT-002', 'Incident Resolution Time', 'Average hours to resolve IT incidents', 1, 'measurement', 'hours', 'lower_is_better', 4, 2, 'monthly', 1, NOW(), NOW()),
('KPI-IT-003', 'Help Desk Satisfaction', 'User satisfaction score for help desk', 1, 'measurement', 'percent', 'higher_is_better', 90, 2, 'monthly', 1, NOW(), NOW()),
('KPI-IT-004', 'Backup Success Rate', 'Whether scheduled backup completed successfully', 1, 'yes_no', 'yes/no', 'higher_is_better', 1, 2, 'monthly', 1, NOW(), NOW()),
('KPI-IT-005', 'Network Availability', 'Percentage uptime of network infrastructure', 1, 'measurement', 'percent', 'higher_is_better', 99.5, 1, 'monthly', 1, NOW(), NOW()),
-- Finance Unit KPIs
('KPI-FI-001', 'Budget Utilization Rate', 'Percentage of approved budget actually utilized', 2, 'measurement', 'percent', 'higher_is_better', 90, 3, 'quarterly', 1, NOW(), NOW()),
('KPI-FI-002', 'Report Submission Accuracy', 'Accuracy rate of financial reports submitted', 2, 'measurement', 'percent', 'higher_is_better', 95, 2, 'monthly', 1, NOW(), NOW()),
('KPI-FI-003', 'Collection Efficiency', 'Percentage of receivables collected on time', 2, 'measurement', 'percent', 'higher_is_better', 85, 2, 'monthly', 1, NOW(), NOW()),
('KPI-FI-004', 'Audit Finding Resolution', 'Whether all audit findings from the period are resolved', 2, 'yes_no', 'yes/no', 'higher_is_better', 1, 2, 'monthly', 1, NOW(), NOW()),
('KPI-FI-005', 'Financial Statement Timeliness', 'Percentage of financial statements submitted on time', 2, 'measurement', 'percent', 'higher_is_better', 100, 1, 'monthly', 1, NOW(), NOW());

INSERT INTO kpi_scoring_rules (`name`, `active`, `cap_score`, `floor_score`, `yes_score`, `no_score`, `created_at`, `updated_at`) VALUES
('default', 1, 100, 0, 100, 0, NOW(), NOW());

INSERT INTO kpi_thresholds (`band`, `min_score`, `max_score`, `color`, `created_at`, `updated_at`) VALUES
('green', 90, 100, 'success', NOW(), NOW()),
('amber', 75, 89.99, 'warning', NOW(), NOW()),
('red', 0, 74.99, 'error', NOW(), NOW());

INSERT INTO kpi_monitoring (`kpi_master_code`, `unit_id`, `period_year`, `period_month`, `actual_value`, `remarks`, `entered_by_user_id`, `entered_by_staff_id`, `entered_by_name`, `status`, `created_at`, `updated_at`) VALUES
-- IT Unit — January 2025 (composite ≈ 100, GREEN)
('KPI-IT-001', 1, 2025, 1, 99.9, 'Systems fully operational.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 1, 3.1,  'All incidents resolved quickly.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 1, 92,   'Excellent help desk satisfaction.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 1, 1,    'Backup completed successfully.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 1, 99.8, 'Network fully available.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — February 2025 (composite ≈ 99.8, GREEN)
('KPI-IT-001', 1, 2025, 2, 99.8, 'Minor maintenance window.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 2, 3.3,  'Fast incident resolution.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 2, 91,   'High satisfaction rate.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 2, 1,    'Backup completed successfully.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 2, 99.7, 'Network stable.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — March 2025 (composite ≈ 99.5, GREEN)
('KPI-IT-001', 1, 2025, 3, 99.7, 'Scheduled maintenance completed.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 3, 3.5,  'Resolution time within target.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 3, 90,   'Help desk met satisfaction target.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 3, 1,    'Backup completed successfully.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 3, 99.6, 'Network fully available.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — April 2025 (composite ≈ 98.4, GREEN)
('KPI-IT-001', 1, 2025, 4, 99.5, 'Uptime met.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 4, 3.8,  'Minor delays in resolution.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 4, 89,   'Slight dip in user satisfaction.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 4, 1,    'Backup completed successfully.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 4, 99.5, 'Network stable.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — May 2025 (composite ≈ 97.2, GREEN)
('KPI-IT-001', 1, 2025, 5, 99.3, 'System stable.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 5, 4.1,  'Slightly over resolution target.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 5, 88,   'Two escalated tickets impacted score.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 5, 1,    'Backup completed successfully.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 5, 99.3, 'Network available.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — June 2025 (composite ≈ 98.76, GREEN — preserved from prior session)
('KPI-IT-001', 1, 2025, 6, 99.5, 'Systems operational.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 6, 3.5,  'Incidents resolved below target.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 6, 85,   'Help desk satisfaction slightly dipping.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 6, 1,    'Backup completed.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 6, 99.8, 'Network fully available.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — July 2025 (composite ≈ 86.36, AMBER — preserved from prior session)
('KPI-IT-001', 1, 2025, 7, 95,   'Planned upgrade caused brief outage.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 7, 6.5,  'Incident backlog from upgrade.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 7, 71,   'User complaints from upgrade downtime.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 7, 1,    'Backup completed.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 7, 97,   'Network partially impacted during upgrade.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — August 2025 (composite ≈ 71.96, RED — Backup failed)
('KPI-IT-001', 1, 2025, 8, 97.8, 'System recovering post-upgrade.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 8, 5.2,  'Residual incidents from upgrade.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 8, 78,   'Satisfaction recovering.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 8, 0,    'Backup failed — storage issue.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 8, 98.2, 'Network stable.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — September 2025 (composite ≈ 95.5, GREEN — recovery)
('KPI-IT-001', 1, 2025, 9, 98.5, 'Systems near full capacity.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 9, 4.5,  'Resolution slightly above target.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 9, 82,   'Help desk recovery in progress.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 9, 1,    'Backup restored and successful.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 9, 98.8, 'Network fully available.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — October 2025 (composite ≈ 97.6, GREEN)
('KPI-IT-001', 1, 2025, 10, 99.0, 'Strong uptime.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 10, 4.2,  'Response time improving.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 10, 85,   'Satisfaction trending upward.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 10, 1,    'Backup completed successfully.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 10, 99.1, 'Network stable.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — November 2025 (composite ≈ 98.4, GREEN)
('KPI-IT-001', 1, 2025, 11, 99.5, 'Excellent uptime.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 11, 3.8,  'Fast resolution times.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 11, 88,   'Strong help desk performance.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 11, 1,    'Backup completed.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 11, 99.3, 'Network available.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- IT Unit — December 2025 (composite ≈ 99.8, GREEN — year-end excellence)
('KPI-IT-001', 1, 2025, 12, 99.8, 'Year-end uptime excellent.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-002', 1, 2025, 12, 3.3,  'Year-end resolution time excellent.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-003', 1, 2025, 12, 91,   'Year-end satisfaction high.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-004', 1, 2025, 12, 1,    'Backup completed.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2025, 12, 99.6, 'Network fully available year-end.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
-- Finance Unit — February 2025 (composite ≈ 100, GREEN)
('KPI-FI-001', 2, 2025, 2, 91,  'Budget utilization on track.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-002', 2, 2025, 2, 96,  'High report accuracy.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-003', 2, 2025, 2, 87,  'Collection above target.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-004', 2, 2025, 2, 1,   'All audit findings resolved.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-005', 2, 2025, 2, 100, 'All statements submitted on time.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
-- Finance Unit — March 2025 (composite ≈ 99.7, GREEN)
('KPI-FI-001', 2, 2025, 3, 90,  'Budget on target.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-002', 2, 2025, 3, 97,  'Excellent report accuracy.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-003', 2, 2025, 3, 88,  'Collections above target.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-004', 2, 2025, 3, 1,   'All audit findings resolved.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-005', 2, 2025, 3, 99,  'Statements submitted on time.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
-- Finance Unit — April 2025 (composite ≈ 99.8, GREEN)
('KPI-FI-001', 2, 2025, 4, 92,  'Budget utilization excellent.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-002', 2, 2025, 4, 96,  'High accuracy maintained.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-003', 2, 2025, 4, 86,  'Collection on track.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-004', 2, 2025, 4, 1,   'Audit findings cleared.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-005', 2, 2025, 4, 100, 'Statements on time.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
-- Finance Unit — May 2025 (composite ≈ 99.25, GREEN)
('KPI-FI-001', 2, 2025, 5, 89,  'Slight under-utilization.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-002', 2, 2025, 5, 94,  'Minor accuracy issues.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-003', 2, 2025, 5, 85,  'Collection at target.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-004', 2, 2025, 5, 1,   'All findings resolved.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-005', 2, 2025, 5, 98,  'One statement slightly late.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
-- Finance Unit — June 2025 (composite ≈ 95.9, GREEN — preserved from prior session)
('KPI-FI-001', 2, 2025, 6, 88,  'Budget nearing cap.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-002', 2, 2025, 6, 93,  'Accuracy issues flagged.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-003', 2, 2025, 6, 73,  'Collections below target.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-004', 2, 2025, 6, 1,   'Audit findings resolved.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-005', 2, 2025, 6, 98,  'Most statements on time.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
-- Finance Unit — July 2025 (composite ≈ 72.4, RED — Audit finding unresolved)
('KPI-FI-001', 2, 2025, 7, 82,  'Budget under-utilized mid-year.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-002', 2, 2025, 7, 88,  'Report errors increased.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-003', 2, 2025, 7, 72,  'Collection efficiency dropped.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-004', 2, 2025, 7, 0,   'Audit finding not resolved this period.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-005', 2, 2025, 7, 96,  'Timeliness mostly maintained.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
-- Finance Unit — August 2025 (composite ≈ 89.4, AMBER — preserved from prior session)
('KPI-FI-001', 2, 2025, 8, 87,  'Budget recovery.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-002', 2, 2025, 8, 76,  'Accuracy issues continue.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-003', 2, 2025, 8, 62,  'Collections still below target.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-004', 2, 2025, 8, 1,   'Audit findings cleared.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
('KPI-FI-005', 2, 2025, 8, 98,  'Statement timeliness improving.', 2, 'CO-1003', 'Finance Auditor', 'locked', NOW(), NOW()),
-- IT and Finance — February 2026 (current demo period)
('KPI-IT-001', 1, 2026, 2, 97.5, 'Minor scheduled maintenance.', 2, 'CO-1002', 'QA Reviewer', 'draft', NOW(), NOW()),
('KPI-IT-002', 1, 2026, 2, 4.5,  'Slightly over resolution target.', 2, 'CO-1002', 'QA Reviewer', 'draft', NOW(), NOW()),
('KPI-IT-003', 1, 2026, 2, 84,   'Tickets backlogged.', 2, 'CO-1002', 'QA Reviewer', 'draft', NOW(), NOW()),
('KPI-IT-004', 1, 2026, 2, 1,    'Backup completed.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-IT-005', 1, 2026, 2, 98.9, 'Network stable.', 2, 'CO-1002', 'QA Reviewer', 'draft', NOW(), NOW()),
('KPI-FI-001', 2, 2026, 2, 88,   'Budget utilization on track.', 2, 'CO-1003', 'Finance Auditor', 'draft', NOW(), NOW()),
('KPI-FI-002', 2, 2026, 2, 94,   'Some accuracy issues.', 2, 'CO-1003', 'Finance Auditor', 'draft', NOW(), NOW()),
('KPI-FI-003', 2, 2026, 2, 71,   'Collections below target.', 2, 'CO-1003', 'Finance Auditor', 'draft', NOW(), NOW()),
('KPI-FI-004', 2, 2026, 2, 0,    'One control pending final sign-off.', 2, 'CO-1003', 'Finance Auditor', 'draft', NOW(), NOW()),
('KPI-FI-005', 2, 2026, 2, 97,   'Most statements on time.', 2, 'CO-1003', 'Finance Auditor', 'draft', NOW(), NOW());

-- metric_results: columns are id, version_id, metric_template_id, status (enum pass/fail/warning/error), message, score, computed_at, evidence
INSERT INTO metric_results (id, version_id, metric_template_id, status, score, message, evidence, computed_at) VALUES
('result-001', 'ver-001', 'metric-001', 'pass', 100.00, 'All required sections found.', JSON_OBJECT('sections_found', JSON_ARRAY('Introduction', 'Findings', 'Recommendations')), NOW()),
('result-002', 'ver-001', 'metric-002', 'pass', 100.00, 'All required keywords found.', JSON_OBJECT('count', 3, 'matches', JSON_ARRAY('compliance', 'regulation', 'policy')), NOW()),
('result-003', 'ver-001', 'metric-003', 'pass', 100.00, 'Incident count meets threshold.', JSON_OBJECT('extracted_value', 2, 'comparison', '>=', 'threshold', 1), NOW()),
('result-004', 'ver-001', 'metric-004', 'pass', 100.00, 'Document submitted on time.', JSON_OBJECT('on_time', TRUE, 'days_late', 0), NOW()),
('result-005', 'ver-002', 'metric-001', 'pass', 100.00, 'All required sections found.', JSON_OBJECT('sections_found', JSON_ARRAY('Introduction', 'Findings', 'Recommendations')), NOW()),
('result-006', 'ver-002', 'metric-002', 'pass', 100.00, 'All required keywords found.', JSON_OBJECT('count', 3, 'matches', JSON_ARRAY('compliance', 'regulation', 'policy')), NOW());

-- manual_reviews: reviewer_id is int
INSERT INTO manual_reviews (id, document_id, version_id, decision, remarks, findings, reviewer_id, reviewed_at) VALUES
('review-001', 'doc-001', 'ver-001', 'compliant', 'Seeded compliant review. All sections verified.', NULL, 2, NOW());

COMMIT;

