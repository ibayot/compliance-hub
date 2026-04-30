-- v0.0.49 Schema Baseline Migration
-- Date: 2026-04-30
-- Description: Captures all runtime ALTER TABLE / CREATE TABLE self-healing statements
--              that currently run inside NestJS services on startup.
--              Run this once against the live databases after deploying v0.0.49.
--              The services will still self-heal as a fallback, but this script
--              makes the schema state explicit and auditable.
--
-- Usage:
--   mysql -h <host> -u <user> -p compliance_hub < backend/database/migrations/v0.0.49-schema-baseline.sql
--   mysql -h <host> -u <user> -p compliance_hub_users < backend/database/migrations/v0.0.49-schema-baseline.sql
--   mysql -h <host> -u <user> -p compliance_hub_ticketing < backend/database/migrations/v0.0.49-schema-baseline.sql

-- ============================================================
-- compliance_hub: issuances extended columns
-- (from issuance.service.ts onModuleInit)
-- ============================================================
ALTER TABLE `compliance_hub`.`issuances`
  ADD COLUMN IF NOT EXISTS `attachment_file_name` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `attachment_mime_type` VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS `attachment_blob` LONGBLOB NULL,
  ADD COLUMN IF NOT EXISTS `attachment_uploaded_at` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `binding_nature` VARCHAR(60) NULL,
  ADD COLUMN IF NOT EXISTS `adoption_basis` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `applicable_provisions` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `compliance_obligations` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `required_evidence` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `evidence_location` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `process_owner` VARCHAR(160) NULL,
  ADD COLUMN IF NOT EXISTS `frequency_cadence` VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS `compliance_status` VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS `gap_summary` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `action_required` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `target_date` DATE NULL,
  ADD COLUMN IF NOT EXISTS `last_review_date` DATE NULL,
  ADD COLUMN IF NOT EXISTS `quarterly_readiness` VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS `q1_compliance_status` VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS `q2_compliance_status` VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS `q3_compliance_status` VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS `q4_compliance_status` VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS `register_added_at` DATE NULL;

-- ============================================================
-- compliance_hub: document_issuances pivot table
-- (from issuance.service.ts onModuleInit - v0.0.49)
-- ============================================================
CREATE TABLE IF NOT EXISTS `compliance_hub`.`document_issuances` (
  `issuance_id` varchar(36) NOT NULL,
  `document_id` varchar(36) NOT NULL,
  PRIMARY KEY (`issuance_id`, `document_id`),
  KEY `fk_doc_issuance_document` (`document_id`),
  CONSTRAINT `fk_doc_issuance_issuance` FOREIGN KEY (`issuance_id`) REFERENCES `compliance_hub`.`issuances` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doc_issuance_document` FOREIGN KEY (`document_id`) REFERENCES `compliance_hub`.`documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- compliance_hub: document_versions and documents blob columns
-- (from document.service.ts onModuleInit)
-- ============================================================
ALTER TABLE `compliance_hub`.`document_versions`
  ADD COLUMN IF NOT EXISTS `file_blob` LONGBLOB NULL,
  ADD COLUMN IF NOT EXISTS `preview_blob` LONGBLOB NULL;

ALTER TABLE `compliance_hub`.`documents`
  ADD COLUMN IF NOT EXISTS `file_blob` LONGBLOB NULL;

-- ============================================================
-- compliance_hub_users: users extended columns
-- (from users.service.ts ensureSchema)
-- ============================================================
ALTER TABLE `compliance_hub_users`.`users`
  ADD COLUMN IF NOT EXISTS `middle_name` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `suffix` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `staff_id` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `position` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `position_full` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `designation` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `ticket_main_focal` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `ticket_technician` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `last_login` DATETIME NULL;

ALTER TABLE `compliance_hub_users`.`users`
  ADD COLUMN IF NOT EXISTS `auth_provider` ENUM('local','google') NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS `google_sub` VARCHAR(255) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_users_google_sub` ON `compliance_hub_users`.`users` (`google_sub`);

-- ============================================================
-- compliance_hub_users: role_definitions extended columns
-- ============================================================
ALTER TABLE `compliance_hub_users`.`role_definitions`
  ADD COLUMN IF NOT EXISTS `technician_type` VARCHAR(30) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `role_code` VARCHAR(50) NULL DEFAULT NULL;

UPDATE `compliance_hub_users`.`role_definitions`
  SET `role_code` = 'section_head'
  WHERE `value` = 'section_head' AND `role_code` IS NULL;

-- ============================================================
-- compliance_hub_users: role_capabilities module access columns
-- (from users.service.ts ensureSchema - v0.0.41+)
-- ============================================================
ALTER TABLE `compliance_hub_users`.`role_capabilities`
  ADD COLUMN IF NOT EXISTS `is_kpi_access` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_kpi_manage` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_attendance_access` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_attendance_manage` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_reports_access` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_reviews_access` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_mov_access` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_documents_access` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_repository_access` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_issuances_access` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_metrics_access` TINYINT(1) NOT NULL DEFAULT 0;

-- ============================================================
-- compliance_hub_ticketing: tickets extended columns
-- (from ticket.service.ts onModuleInit)
-- ============================================================
ALTER TABLE `compliance_hub_ticketing`.`tickets`
  ADD COLUMN IF NOT EXISTS `ticket_number` VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS `ticket_type` VARCHAR(30) NOT NULL DEFAULT 'it_support',
  ADD COLUMN IF NOT EXISTS `requester_id` INT NULL,
  ADD COLUMN IF NOT EXISTS `resolution_notes` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `resolved_at` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `satisfaction_rating` TINYINT NULL,
  ADD COLUMN IF NOT EXISTS `satisfaction_comment` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `satisfaction_submitted_at` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `duplicate_of_id` VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS `user_closed` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `category_id` VARCHAR(36) NULL;

ALTER TABLE `compliance_hub_ticketing`.`ticket_comments`
  ADD COLUMN IF NOT EXISTS `is_internal` TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE `compliance_hub_ticketing`.`ticket_categories`
  ADD COLUMN IF NOT EXISTS `ticket_type` VARCHAR(30) NOT NULL DEFAULT 'it_support';
