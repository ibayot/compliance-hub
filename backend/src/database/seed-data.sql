-- RICTMS Compliance Hub - Seed Data
-- Generated to work with TypeORM auto-generated schema

-- 1. Insert sample units
INSERT INTO units (id, name, description, active, created_at) VALUES
(1, 'Office of the President', 'Executive office managing university-wide compliance', 1, NOW()),
(2, 'Academic Affairs', 'Oversees all academic programs and curriculum', 1, NOW()),
(3, 'Admin & Finance', 'Handles administrative and financial operations', 1, NOW()),
(4, 'Human Resources', 'Manages personnel and employee relations', 1, NOW()),
(5, 'ICT Services', 'Information and communications technology unit', 1, NOW());

-- 2. Insert sample users (password: password123 hashed with bcrypt cost=10)
-- Hash generated using: bcrypt.hashSync('password123', 10)
INSERT INTO users (id, email, passwordHash, first_name, last_name, role, active, created_at, updated_at) VALUES
(1, 'admin@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Juan', 'Dela Cruz', 'super_admin', 1, NOW(), NOW()),
(2, 'reviewer@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Maria', 'Santos', 'reviewer', 1, NOW(), NOW()),
(3, 'focal.president@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Pedro', 'Reyes', 'focal', 1, NOW(), NOW()),
(4, 'focal.academic@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Ana', 'Garcia', 'focal', 1, NOW(), NOW()),
(5, 'technician@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Carlos', 'Lopez', 'technician', 1, NOW(), NOW()),
(6, 'auditor@rictms.edu.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Rosa', 'Fernandez', 'auditor', 1, NOW(), NOW());

-- 3. Link users to units via user_unit_access
INSERT INTO user_unit_access (user_id, unit_id) VALUES
-- Admin has access to all units
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
-- Reviewer has access to most units
(2, 1), (2, 2), (2, 3),
-- Focal users assigned to specific units
(3, 1), -- President's office focal
(4, 2), -- Academic Affairs focal
-- Technician has access to ICT
(5, 5),
-- Auditor can access all for review
(6, 1), (6, 2), (6, 3), (6, 4), (6, 5);

-- 4. Insert sample issuances
INSERT INTO issuances (id, issuance_number, title, description, issuing_body, effectivity_date, source_url, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'CMO-2024-001', 'Quality Assurance Framework', 'Commission memorandum on institutional quality assurance', 'CHED', '2024-01-15', 'https://ched.gov.ph/cmo-2024-001', NOW()),
('22222222-2222-2222-2222-222222222222', 'RA-10912', 'Continuing Professional Development Act', 'Law requiring CPD for licensed professionals', 'Congress', '2016-07-21', 'http://legacy.senate.gov.ph/ra10912', NOW()),
('33333333-3333-3333-3333-333333333333', 'DBM-2023-005', 'Budget Execution Guidelines', 'Guidelines for government budget management', 'DBM', '2023-03-01', NULL, NOW());

-- 5. Insert sample documents
INSERT INTO documents (id, title, document_type, period, year, status, unit_id, uploaded_by, current_version, extracted_text, created_at, updated_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Annual Quality Assurance Report', 'QA Report', 'Annual', '2024', 'pending', 1, 1, 1, NULL, NOW(), NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Faculty Development Plan Q1', 'Development Plan', 'Q1', '2024', 'compliant', 2, 4, 1, 'Faculty development activities for first quarter...', NOW(), NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '2024 Budget Proposal', 'Budget Document', 'Annual', '2024', 'non_compliant', 3, 1, 2, 'Proposed budget allocation for fiscal year 2024...', NOW(), NOW());

-- 6. Insert sample document versions
INSERT INTO document_versions (id, document_id, version_number, file_name, file_path, mime_type, file_size, checksum, uploaded_by, created_at) VALUES
('aaaaaaaa-0001-0001-0001-version00001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 'qa-report-2024-v1.docx', '/uploads/documents/qa-report-2024-v1.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 524288, 'abc123def456', 1, NOW()),
('bbbbbbbb-0001-0001-0001-version00001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 'faculty-dev-q1-v1.docx', '/uploads/documents/faculty-dev-q1-v1.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 312000, 'def789ghi012', 4, NOW()),
('cccccccc-0001-0001-0001-version00001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 'budget-2024-v1.docx', '/uploads/documents/budget-2024-v1.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1048576, 'ghi345jkl678', 1, NOW()),
('cccccccc-0002-0002-0002-version00002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 2, 'budget-2024-v2.docx', '/uploads/documents/budget-2024-v2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1100000, 'jkl901mno234', 1, NOW());

-- 7. Link documents to issuances
INSERT INTO document_issuances (document_id, issuance_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333');

-- 8. Insert sample metric templates
INSERT INTO metric_templates (id, name, description, metric_type, rule_config, pass_criteria, weight, is_active, created_at, updated_at) VALUES
('mtpl1111-1111-1111-1111-111111111111', 'Executive Summary Check', 'Verify presence of executive summary section', 'section_check', '{"section_name": "Executive Summary", "required": true}', '{"min_words": 100}', 5, 1, NOW(), NOW()),
('mtpl2222-2222-2222-2222-222222222222', 'CHED Compliance Keywords', 'Check for key CHED compliance terms', 'keyword_check', '{"keywords": ["quality assurance", "CHED", "compliance"], "case_sensitive": false}', '{"min_occurrences": 2}', 3, 1, NOW(), NOW()),
('mtpl3333-3333-3333-3333-333333333333', 'Budget Format Validation', 'Validate budget document structure', 'property_check', '{"properties": ["revenue", "expenditure", "balance"]}', '{"all_present": true}', 4, 1, NOW(), NOW());

-- 9. Insert metric applicability rules
INSERT INTO metric_applicability (id, metric_id, unit_id, document_type) VALUES
('mapl1111-1111-1111-1111-111111111111', 'mtpl1111-1111-1111-1111-111111111111', 1, 'QA Report'),
('mapl2222-2222-2222-2222-222222222222', 'mtpl2222-2222-2222-2222-222222222222', NULL, 'QA Report'), -- Global rule for QA Reports
('mapl3333-3333-3333-3333-333333333333', 'mtpl3333-3333-3333-3333-333333333333', 3, 'Budget Document'),
('mapl4444-4444-4444-4444-444444444444', 'mtpl1111-1111-1111-1111-111111111111', 2, 'Development Plan');

-- 10. Insert sample metric results
INSERT INTO metric_results (id, version_id, metric_id, status, score, message, evidence, computed_at) VALUES
('mres1111-1111-1111-1111-111111111111', 'aaaaaaaa-0001-0001-0001-version00001', 'mtpl1111-1111-1111-1111-111111111111', 'pending', NULL, NULL, NULL, NOW()),
('mres2222-2222-2222-2222-222222222222', 'bbbbbbbb-0001-0001-0001-version00001', 'mtpl2222-2222-2222-2222-222222222222', 'passed', 0.95, 'Found 5 occurrences of key compliance terms', '{"matches": ["quality assurance", "CHED compliance"]}', NOW()),
('mres3333-3333-3333-3333-333333333333', 'cccccccc-0002-0002-0002-version00002', 'mtpl3333-3333-3333-3333-333333333333', 'failed', 0.4, 'Missing required budget properties', '{"missing": ["balance sheet"]}', NOW());

-- 11. Insert sample manual reviews
INSERT INTO manual_reviews (id, document_id, version_id, decision, remarks, findings, reviewer_id, reviewed_at) VALUES
('mrev1111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-0001-0001-0001-version00001', 'compliant', 'Meets all CMO requirements. Well-structured development plan.', '[{"category": "Format", "description": "Proper headings and sections", "severity": "low"}]', 2, NOW()),
('mrev2222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-0001-0001-0001-version00001', 'needs_revision', 'Budget allocation unclear in several line items', '[{"category": "Content", "description": "Line item 304 lacks justification", "severity": "medium"}, {"category": "Format", "description": "Table formatting inconsistent", "severity": "low"}]', 2, NOW());

-- 12. Insert sample version comparison
INSERT INTO version_comparisons (id, document_id, version_a_id, version_b_id, compared_by_id, diff_output, compared_at) VALUES
('vcmp1111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-0001-0001-0001-version00001', 'cccccccc-0002-0002-0002-version00002', 2, '{"changes": 45, "additions": 23, "deletions": 12, "modified": 10}', NOW());

-- 13. Insert sample tickets
INSERT INTO tickets (id, ticket_number, subject, description, category, status, priority, reported_by_id, assigned_to_id, unit_id, created_at, updated_at) VALUES
('tick1111-1111-1111-1111-111111111111', 'TICK-2024-0001', 'Unable to upload large DOCX files', 'Getting timeout error when uploading files over 20MB', 'system_issue', 'in_progress', 'high', 4, 5, 2, NOW(), NOW()),
('tick2222-2222-2222-2222-222222222222', 'TICK-2024-0002', 'Clarification on CMO-2024-001 compliance', 'Need guidance on Section 4.2 implementation for our unit', 'compliance_query', 'open', 'medium', 3, 2, 1, NOW(), NOW()),
('tick3333-3333-3333-3333-333333333333', 'TICK-2024-0003', 'Document status not updating after review', 'Submitted review but document still shows pending', 'document_related', 'resolved', 'low', 4, 5, NULL, NOW(), NOW());

-- 14. Insert sample ticket comments
INSERT INTO ticket_comments (id, ticket_id, comment, user_id, created_at) VALUES
('tcom1111-1111-1111-1111-111111111111', 'tick1111-1111-1111-1111-111111111111', 'Investigating the upload timeout issue. Likely related to server configuration.', 5, NOW()),
('tcom2222-2222-2222-2222-222222222222', 'tick1111-1111-1111-1111-111111111111', 'Increased max file size limit to 50MB and extended timeout to 5 minutes. Please test again.', 5, NOW()),
('tcom3333-3333-3333-3333-333333333333', 'tick2222-2222-2222-2222-222222222222', 'Please refer to the CHED implementation guide document in the issuances section. Will schedule a consultation meeting next week.', 2, NOW()),
('tcom4444-4444-4444-4444-444444444444', 'tick3333-3333-3333-3333-333333333333', 'Fixed. There was a cache issue. Document status now reflects the latest review.', 5, NOW());

-- Seed data insertion complete
-- Total records: 6 users, 5 units, 3 issuances, 3 documents, 4 versions, 3 metrics, 4 applicability rules, 3 results, 2 reviews, 1 comparison, 3 tickets, 4 comments
