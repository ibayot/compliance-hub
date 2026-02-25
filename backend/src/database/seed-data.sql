-- Alias seed script
-- This file is intentionally kept in sync with seed.sql for tooling compatibility.

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
TRUNCATE TABLE document_versions;
TRUNCATE TABLE documents;
TRUNCATE TABLE issuances;
TRUNCATE TABLE user_unit_access;
TRUNCATE TABLE units;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, email, passwordHash, first_name, last_name, role, is_active, created_at, updated_at) VALUES
(1, 'admin@rictms.gov.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'System', 'Admin', 'super_admin', 1, NOW(), NOW()),
(2, 'reviewer@rictms.gov.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'QA', 'Reviewer', 'reviewer', 1, NOW(), NOW()),
(3, 'focal@rictms.gov.ph', '$2b$10$rXJzN8m8qLN5xYU6kZYqZOQJ3YqZ3Hy0yLX5Y0X7Z8Y9Z1Z2Z3Z4Ze', 'Unit', 'Focal', 'focal', 1, NOW(), NOW());

INSERT INTO units (id, name, abbreviation, parent_id, head_id, is_active, created_at, updated_at) VALUES
('unit-001', 'Information Technology Unit', 'ITU', NULL, NULL, 1, NOW(), NOW()),
('unit-002', 'Finance Unit', 'FIN', NULL, NULL, 1, NOW(), NOW());

INSERT INTO user_unit_access (user_id, unit_id) VALUES
(1, 'unit-001'), (1, 'unit-002'),
(2, 'unit-001'), (2, 'unit-002'),
(3, 'unit-001');

INSERT INTO issuances (id, issuance_number, title, description, issuing_authority, issue_date, effectivity_date, source_url, is_active, created_at, updated_at) VALUES
('issuance-001', 'RA-10173', 'Data Privacy Act of 2012', 'Personal data protection law', 'Congress of the Philippines', '2012-08-15', '2012-09-08', 'https://www.officialgazette.gov.ph/2012/08/15/republic-act-no-10173/', 1, NOW(), NOW());

INSERT INTO documents (id, title, document_type, period, year, status, current_version, extracted_text, unit_id, uploaded_by, is_deleted, created_at, updated_at) VALUES
('doc-001', 'ICT Compliance Narrative', 'Narrative Report', 'Q1', '2024', 'ready', 1, 'Seeded text for ICT compliance narrative.', 'unit-001', '1', 0, NOW(), NOW()),
('doc-002', 'Finance Compliance Memo', 'Memo', 'Q1', '2024', 'ready', 1, 'Seeded text for finance compliance memo.', 'unit-002', '1', 0, NOW(), NOW());

SET @pdf_blob = UNHEX('255044462D312E340A25E2E3CFD30A');

INSERT INTO document_versions (
  id,
  document_id,
  version_number,
  file_name,
  file_path,
  file_blob,
  mime_type,
  file_size,
  checksum,
  preview_path,
  preview_blob,
  extracted_text,
  change_notes,
  uploaded_by,
  created_at
) VALUES
('ver-001', 'doc-001', 1, 'ICT_Compliance_Q1_2024.pdf', 'documents/seed-ict-q1-2024.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), 'previews/seed-ict-q1-2024-preview.pdf', @pdf_blob, 'Seeded extracted text for document 1.', 'Initial seed version', '1', NOW()),
('ver-002', 'doc-002', 1, 'Finance_Compliance_Q1_2024.pdf', 'documents/seed-fin-q1-2024.pdf', @pdf_blob, 'application/pdf', OCTET_LENGTH(@pdf_blob), SHA2(@pdf_blob, 256), 'previews/seed-fin-q1-2024-preview.pdf', @pdf_blob, 'Seeded extracted text for document 2.', 'Initial seed version', '1', NOW());

INSERT INTO document_issuances (issuance_id, document_id) VALUES
('issuance-001', 'doc-001'),
('issuance-001', 'doc-002');

COMMIT;
