-- Add independent technician-view and full-management permissions for Ticket Reports.
-- Existing effective permissions are seeded only when the columns are first introduced.

USE `02_db_stg_compliance_hub_users`;

SET @ticket_reports_access_existed := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'role_capabilities'
    AND column_name = 'is_ticket_reports_access'
);

SET @ticket_reports_manage_existed := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'role_capabilities'
    AND column_name = 'is_ticket_reports_manage'
);

ALTER TABLE `role_capabilities`
  ADD COLUMN IF NOT EXISTS `is_ticket_reports_access` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Technician-scoped Ticket Reports access' AFTER `is_ticket_module_access`,
  ADD COLUMN IF NOT EXISTS `is_ticket_reports_manage` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Full Ticket Reports access including Issues and SLA Insights' AFTER `is_ticket_reports_access`;

SET @seed_ticket_reports_access_sql := IF(
  @ticket_reports_access_existed = 0,
  'UPDATE role_capabilities SET is_ticket_reports_access = IF(is_ticket_settings_focal = 1 OR is_desktop = 1 OR is_it_support = 1 OR is_pantawid_ict = 1, 1, 0)',
  'SELECT 1'
);
PREPARE seed_ticket_reports_access_stmt FROM @seed_ticket_reports_access_sql;
EXECUTE seed_ticket_reports_access_stmt;
DEALLOCATE PREPARE seed_ticket_reports_access_stmt;

SET @seed_ticket_reports_manage_sql := IF(
  @ticket_reports_manage_existed = 0,
  'UPDATE role_capabilities SET is_ticket_reports_manage = IF(is_ticket_settings_focal = 1, 1, 0)',
  'SELECT 1'
);
PREPARE seed_ticket_reports_manage_stmt FROM @seed_ticket_reports_manage_sql;
EXECUTE seed_ticket_reports_manage_stmt;
DEALLOCATE PREPARE seed_ticket_reports_manage_stmt;

USE `02_db_stg_compliance_hub_ticketing`;
CREATE OR REPLACE VIEW `role_capabilities` AS
SELECT *
FROM `02_db_stg_compliance_hub_users`.`role_capabilities`;

USE `02_db_stg_compliance_hub`;
CREATE OR REPLACE VIEW `role_capabilities` AS
SELECT *
FROM `02_db_stg_compliance_hub_users`.`role_capabilities`;
