-- Extend role_capabilities for permissions previously enforced by role names.
-- Existing capability values are preserved.
USE `02_db_stg_compliance_hub_users`;

ALTER TABLE `role_capabilities`
  ADD COLUMN IF NOT EXISTS `is_audit_access` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_units_access` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_units_manage` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_document_types_manage` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_metrics_manage` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_user_management_roles_manage` tinyint(1) NOT NULL DEFAULT 0;

-- Preserve the current effective permissions while moving their authority into
-- the matrix. No existing capability columns are overwritten.
UPDATE `role_capabilities`
SET `is_audit_access` = CASE WHEN `is_reports_access` = 1 OR `is_ticket_settings_focal` = 1 THEN 1 ELSE 0 END,
    `is_units_access` = CASE WHEN `is_attendance_access` = 1 OR `is_all_tickets` = 1 THEN 1 ELSE 0 END,
    `is_units_manage` = `is_role_capabilities_access`,
    `is_document_types_manage` = `is_role_capabilities_access`,
    `is_metrics_manage` = `is_role_capabilities_access`,
    `is_user_management_roles_manage` = `is_system_roles_access`;
