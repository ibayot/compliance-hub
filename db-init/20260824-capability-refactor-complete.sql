
-- Canonical capability/technician refactor for staging.
-- Run after the base db-init files (01-create-dbs.sql through 05-audit.sql)
-- and after any older dated hotfixes. This script is idempotent.
-- It backfills capability flags before removing legacy role columns.

USE `02_db_stg_compliance_hub_users`;

ALTER TABLE `role_capabilities`
  ADD COLUMN IF NOT EXISTS `is_ticket_module_access` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_attendance_eligible` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_audit_access` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_units_access` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_units_manage` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_document_types_manage` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_metrics_manage` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_user_management_roles_manage` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_documents_manage` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_documents_delete` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_issuances_manage` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_metrics_delete` tinyint(1) NOT NULL DEFAULT 0;

-- Dynamic role values remain valid after the role list is extended.
ALTER TABLE `users`
  MODIFY COLUMN `role` varchar(60) NOT NULL DEFAULT 'user';

-- Ensure every role definition has a capability row without changing existing rows.
INSERT INTO `role_capabilities` (`role_value`)
SELECT rd.`value`
FROM `role_definitions` rd
LEFT JOIN `role_capabilities` rc
  ON rc.`role_value` = rd.`value`
WHERE rc.`role_value` IS NULL;

-- First backfill technician classifications while technician_type still exists.
UPDATE `role_capabilities` rc
JOIN `role_definitions` rd
  ON rd.`value` = rc.`role_value`
SET
  rc.`is_desktop` = CASE
    WHEN rd.`technician_type` = 'desktop_support' THEN 1
    ELSE rc.`is_desktop`
  END,
  rc.`is_it_support` = CASE
    WHEN rd.`technician_type` = 'it_support' THEN 1
    ELSE rc.`is_it_support`
  END,
  rc.`is_pantawid_ict` = CASE
    WHEN rd.`technician_type` = 'pantawid_ict_support' THEN 1
    ELSE rc.`is_pantawid_ict`
  END;

-- Seed only the newly introduced authority columns for built-in roles.
-- Existing capability columns are not overwritten.
UPDATE `role_capabilities` rc
JOIN `role_definitions` rd
  ON rd.`value` = rc.`role_value`
SET
  rc.`is_ticket_module_access` = CASE
    WHEN rd.`is_system` = 1 THEN 1
    ELSE rc.`is_ticket_module_access`
  END,
  rc.`is_attendance_eligible` = CASE
    WHEN rd.`is_system` = 1
      AND rd.`assignable` = 1
      AND rd.`value` NOT IN ('user', 'super_admin')
    THEN 1
    ELSE rc.`is_attendance_eligible`
  END,
  rc.`is_audit_access` = CASE
    WHEN rd.`value` IN ('super_admin', 'compliance_officer') THEN 1
    ELSE rc.`is_audit_access`
  END,
  rc.`is_units_access` = CASE
    WHEN rd.`is_system` = 1 THEN 1
    ELSE rc.`is_units_access`
  END,
  rc.`is_units_manage` = CASE
    WHEN rd.`value` = 'super_admin' THEN 1
    ELSE rc.`is_units_manage`
  END,
  rc.`is_document_types_manage` = CASE
    WHEN rd.`value` = 'super_admin' THEN 1
    ELSE rc.`is_document_types_manage`
  END,
  rc.`is_metrics_manage` = CASE
    WHEN rd.`value` IN ('super_admin', 'compliance_officer') THEN 1
    ELSE rc.`is_metrics_manage`
  END,
  rc.`is_user_management_roles_manage` = CASE
    WHEN rd.`value` IN ('super_admin', 'section_head', 'compliance_officer') THEN 1
    ELSE rc.`is_user_management_roles_manage`
  END,
  rc.`is_documents_manage` = CASE
    WHEN rd.`value` IN ('super_admin', 'compliance_officer')
      OR rc.`is_focal` = 1
      OR rc.`is_desktop` = 1
      OR rc.`is_it_support` = 1
      OR rc.`is_pantawid_ict` = 1
    THEN 1
    ELSE rc.`is_documents_manage`
  END,
  rc.`is_documents_delete` = CASE
    WHEN rd.`value` IN ('super_admin', 'compliance_officer') THEN 1
    ELSE rc.`is_documents_delete`
  END,
  rc.`is_issuances_manage` = CASE
    WHEN rd.`value` IN ('super_admin', 'compliance_officer') THEN 1
    ELSE rc.`is_issuances_manage`
  END,
  rc.`is_metrics_delete` = CASE
    WHEN rd.`value` = 'super_admin' THEN 1
    ELSE rc.`is_metrics_delete`
  END;

-- Remove legacy role metadata only after all backfills have completed.
ALTER TABLE `role_definitions`
  DROP COLUMN IF EXISTS `technician_type`;
ALTER TABLE `role_definitions`
  DROP COLUMN IF EXISTS `role_code`;

-- Recreate cross-database views without technician_type or role_code.
USE `02_db_stg_compliance_hub`;

-- Preserve a stale derived table as a recoverable backup before creating the shared view.
SET @rename_role_capabilities_sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'role_capabilities'
      AND table_type = 'BASE TABLE'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'role_capabilities_legacy_20260824'
  ),
  'RENAME TABLE role_capabilities TO role_capabilities_legacy_20260824',
  'SELECT 1'
);
PREPARE rename_role_capabilities_stmt FROM @rename_role_capabilities_sql;
EXECUTE rename_role_capabilities_stmt;
DEALLOCATE PREPARE rename_role_capabilities_stmt;
CREATE OR REPLACE VIEW `role_capabilities` AS
SELECT *
FROM `02_db_stg_compliance_hub_users`.`role_capabilities`;

-- Preserve a stale derived table as a recoverable backup before creating the shared view.
SET @rename_role_definitions_sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'role_definitions'
      AND table_type = 'BASE TABLE'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'role_definitions_legacy_20260824'
  ),
  'RENAME TABLE role_definitions TO role_definitions_legacy_20260824',
  'SELECT 1'
);
PREPARE rename_role_definitions_stmt FROM @rename_role_definitions_sql;
EXECUTE rename_role_definitions_stmt;
DEALLOCATE PREPARE rename_role_definitions_stmt;
CREATE OR REPLACE VIEW `role_definitions` AS
SELECT
  `id`,
  `value`,
  `label`,
  `description`,
  `assignable`,
  `is_system`,
  `created_at`,
  `updated_at`
FROM `02_db_stg_compliance_hub_users`.`role_definitions`;

USE `02_db_stg_compliance_hub_ticketing`;

-- Preserve a stale derived table as a recoverable backup before creating the shared view.
SET @rename_role_capabilities_sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'role_capabilities'
      AND table_type = 'BASE TABLE'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'role_capabilities_legacy_20260824'
  ),
  'RENAME TABLE role_capabilities TO role_capabilities_legacy_20260824',
  'SELECT 1'
);
PREPARE rename_role_capabilities_stmt FROM @rename_role_capabilities_sql;
EXECUTE rename_role_capabilities_stmt;
DEALLOCATE PREPARE rename_role_capabilities_stmt;
CREATE OR REPLACE VIEW `role_capabilities` AS
SELECT *
FROM `02_db_stg_compliance_hub_users`.`role_capabilities`;

-- Preserve a stale derived table as a recoverable backup before creating the shared view.
SET @rename_role_definitions_sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'role_definitions'
      AND table_type = 'BASE TABLE'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'role_definitions_legacy_20260824'
  ),
  'RENAME TABLE role_definitions TO role_definitions_legacy_20260824',
  'SELECT 1'
);
PREPARE rename_role_definitions_stmt FROM @rename_role_definitions_sql;
EXECUTE rename_role_definitions_stmt;
DEALLOCATE PREPARE rename_role_definitions_stmt;
CREATE OR REPLACE VIEW `role_definitions` AS
SELECT
  `id`,
  `value`,
  `label`,
  `description`,
  `assignable`,
  `is_system`,
  `created_at`,
  `updated_at`
FROM `02_db_stg_compliance_hub_users`.`role_definitions`;
