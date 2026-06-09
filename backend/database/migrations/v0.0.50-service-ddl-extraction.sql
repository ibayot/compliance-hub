-- ============================================================
-- v0.0.50 — Service DDL Extraction
-- ============================================================
-- This file DOCUMENTS the DDL that was previously inline in each
-- service's onModuleInit() / runMigrations() method.
--
-- As of v0.0.50 those DDL blocks have been removed from service
-- code. This file is NOT re-runnable on the live database (all
-- objects already exist per the v0.0.49 snapshot). It serves as
-- an audit trail of what was removed.
--
-- Run v0.0.49-schema-baseline.sql on a FRESH database first,
-- then run this file to add objects introduced in v0.0.50 code.
-- ============================================================

-- ── compliance_hub_ticketing ─────────────────────────────────

-- Seeded by ticket.service.ts (now inlined at startup only as data seeding,
-- DDL moved here)
CREATE TABLE IF NOT EXISTS `compliance_hub_ticketing`.`ticket_keyword_rules` (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  keyword VARCHAR(100) NOT NULL,
  target_ticket_type VARCHAR(30) NOT NULL,
  target_category_id VARCHAR(36) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `compliance_hub_ticketing`.`ticket_keyword_rules`
  ADD COLUMN IF NOT EXISTS keywords TEXT NULL;

CREATE TABLE IF NOT EXISTS `compliance_hub_ticketing`.`office_days` (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  is_office_day TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT NULL,
  set_by_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `compliance_hub_ticketing`.`ticket_events` (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  ticket_id VARCHAR(36) NOT NULL,
  actor_id INT NULL,
  event_type VARCHAR(50) NOT NULL,
  meta TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_te_ticket_id (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `compliance_hub_ticketing`.`ticket_escalations` (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  ticket_id VARCHAR(36) NOT NULL,
  escalated_by_id INT NOT NULL,
  escalated_to_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  return_reason TEXT NULL,
  proof_files JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_te_ticket (ticket_id),
  CONSTRAINT fk_te_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `compliance_hub_ticketing`.`escalation_focal_configs` (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticket_type VARCHAR(30) NOT NULL,
  role_value VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  created_by_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_efc_type_role (ticket_type, role_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance table owned by users DB (was migrated from ticketing in v0.6)
CREATE TABLE IF NOT EXISTS `compliance_hub_users`.`attendance` (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  set_by_id INT NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── compliance_hub ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `compliance_hub`.`document_assignments` (
  id varchar(36) NOT NULL,
  user_id int NOT NULL,
  unit_id int NOT NULL,
  document_type varchar(100) NOT NULL,
  report_name varchar(255) DEFAULT NULL,
  filename_prefix varchar(100) DEFAULT NULL,
  submission_frequency enum('monthly','quarterly','annual','custom') NOT NULL DEFAULT 'monthly',
  submission_month tinyint DEFAULT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignment_user_unit_type (user_id, unit_id, document_type),
  KEY idx_assignment_user (user_id),
  KEY idx_assignment_unit (unit_id),
  CONSTRAINT fk_assignment_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `compliance_hub`.`document_references` (
  id varchar(36) NOT NULL,
  source_document_id varchar(36) NOT NULL,
  target_document_id varchar(36) NOT NULL,
  relationship_type varchar(50) NOT NULL DEFAULT 'references',
  created_by int DEFAULT NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_document_reference_pair (source_document_id, target_document_id),
  KEY idx_doc_ref_source (source_document_id),
  KEY idx_doc_ref_target (target_document_id),
  CONSTRAINT fk_doc_ref_source FOREIGN KEY (source_document_id) REFERENCES documents (id) ON DELETE CASCADE,
  CONSTRAINT fk_doc_ref_target FOREIGN KEY (target_document_id) REFERENCES documents (id) ON DELETE CASCADE,
  CONSTRAINT fk_doc_ref_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `compliance_hub`.`document_versions`
  ADD COLUMN IF NOT EXISTS file_blob LONGBLOB NULL,
  ADD COLUMN IF NOT EXISTS preview_blob LONGBLOB NULL;

ALTER TABLE `compliance_hub`.`documents`
  ADD COLUMN IF NOT EXISTS file_blob LONGBLOB NULL;

-- ── compliance_hub_users ──────────────────────────────────────

ALTER TABLE `compliance_hub_users`.`users`
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS suffix VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS staff_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS position VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS position_full VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS designation VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS ticket_main_focal TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ticket_technician TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auth_provider ENUM('local','google') NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS last_login DATETIME NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_sub ON `compliance_hub_users`.`users` (google_sub);

ALTER TABLE `compliance_hub_users`.`role_definitions`
  ADD COLUMN IF NOT EXISTS technician_type VARCHAR(30) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS role_code VARCHAR(50) NULL DEFAULT NULL;

ALTER TABLE `compliance_hub_users`.`role_capabilities`
  ADD COLUMN IF NOT EXISTS is_kpi_access TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_kpi_manage TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_attendance_access TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_attendance_manage TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_reports_access TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_reviews_access TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_mov_access TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_documents_access TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_repository_access TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_issuances_access TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_metrics_access TINYINT(1) NOT NULL DEFAULT 0;
