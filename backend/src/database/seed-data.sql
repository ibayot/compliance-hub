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
('KPI-IT-ONTIME', 'On-time Compliance Submission', 'Percentage of compliance submissions received on or before deadline.', 1, 'measurement', '%', 'higher_is_better', 95, 0.4, 'monthly', 1, NOW(), NOW()),
('KPI-IT-QA', 'Quality Pass Rate', 'Percentage of submissions passing first compliance review.', 1, 'measurement', '%', 'higher_is_better', 90, 0.35, 'monthly', 1, NOW(), NOW()),
('KPI-IT-COMP', 'Critical Control Completed', 'Whether all critical controls for the period are completed.', 1, 'yes_no', 'yes/no', 'higher_is_better', 1, 0.25, 'monthly', 1, NOW(), NOW()),
('KPI-FIN-ONTIME', 'On-time Compliance Submission', 'Percentage of compliance submissions received on or before deadline.', 2, 'measurement', '%', 'higher_is_better', 95, 0.4, 'monthly', 1, NOW(), NOW()),
('KPI-FIN-QA', 'Quality Pass Rate', 'Percentage of submissions passing first compliance review.', 2, 'measurement', '%', 'higher_is_better', 90, 0.35, 'monthly', 1, NOW(), NOW()),
('KPI-FIN-COMP', 'Critical Control Completed', 'Whether all critical controls for the period are completed.', 2, 'yes_no', 'yes/no', 'higher_is_better', 1, 0.25, 'monthly', 1, NOW(), NOW());

INSERT INTO kpi_scoring_rules (`name`, `active`, `cap_score`, `floor_score`, `yes_score`, `no_score`, `created_at`, `updated_at`) VALUES
('default', 1, 100, 0, 100, 0, NOW(), NOW());

INSERT INTO kpi_thresholds (`band`, `min_score`, `max_score`, `color`, `created_at`, `updated_at`) VALUES
('green', 90, 100, 'success', NOW(), NOW()),
('amber', 75, 89.99, 'warning', NOW(), NOW()),
('red', 0, 74.99, 'error', NOW(), NOW());

INSERT INTO kpi_monitoring (`kpi_master_code`, `unit_id`, `period_year`, `period_month`, `actual_value`, `remarks`, `entered_by_user_id`, `entered_by_staff_id`, `entered_by_name`, `status`, `created_at`, `updated_at`) VALUES
('KPI-IT-ONTIME', 1, 2026, 2, 92, 'Slight delay due to document revisions.', 2, 'CO-1002', 'QA Reviewer', 'draft', NOW(), NOW()),
('KPI-IT-QA', 1, 2026, 2, 88, 'Two submissions required corrections.', 2, 'CO-1002', 'QA Reviewer', 'draft', NOW(), NOW()),
('KPI-IT-COMP', 1, 2026, 2, 1, 'All required controls completed.', 2, 'CO-1002', 'QA Reviewer', 'locked', NOW(), NOW()),
('KPI-FIN-ONTIME', 2, 2026, 2, 96, 'All reports submitted ahead of deadline.', 2, 'CO-1002', 'QA Reviewer', 'draft', NOW(), NOW()),
('KPI-FIN-QA', 2, 2026, 2, 91, 'Quality target achieved.', 2, 'CO-1002', 'QA Reviewer', 'draft', NOW(), NOW()),
('KPI-FIN-COMP', 2, 2026, 2, 0, 'One control pending final sign-off.', 2, 'CO-1002', 'QA Reviewer', 'draft', NOW(), NOW());

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

