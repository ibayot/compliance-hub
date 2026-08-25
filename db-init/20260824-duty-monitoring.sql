-- RICTMS Duty Monitoring schema.
-- Apply this single script to the staging ticketing and users databases.
-- It is safe to rerun. Existing legacy per-duty roster rows are consolidated
-- into the shared roster, and NULL exception duty_type values remain global.

USE `02_db_stg_compliance_hub_users`;

ALTER TABLE `role_capabilities`
  ADD COLUMN IF NOT EXISTS `is_duty_viewer_access` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_duty_admin_access` tinyint(1) NOT NULL DEFAULT 0;

UPDATE `role_capabilities`
SET `is_duty_viewer_access` = 1,
    `is_duty_admin_access` = 1
WHERE `role_value` = 'super_admin';

USE `02_db_stg_compliance_hub_ticketing`;

CREATE TABLE IF NOT EXISTS `duty_roster_memberships` (
  `id` varchar(36) NOT NULL,
  `user_id` int NOT NULL,
  `duty_type` varchar(20) NOT NULL DEFAULT 'OD',
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_duty_roster_user` (`user_id`),
  KEY `idx_duty_roster_active_order` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `duty_assignments` (
  `id` varchar(36) NOT NULL,
  `duty_date` date NOT NULL,
  `user_id` int NOT NULL,
  `duty_type` varchar(20) NOT NULL,
  `remarks` text NULL,
  `source` varchar(20) NOT NULL DEFAULT 'manual',
  `created_by_id` int NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_duty_assignment` (`duty_date`, `user_id`, `duty_type`),
  KEY `idx_duty_assignment_rotation` (`duty_type`, `user_id`, `duty_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `duty_exceptions` (
  `id` varchar(36) NOT NULL,
  `exception_date` date NOT NULL,
  `user_id` int NOT NULL,
  `duty_type` varchar(20) NULL,
  `type` varchar(30) NOT NULL,
  `remarks` text NULL,
  `created_by_id` int NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_duty_exception_date_user` (`exception_date`, `user_id`),
  UNIQUE KEY `uq_duty_exception_scope` (`exception_date`, `user_id`, `duty_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `duty_meeting_reservations` (
  `id` varchar(36) NOT NULL,
  `meeting_date` date NOT NULL,
  `venue_type` varchar(20) NOT NULL,
  `start_time` time NULL,
  `end_time` time NULL,
  `purpose` varchar(255) NULL,
  `remarks` text NULL,
  `status` varchar(20) NOT NULL DEFAULT 'scheduled',
  `created_by_id` int NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_duty_reservation_date_venue` (`meeting_date`, `venue_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `duty_daily_coverages` (
  `id` varchar(36) NOT NULL,
  `duty_date` date NOT NULL,
  `duty_type` varchar(20) NOT NULL,
  `primary_user_id` int NOT NULL,
  `assigned_user_id` int NULL,
  `is_substitute` tinyint(1) NOT NULL DEFAULT 0,
  `substitution_reason` text NULL,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `previous_attendance_status` varchar(20) NULL,
  `previous_attendance_notes` text NULL,
  `attendance_overridden` tinyint(1) NOT NULL DEFAULT 0,
  `released_at` datetime NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_duty_coverage_date_type` (`duty_date`, `duty_type`),
  KEY `idx_duty_coverage_assignment_block` (`duty_date`, `assigned_user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Upgrade legacy exception tables that predate duty-scoped skips.
SET @exception_column_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'duty_exceptions'
    AND column_name = 'duty_type'
);
SET @exception_column_sql := IF(
  @exception_column_exists = 0,
  'ALTER TABLE `duty_exceptions` ADD COLUMN `duty_type` varchar(20) NULL AFTER `user_id`',
  'SELECT 1'
);
PREPARE duty_exception_column_stmt FROM @exception_column_sql;
EXECUTE duty_exception_column_stmt;
DEALLOCATE PREPARE duty_exception_column_stmt;

SET @old_exception_index_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'duty_exceptions'
    AND index_name = 'uq_duty_exception_date_user'
);
SET @drop_old_exception_index_sql := IF(
  @old_exception_index_exists > 0,
  'ALTER TABLE `duty_exceptions` DROP INDEX `uq_duty_exception_date_user`',
  'SELECT 1'
);
PREPARE duty_exception_old_index_stmt FROM @drop_old_exception_index_sql;
EXECUTE duty_exception_old_index_stmt;
DEALLOCATE PREPARE duty_exception_old_index_stmt;

SET @new_exception_index_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'duty_exceptions'
    AND index_name = 'uq_duty_exception_scope'
);
SET @add_exception_index_sql := IF(
  @new_exception_index_exists = 0,
  'ALTER TABLE `duty_exceptions` ADD UNIQUE KEY `uq_duty_exception_scope` (`exception_date`, `user_id`, `duty_type`)',
  'SELECT 1'
);
PREPARE duty_exception_new_index_stmt FROM @add_exception_index_sql;
EXECUTE duty_exception_new_index_stmt;
DEALLOCATE PREPARE duty_exception_new_index_stmt;

-- Upgrade legacy per-duty roster rows to one shared roster.
DROP TEMPORARY TABLE IF EXISTS `tmp_shared_duty_roster`;
CREATE TEMPORARY TABLE `tmp_shared_duty_roster` AS
SELECT
  COALESCE(
    MIN(CASE WHEN `duty_type` = 'OD' AND `is_active` = 1 THEN `id` END),
    MIN(CASE WHEN `is_active` = 1 THEN `id` END),
    MIN(`id`)
  ) AS `id`,
  `user_id`,
  COALESCE(
    MIN(CASE WHEN `duty_type` = 'OD' AND `is_active` = 1 THEN `sort_order` END),
    MIN(CASE WHEN `is_active` = 1 THEN `sort_order` END),
    MIN(`sort_order`)
  ) AS `sort_order`,
  MAX(`is_active`) AS `is_active`,
  MIN(`created_at`) AS `created_at`,
  MAX(`updated_at`) AS `updated_at`
FROM `duty_roster_memberships`
GROUP BY `user_id`;

DELETE FROM `duty_roster_memberships`;
INSERT INTO `duty_roster_memberships`
  (`id`, `user_id`, `duty_type`, `sort_order`, `is_active`, `created_at`, `updated_at`)
SELECT `id`, `user_id`, 'OD', `sort_order`, `is_active`, `created_at`, `updated_at`
FROM `tmp_shared_duty_roster`;
DROP TEMPORARY TABLE `tmp_shared_duty_roster`;

SET @legacy_roster_index_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'duty_roster_memberships'
    AND index_name = 'uq_duty_roster_user_type'
);
SET @drop_legacy_roster_index_sql := IF(
  @legacy_roster_index_exists > 0,
  'ALTER TABLE `duty_roster_memberships` DROP INDEX `uq_duty_roster_user_type`',
  'SELECT 1'
);
PREPARE duty_roster_old_index_stmt FROM @drop_legacy_roster_index_sql;
EXECUTE duty_roster_old_index_stmt;
DEALLOCATE PREPARE duty_roster_old_index_stmt;

SET @shared_roster_index_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'duty_roster_memberships'
    AND index_name = 'uq_duty_roster_user'
);
SET @add_shared_roster_index_sql := IF(
  @shared_roster_index_exists = 0,
  'ALTER TABLE `duty_roster_memberships` ADD UNIQUE KEY `uq_duty_roster_user` (`user_id`)',
  'SELECT 1'
);
PREPARE duty_roster_new_index_stmt FROM @add_shared_roster_index_sql;
EXECUTE duty_roster_new_index_stmt;
DEALLOCATE PREPARE duty_roster_new_index_stmt;

ALTER TABLE `duty_roster_memberships`
  MODIFY COLUMN `duty_type` varchar(20) NOT NULL DEFAULT 'OD';
