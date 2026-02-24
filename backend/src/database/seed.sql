-- Seed Data for RICTMS Compliance System
-- This script populates the database with initial test data
-- Run this after schema.sql

USE rictms_compliance;

-- Delete existing data (in correct order due to foreign keys)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE ticket_comments;
TRUNCATE TABLE tickets;
TRUNCATE TABLE document_issuances;
TRUNCATE TABLE version_comparisons;
TRUNCATE TABLE manual_reviews;
TRUNCATE TABLE metric_results;
TRUNCATE TABLE metric_applicability;
TRUNCATE TABLE metric_templates;
TRUNCATE TABLE document_versions;
TRUNCATE TABLE documents;
TRUNCATE TABLE issuances;
TRUNCATE TABLE user_unit_access;
TRUNCATE TABLE units;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert default users
-- Password for all users: Admin123! (hashed with bcrypt cost 10)
INSERT INTO users (email, passwordHash, first_name, last_name, role, active, created_at, updated_at) VALUES
('admin@rictms.gov.ph', '$2b$10$XYZ.mockHashForDevelopment.only.changeInProduction123456789', 'System', 'Administrator', 'super_admin', TRUE, NOW(), NOW()),
('reviewer1@rictms.gov.ph', '$2b$10$XYZ.mockHashForDevelopment.only.changeInProduction123456789', 'John', 'Reviewer', 'reviewer', TRUE, NOW(), NOW()),
('viewer1@rictms.gov.ph', '$2b$10$XYZ.mockHashForDevelopment.only.changeInProduction123456789', 'Jane', 'Viewer', 'auditor', TRUE, NOW(), NOW());

-- Insert sample units
INSERT INTO units (id, name, abbreviation, parent_id, is_active, created_at, updated_at) VALUES
('unit-001', 'Information Technology Unit', 'ITU', NULL, TRUE, NOW(), NOW()),
('unit-002', 'Finance Unit', 'FIN', NULL, TRUE, NOW(), NOW()),
('unit-003', 'Human Resources Unit', 'HR', NULL, TRUE, NOW(), NOW()),
('unit-004', 'Legal Unit', 'LEG', NULL, TRUE, NOW(), NOW()),
('unit-005', 'Operations Unit', 'OPS', NULL, TRUE, NOW(), NOW());

-- Insert sample issuances (regulatory references)
INSERT INTO issuances (id, issuance_number, title, issuing_authority, issue_date, effectivity_date, description, source_url, is_active, created_at, updated_at) VALUES
('issuance-001', 'RA-11032', 'Ease of Doing Business and Efficient Government Service Delivery Act', 'Congress of the Philippines', '2018-05-28', '2018-06-15', 'An act promoting ease of doing business and efficient delivery of government services', 'https://www.officialgazette.gov.ph/2018/05/28/republic-act-no-11032/', TRUE, NOW(), NOW()),
('issuance-002', 'RA-10173', 'Data Privacy Act of 2012', 'Congress of the Philippines', '2012-08-15', '2012-09-08', 'An act protecting individual personal information in information and communications systems', 'https://www.officialgazette.gov.ph/2012/08/15/republic-act-no-10173/', TRUE, NOW(), NOW()),
('issuance-003', 'EO-002', 'Freedom of Information Executive Order', 'Office of the President', '2016-07-23', '2016-07-23', 'Operationalizing the Peoples Constitutional Right to Information', 'https://www.officialgazette.gov.ph/2016/07/23/executive-order-no-2-s-2016/', TRUE, NOW(), NOW()),
('issuance-004', 'ARTA-2019-001', 'Anti-Red Tape Authority Guidelines', 'ARTA', '2019-05-21', '2019-06-01', 'Guidelines for the implementation of RA 11032', 'https://arta.gov.ph/', TRUE, NOW(), NOW()),
('issuance-005', 'CSC-MC-15-2016', 'Revised Guidelines on Notarization of Documents', 'Civil Service Commission', '2016-08-15', '2016-09-01', 'Updated guidelines for document notarization in government', NULL, TRUE, NOW(), NOW());

-- Insert sample documents
INSERT INTO documents (id, title, document_type, period, year, status, current_version, unit_id, uploaded_by, created_at, updated_at) VALUES
('doc-001', 'IT Security Policy Manual', 'Policy', 'Annual', '2024', 'ready', 1, 'unit-001', 'admin-001', NOW(), NOW()),
('doc-002', 'Financial Audit Report Q1 2024', 'Report', 'Q1', '2024', 'ready', 1, 'unit-002', 'admin-001', NOW(), NOW()),
('doc-003', 'HR Personnel Manual', 'Manual', 'Annual', '2024', 'processing', 1, 'unit-003', 'admin-001', NOW(), NOW()),
('doc-004', 'Legal Compliance Checklist', 'Checklist', 'Monthly', '2024', 'ready', 2, 'unit-004', 'admin-001', NOW(), NOW()),
('doc-005', 'Operations Standard Procedures', 'SOP', 'Annual', '2024', 'pending', 1, 'unit-005', 'admin-001', NOW(), NOW());

-- Insert sample document versions
INSERT INTO document_versions (id, document_id, version_number, file_name, file_path, mime_type, file_size, checksum, uploaded_by, created_at) VALUES
('ver-001', 'doc-001', 1, 'IT_Security_Policy_2024.pdf', 'storage/documents/doc-001/v1/IT_Security_Policy_2024.pdf', 'application/pdf', 2048576, 'abc123def456', 'admin-001', NOW()),
('ver-002', 'doc-002', 1, 'Financial_Audit_Q1_2024.pdf', 'storage/documents/doc-002/v1/Financial_Audit_Q1_2024.pdf', 'application/pdf', 1536000, 'def456ghi789', 'admin-001', NOW()),
('ver-003', 'doc-003', 1, 'HR_Personnel_Manual_2024.pdf', 'storage/documents/doc-003/v1/HR_Personnel_Manual_2024.pdf', 'application/pdf', 3072000, 'ghi789jkl012', 'admin-001', NOW()),
('ver-004', 'doc-004', 1, 'Legal_Checklist_v1.pdf', 'storage/documents/doc-004/v1/Legal_Checklist_v1.pdf', 'application/pdf', 512000, 'jkl012mno345', 'admin-001', DATE_SUB(NOW(), INTERVAL 30 DAY)),
('ver-005', 'doc-004', 2, 'Legal_Checklist_v2.pdf', 'storage/documents/doc-004/v2/Legal_Checklist_v2.pdf', 'application/pdf', 614400, 'mno345pqr678', 'user-001', NOW()),
('ver-006', 'doc-005', 1, 'Operations_SOP_2024.pdf', 'storage/documents/doc-005/v1/Operations_SOP_2024.pdf', 'application/pdf', 1024000, 'pqr678stu901', 'admin-001', NOW());

-- Link documents to issuances
INSERT INTO document_issuances (document_id, issuance_id) VALUES
('doc-001', 'issuance-002'), -- IT Security linked to Data Privacy Act
('doc-002', 'issuance-001'), -- Financial Audit linked to EODB Act
('doc-003', 'issuance-005'), -- HR Manual linked to CSC Guidelines
('doc-004', 'issuance-003'), -- Legal Checklist linked to FOI EO
('doc-004', 'issuance-004'); -- Legal Checklist also linked to ARTA Guidelines

-- Insert metric templates
INSERT INTO metric_templates (id, name, category, description, calculation_method, threshold, weight, is_active, created_at, updated_at) VALUES
('metric-001', 'Document Completeness Score', 'completeness', 'Measures if all required sections are present in the document', 'percentage', 85.0, 0.30, TRUE, NOW(), NOW()),
('metric-002', 'Version Consistency Check', 'consistency', 'Checks if version metadata is consistent across document versions', 'binary', 100.0, 0.20, TRUE, NOW(), NOW()),
('metric-003', 'Compliance Citation Coverage', 'compliance', 'Percentage of required citations present in the document', 'percentage', 90.0, 0.25, TRUE, NOW(), NOW()),
('metric-004', 'Document Age Warning', 'timeliness', 'Flags documents older than policy review period', 'days', 365.0, 0.15, TRUE, NOW(), NOW()),
('metric-005', 'Format Compliance', 'format', 'Checks if document follows standard formatting guidelines', 'percentage', 95.0, 0.10, TRUE, NOW(), NOW());

-- Link metrics to units and document types (applicability)
INSERT INTO metric_applicability (id, metric_id, unit_id, document_type) VALUES
('appl-001', 'metric-001', 'unit-001', 'Policy'),
('appl-002', 'metric-001', 'unit-002', 'Report'),
('appl-003', 'metric-002', NULL, NULL),  -- Applies to all units and document types
('appl-004', 'metric-003', 'unit-004', 'Checklist'),
('appl-005', 'metric-004', NULL, 'Policy'),  -- Applies to all Policy documents
('appl-006', 'metric-005', 'unit-003', 'Manual');

-- Insert metric results for documents
INSERT INTO metric_results (id, version_id, metric_id, score, passed, evidence, computed_at) VALUES
('result-001', 'ver-001', 'metric-001', 92.5, TRUE, '{"missing_sections": [], "present_sections": ["Introduction", "Scope", "Definitions", "Policies", "Procedures"]}', NOW()),
('result-002', 'ver-001', 'metric-002', 100.0, TRUE, '{"version_match": true, "metadata_consistent": true}', NOW()),
('result-003', 'ver-001', 'metric-003', 95.0, TRUE, '{"required_citations": 20, "present_citations": 19}', NOW()),
('result-004', 'ver-002', 'metric-001', 88.0, TRUE, '{"missing_sections": ["Appendix"], "present_sections": ["Executive Summary", "Findings", "Recommendations"]}', NOW()),
('result-005', 'ver-005', 'metric-003', 100.0, TRUE, '{"required_citations": 15, "present_citations": 15}', NOW());

-- Insert manual reviews
INSERT INTO manual_reviews (id, document_id, version_id, reviewer_id, decision, remarks, findings, reviewed_at) VALUES
('review-001', 'doc-001', 'ver-001', 'user-001', 'compliant', 'Well-structured IT security policy. Covers all essential areas. Minor suggestion: add more examples in incident response section.', '{"rating": 4, "sections_reviewed": ["Introduction", "Scope", "Policies"]}', NOW()),
('review-002', 'doc-002', 'ver-002', 'user-001', 'compliant', 'Excellent financial audit report. Comprehensive analysis with clear recommendations.', '{"rating": 5, "completeness": "excellent"}', NOW()),
('review-003', 'doc-004', 'ver-004', 'user-001', 'needs_revision', 'Good start but needs updates to reflect latest ARTA guidelines. Please revise sections 3 and 5.', '{"rating": 3, "issues": ["Section 3 outdated", "Section 5 incomplete"]}', DATE_SUB(NOW(), INTERVAL 15 DAY)),
('review-004', 'doc-004', 'ver-005', 'user-001', 'compliant', 'Revised version addresses previous concerns. Good compliance with latest guidelines.', '{"rating": 4, "improvements": ["Updated Section 3", "Completed Section 5"]}', NOW());

-- Insert version comparisons
INSERT INTO version_comparisons (id, document_id, version_a_id, version_b_id, compared_by_id, diff_output, compared_at) VALUES
('comp-001', 'doc-004', 'ver-004', 'ver-005', 'user-001', '{"added": ["Section 3.2: Updated ARTA compliance requirements", "Section 5.1: New FOI provisions"], "removed": ["Old Section 3.2"], "modified": ["Section 4: Clarified appeal process"], "similarity_score": 78.5}', NOW());

-- Insert sample tickets
INSERT INTO tickets (id, subject, description, category, priority, status, unit_id, document_id, reported_by, assigned_to, resolved_at, created_at, updated_at) VALUES
('ticket-001', 'Missing compliance citation in IT Policy', 'Section 4.2 of the IT Security Policy is missing a reference to RA-10173 (Data Privacy Act)', 'compliance', 'high', 'resolved', 'unit-001', 'doc-001', 'user-001', 'admin-001', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
('ticket-002', 'Financial report formatting issue', 'Tables in Q1 Financial Audit Report are not properly formatted according to DBM standards', 'format', 'medium', 'in_progress', 'unit-002', 'doc-002', 'user-002', 'admin-001', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW()),
('ticket-003', 'HR Manual outdated references', 'Personnel Manual contains references to superseded CSC memoranda. Needs update.', 'content', 'high', 'open', 'unit-003', 'doc-003', 'user-001', NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
('ticket-004', 'General system enhancement request', 'Add bulk document upload feature to reduce processing time', 'other', 'low', 'open', NULL, NULL, 'user-002', NULL, NULL, NOW(), NOW());

-- Insert ticket comments
INSERT INTO ticket_comments (id, ticket_id, user_id, comment, created_at) VALUES
('comment-001', 'ticket-001', 'admin-001', 'Acknowledged. Will review Section 4.2 and add the missing citation.', DATE_SUB(NOW(), INTERVAL 4 DAY)),
('comment-002', 'ticket-001', 'admin-001', 'Citation added and document updated. Please review version 2.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('comment-003', 'ticket-001', 'user-001', 'Reviewed and verified. Citation is now properly included. Closing ticket.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('comment-004', 'ticket-002', 'admin-001', 'Working on reformatting the tables. Will upload revised version by EOD.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('comment-005', 'ticket-003', 'user-001', 'Identified 7 outdated CSC memoranda references. List compiled and ready for revision.', DATE_SUB(NOW(), INTERVAL 1 DAY));

COMMIT;

-- Display seed data summary
SELECT 'Database seeded successfully!' AS Status;
SELECT COUNT(*) AS 'Users' FROM users;
SELECT COUNT(*) AS 'Units' FROM units;
SELECT COUNT(*) AS 'Issuances' FROM issuances;
SELECT COUNT(*) AS 'Documents' FROM documents;
SELECT COUNT(*) AS 'Document Versions' FROM document_versions;
SELECT COUNT(*) AS 'Metric Templates' FROM metric_templates;
SELECT COUNT(*) AS 'Metric Results' FROM metric_results;
SELECT COUNT(*) AS 'Manual Reviews' FROM manual_reviews;
SELECT COUNT(*) AS 'Tickets' FROM tickets;
SELECT COUNT(*) AS 'Ticket Comments' FROM ticket_comments;
