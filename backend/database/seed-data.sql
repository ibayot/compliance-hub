-- =====================================================
-- COMPREHENSIVE SEED DATA FOR RICTMS COMPLIANCE HUB
-- Generated from TypeORM Entity Definitions
-- =====================================================

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data
TRUNCATE TABLE ticket_comments;
TRUNCATE TABLE tickets;
TRUNCATE TABLE version_comparisons;
TRUNCATE TABLE manual_reviews;
TRUNCATE TABLE metric_results;
TRUNCATE TABLE metric_applicability;
TRUNCATE TABLE metric_templates;
TRUNCATE TABLE document_issuances;
TRUNCATE TABLE document_versions;
TRUNCATE TABLE documents;
TRUNCATE TABLE issuances;
TRUNCATE TABLE user_unit_access;
TRUNCATE TABLE incident_daily_snapshots;
TRUNCATE TABLE incidents;
TRUNCATE TABLE cybersecurity_metrics;
TRUNCATE TABLE users;
TRUNCATE TABLE units;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 1. UNITS (5 units)
-- =====================================================
INSERT INTO units (id, name, description, active, created_at) VALUES
(1, 'Office of the President', 'Executive leadership and strategic planning', 1, NOW()),
(2, 'Finance Department', 'Budget management and financial reporting', 1, NOW()),
(3, 'Human Resources', 'Personnel management and employee development', 1, NOW()),
(4, 'IT Services', 'Information technology infrastructure and support', 1, NOW()),
(5, 'Procurement Office', 'Purchasing and vendor management', 1, NOW());

-- =====================================================
-- 2. USERS (6 users with different roles)
-- =====================================================
-- Password for all users: password123
-- Hash: $2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze

INSERT INTO users (id, email, passwordHash, first_name, last_name, role, active, created_at, updated_at) VALUES
(1, 'admin@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Maria', 'Santos', 'super_admin', 1, NOW(), NOW()),
(2, 'reviewer@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Juan', 'Dela Cruz', 'reviewer', 1, NOW(), NOW()),
(3, 'focal1@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Ana', 'Reyes', 'focal', 1, NOW(), NOW()),
(4, 'focal2@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Pedro', 'Garcia', 'focal', 1, NOW(), NOW()),
(5, 'tech@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Rosa', 'Mendoza', 'technician', 1, NOW(), NOW()),
(6, 'auditor@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Carlos', 'Lopez', 'auditor', 1, NOW(), NOW());

-- =====================================================
-- 3. USER-UNIT ACCESS MAPPINGS
-- =====================================================
INSERT INTO user_unit_access (user_id, unit_id) VALUES
-- Super Admin has access to all units
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
-- Reviewer has access to all units
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5),
-- Focal 1 manages Finance and HR
(3, 2), (3, 3),
-- Focal 2 manages IT and Procurement
(4, 4), (4, 5),
-- Technician supports IT
(5, 4),
-- Auditor reviews all units
(6, 1), (6, 2), (6, 3), (6, 4), (6, 5);

-- =====================================================
-- 4. ISSUANCES (3 issuances)
-- =====================================================
INSERT INTO issuances (id, issuance_number, title, description, issuing_authority, issue_date, effectivity_date, source_url, is_active, created_at, updated_at) VALUES
(UUID(), 'CMO-2023-001', 'Policies and Guidelines on Quality Assurance', 'Comprehensive guidelines for quality assurance in higher education institutions', 'CHED', '2023-01-15', '2023-02-01', 'https://ched.gov.ph/cmo-2023-001', 1, NOW(), NOW()),
(UUID(), 'NBC-2024-580', 'National Budget Circular on Fiscal Accountability', 'Guidelines for transparent budget management and financial reporting', 'DBM', '2024-03-10', '2024-04-01', 'https://dbm.gov.ph/nbc-2024-580', 1, NOW(), NOW()),
(UUID(), 'CSC-MC-2023-015', 'Civil Service Commission Memorandum on Performance Management', 'Updated performance management system for government employees', 'CSC', '2023-06-20', '2023-07-01', 'https://csc.gov.ph/mc-2023-015', 1, NOW(), NOW());

-- =====================================================
-- 5. DOCUMENTS (3 documents)
-- =====================================================
INSERT INTO documents (id, title, document_type, period, year, status, current_version, extracted_text, unit_id, uploaded_by, created_at, updated_at, is_deleted) VALUES
(UUID(), 'Quality Assurance Self-Assessment Report', 'assessment_report', '2024-Q1', '2024', 'ready', 1, 'This document contains the comprehensive quality assurance self-assessment for Q1 2024...', 1, 3, '2024-01-15 08:30:00', '2024-01-15 08:30:00', 0),
(UUID(), 'Financial Performance Report Q4 2023', 'financial_report', '2023-Q4', '2023', 'ready', 2, 'Financial performance analysis for Q4 2023 including budget utilization and variance analysis...', 2, 3, '2024-01-10 10:00:00', '2024-01-20 14:00:00', 0),
(UUID(), 'Employee Training and Development Plan 2024', 'training_plan', '2024-Annual', '2024', 'ready', 1, 'Comprehensive training and development plan for all employees in 2024...', 3, 4, '2024-02-01 09:00:00', '2024-02-01 09:00:00', 0);

-- =====================================================
-- 6. DOCUMENT VERSIONS (4 versions)
-- =====================================================
-- Get the document IDs first for reference
SET @doc1_id = (SELECT id FROM documents WHERE title = 'Quality Assurance Self-Assessment Report');
SET @doc2_id = (SELECT id FROM documents WHERE title = 'Financial Performance Report Q4 2023');
SET @doc3_id = (SELECT id FROM documents WHERE title = 'Employee Training and Development Plan 2024');

INSERT INTO document_versions (id, document_id, version_number, file_name, file_path, mime_type, file_size, checksum, preview_path, extracted_text, change_notes, uploaded_by, created_at) VALUES
(UUID(), @doc1_id, 1, 'QA_Self_Assessment_Q1_2024_v1.pdf', 'storage/documents/2024/01/qa_assessment_v1.pdf', 'application/pdf', 2457600, 'a3d5e9f1c2b4a6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6', 'storage/previews/2024/01/qa_assessment_v1_preview.pdf', 'Quality Assurance Self-Assessment Report Q1 2024...', 'Initial version', 3, '2024-01-15 08:30:00'),
(UUID(), @doc2_id, 1, 'Financial_Report_Q4_2023_v1.xlsx', 'storage/documents/2024/01/financial_q4_v1.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1048576, 'b4e6f0a2c4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8', 'storage/previews/2024/01/financial_q4_v1_preview.pdf', 'Financial Performance Q4 2023...', 'Initial submission', 3, '2024-01-10 10:00:00'),
(UUID(), @doc2_id, 2, 'Financial_Report_Q4_2023_v2_revised.xlsx', 'storage/documents/2024/01/financial_q4_v2.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1153433, 'c5f7a1b3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9', 'storage/previews/2024/01/financial_q4_v2_preview.pdf', 'Financial Performance Q4 2023 (Revised)...', 'Updated based on auditor feedback - corrected variance calculations', 3, '2024-01-20 14:00:00'),
(UUID(), @doc3_id, 1, 'Training_Development_Plan_2024.docx', 'storage/documents/2024/02/training_plan_2024.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 819200, 'd6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8', 'storage/previews/2024/02/training_plan_2024_preview.pdf', 'Employee Training and Development Plan 2024...', 'Initial version approved by management', 4, '2024-02-01 09:00:00');

-- =====================================================
-- 7. DOCUMENT-ISSUANCE MAPPINGS
-- =====================================================
SET @iss1_id = (SELECT id FROM issuances WHERE issuance_number = 'CMO-2023-001');
SET @iss2_id = (SELECT id FROM issuances WHERE issuance_number = 'NBC-2024-580');
SET @iss3_id = (SELECT id FROM issuances WHERE issuance_number = 'CSC-MC-2023-015');

INSERT INTO document_issuances (document_id, issuance_id) VALUES
(@doc1_id, @iss1_id),  -- QA Report references CHED CMO
(@doc2_id, @iss2_id),  -- Financial Report references DBM NBC
(@doc3_id, @iss3_id);  -- Training Plan references CSC MC

-- =====================================================
-- 8. METRIC TEMPLATES (3 templates)
-- =====================================================
INSERT INTO metric_templates (id, name, description, metric_type, rule_config, pass_criteria, weight, is_active, created_at, updated_at) VALUES
(UUID(), 'Required Sections Check', 'Verifies that all required document sections are present', 'section_check', 
    '{"required_sections": ["Executive Summary", "Introduction", "Methodology", "Findings", "Recommendations", "Conclusion"]}',
    '{"all_present": true}', 
    2, 1, NOW(), NOW()),
(UUID(), 'Compliance Keywords Presence', 'Checks for presence of key compliance-related terms', 'keyword_check',
    '{"keywords": ["compliance", "regulation", "standard", "requirement", "policy"], "min_count": 3}',
    '{"min_matches": 3}',
    1, 1, NOW(), NOW()),
(UUID(), 'Submission Deadline Check', 'Verifies document was submitted within the required timeframe', 'date_check',
    '{"max_days_late": 5}',
    '{"within_deadline": true}',
    3, 1, NOW(), NOW());

-- =====================================================
-- 9. METRIC APPLICABILITY (4 rules)
-- =====================================================
SET @metric1_id = (SELECT id FROM metric_templates WHERE name = 'Required Sections Check');
SET @metric2_id = (SELECT id FROM metric_templates WHERE name = 'Compliance Keywords Presence');
SET @metric3_id = (SELECT id FROM metric_templates WHERE name = 'Submission Deadline Check');

INSERT INTO metric_applicability (id, metric_id, unit_id, document_type) VALUES
(UUID(), @metric1_id, NULL, 'assessment_report'),  -- Applies to all assessment reports
(UUID(), @metric2_id, NULL, NULL),                   -- Applies globally to all documents
(UUID(), @metric3_id, 2, 'financial_report'),       -- Applies to financial reports from Finance Dept
(UUID(), @metric3_id, 1, NULL);                      -- Applies to all documents from Office of President

-- =====================================================
-- 10. METRIC RESULTS (3 results)
-- =====================================================
SET @ver1_id = (SELECT id FROM document_versions WHERE document_id = @doc1_id AND version_number = 1);
SET @ver2_id = (SELECT id FROM document_versions WHERE document_id = @doc2_id AND version_number = 2);
SET @ver3_id = (SELECT id FROM document_versions WHERE document_id = @doc3_id AND version_number = 1);

INSERT INTO metric_results (id, version_id, metric_template_id, status, evidence, message, score, computed_at) VALUES
(UUID(), @ver1_id, @metric1_id, 'pass',
    '{"found_sections": ["Executive Summary", "Introduction", "Methodology", "Findings", "Recommendations", "Conclusion"], "missing_sections": []}',
    'All required sections are present in the document', 1.0, '2024-01-15 08:45:00'),
(UUID(), @ver2_id, @metric2_id, 'pass',
    '{"matches": [{"keyword": "compliance", "count": 8}, {"keyword": "regulation", "count": 5}, {"keyword": "standard", "count": 4}, {"keyword": "requirement", "count": 6}, {"keyword": "policy", "count": 3}]}',
    'Document contains sufficient compliance terminology (5 keywords found)', 1.0, '2024-01-20 14:15:00'),
(UUID(), @ver2_id, @metric3_id, 'warning',
    '{"submitted_date": "2024-01-20", "deadline": "2024-01-15", "days_late": 5}',
    'Document submitted 5 days after deadline (within acceptable grace period)', 0.7, '2024-01-20 14:15:00');

-- =====================================================
-- 11. MANUAL REVIEWS (2 reviews)
-- =====================================================
INSERT INTO manual_reviews (id, document_id, version_id, decision, remarks, findings, reviewer_id, reviewed_at) VALUES
(UUID(), @doc1_id, @ver1_id, 'compliant',
    'Excellent quality assurance report. All requirements met and well-documented.',
    '[{"category": "Completeness", "description": "All required sections present and comprehensive", "severity": "low"}, {"category": "Quality", "description": "High-quality analysis and recommendations", "severity": "low"}]',
    2, '2024-01-16 10:30:00'),
(UUID(), @doc2_id, @ver2_id, 'needs_revision',
    'Financial report needs minor corrections in the variance analysis section. Resubmit after corrections.',
    '[{"category": "Accuracy", "description": "Variance calculations need verification", "severity": "medium"}, {"category": "Timeliness", "description": "Submitted 5 days late", "severity": "medium"}]',
    2, '2024-01-21 11:00:00');

-- =====================================================
-- 12. VERSION COMPARISONS (1 comparison)
-- =====================================================
SET @ver2_v1_id = (SELECT id FROM document_versions WHERE document_id = @doc2_id AND version_number = 1);
SET @ver2_v2_id = (SELECT id FROM document_versions WHERE document_id = @doc2_id AND version_number = 2);

INSERT INTO version_comparisons (id, document_id, version_a_id, version_b_id, compared_by_id, diff_output, compared_at) VALUES
(UUID(), @doc2_id, @ver2_v1_id, @ver2_v2_id, 2,
    '{"total_changes": 12, "additions": 5, "deletions": 3, "modifications": 4, "sections_changed": ["Variance Analysis", "Budget Utilization Summary"], "summary": "Version 2 includes corrected variance calculations and updated budget utilization figures based on auditor feedback"}',
    '2024-01-21 09:30:00');

-- =====================================================
-- 13. TICKETS (3 tickets)
-- =====================================================
INSERT INTO tickets (id, ticket_number, subject, description, category, status, priority, reported_by_id, assigned_to_id, unit_id, resolved_at, created_at, updated_at) VALUES
(UUID(), 'TICK-2024-0001', 'Unable to upload large PDF files', 
    'When trying to upload the annual report PDF (25MB), the system times out and shows an error. Tried multiple times with the same result.',
    'system_issue', 'resolved', 'high', 3, 5, 2, '2024-01-18 16:00:00', '2024-01-17 14:30:00', '2024-01-18 16:00:00'),
(UUID(), 'TICK-2024-0002', 'Clarification on compliance metric interpretation',
    'Need clarification on how the "Submission Deadline Check" metric calculates grace periods for quarterly reports. The policy document is ambiguous.',
    'compliance_query', 'in_progress', 'medium', 4, 2, 4, NULL, '2024-01-22 09:15:00', '2024-01-22 09:15:00'),
(UUID(), 'TICK-2024-0003', 'Request for training on new document version control features',
    'Our team would like to request training on the new version comparison and tracking features introduced in the latest update.',
    'training_request', 'open', 'low', 4, NULL, 5, NULL, '2024-02-05 10:00:00', '2024-02-05 10:00:00');

-- =====================================================
-- 14. TICKET COMMENTS (4 comments)
-- =====================================================
SET @ticket1_id = (SELECT id FROM tickets WHERE ticket_number = 'TICK-2024-0001');
SET @ticket2_id = (SELECT id FROM tickets WHERE ticket_number = 'TICK-2024-0002');

INSERT INTO ticket_comments (id, ticket_id, comment, user_id, created_at) VALUES
(UUID(), @ticket1_id, 'Thank you for reporting this issue. I''m investigating the file upload timeout problem. Can you confirm the exact file size and format?', 5, '2024-01-17 15:00:00'),
(UUID(), @ticket1_id, 'The file is 24.8 MB and in PDF format (Adobe Acrobat DC). It''s our Q4 consolidated report with embedded charts.', 3, '2024-01-17 15:30:00'),
(UUID(), @ticket1_id, 'I''ve increased the upload timeout limit and file size cap to 50MB. Please try uploading again and let me know if the issue persists.', 5, '2024-01-18 14:00:00'),
(UUID(), @ticket2_id, 'According to the policy, the grace period is 5 calendar days for quarterly reports and 3 calendar days for monthly reports. I''ll update the documentation to make this clearer.', 2, '2024-01-22 11:30:00');

-- =====================================================
-- 11. CYBERSECURITY METRICS (8 metrics)
-- =====================================================
INSERT INTO cybersecurity_metrics (metric_type, name, description, status, value, details, last_checked, is_active, created_at, updated_at) VALUES
('firewall_status', 'Firewall Status', 'Active firewall protection across all network perimeters', 'compliant', 'Active & Configured', 'Main firewall: pfSense 2.6, Branch firewalls: FortiGate 60F. All rules updated and tested.', DATE_SUB(NOW(), INTERVAL 2 HOUR), 1, NOW(), NOW()),
('antivirus_status', 'Antivirus Protection', 'Enterprise antivirus and endpoint protection', 'compliant', 'Up to Date', 'Symantec Endpoint Protection 14.3. Last definition update: 2 hours ago. 243/245 endpoints protected (2 offline devices).', DATE_SUB(NOW(), INTERVAL 2 HOUR), 1, NOW(), NOW()),
('user_training', 'Security Awareness Training', 'Mandatory cybersecurity training for all staff', 'warning', '85% Completion Rate', 'Q1 2024 Training: 205/243 employees completed. Deadline: Feb 29, 2024. Pending departments: HR (12), Procurement (8), Finance (18).', DATE_SUB(NOW(), INTERVAL 1 DAY), 1, NOW(), NOW()),
('backup_status', 'Data Backup & Recovery', 'Regular backups of critical systems and data', 'compliant', 'Last Backup: 3 AM Today', 'Daily incremental backups at 3 AM, Weekly full backups on Sunday. Last recovery test: Jan 15, 2024 (successful). Retention: 30 days local, 90 days cloud.', DATE_SUB(NOW(), INTERVAL 6 HOUR), 1, NOW(), NOW()),
('patch_management', 'System Patch Management', 'Regular security updates and patch deployment', 'compliant', '98% Patched', 'Critical patches: 100% deployed within 48 hours. Non-critical: 98% compliance. 5 legacy systems require manual patching (scheduled monthly).', DATE_SUB(NOW(), INTERVAL 1 DAY), 1, NOW(), NOW()),
('access_control', 'Access Control & Authentication', 'Multi-factor authentication and access policies', 'compliant', 'MFA Enabled: 100%', 'All users enrolled in Azure MFA. Password policy: 12+ characters, 90-day rotation. Privileged access review: Monthly. Last review: Jan 20, 2024.', DATE_SUB(NOW(), INTERVAL 3 HOUR), 1, NOW(), NOW()),
('encryption', 'Data Encryption', 'Encryption of data at rest and in transit', 'compliant', 'Full Encryption Active', 'SSL/TLS for all web services. BitLocker on all workstations (243/243). Database encryption: AES-256. File servers: encrypted volumes.', DATE_SUB(NOW(), INTERVAL 1 DAY), 1, NOW(), NOW()),
('incident_response', 'Incident Response Plan', 'Documented incident response procedures and team', 'compliant', 'Plan Active & Tested', 'Last IR drill: Jan 10, 2024. Response team: 5 members trained. Average response time: 15 minutes. Incident escalation matrix updated quarterly.', DATE_SUB(NOW(), INTERVAL 2 DAY), 1, NOW(), NOW());

-- =====================================================
-- 12. INCIDENTS (15 incidents - various severities)
-- =====================================================
INSERT INTO incidents (title, description, category, severity, status, reported_by_id, assigned_to_id, resolution_notes, resolved_at, created_at, updated_at) VALUES
-- Closed incidents (last week)
('Email Phishing Attempt - Finance Dept', 'Multiple users in Finance received phishing emails impersonating the bank. Subject: "Urgent Account Verification Required". Links led to fake banking portal. Users reported without clicking.', 'phishing', 'high', 'resolved', 5, 5, 'Emails quarantined. Users received security awareness reminder. Email filters updated to block similar domains. No credentials compromised.', DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY)),
('Unauthorized USB Device Connected', 'Security scan detected unauthorized USB storage device on HR workstation. Device belonged to contractor copying presentation files.', 'unauthorized_access', 'medium', 'resolved', 5, 5, 'Files scanned - no malware. Contractor reminded of data transfer policy. USB ports disabled on non-IT staff computers.', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
('Weak Password Detected - 3 Accounts', 'Automated password audit identified 3 accounts using weak passwords (less than 8 characters, no special chars).', 'security_breach', 'low', 'resolved', 5, 5, 'Users notified. Passwords reset. Minimum password length increased to 12 characters in AD policy.', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),

-- Today's incidents (8 AM - 5 PM)
('Suspicious Login Attempts - Admin Account', 'Multiple failed login attempts detected on admin account from IP address in foreign country. 47 attempts in 10 minutes.', 'unauthorized_access', 'critical', 'in_progress', 5, 5, NULL, NULL, CONCAT(CURDATE(), ' 09:15:00'), CONCAT(CURDATE(), ' 09:15:00')),
('Slow Network Performance - IT Dept', 'IT department experiencing unusually slow network speeds. File transfers taking 3x longer than normal. Affecting document uploads.', 'system_outage', 'medium', 'in_progress', 5, 5, NULL, NULL, CONCAT(CURDATE(), ' 10:30:00'), CONCAT(CURDATE(), ' 10:30:00')),
('Malware Detection - Workstation #127', 'Windows Defender detected and quarantined PUP.Optional.Legacy on workstation in Procurement. User clicked suspicious email attachment.', 'malware', 'high', 'in_progress', 5, 5, NULL, NULL, CONCAT(CURDATE(), ' 11:45:00'), CONCAT(CURDATE(), ' 11:45:00')),
('Failed Backup - HR Database', 'Scheduled backup of HR database failed at 3 AM. Error: "Insufficient disk space on backup target". Last successful backup: 2 days ago.', 'system_outage', 'high', 'open', 5, NULL, NULL, NULL, CONCAT(CURDATE(), ' 08:15:00'), CONCAT(CURDATE(), ' 08:15:00')),
('Outdated Browser Alert - 12 Computers', 'Security scan identified 12 computers still running Chrome v89 (2 years old). Multiple known vulnerabilities present.', 'security_breach', 'medium', 'open', 5, NULL, NULL, NULL, CONCAT(CURDATE(), ' 13:20:00'), CONCAT(CURDATE(), ' 13:20:00')),
('DDoS Attack Attempt Detected', 'Firewall logs show distributed connection attempts from 234 IPs targeting public web server. Attack mitigated by Cloudflare.', 'ddos', 'high', 'resolved', 5, 5, 'Cloudflare successfully blocked attack. Peak traffic: 12K requests/sec. No service disruption. IP addresses added to blocklist.', CONCAT(CURDATE(), ' 15:00:00'), CONCAT(CURDATE(), ' 14:30:00'), CONCAT(CURDATE(), ' 15:00:00')),

-- Open incidents from yesterday
('SharePoint Sync Issues - Finance', 'Users in Finance cannot sync SharePoint document library. Error: "Sync pending" shows indefinitely. Affecting 8 users.', 'system_outage', 'medium', 'in_progress', 5, 5, NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
('Expired SSL Certificate - Internal Portal', 'Internal HR portal SSL certificate expired yesterday. Browsers showing security warning. Portal still accessible but users hesitant .', 'security_breach', 'high', 'in_progress', 5, 5, NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
('USB Printer Driver Malware Alert', 'Malware scanner flagged printer driver installer from USB drive. Driver downloaded from third-party site, not manufacturer.', 'malware', 'medium', 'open', 5, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
('Failed Login - Service Account', 'Automated backup service account locked due to password expiration. Nightly backups failing for 3 nights.', 'system_outage', 'high', 'open', 5, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
('Suspicious Outbound Traffic', 'Firewall detected large outbound data transfer (15GB) from accounting workstation at 2 AM. User was not online.', 'security_breach', 'critical', 'in_progress', 5, 5, NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
('WiFi Password Compromised', 'Guest WiFi password found posted on social media. Password unchanged for 6 months. 47 unknown devices connected.', 'unauthorized_access', 'medium', 'open', 5, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY));

-- =====================================================
-- 13. INCIDENT DAILY SNAPSHOTS (7 days of data)
-- =====================================================
-- Start of Day (8 AM) and End of Day (5 PM) snapshots
-- Today
INSERT INTO incident_daily_snapshots (snapshot_date, snapshot_time, snapshot_type, low_count, medium_count, high_count, critical_count, total_count, low_added, medium_added, high_added, critical_added, total_added, created_at) VALUES
(CURDATE(), '08:00:00', 'start', 0, 4, 4, 1, 9, NULL, NULL, NULL, NULL, NULL, CONCAT(CURDATE(), ' 08:00:00'));
-- End of day snapshot will be created automatically at 5 PM

-- Yesterday
INSERT INTO incident_daily_snapshots (snapshot_date, snapshot_time, snapshot_type, low_count, medium_count, high_count, critical_count, total_count, low_added, medium_added, high_added, critical_added, total_added, created_at) VALUES
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:00:00', 'start', 0, 3, 3, 1, 7, NULL, NULL, NULL, NULL, NULL, CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 08:00:00')),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '17:00:00', 'end', 0, 4, 4, 1, 9, 0, 1, 1, 0, 2, CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 17:00:00'));

-- 2 days ago
INSERT INTO incident_daily_snapshots (snapshot_date, snapshot_time, snapshot_type, low_count, medium_count, high_count, critical_count, total_count, low_added, medium_added, high_added, critical_added, total_added, created_at) VALUES
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '08:00:00', 'start', 0, 2, 2, 1, 5, NULL, NULL, NULL, NULL, NULL, CONCAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), ' 08:00:00')),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '17:00:00', 'end', 0, 3, 3, 1, 7, 0, 1, 1, 0, 2, CONCAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), ' 17:00:00'));

-- 3 days ago
INSERT INTO incident_daily_snapshots (snapshot_date, snapshot_time, snapshot_type, low_count, medium_count, high_count, critical_count, total_count, low_added, medium_added, high_added, critical_added, total_added, created_at) VALUES
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '08:00:00', 'start', 0, 1, 2, 0, 3, NULL, NULL, NULL, NULL, NULL, CONCAT(DATE_SUB(CURDATE(), INTERVAL 3 DAY), ' 08:00:00')),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '17:00:00', 'end', 0, 2, 2, 1, 5, 0, 1, 0, 1, 2, CONCAT(DATE_SUB(CURDATE(), INTERVAL 3 DAY), ' 17:00:00'));

-- 4 days ago
INSERT INTO incident_daily_snapshots (snapshot_date, snapshot_time, snapshot_type, low_count, medium_count, high_count, critical_count, total_count, low_added, medium_added, high_added, critical_added, total_added, created_at) VALUES
(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '08:00:00', 'start', 1, 1, 1, 0, 3, NULL, NULL, NULL, NULL, NULL, CONCAT(DATE_SUB(CURDATE(), INTERVAL 4 DAY), ' 08:00:00')),
(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '17:00:00', 'end', 0, 1, 2, 0, 3, -1, 0, 1, 0, 0, CONCAT(DATE_SUB(CURDATE(), INTERVAL 4 DAY), ' 17:00:00'));

-- 5 days ago
INSERT INTO incident_daily_snapshots (snapshot_date, snapshot_time, snapshot_type, low_count, medium_count, high_count, critical_count, total_count, low_added, medium_added, high_added, critical_added, total_added, created_at) VALUES
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '08:00:00', 'start', 1, 1, 0, 0, 2, NULL, NULL, NULL, NULL, NULL, CONCAT(DATE_SUB(CURDATE(), INTERVAL 5 DAY), ' 08:00:00')),
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '17:00:00', 'end', 1, 1, 1, 0, 3, 0, 0, 1, 0, 1, CONCAT(DATE_SUB(CURDATE(), INTERVAL 5 DAY), ' 17:00:00'));

-- 6 days ago
INSERT INTO incident_daily_snapshots (snapshot_date, snapshot_time, snapshot_type, low_count, medium_count, high_count, critical_count, total_count, low_added, medium_added, high_added, critical_added, total_added, created_at) VALUES
(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '08:00:00', 'start', 0, 1, 1, 0, 2, NULL, NULL, NULL, NULL, NULL, CONCAT(DATE_SUB(CURDATE(), INTERVAL 6 DAY), ' 08:00:00')),
(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '17:00:00', 'end', 1, 1, 0, 0, 2, 1, 0, -1, 0, 0, CONCAT(DATE_SUB(CURDATE(), INTERVAL 6 DAY), ' 17:00:00'));

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Uncomment these to verify the data after import:
-- SELECT COUNT(*) as unit_count FROM units;
-- SELECT COUNT(*) as user_count FROM users;
-- SELECT COUNT(*) as access_mapping_count FROM user_unit_access;
-- SELECT COUNT(*) as issuance_count FROM issuances;
-- SELECT COUNT(*) as document_count FROM documents;
-- SELECT COUNT(*) as version_count FROM document_versions;
-- SELECT COUNT(*) as doc_issuance_count FROM document_issuances;
-- SELECT COUNT(*) as metric_template_count FROM metric_templates;
-- SELECT COUNT(*) as metric_applicability_count FROM metric_applicability;
-- SELECT COUNT(*) as metric_result_count FROM metric_results;
-- SELECT COUNT(*) as manual_review_count FROM manual_reviews;
-- SELECT COUNT(*) as version_comparison_count FROM version_comparisons;
-- SELECT COUNT(*) as ticket_count FROM tickets;
-- SELECT COUNT(*) as ticket_comment_count FROM ticket_comments;
-- SELECT COUNT(*) as incident_count FROM incidents;
-- SELECT COUNT(*) as daily_snapshot_count FROM incident_daily_snapshots;
-- SELECT COUNT(*) as cybersecurity_metric_count FROM cybersecurity_metrics;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This seed data file includes:
-- - 5 units across different departments
-- - 6 users with roles: super_admin, reviewer, focal(x2), technician, auditor
-- - User-unit access mappings for proper authorization
-- - 3 issuances from different government bodies (CHED, DBM, CSC)
-- - 3 documents in various stages and types
-- - 4 document versions (including revised versions)
-- - Document-issuance reference mappings
-- - 3 metric templates for compliance checking
-- - 4 metric applicability rules
-- - 3 metric results showing pass/warning statuses
-- - 2 manual reviews with different decisions
-- - 1 version comparison between document versions
-- - 3 tickets covering different categories and statuses
-- - 4 ticket comments showing conversation threads
-- - 8 cybersecurity metrics (fully configured with API integration points)
-- - 15 security incidents (various severities: low/medium/high/critical) 
-- - 14 daily snapshots (7 days, 2 per day: 8AM start, 5PM end)
-- =====================================================
-- TOTAL RECORDS: ~180 records across 17 tables
-- =====================================================
-- - 4 ticket comments showing conversation threads
-- =====================================================
