-- RICTMS Compliance Hub Seed Data (v1.1.2 Clean Baseline)
-- Aligned with actual MariaDB schema (auto-detected column names).

USE compliance_hub;

SET FOREIGN_KEY_CHECKS = 0;
CREATE TABLE IF NOT EXISTS mov_artifacts (
	id CHAR(36) NOT NULL,
	artifact_type VARCHAR(60) NOT NULL,
	scope VARCHAR(30) NOT NULL DEFAULT 'regional',
	title VARCHAR(255) NOT NULL,
	period_year INT NOT NULL,
	quarter INT NULL,
	unit_id INT NULL,
	status VARCHAR(30) NOT NULL DEFAULT 'draft',
	content_markdown LONGTEXT NOT NULL,
	metadata_json JSON NULL,
	created_by INT NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
TRUNCATE TABLE mov_artifacts;
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

ALTER TABLE issuances ADD COLUMN IF NOT EXISTS issuance_type VARCHAR(80) NULL AFTER description;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS applicability_scope TEXT NULL AFTER issuance_type;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS relevance_notes TEXT NULL AFTER applicability_scope;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS binding_nature VARCHAR(60) NULL AFTER relevance_notes;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS adoption_basis TEXT NULL AFTER binding_nature;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS applicable_provisions TEXT NULL AFTER adoption_basis;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS compliance_obligations TEXT NULL AFTER applicable_provisions;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS required_evidence TEXT NULL AFTER compliance_obligations;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS evidence_location TEXT NULL AFTER required_evidence;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS process_owner VARCHAR(160) NULL AFTER evidence_location;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS frequency_cadence VARCHAR(80) NULL AFTER process_owner;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(40) NULL AFTER frequency_cadence;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS gap_summary TEXT NULL AFTER compliance_status;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS action_required TEXT NULL AFTER gap_summary;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS target_date DATE NULL AFTER action_required;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS last_review_date DATE NULL AFTER target_date;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS quarterly_readiness VARCHAR(40) NULL AFTER last_review_date;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS q1_compliance_status VARCHAR(40) NULL AFTER quarterly_readiness;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS q2_compliance_status VARCHAR(40) NULL AFTER q1_compliance_status;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS q3_compliance_status VARCHAR(40) NULL AFTER q2_compliance_status;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS q4_compliance_status VARCHAR(40) NULL AFTER q3_compliance_status;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS register_added_at DATE NULL AFTER q4_compliance_status;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS is_amendment TINYINT(1) NOT NULL DEFAULT 0 AFTER relevance_notes;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS amended_issuance_number VARCHAR(100) NULL AFTER is_amendment;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS ict_amendment_notes TEXT NULL AFTER amended_issuance_number;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS attachment_file_name VARCHAR(255) NULL AFTER source_url;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS attachment_mime_type VARCHAR(120) NULL AFTER attachment_file_name;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS attachment_blob LONGBLOB NULL AFTER attachment_mime_type;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS attachment_uploaded_at DATETIME NULL AFTER attachment_blob;

-- Users: column is `active` (not is_active)
INSERT INTO users (id, email, passwordHash, first_name, last_name, role, active, created_at, updated_at) VALUES
(1, 'admin@rictms.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'System', 'Admin', 'super_admin', 1, NOW(), NOW()),
(2, 'reviewer@rictms.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'QA', 'Reviewer', 'reviewer', 1, NOW(), NOW()),
(3, 'focal@rictms.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'Unit', 'Focal', 'focal', 1, NOW(), NOW()),
(4, 'desktop.tech@rictms.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'Desktop', 'Technician', 'technician_desktop', 1, NOW(), NOW()),
(5, 'it.tech@rictms.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'IT', 'Technician', 'technician_it_support', 1, NOW(), NOW()),
(6, 'user1@example.com', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'Juan', 'Dela Cruz', 'user', 1, NOW(), NOW()),
(7, 'user2@example.com', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'Maria', 'Santos', 'user', 1, NOW(), NOW()),
(8, 'mjdibay@dswd.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'Mark John', 'Dibay', 'user', 1, NOW(), NOW());

-- Seed tickets (ticket_number format: DESK-YYYYMMDD-NNNN or IT-YYYYMMDD-NNNN)
INSERT INTO tickets (id, ticket_number, subject, description, ticket_type, priority, status, requester_id, assigned_to_id, resolution_notes, created_at, updated_at) VALUES
(UUID(), 'DESK-20250101-0001', 'My computer won''t turn on', 'Pressed the power button but nothing happens. No lights or fans.', 'desktop_support', 'high', 'assigned', 6, 4, NULL, NOW(), NOW()),
(UUID(), 'IT-20250101-0001', 'Cannot connect to the internet', 'Getting "No internet access" despite being connected to the office WiFi.', 'it_support', 'medium', 'assigned', 7, 5, NULL, NOW(), NOW()),
(UUID(), 'DESK-20250101-0002', 'Printer not printing', 'Document sent to shared printer but nothing comes out. Queue shows it pending.', 'desktop_support', 'low', 'open', 6, NULL, NULL, NOW(), NOW()),
(UUID(), 'IT-20250101-0002', 'Email not syncing on phone', 'Work email stopped syncing on my mobile device after password reset.', 'it_support', 'medium', 'resolved', 7, 5, 'Exchange profile was re-configured on the device. Issue resolved.', NOW(), NOW()),
-- mjdibay sample tickets: keyword auto-tag correction demo
-- "internet" keyword → auto-shifted to it_support (originally submitted as desktop_support)
(UUID(), 'IT-20250115-0001', 'Internet connectivity issue at workstation', 'My workstation cannot access the internet. Other devices on the same desk work fine. Possibly a cable or port issue.', 'it_support', 'medium', 'open', 8, NULL, NULL, NOW(), NOW()),
-- "printer repair" keyword → auto-shifted to desktop_support (originally submitted as it_support)
(UUID(), 'DESK-20250115-0001', 'Printer repair request — unit 3B shared printer', 'The shared printer in unit 3B is making a grinding noise and not feeding paper properly. Needs physical inspection and repair.', 'desktop_support', 'low', 'open', 8, NULL, NULL, NOW(), NOW());


-- Units: id is auto_increment int; columns: id, name, description, active, created_at
INSERT INTO units (id, name, description, active, created_at) VALUES
(1, 'Information Technology Unit', 'Handles ICT compliance and digital services.', 1, NOW()),
(2, 'Finance Unit', 'Handles financial compliance and reporting.', 1, NOW());

-- user_unit_access: user_id int, unit_id int
INSERT INTO user_unit_access (user_id, unit_id) VALUES
(1, 1), (1, 2),
(2, 1), (2, 2),
(3, 1),
(8, 1);

INSERT INTO role_definitions (`value`, `label`, `description`, `assignable`, `is_system`, `created_at`, `updated_at`) VALUES
('super_admin', 'Super Admin', 'Full system access including user and security administration.', 0, 1, NOW(), NOW()),
('reviewer', 'Reviewer / Compliance Officer', 'Consolidated compliance oversight and KPI monitoring input.', 1, 1, NOW(), NOW()),
('focal', 'Focal Person', 'Unit-level dashboard visibility and document operations.', 1, 1, NOW(), NOW()),
('technician', 'Technician', 'Operational support role with limited visibility.', 1, 1, NOW(), NOW()),
('auditor', 'Auditor', 'Read-only compliance and KPI access for audit.', 1, 1, NOW(), NOW());

INSERT INTO mov_artifacts (id, artifact_type, scope, title, period_year, quarter, unit_id, status, content_markdown, metadata_json, created_by, created_at, updated_at) VALUES
('mov-001', 'assessment_plan', 'regional', 'Assessment Plan Q1 2026', 2026, 1, 1, 'draft',
'# Assessment Plan\n\n## Institutional Context\n- Identify unit processes\n- Establish governance standards\n\n## Risk Analysis\n- Technical, operational, compliance risks\n\n## Treatment\n- Corrective actions and awareness plans\n\n## Validation\n- Pilot audits and readiness checks\n',
JSON_OBJECT('unitName', 'Information Technology Unit'), 2, NOW(), NOW()),
('mov-002', 'review_report', 'regional', 'ICT Document Review Report Q1 2026', 2026, 1, 1, 'draft',
'# ICT Document Review Report\n\n## Coverage\n- National and Regional\n\n## Findings\n- Relevance and validity checks\n\n## Action Plan\n| Item | Owner | Due | Status |\n|---|---|---|---|\n',
JSON_OBJECT('unitName', 'Information Technology Unit'), 2, NOW(), NOW()),
('mov-003', 'assessment_plan_year', 'regional', 'Year 1 - Context, Governance, Risk Foundation', 2026, NULL, 1, 'active', 'Map processes, governance standards, and baseline risk analysis with ISO/IEC 27001 and QMS alignment.', JSON_OBJECT('year_index', 1), 2, NOW(), NOW()),
('mov-004', 'assessment_plan_year', 'regional', 'Year 2 - Control Stabilization and Standardization', 2027, NULL, 1, 'active', 'Standardize SOPs, strengthen treatment rollout, and formalize quarterly management review.', JSON_OBJECT('year_index', 2), 2, NOW(), NOW()),
('mov-005', 'assessment_plan_year', 'regional', 'Year 3 - Integration and Capability Maturity', 2028, NULL, 1, 'active', 'Integrate cross-unit evidence traceability and mature KPI-linked control monitoring.', JSON_OBJECT('year_index', 3), 2, NOW(), NOW()),
('mov-006', 'assessment_plan_year', 'regional', 'Year 4 - Optimization and Audit Readiness', 2029, NULL, 1, 'active', 'Optimize recurring gaps and finalize complete audit-ready evidence packs.', JSON_OBJECT('year_index', 4), 2, NOW(), NOW()),
('mov-007', 'assessment_plan_year', 'regional', 'Year 5 - Sustainment and Continuous Improvement', 2030, NULL, 1, 'active', 'Institutionalize continuous improvement and sustain quality quarterly compliance reporting.', JSON_OBJECT('year_index', 5), 2, NOW(), NOW()),
('mov-008', 'assessment_schedule_entry', 'regional', 'Process Mapping and Governance Setup', 2026, 1, 1, 'planned', 'Initial governance and stakeholder assignment.', JSON_OBJECT('owner', 'ICT Process Owner', 'due_date', '2026-03-31', 'sample_seed', true), 2, NOW(), NOW()),
('mov-009', 'assessment_schedule_entry', 'regional', 'Risk Analysis and ISMS/QMS Mapping', 2026, 2, 1, 'planned', 'Quarterly risk analysis and framework mapping.', JSON_OBJECT('owner', 'Compliance Team', 'due_date', '2026-06-30', 'sample_seed', true), 2, NOW(), NOW()),
('mov-010', 'assessment_schedule_entry', 'regional', 'Risk Treatment and Awareness Rollout', 2026, 3, 1, 'planned', 'Implement treatment plan and run awareness sessions.', JSON_OBJECT('owner', 'Unit Heads', 'due_date', '2026-09-30', 'sample_seed', true), 2, NOW(), NOW()),
('mov-011', 'assessment_schedule_entry', 'regional', 'Pilot Audit and Readiness Validation', 2026, 4, 1, 'planned', 'Pilot audit and adjust documentation for readiness.', JSON_OBJECT('owner', 'Internal Audit Team', 'due_date', '2026-12-15', 'sample_seed', true), 2, NOW(), NOW());

-- Issuances: expanded ICT baseline (laws, circulars, memorandums, IRRs, standards)
INSERT INTO issuances (id, issuance_number, title, description, issuance_type, applicability_scope, relevance_notes, issuing_authority, issue_date, effectivity_date, source_url, is_active, created_at, updated_at) VALUES
('issuance-001', 'RA-10173', 'Data Privacy Act of 2012', 'Personal data protection law.', 'law', 'ICT operations, information security, data governance, safety controls', 'Core legal baseline for privacy governance and protection controls across ICT systems.', 'Congress of the Philippines', '2012-08-15', '2012-09-08', 'https://www.officialgazette.gov.ph/2012/08/15/republic-act-no-10173/', 1, NOW(), NOW()),
('issuance-002', 'RA-8792', 'E-Commerce Act of 2000', 'Legal recognition of electronic data messages and documents.', 'law', 'Digital transactions, e-government, records authenticity', 'Enables legally recognized electronic workflows and signatures in government operations.', 'Congress of the Philippines', '2000-06-14', '2000-06-14', 'https://www.officialgazette.gov.ph/2000/06/14/republic-act-no-8792/', 1, NOW(), NOW()),
('issuance-003', 'RA-10175', 'Cybercrime Prevention Act of 2012', 'Defines cybercrime offenses and response framework.', 'law', 'Cybersecurity operations, incident response, digital forensics support', 'Provides legal framework for cyber offense handling and investigation support.', 'Congress of the Philippines', '2012-09-12', '2012-09-12', 'https://www.officialgazette.gov.ph/2012/09/12/republic-act-no-10175/', 1, NOW(), NOW()),
('issuance-004', 'RA-10844', 'Department of Information and Communications Technology Act of 2015', 'Creates DICT and national ICT governance mandate.', 'law', 'ICT governance, national policy, e-government oversight', 'Defines institutional governance and policy roles for ICT administration.', 'Congress of the Philippines', '2016-05-23', '2016-05-23', 'https://www.officialgazette.gov.ph/2016/05/23/republic-act-no-10844/', 1, NOW(), NOW()),
('issuance-005', 'RA-10929', 'Free Internet Access in Public Places Act', 'Public internet access operations and implementation.', 'law', 'ICT operations, connectivity services, public digital access', 'Supports operational ICT service delivery and digital inclusion programs.', 'Congress of the Philippines', '2017-08-02', '2017-08-02', 'https://www.officialgazette.gov.ph/2017/08/02/republic-act-no-10929/', 1, NOW(), NOW()),
('issuance-006', 'RA-11032', 'Ease of Doing Business and Efficient Government Service Delivery Act', 'Improves service delivery and process streamlining.', 'law', 'Digital service governance, process automation, compliance timelines', 'Drives ICT-enabled public service modernization and turnaround control.', 'Congress of the Philippines', '2018-05-28', '2018-05-28', 'https://www.officialgazette.gov.ph/2018/05/28/republic-act-no-11032/', 1, NOW(), NOW()),
('issuance-007', 'RA-11313', 'Safe Spaces Act', 'Includes online gender-based sexual harassment provisions.', 'law', 'Online safety, platform governance, acceptable use controls', 'Relevant to online safety controls and harmful behavior policy governance.', 'Congress of the Philippines', '2019-04-17', '2019-04-17', 'https://www.officialgazette.gov.ph/2019/04/17/republic-act-no-11313/', 1, NOW(), NOW()),
('issuance-008', 'RA-11967', 'Internet Transactions Act of 2023', 'Regulates internet transactions and platform responsibilities.', 'law', 'Digital commerce operations, consumer protection, platform accountability', 'Supports trust, safety, and governance for internet transaction ecosystems.', 'Congress of the Philippines', '2023-12-05', '2023-12-05', 'https://www.officialgazette.gov.ph/2023/12/05/republic-act-no-11967/', 1, NOW(), NOW()),
('issuance-009', 'RA-12009', 'New Government Procurement Act', 'Revises and modernizes public procurement law.', 'law', 'ICT procurement governance, digital procurement controls', 'Modernized procurement governance affecting ICT acquisition lifecycle.', 'Congress of the Philippines', '2024-07-20', '2024-07-20', 'https://www.officialgazette.gov.ph/2024/07/20/republic-act-no-12009/', 1, NOW(), NOW()),
('issuance-010', 'RA-9184', 'Government Procurement Reform Act', 'Baseline procurement law with electronic procurement provisions.', 'law', 'Procurement operations, e-procurement controls, audit trail', 'Foundational procurement compliance reference for ICT projects and services.', 'Congress of the Philippines', '2003-01-10', '2003-01-10', 'https://www.officialgazette.gov.ph/2003/01/10/republic-act-no-9184/', 1, NOW(), NOW()),
('issuance-011', 'RA-9470', 'National Archives of the Philippines Act of 2007', 'Records lifecycle and archival governance.', 'law', 'Records governance, electronic records, continuity of evidence', 'Supports governance, auditability, and retention controls for ICT-managed records.', 'Congress of the Philippines', '2007-05-21', '2007-05-21', 'https://www.officialgazette.gov.ph/2007/05/21/republic-act-no-9470/', 1, NOW(), NOW()),
('issuance-012', 'RA-10173-IRR', 'Implementing Rules and Regulations of the Data Privacy Act of 2012', 'Operational rules for data privacy implementation.', 'irr', 'Operational privacy controls, breach handling, compliance implementation', 'Translates DPA legal requirements into operational and implementable controls.', 'National Privacy Commission', '2016-08-24', '2016-09-09', 'https://privacy.gov.ph/implementing-rules-and-regulations-of-republic-act-no-10173-known-as-the-data-privacy-act-of-2012/', 1, NOW(), NOW()),
('issuance-013', 'NPC-CIRCULARS', 'NPC Circulars and Advisories', 'Registry of NPC circulars and advisories including breach/privacy operations.', 'circular', 'Privacy operations, cybersecurity response, personal data handling', 'Covers operational circular-level obligations and implementation guidance.', 'National Privacy Commission', '2017-01-01', '2017-01-01', 'https://privacy.gov.ph/circulars/', 1, NOW(), NOW()),
('issuance-014', 'DICT-ISSUANCES', 'DICT Department Circulars', 'DICT department circular repository for ICT governance directives.', 'circular', 'ICT governance, operations, cybersecurity, continuity directives', 'Contains operational and governance-level ICT directives and circular guidance.', 'Department of Information and Communications Technology', '2017-01-01', '2017-01-01', 'https://dict.gov.ph/department-circulars', 1, NOW(), NOW()),
('issuance-015', 'COA-CIRCULARS', 'COA Circulars and Issuances', 'COA issuance repository used for governance and audit controls.', 'circular', 'Audit governance, internal controls, ICT control assurance', 'Supports auditable governance and control compliance references.', 'Commission on Audit', '2012-01-01', '2012-01-01', 'https://www.coa.gov.ph/issuances/circulars/', 1, NOW(), NOW()),
('issuance-016', 'DBM-NBC-ISSUANCES', 'DBM National Budget Circulars', 'Budget circular repository including ICT-related budgeting references.', 'circular', 'ICT budgeting, procurement planning, operational spending controls', 'Applicable to budget governance and ICT program/resource planning.', 'Department of Budget and Management', '2014-01-01', '2014-01-01', 'https://www.dbm.gov.ph/index.php/issuances/national-budget-circulars', 1, NOW(), NOW()),
('issuance-017', 'DBM-MEMO-ISSUANCES', 'DBM Memorandum Circulars', 'Memorandum circular repository for budget and administrative implementation.', 'memorandum', 'Governance implementation, budget compliance, operations management', 'Provides memorandum-level implementation guidance relevant to ICT programs.', 'Department of Budget and Management', '2014-01-01', '2014-01-01', 'https://www.dbm.gov.ph/index.php/issuances/memorandum-circulars', 1, NOW(), NOW()),
('issuance-018', 'GPPB-IRR-9184', 'GPPB IRR and Procurement Policy Issuances', 'Implementing guidance and policy issuances for government procurement.', 'irr', 'ICT procurement implementation, compliance procedures, governance controls', 'Operational procurement procedures and controls impacting ICT acquisitions.', 'Government Procurement Policy Board', '2016-01-01', '2016-01-01', 'https://gppb.gov.ph/laws/', 1, NOW(), NOW()),
('issuance-019', 'ISO-IEC-27001:2022', 'ISO/IEC 27001 Information Security Management Systems', 'International ISMS requirements for governance and control.', 'standard', 'Information security governance, risk management, control framework', 'Global baseline standard for security governance and control implementation.', 'ISO', '2022-10-25', '2022-10-25', 'https://www.iso.org/standard/82875.html', 1, NOW(), NOW()),
('issuance-020', 'ISO-IEC-27002:2022', 'ISO/IEC 27002 Information Security Controls', 'Control guidance supporting ISO/IEC 27001 implementation.', 'standard', 'Security operations, control design, governance assurance', 'Detailed control catalog used for practical security control implementation.', 'ISO', '2022-02-15', '2022-02-15', 'https://www.iso.org/standard/75652.html', 1, NOW(), NOW()),
('issuance-021', 'ISO-IEC-22301:2019', 'ISO 22301 Business Continuity Management Systems', 'Business continuity management requirements.', 'standard', 'Business continuity, disaster response readiness, operational resilience', 'Supports continuity planning, disruption management, and resilience governance.', 'ISO', '2019-10-31', '2019-10-31', 'https://www.iso.org/standard/75106.html', 1, NOW(), NOW()),
('issuance-022', 'ISO-IEC-27035', 'ISO/IEC 27035 Information Security Incident Management', 'Incident management guidance and controls.', 'standard', 'Incident response operations, cybersecurity event handling, safety posture', 'Applicable to cyber incident lifecycle and response governance.', 'ISO', '2023-01-01', '2023-01-01', 'https://www.iso.org/standard/78996.html', 1, NOW(), NOW()),
('issuance-023', 'NIST-CSF-2.0', 'NIST Cybersecurity Framework 2.0', 'Risk-based cybersecurity framework.', 'standard', 'Cybersecurity governance, risk management, control maturity', 'Widely used governance framework for improving cybersecurity capability.', 'NIST', '2024-02-26', '2024-02-26', 'https://www.nist.gov/cyberframework', 1, NOW(), NOW()),
('issuance-024', 'NIST-SP-800-61R2', 'NIST SP 800-61r2 Computer Security Incident Handling Guide', 'Guidance for incident handling lifecycle.', 'standard', 'Incident response operations, cybersecurity procedures, escalation', 'Operational playbook reference for response process and coordination.', 'NIST', '2012-08-01', '2012-08-01', 'https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final', 1, NOW(), NOW()),
('issuance-025', 'NIST-SP-800-34R1', 'NIST SP 800-34r1 Contingency Planning Guide', 'Contingency planning guidance for information systems.', 'standard', 'Business continuity, disaster recovery, operations resilience', 'Supports disaster response and continuity program design and testing.', 'NIST', '2010-05-01', '2010-05-01', 'https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final', 1, NOW(), NOW()),
('issuance-026', 'RA-11032-IRR', 'IRR of RA 11032 (Ease of Doing Business)', 'Operational rules for service delivery and process digitization.', 'irr', 'Service process redesign, digital submission channels, transaction traceability, and ICT-enabled workflow controls.', 'Originally service-delivery focused but includes explicit electronic processing and digital service requirements that affect ICT governance and implementation controls.', 'Anti-Red Tape Authority', '2019-07-17', '2019-07-17', 'https://arta.gov.ph/', 1, NOW(), NOW()),
('issuance-027', 'RA-9184-2024-IRR', 'Updated IRR/Rules under RA 9184 Procurement Regime', 'Updated procurement implementation guidance with electronic procurement emphasis.', 'irr', 'Public procurement lifecycle, e-procurement controls, digital bid records, and audit-ready ICT evidence handling.', 'Originally procurement-focused framework with expanded electronic procurement and digital controls impacting ICT systems and operations.', 'Government Procurement Policy Board', '2024-01-01', '2024-01-01', 'https://gppb.gov.ph/laws/', 1, NOW(), NOW()),
('issuance-028', 'RA-9470-IRR', 'IRR/Policy Guidance under National Archives Framework', 'Records governance implementation guidance with electronic records treatment.', 'irr', 'Records lifecycle governance, electronic records retention, digital archiving controls, and evidence continuity requirements.', 'Originally archives/records governance domain but includes ICT-relevant obligations for electronic records handling and system-supported records assurance.', 'National Archives of the Philippines', '2010-01-01', '2010-01-01', 'https://nationalarchives.gov.ph/', 1, NOW(), NOW()),
('issuance-029', 'RA-11202', 'Philippine Identification System Act', 'National digital identity framework law.', 'law', 'Digital identity governance, data sharing controls, identity assurance, and service integration controls.', 'Establishes foundational digital identity and data governance controls used by ICT-enabled public services and interoperable government systems.', 'Congress of the Philippines', '2018-08-06', '2018-08-06', 'https://www.officialgazette.gov.ph/2018/08/06/republic-act-no-11202/', 1, NOW(), NOW()),
('issuance-030', 'RA-11659', 'Public Service Act (Amendment)', 'Liberalization update affecting telecommunications and digital infrastructure sectors.', 'law', 'Telecommunications governance, digital infrastructure investment controls, and service continuity implications for ICT operations.', 'While not originally an ICT-specific law, it has direct impact on telecom and digital infrastructure governance relevant to ICT planning and resilience.', 'Congress of the Philippines', '2022-03-21', '2022-04-10', 'https://www.officialgazette.gov.ph/2022/03/21/republic-act-no-11659/', 1, NOW(), NOW()),
('issuance-031', 'EO-170-2022', 'Executive Order No. 170, s. 2022', 'Mandates adoption of digital payments for government disbursements and collections.', 'executive_order', 'Government digital payments operations, platform interoperability, service security, and financial ICT controls.', 'EO-level policy direction requiring ICT-enabled digital payment channels and related governance, security, and operational compliance controls.', 'Office of the President', '2022-05-12', '2022-05-12', 'https://www.officialgazette.gov.ph/2022/05/12/executive-order-no-170-s-2022/', 1, NOW(), NOW()),
('issuance-032', 'NCSP-2023-2028', 'National Cybersecurity Plan 2023–2028', 'National strategic cybersecurity plan for resilience and cyber capability maturity.', 'plan', 'Cybersecurity governance, incident readiness, risk management, sector coordination, and cyber resilience implementation.', 'Strategic national cyber roadmap used to align ICT security priorities, capability development, incident preparedness, and governance maturity targets.', 'Department of Information and Communications Technology', '2023-01-01', '2023-01-01', 'https://dict.gov.ph/national-cybersecurity-plan-2023-2028/', 1, NOW(), NOW()),
('issuance-033', 'ISO-IEC-27701:2019', 'ISO/IEC 27701 Privacy Information Management', 'Privacy extension for ISO/IEC 27001 and ISO/IEC 27002.', 'standard', 'Privacy control design, personal data lifecycle governance, and accountability extension for information security programs.', 'Strengthens privacy governance and data protection accountability for ICT systems handling personal information.', 'ISO', '2019-08-06', '2019-08-06', 'https://www.iso.org/standard/71670.html', 1, NOW(), NOW()),
('issuance-034', 'ISO-IEC-27017:2015', 'ISO/IEC 27017 Cloud Security Controls', 'Security controls guidance for cloud services.', 'standard', 'Cloud governance, shared responsibility controls, service security baselines, and supplier assurance for ICT operations.', 'Applicable to cloud-based ICT operations and third-party service control assurance.', 'ISO', '2015-12-15', '2015-12-15', 'https://www.iso.org/standard/43757.html', 1, NOW(), NOW()),
('issuance-035', 'NIST-SP-800-53R5', 'NIST SP 800-53 Rev. 5 Security and Privacy Controls', 'Comprehensive security and privacy control catalog.', 'standard', 'Security and privacy control baselines, risk management, assurance testing, and governance control mapping.', 'Provides detailed control baselines for security and privacy governance in ICT environments.', 'NIST', '2020-09-23', '2020-09-23', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final', 1, NOW(), NOW()),
('issuance-036', 'NPC-CIRCULAR-16-03', 'NPC Circular No. 16-03 (Personal Data Breach Management)', 'Breach management and notification guidance under data privacy regime.', 'circular', 'Breach response operations, incident reporting timelines, notification governance, and evidence handling.', 'Provides concrete breach response obligations and timing controls critical to ICT incident governance and compliance.', 'National Privacy Commission', '2016-12-08', '2016-12-08', 'https://privacy.gov.ph/circulars/', 1, NOW(), NOW()),
('issuance-037', 'DICT-CYBER-INDEX', 'DICT Cybersecurity Policies and Advisories Index', 'Reference index for DICT cybersecurity advisories and policy issuances.', 'circular', 'Cybersecurity operational guidance, sector advisories, and implementation references for ICT units.', 'Expands searchable DICT cyber references used for practical operational alignment and compliance implementation.', 'Department of Information and Communications Technology', '2017-01-01', '2017-01-01', 'https://dict.gov.ph/cybersecurity/', 1, NOW(), NOW()),
('issuance-038', 'RA-9485', 'Anti-Red Tape Act of 2007', 'Public service reform law to reduce red tape and improve frontline service delivery.', 'law', 'Public service process governance, service standards, transparency, and workflow simplification for citizen-facing offices.', 'Required by government agencies for service efficiency and anti-red-tape compliance; directly relevant to ICT-enabled service workflows and process digitization.', 'Congress of the Philippines', '2007-06-02', '2007-06-02', 'https://lawphil.net/statutes/repacts/ra2007/ra_9485_2007.html', 1, NOW(), NOW()),
('issuance-039', 'EO-2-2016', 'Executive Order No. 2, s. 2016 (Freedom of Information)', 'Operationalizes access to information in the executive branch.', 'executive_order', 'Public information access, transparency workflows, records disclosure handling, and request-response governance in public service operations.', 'Supports public-service transparency obligations and process controls for information handling, including ICT-enabled request management and records retrieval.', 'Office of the President', '2016-07-23', '2016-07-23', 'https://www.officialgazette.gov.ph/2016/07/23/executive-order-no-2-s-2016/', 1, NOW(), NOW()),
('issuance-040', 'RA-12254', 'E-Governance Act', 'Digital governance law for modernization of government services and interoperability.', 'law', 'Digital public service delivery, interoperability, process digitization, and service governance for government agencies.', 'Public-service relevant law for ICT-enabled government modernization and operational governance of digital service systems.', 'Congress of the Philippines', '2025-09-11', '2025-09-11', 'https://www.officialgazette.gov.ph/', 1, NOW(), NOW()),
('issuance-041', 'AO-NO-02-S-2025', 'Administrative Order No. 02, s. 2025', 'Internal office administrative order for governance/operations implementation.', 'internal policy', 'Internal office governance controls, process compliance, and implementation guidance.', 'Included as internal policy issuance for office-level compliance and evidence tracking.', 'Department of Social Welfare and Development', '2025-01-01', '2025-01-01', NULL, 1, NOW(), NOW()),
('issuance-042', 'AO-NO-10-S-2025', 'Administrative Order No. 10, s. 2025', 'Internal office administrative order for governance/operations implementation.', 'internal policy', 'Internal office governance controls, process compliance, and implementation guidance.', 'Included as internal policy issuance for office-level compliance and evidence tracking.', 'Department of Social Welfare and Development', '2025-01-01', '2025-01-01', NULL, 1, NOW(), NOW()),
('issuance-043', 'AO-2015-009', 'Administrative Order 2015-009', 'Internal office administrative order for governance/operations implementation.', 'internal policy', 'Internal office governance controls, process compliance, and implementation guidance.', 'Included as internal policy issuance for office-level compliance and evidence tracking.', 'Department of Social Welfare and Development', '2015-01-01', '2015-01-01', NULL, 1, NOW(), NOW()),
('issuance-044', 'AO-2018-001', 'Administrative Order 2018-001', 'Internal office administrative order for governance/operations implementation.', 'internal policy', 'Internal office governance controls, process compliance, and implementation guidance.', 'Included as internal policy issuance for office-level compliance and evidence tracking.', 'Department of Social Welfare and Development', '2018-01-01', '2018-01-01', NULL, 1, NOW(), NOW()),
('issuance-045', 'AO-2019-020', 'Administrative Order 2019-020', 'Internal office administrative order for governance/operations implementation.', 'internal policy', 'Internal office governance controls, process compliance, and implementation guidance.', 'Included as internal policy issuance for office-level compliance and evidence tracking.', 'Department of Social Welfare and Development', '2019-01-01', '2019-01-01', NULL, 1, NOW(), NOW()),
('issuance-046', 'AO-2024-002', 'Administrative Order 2024-002', 'Internal office administrative order for governance/operations implementation.', 'internal policy', 'Internal office governance controls, process compliance, and implementation guidance.', 'Included as internal policy issuance for office-level compliance and evidence tracking.', 'Department of Social Welfare and Development', '2024-01-01', '2024-01-01', NULL, 1, NOW(), NOW()),
('issuance-047', 'AO-2024-003', 'Administrative Order 2024-003', 'Internal office administrative order for governance/operations implementation.', 'internal policy', 'Internal office governance controls, process compliance, and implementation guidance.', 'Included as internal policy issuance for office-level compliance and evidence tracking.', 'Department of Social Welfare and Development', '2024-01-01', '2024-01-01', NULL, 1, NOW(), NOW()),
('issuance-048', 'MC-2012-020', 'Memorandum Circular 2012-020', 'Internal office memorandum circular for process and governance implementation.', 'internal policy', 'Internal process directives, operational controls, and office implementation instructions.', 'Included as internal policy issuance for office-level compliance and operational consistency.', 'Department of Social Welfare and Development', '2012-01-01', '2012-01-01', NULL, 1, NOW(), NOW()),
('issuance-049', 'MC-2023-011', 'Memorandum Circular 2023-011', 'Internal office memorandum circular for process and governance implementation.', 'internal policy', 'Internal process directives, operational controls, and office implementation instructions.', 'Included as internal policy issuance for office-level compliance and operational consistency.', 'Department of Social Welfare and Development', '2023-01-01', '2023-01-01', NULL, 1, NOW(), NOW()),
('issuance-050', 'MC-2024-003', 'Memorandum Circular 2024-003', 'Internal office memorandum circular for process and governance implementation.', 'internal policy', 'Internal process directives, operational controls, and office implementation instructions.', 'Included as internal policy issuance for office-level compliance and operational consistency.', 'Department of Social Welfare and Development', '2024-01-01', '2024-01-01', NULL, 1, NOW(), NOW()),
('issuance-051', 'NPC-CIRCULAR-17-01', 'NPC Circular No. 17-01 (Registration of Data Processing Systems)', 'NPC circular containing operational obligations, including Data Protection Officer designation/registration responsibilities under privacy compliance implementation.', 'circular', 'Data privacy governance, compliance registration, accountability assignment, and DPO-related operational compliance controls.', 'Key implementation circular used in practice for DPO-related accountability and privacy compliance operations.', 'National Privacy Commission', '2017-08-21', '2017-09-09', 'https://privacy.gov.ph/circulars/', 1, NOW(), NOW());

UPDATE issuances
SET is_amendment = 1,
	amended_issuance_number = 'RA-11032',
	ict_amendment_notes = 'Introduces digital process provisions, electronic transaction handling, and ICT-supported compliance checkpoints into a non-ICT-origin law.'
WHERE issuance_number = 'RA-11032-IRR';

UPDATE issuances
SET is_amendment = 1,
	amended_issuance_number = 'RA-9184',
	ict_amendment_notes = 'Adds/clarifies ICT-related procurement controls such as electronic submissions, platform governance, and digital audit traceability.'
WHERE issuance_number = 'RA-9184-2024-IRR';

UPDATE issuances
SET is_amendment = 1,
	amended_issuance_number = 'RA-9470',
	ict_amendment_notes = 'Introduces ICT-related requirements for electronic records integrity, lifecycle management, and digital retention controls.'
WHERE issuance_number = 'RA-9470-IRR';

UPDATE issuances
SET applicability_scope = 'Applies to ICT owners, compliance reviewers, system custodians, records handlers, procurement focal staff, and service process owners. Covers governance policy creation, day-to-day control operations, incident and exception handling, lifecycle monitoring, and audit evidence management across planning, implementation, and continuous improvement phases. Includes obligations for system access governance, data handling boundaries, records retention, coordination with oversight offices, and evidence traceability for legal and audit inspection.'
WHERE issuance_type = 'law';

UPDATE issuances
SET relevance_notes = 'Provides enforceable legal obligations that define minimum compliance expectations, accountability boundaries, and consequences for non-compliance. Used as the primary basis for control mapping, policy updates, compliance attestations, and supersession checks when newer laws amend or replace prior legal requirements. Legal issuances should be interpreted as source-of-truth requirements for mandatory controls, and every implementation decision should be traceable to a specific provision, responsible office, affected process, and supporting compliance evidence.'
WHERE issuance_type = 'law';

UPDATE issuances
SET binding_nature = 'mandatory',
	adoption_basis = 'Statutory and executive mandate adopted as compulsory compliance baseline for ISMS legal obligations and governance controls.',
	applicable_provisions = 'Establish legal requirements for data protection, cybersecurity, records, procurement, and digital governance controls applicable to agency ICT operations.',
	compliance_obligations = 'Maintain evidence of implementation, assign accountable owners, perform periodic review, and document corrective actions for identified gaps.'
WHERE issuance_type IN ('law', 'irr', 'executive_order', 'circular', 'memorandum');

UPDATE issuances
SET binding_nature = 'adopted_policy_baseline',
	adoption_basis = 'Adopted by management as recognized external framework/reference to support ISMS control design, assessment, and continuous improvement.',
	applicable_provisions = 'Use framework clauses and control guidance to map applicable controls, risk treatment priorities, and monitoring checkpoints.',
	compliance_obligations = 'Document mapped controls, maintain alignment evidence, perform regular gap reviews, and update implementation roadmap when standards change.'
WHERE issuance_type IN ('standard', 'guideline');

UPDATE issuances
SET binding_nature = 'adopted_policy_baseline',
	adoption_basis = 'Internal governance issuance approved by management and adopted for mandatory execution within covered units and processes.',
	applicable_provisions = 'Defines internal policy directives, operational procedures, and governance responsibilities for covered business and ICT activities.',
	compliance_obligations = 'Assign process owner, maintain implementation evidence, report quarterly readiness status, and close action items within approved target dates.'
WHERE issuance_type IN ('internal policy', 'plan');

UPDATE issuances
SET register_added_at = COALESCE(register_added_at, DATE(created_at));

UPDATE issuances
SET q1_compliance_status = COALESCE(q1_compliance_status, 'compliant'),
	q2_compliance_status = COALESCE(q2_compliance_status, 'compliant'),
	q3_compliance_status = COALESCE(q3_compliance_status, 'compliant'),
	q4_compliance_status = COALESCE(q4_compliance_status, 'compliant');

UPDATE issuances
SET applicability_scope = 'Applies to compliance implementation teams translating legal mandates into executable controls, procedures, and reporting routines. Covers operational interpretation, implementation timelines, required artifacts, escalation pathways, and conformance verification activities for affected ICT and business processes. Includes procedure-level definitions of who performs each control, required review cadence, documentation templates, breach/incident response checkpoints, and accountability handoffs between focal units, reviewers, and management approvers.'
WHERE issuance_type = 'irr';

UPDATE issuances
SET relevance_notes = 'Defines implementation-level requirements that operationalize broad legal provisions into specific, testable compliance behaviors. Used to design checklists, assign responsibilities, validate procedural completeness, and evaluate whether legal duties are being executed consistently in practice. IRR references are essential when assessing whether implementation quality is sufficient, because they describe expected artifacts, timing, process controls, and measurable conformity points that legal text alone may not explicitly detail.'
WHERE issuance_type = 'irr';

UPDATE issuances
SET applicability_scope = 'Applies to operating units executing recurring compliance and control activities under regulator-issued updates. Covers periodic submission rules, advisory-driven control adjustments, incident and reporting obligations, and short-cycle governance updates requiring immediate process alignment. Circulars apply to day-to-day operational governance where agencies must rapidly align forms, procedures, and reporting behavior to updated regulator direction, including transition windows and interim controls pending full policy revision.'
WHERE issuance_type = 'circular';

UPDATE issuances
SET relevance_notes = 'Provides current administrative guidance and control clarifications that often drive immediate process changes without requiring statutory amendments. Used to keep operational controls synchronized with regulator expectations, close interpretation gaps, and maintain defensible audit readiness. Circular-level guidance is highly relevant for compliance timing and interpretation because it often defines what reviewers will treat as acceptable implementation practice during audits and formal assessments.'
WHERE issuance_type = 'circular';

UPDATE issuances
SET applicability_scope = 'Applies to departments implementing managerial directives, budget and coordination instructions, and inter-office compliance actions. Covers assignment of accountable units, execution sequencing, internal monitoring requirements, and communication controls for organization-wide ICT governance activities. Memorandum applicability includes internal rollout planning, designated focal accountability, reporting deadlines, approval routing, and governance escalation workflows required to operationalize policy intent in real organizational settings.'
WHERE issuance_type = 'memorandum';

UPDATE issuances
SET relevance_notes = 'Documents directive-level implementation intent for how offices should execute governance and compliance responsibilities. Used as evidence of administrative alignment, role clarity, and procedural adoption, especially when formal law or IRR provisions require local operationalization. Memoranda are frequently the practical bridge between policy and execution, making them relevant for proving organizational adoption, assigned ownership, and control institutionalization across units.'
WHERE issuance_type = 'memorandum';

UPDATE issuances
SET applicability_scope = 'Applies to information security, cybersecurity, resilience, and continuity practitioners designing and operating control frameworks. Covers risk assessment, control selection, incident lifecycle response, recovery planning, testing cadence, and maturity measurement across technical and organizational layers. Standards are applicable to policy architecture, technical control baselines, governance committee review, evidence model design, and capability maturity roadmaps used to continuously improve risk posture.'
WHERE issuance_type = 'standard';

UPDATE issuances
SET relevance_notes = 'Provides internationally recognized control and framework references used to benchmark governance quality, strengthen operational discipline, and improve assurance outcomes. Used to structure policy baselines, define measurable safeguards, and support transition planning when local requirements evolve or supersede existing controls. Standards references are especially relevant for harmonizing multi-framework compliance, improving audit defensibility, and translating high-level regulatory intent into concrete, testable control practices.'
WHERE issuance_type = 'standard';

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
('doc-008', 'Finance Compliance Report Q1 2026', 'Quarterly Report', '2026Q1', '2026', 'pending', 1, @sample_text, 2, 3, 0, '2026-04-05 10:00:00', '2026-04-05 10:00:00'),
-- IT Unit — January 2026 monthly incident report
('doc-009', 'IT Unit Incident Summary January 2026', 'Incident Report', '202601', '2026', 'ready', 1, @sample_text, 1, 1, 0, '2026-02-03 08:30:00', '2026-02-03 08:30:00'),
-- Finance Unit — February 2026 monthly compliance memo
('doc-010', 'Finance Compliance Memo February 2026', 'Compliance Report', '202602', '2026', 'pending', 1, @sample_text, 2, 3, 0, '2026-03-04 11:00:00', '2026-03-04 11:00:00'),
-- 2025 Jan–Mar monthly sample reports for Documents module (pending queue)
('doc-017', 'IT Security Assessment January 2025', 'Monthly Report', '202501', '2025', 'pending', 1, @sample_text, 1, 3, 0, '2025-02-05 09:10:00', '2025-02-05 09:10:00'),
('doc-018', 'IT Security Assessment February 2025', 'Monthly Report', '202502', '2025', 'pending', 1, @sample_text, 1, 3, 0, '2025-03-05 09:10:00', '2025-03-05 09:10:00'),
('doc-019', 'IT Security Assessment March 2025', 'Monthly Report', '202503', '2025', 'pending', 1, @sample_text, 1, 3, 0, '2025-04-05 09:10:00', '2025-04-05 09:10:00'),
('doc-020', 'Finance Risk Report January 2025', 'Monthly Report', '202501', '2025', 'pending', 1, @sample_text, 2, 3, 0, '2025-02-05 09:20:00', '2025-02-05 09:20:00'),
('doc-021', 'Finance Risk Report February 2025', 'Monthly Report', '202502', '2025', 'pending', 1, @sample_text, 2, 3, 0, '2025-03-05 09:20:00', '2025-03-05 09:20:00'),
('doc-022', 'Finance Risk Report March 2025', 'Monthly Report', '202503', '2025', 'pending', 1, @sample_text, 2, 3, 0, '2025-04-05 09:20:00', '2025-04-05 09:20:00');

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
 'text/html', @sample_text, 'Initial seed version', 3, '2026-04-05 10:00:00'),
('ver-009', 'doc-009', 1, 'IT_Incident_Jan_2026.pdf', 'documents/seed-it-incident-202601.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">IT_Incident_Jan_2026.pdf</div></div><h1>IT Unit Incident Summary — January 2026</h1><h2>Introduction</h2><p>This summary documents all ICT incidents for January 2026. Incidents are tracked against our security policy and applicable regulations.</p><h2>Findings</h2><p>Total incidents: 5 incidents logged in January. All incidents were resolved within SLA. Policy compliance maintained at 100%. No regulation violations recorded. Security controls effective.</p><h2>Recommendations</h2><p>Continue monthly incident tracking. Align incident categories with updated regulation references. Review compliance thresholds before Q1 close.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 1, '2026-02-03 08:30:00'),
('ver-010', 'doc-010', 1, 'Finance_Compliance_Feb_2026.pdf', 'documents/seed-fin-compliance-202602.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Compliance_Feb_2026.pdf</div></div><h1>Finance Compliance Memo — February 2026</h1><h2>Introduction</h2><p>February 2026 compliance memo covering fiscal regulation updates and internal policy adherence for the Finance Unit.</p><h2>Findings</h2><p>All compliance obligations met. One new regulation issued by oversight body — policy update in progress. Total incidents: 0 incidents in February. Budget compliance at 93%.</p><h2>Recommendations</h2><p>Complete policy update for new regulation by March 15. Schedule compliance training refresher. Prepare for Q1 2026 close compliance audit.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 3, '2026-03-04 11:00:00'),
('ver-017', 'doc-017', 1, 'IT_Security_Assessment_Jan_2025.pdf', 'documents/seed-it-sec-202501.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">IT_Security_Assessment_Jan_2025.pdf</div></div><h1>IT Security Assessment — January 2025</h1><h2>Executive Summary</h2><p>January assessment for ICT security controls and compliance posture.</p><h2>Risk Analysis</h2><p>Compliance, regulation, and policy checks completed. Total incidents: 2.</p><h2>Mitigation Plan</h2><p>Patch management and vulnerability scanning cadence reinforced.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 3, '2025-02-05 09:10:00'),
('ver-018', 'doc-018', 1, 'IT_Security_Assessment_Feb_2025.pdf', 'documents/seed-it-sec-202502.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">IT_Security_Assessment_Feb_2025.pdf</div></div><h1>IT Security Assessment — February 2025</h1><h2>Executive Summary</h2><p>February assessment for ICT security controls and compliance posture.</p><h2>Risk Analysis</h2><p>Compliance, regulation, and policy checks completed. Total incidents: 3.</p><h2>Mitigation Plan</h2><p>Endpoint hardening and backup verification actions tracked.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 3, '2025-03-05 09:10:00'),
('ver-019', 'doc-019', 1, 'IT_Security_Assessment_Mar_2025.pdf', 'documents/seed-it-sec-202503.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">IT_Security_Assessment_Mar_2025.pdf</div></div><h1>IT Security Assessment — March 2025</h1><h2>Executive Summary</h2><p>March assessment for ICT security controls and compliance posture.</p><h2>Risk Analysis</h2><p>Compliance, regulation, and policy checks completed. Total incidents: 1.</p><h2>Mitigation Plan</h2><p>Improve vulnerability scanning coverage and patch reporting.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 3, '2025-04-05 09:10:00'),
('ver-020', 'doc-020', 1, 'Finance_Risk_Report_Jan_2025.pdf', 'documents/seed-fin-risk-202501.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Risk_Report_Jan_2025.pdf</div></div><h1>Finance Risk Report — January 2025</h1><h2>Budget Summary</h2><p>January budget and risk profile review for Finance Unit.</p><h2>Variance Analysis</h2><p>Compliance, regulation, and policy checks completed. Total incidents: 2.</p><h2>Recommendations</h2><p>Strengthen reporting controls and reconciliation practices.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 3, '2025-02-05 09:20:00'),
('ver-021', 'doc-021', 1, 'Finance_Risk_Report_Feb_2025.pdf', 'documents/seed-fin-risk-202502.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Risk_Report_Feb_2025.pdf</div></div><h1>Finance Risk Report — February 2025</h1><h2>Budget Summary</h2><p>February budget and risk profile review for Finance Unit.</p><h2>Variance Analysis</h2><p>Compliance, regulation, and policy checks completed. Total incidents: 1.</p><h2>Recommendations</h2><p>Improve procurement variance tracking and governance.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 3, '2025-03-05 09:20:00'),
('ver-022', 'doc-022', 1, 'Finance_Risk_Report_Mar_2025.pdf', 'documents/seed-fin-risk-202503.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Risk_Report_Mar_2025.pdf</div></div><h1>Finance Risk Report — March 2025</h1><h2>Budget Summary</h2><p>March budget and risk profile review for Finance Unit.</p><h2>Variance Analysis</h2><p>Compliance, regulation, and policy checks completed. Total incidents: 2.</p><h2>Recommendations</h2><p>Finalize quarter-end controls and audit evidence package.</p></body></html>'),
 'text/html', @sample_text, 'Initial seed version', 3, '2025-04-05 09:20:00');

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

-- ──────────────────────────────────────────────────────────────────────────────
-- Unit-targeted metric templates (2 per type — 1 IT, 1 Finance).
-- Combined with the 4 global templates above this gives 3 of each type in total.
-- IT templates apply only to document_type='ICT Security Assessment' for unit 1.
-- Finance templates apply only to document_type='Finance Risk Report' for unit 2.
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO metric_templates (id, name, description, metric_type, rule_config, pass_criteria, weight, is_active, created_at, updated_at) VALUES
('metric-005', 'ICT Risk Report Sections',       'Verifies ICT security assessments contain Executive Summary, Risk Analysis, and Mitigation Plan.',    'section_check',  JSON_OBJECT('required_sections', JSON_ARRAY('Executive Summary', 'Risk Analysis', 'Mitigation Plan')),                                                               JSON_OBJECT('all_present', TRUE),                       2, 1, NOW(), NOW()),
('metric-006', 'ICT Security Keyword Check',     'Checks that ICT security terms (cybersecurity, vulnerability, patch) appear in the document.',        'keyword_check',  JSON_OBJECT('keywords', JSON_ARRAY('cybersecurity', 'vulnerability', 'patch'),        'min_matches', 2, 'case_sensitive', FALSE, 'whole_word', FALSE),              JSON_OBJECT('min_matches', 2),                          1, 1, NOW(), NOW()),
('metric-007', 'Vulnerability Count Extraction', 'Extracts and validates the reported vulnerability count is non-negative.',                             'property_check', JSON_OBJECT('extraction_keywords', JSON_ARRAY('total vulnerabilities', 'vulnerabilities found'), 'comparison', '>=', 'expected_values', JSON_ARRAY(0)),           JSON_OBJECT('comparison', '>=', 'threshold', 0),        1, 1, NOW(), NOW()),
('metric-008', 'ICT Assessment Deadline Check',  'Validates ICT security assessments are submitted by the 5th of the month following the report period.','date_check',     JSON_OBJECT('submission_frequency', 'monthly', 'deadline_day', 5,  'deadline_month_offset', 1, 'max_days_late', 2),                                          JSON_OBJECT('on_time', TRUE),                           2, 1, NOW(), NOW()),
('metric-009', 'Finance Report Sections',        'Verifies Finance risk reports contain Budget Summary, Variance Analysis, and Recommendations.',        'section_check',  JSON_OBJECT('required_sections', JSON_ARRAY('Budget Summary', 'Variance Analysis', 'Recommendations')),                                                           JSON_OBJECT('all_present', TRUE),                       2, 1, NOW(), NOW()),
('metric-010', 'Finance Terminology Check',      'Checks that Finance-specific terms (audit, budget, variance) appear in the document.',                 'keyword_check',  JSON_OBJECT('keywords', JSON_ARRAY('audit', 'budget', 'variance'),                    'min_matches', 2, 'case_sensitive', FALSE, 'whole_word', FALSE),              JSON_OBJECT('min_matches', 2),                          1, 1, NOW(), NOW()),
('metric-011', 'Transaction Count Extraction',   'Extracts and validates the reported transaction count is at least 1.',                                 'property_check', JSON_OBJECT('extraction_keywords', JSON_ARRAY('total transactions', 'transactions processed'), 'comparison', '>=', 'expected_values', JSON_ARRAY(1)),           JSON_OBJECT('comparison', '>=', 'threshold', 1),        1, 1, NOW(), NOW()),
('metric-012', 'Finance Report Deadline Check',  'Validates Finance Risk Reports are submitted by the 7th of the month following the report period.',    'date_check',     JSON_OBJECT('submission_frequency', 'monthly', 'deadline_day', 7,  'deadline_month_offset', 1, 'max_days_late', 2),                                          JSON_OBJECT('on_time', TRUE),                           2, 1, NOW(), NOW());

INSERT INTO metric_applicability (id, metric_id, unit_id, document_type) VALUES
('map-005', 'metric-005', 1, 'ICT Security Assessment'),
('map-006', 'metric-006', 1, 'ICT Security Assessment'),
('map-007', 'metric-007', 1, 'ICT Security Assessment'),
('map-008', 'metric-008', 1, 'ICT Security Assessment'),
('map-009', 'metric-009', 2, 'Finance Risk Report'),
('map-010', 'metric-010', 2, 'Finance Risk Report'),
('map-011', 'metric-011', 2, 'Finance Risk Report'),
('map-012', 'metric-012', 2, 'Finance Risk Report');

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
('red', 0, 74.99, 'error', NOW(), NOW())
ON DUPLICATE KEY UPDATE
	min_score = VALUES(min_score),
	max_score = VALUES(max_score),
	color = VALUES(color),
	updated_at = NOW();

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

-- ──────────────────────────────────────────────────────────────────────────────
-- Metric-module test documents.
--   doc-011: IT  — ICT Security Assessment  (triggers metric-001..008: global + IT targeted)
--   doc-012: Fin — Finance Risk Report      (triggers metric-001..004 + 009..012: global + Finance targeted)
--   doc-013: IT  — Policy Document          (triggers only global metric-001..004)
--   doc-014: Fin — Policy Document          (triggers only global metric-001..004)
-- ──────────────────────────────────────────────────────────────────────────────
SET @ict_text    = 'Executive Summary. This report presents the ICT security assessment for February 2026. Risk Analysis. Cybersecurity vulnerabilities were identified and patched. Mitigation Plan. Security patch cycle accelerated. Introduction. This document covers all ICT compliance and security activities. Findings. Three observations noted. Total incidents: 3. Total vulnerabilities: 7 vulnerabilities found and remediated. Compliance with regulation maintained. Security policy updated. Patch deployment rate 100%. Recommendations. Strengthen vulnerability scanning cadence. Update cybersecurity policy annually. Review patch management procedure.';
SET @finance_text= 'Budget Summary. Finance Unit risk report for February 2026. Budget utilization at 92%. Variance Analysis. Variance of 8% against approved allocation noted. Total transactions: 250 transactions processed. Audit compliance maintained at 100%. Recommendations. Revise budget allocation methodology. Expedite procurement clearance. Introduction. This report covers Finance compliance and risk activities. Findings. Total incidents: 1 documentation gap identified. All financial statements submitted on time. Compliance with fiscal regulation maintained. Policy adherence at 96%. Budget performance within acceptable range.';
SET @policy_text  = 'Introduction. This policy document covers compliance obligations for the reporting period. All policies and regulations were reviewed. Findings. Compliance rate maintained at 98%. Total incidents: 2 incidents logged. Policy adherence confirmed at 97%. Regulation updates implemented on schedule. Recommendations. Strengthen compliance monitoring. Schedule policy review for next quarter.';
SET @pending_it_text = 'Introduction. This IT unit pending document is for review queue testing. Findings. Draft controls for asset inventory and endpoint hardening were prepared. Recommendations. Complete evidence attachments and submit for compliance validation.';
SET @pending_fin_text = 'Introduction. This Finance unit pending document is for review queue testing. Findings. Draft controls for procurement monitoring and reconciliation were prepared. Recommendations. Finalize variance evidence and submit for compliance validation.';

INSERT INTO documents (id, title, document_type, period, year, status, current_version, extracted_text, unit_id, uploaded_by, is_deleted, created_at, updated_at) VALUES
('doc-011', 'ICT Security Assessment February 2026',  'ICT Security Assessment', '202602', '2026', 'ready',   1, @ict_text,     1, 3, 0, '2026-03-03 09:00:00', '2026-03-03 09:00:00'),
('doc-012', 'Finance Risk Report February 2026',       'Finance Risk Report',     '202602', '2026', 'ready',   1, @finance_text, 2, 3, 0, '2026-03-04 10:00:00', '2026-03-04 10:00:00'),
('doc-013', 'IT Division Policy Review February 2026', 'Policy Document',         '202602', '2026', 'ready',   1, @policy_text,  1, 3, 0, '2026-03-03 14:00:00', '2026-03-03 14:00:00'),
('doc-014', 'Finance Division Policy Update Feb 2026', 'Policy Document',         '202602', '2026', 'ready',   1, @policy_text,  2, 3, 0, '2026-03-04 15:00:00', '2026-03-04 15:00:00'),
('doc-015', 'IT Unit Pending Operations Report Mar 2026', 'Operations Report',    '202603', '2026', 'pending', 1, @pending_it_text,  1, 3, 0, '2026-03-06 08:30:00', '2026-03-06 08:30:00'),
('doc-016', 'Finance Unit Pending Budget Memo Mar 2026',  'Budget Memo',          '202603', '2026', 'pending', 1, @pending_fin_text, 2, 3, 0, '2026-03-06 09:00:00', '2026-03-06 09:00:00');

INSERT INTO document_versions (id, document_id, version_number, file_name, file_path, file_blob, mime_type, file_size, checksum, preview_path, preview_blob, preview_mime_type, extracted_text, change_notes, uploaded_by, created_at) VALUES
('ver-011', 'doc-011', 1, 'ICT_Security_Assessment_Feb2026.pdf', 'documents/seed-it-sec-202602.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">ICT_Security_Assessment_Feb2026.pdf</div></div><h1>ICT Security Assessment \u2014 February 2026</h1><h2>Executive Summary</h2><p>Cybersecurity activities review for February 2026. Vulnerability scanning completed. Patch deployment 100%.</p><h2>Risk Analysis</h2><p>Total vulnerabilities: 7 found and remediated. Cybersecurity patch applied to all systems.</p><h2>Mitigation Plan</h2><p>Accelerate patch cycle to bi-weekly. Enhance vulnerability scanning scope.</p><h2>Introduction</h2><p>ICT compliance and security activities for February 2026. All policies and regulations reviewed.</p><h2>Findings</h2><p>Total incidents: 3 resolved within SLA. Compliance with regulation confirmed. Policy adherence 100%.</p><h2>Recommendations</h2><p>Strengthen vulnerability scanning. Review cybersecurity policy annually.</p></body></html>'),
 'text/html', @ict_text, 'Initial seed version', 3, '2026-03-03 09:00:00'),
('ver-012', 'doc-012', 1, 'Finance_Risk_Report_Feb2026.pdf', 'documents/seed-fin-risk-202602.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Risk_Report_Feb2026.pdf</div></div><h1>Finance Risk Report \u2014 February 2026</h1><h2>Budget Summary</h2><p>Budget utilization: 92% of approved allocation. All budget lines within parameters.</p><h2>Variance Analysis</h2><p>8% variance against approved allocation. Total transactions: 250 processed. Audit compliance 100%.</p><h2>Recommendations</h2><p>Revise budget allocation methodology. Expedite procurement clearance.</p><h2>Introduction</h2><p>Finance compliance and risk activities for February 2026. Fiscal regulation and policy reviewed.</p><h2>Findings</h2><p>Total incidents: 1 documentation gap. Financial statements on time. Compliance with fiscal regulation. Policy adherence at 96%.</p></body></html>'),
 'text/html', @finance_text, 'Initial seed version', 3, '2026-03-04 10:00:00'),
('ver-013', 'doc-013', 1, 'IT_Policy_Review_Feb2026.pdf', 'documents/seed-it-policy-202602.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">IT_Policy_Review_Feb2026.pdf</div></div><h1>IT Division Policy Review \u2014 February 2026</h1><h2>Introduction</h2><p>Policy review covering ICT compliance obligations for February 2026. All policies and regulations reviewed.</p><h2>Findings</h2><p>Compliance rate at 98%. Total incidents: 2 incidents logged. Policy adherence at 97%. Regulation updates implemented.</p><h2>Recommendations</h2><p>Schedule quarterly policy reviews. Reinforce compliance monitoring.</p></body></html>'),
 'text/html', @policy_text, 'Initial seed version', 3, '2026-03-03 14:00:00'),
('ver-014', 'doc-014', 1, 'Finance_Policy_Update_Feb2026.pdf', 'documents/seed-fin-policy-202602.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Policy_Update_Feb2026.pdf</div></div><h1>Finance Division Policy Update \u2014 February 2026</h1><h2>Introduction</h2><p>Policy update covering Finance Unit compliance obligations. All policies and regulations reviewed.</p><h2>Findings</h2><p>Total incidents: 2 minor compliance incidents. Policy adherence at 97%. All regulation requirements met.</p><h2>Recommendations</h2><p>Continue quarterly policy reviews. Strengthen regulation monitoring.</p></body></html>'),
 'text/html', @policy_text, 'Initial seed version', 3, '2026-03-04 15:00:00'),
('ver-015', 'doc-015', 1, 'IT_Pending_Operations_Mar2026.pdf', 'documents/seed-it-pending-202603.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">IT_Pending_Operations_Mar2026.pdf</div></div><h1>IT Unit Pending Operations Report \u2014 March 2026</h1><h2>Introduction</h2><p>This is a pending review document for IT operations compliance testing.</p><h2>Findings</h2><p>Draft controls for asset inventory and endpoint hardening were prepared.</p><h2>Recommendations</h2><p>Complete evidence attachments and submit for final compliance review.</p></body></html>'),
 'text/html', @pending_it_text, 'Initial seed version', 3, '2026-03-06 08:30:00'),
('ver-016', 'doc-016', 1, 'Finance_Pending_Budget_Memo_Mar2026.pdf', 'documents/seed-fin-pending-202603.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), NULL,
 CONCAT(@html_base, '<div class="hdr"><strong>Document Viewer</strong><div style="font-size:0.85em;color:#555;margin-top:4px;">Finance_Pending_Budget_Memo_Mar2026.pdf</div></div><h1>Finance Unit Pending Budget Memo \u2014 March 2026</h1><h2>Introduction</h2><p>This is a pending review document for Finance operations compliance testing.</p><h2>Findings</h2><p>Draft controls for procurement monitoring and reconciliation were prepared.</p><h2>Recommendations</h2><p>Finalize variance evidence and submit for final compliance review.</p></body></html>'),
 'text/html', @pending_fin_text, 'Initial seed version', 3, '2026-03-06 09:00:00');

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

-- Metric results for metric-test documents (doc-011 through doc-014)
INSERT INTO metric_results (id, version_id, metric_template_id, status, score, message, evidence, computed_at) VALUES
-- doc-011 (ICT Security Assessment) — 4 global templates
('result-007', 'ver-011', 'metric-001', 'pass', 100.00, 'All required sections found.',         JSON_OBJECT('sections_found', JSON_ARRAY('Introduction', 'Findings', 'Recommendations')), NOW()),
('result-008', 'ver-011', 'metric-002', 'pass', 100.00, 'All required keywords found.',         JSON_OBJECT('count', 3, 'matches', JSON_ARRAY('compliance', 'regulation', 'policy')), NOW()),
('result-009', 'ver-011', 'metric-003', 'pass', 100.00, 'Incident count meets threshold.',      JSON_OBJECT('extracted_value', 3, 'comparison', '>=', 'threshold', 1), NOW()),
('result-010', 'ver-011', 'metric-004', 'pass', 100.00, 'Document submitted on time.',          JSON_OBJECT('on_time', TRUE, 'days_late', 0), NOW()),
-- doc-011 (ICT Security Assessment) — 4 IT-targeted templates
('result-011', 'ver-011', 'metric-005', 'pass', 100.00, 'All ICT risk sections found.',         JSON_OBJECT('sections_found', JSON_ARRAY('Executive Summary', 'Risk Analysis', 'Mitigation Plan')), NOW()),
('result-012', 'ver-011', 'metric-006', 'pass', 100.00, 'ICT security keywords found.',         JSON_OBJECT('count', 3, 'matches', JSON_ARRAY('cybersecurity', 'vulnerability', 'patch')), NOW()),
('result-013', 'ver-011', 'metric-007', 'pass', 100.00, 'Vulnerability count meets threshold.', JSON_OBJECT('extracted_value', 7, 'comparison', '>=', 'threshold', 0), NOW()),
('result-014', 'ver-011', 'metric-008', 'pass', 100.00, 'ICT assessment submitted on time.',    JSON_OBJECT('on_time', TRUE, 'days_late', 0), NOW()),
-- doc-012 (Finance Risk Report) — 4 global templates
('result-015', 'ver-012', 'metric-001', 'pass', 100.00, 'All required sections found.',         JSON_OBJECT('sections_found', JSON_ARRAY('Introduction', 'Findings', 'Recommendations')), NOW()),
('result-016', 'ver-012', 'metric-002', 'pass', 100.00, 'All required keywords found.',         JSON_OBJECT('count', 3, 'matches', JSON_ARRAY('compliance', 'regulation', 'policy')), NOW()),
('result-017', 'ver-012', 'metric-003', 'pass', 100.00, 'Incident count meets threshold.',      JSON_OBJECT('extracted_value', 1, 'comparison', '>=', 'threshold', 1), NOW()),
('result-018', 'ver-012', 'metric-004', 'pass', 100.00, 'Document submitted on time.',          JSON_OBJECT('on_time', TRUE, 'days_late', 0), NOW()),
-- doc-012 (Finance Risk Report) — 4 Finance-targeted templates
('result-019', 'ver-012', 'metric-009', 'pass', 100.00, 'All Finance risk sections found.',     JSON_OBJECT('sections_found', JSON_ARRAY('Budget Summary', 'Variance Analysis', 'Recommendations')), NOW()),
('result-020', 'ver-012', 'metric-010', 'pass', 100.00, 'Finance keywords found.',              JSON_OBJECT('count', 3, 'matches', JSON_ARRAY('audit', 'budget', 'variance')), NOW()),
('result-021', 'ver-012', 'metric-011', 'pass', 100.00, 'Transaction count meets threshold.',   JSON_OBJECT('extracted_value', 250, 'comparison', '>=', 'threshold', 1), NOW()),
('result-022', 'ver-012', 'metric-012', 'pass', 100.00, 'Finance report submitted on time.',    JSON_OBJECT('on_time', TRUE, 'days_late', 0), NOW()),
-- doc-013 (IT Policy Document) — global templates only (no unit-targeted match)
('result-023', 'ver-013', 'metric-001', 'pass', 100.00, 'All required sections found.',         JSON_OBJECT('sections_found', JSON_ARRAY('Introduction', 'Findings', 'Recommendations')), NOW()),
('result-024', 'ver-013', 'metric-002', 'pass', 100.00, 'All required keywords found.',         JSON_OBJECT('count', 3, 'matches', JSON_ARRAY('compliance', 'regulation', 'policy')), NOW()),
('result-025', 'ver-013', 'metric-003', 'pass', 100.00, 'Incident count meets threshold.',      JSON_OBJECT('extracted_value', 2, 'comparison', '>=', 'threshold', 1), NOW()),
('result-026', 'ver-013', 'metric-004', 'pass', 100.00, 'Document submitted on time.',          JSON_OBJECT('on_time', TRUE, 'days_late', 0), NOW()),
-- doc-014 (Finance Policy Document) — global templates only (no unit-targeted match)
('result-027', 'ver-014', 'metric-001', 'pass', 100.00, 'All required sections found.',         JSON_OBJECT('sections_found', JSON_ARRAY('Introduction', 'Findings', 'Recommendations')), NOW()),
('result-028', 'ver-014', 'metric-002', 'pass', 100.00, 'All required keywords found.',         JSON_OBJECT('count', 3, 'matches', JSON_ARRAY('compliance', 'regulation', 'policy')), NOW()),
('result-029', 'ver-014', 'metric-003', 'pass', 100.00, 'Incident count meets threshold.',      JSON_OBJECT('extracted_value', 2, 'comparison', '>=', 'threshold', 1), NOW()),
('result-030', 'ver-014', 'metric-004', 'pass', 100.00, 'Document submitted on time.',          JSON_OBJECT('on_time', TRUE, 'days_late', 0), NOW());

COMMIT;

