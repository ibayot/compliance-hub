-- Additional Phase 1 and 2 Database Changes

-- Note: The following schemas are applied manually because TypeORM's DB_SYNCHRONIZE is disabled in staging.

USE `02_db_stg_compliance_hub_users`;

-- Users Service Phase 1 Updates
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mfa_code` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mfa_code_expires_at` DATETIME NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mfa_last_verified_at` DATETIME NULL;

USE `02_db_stg_compliance_hub_ticketing`;

-- Ticketing Service Phase 2 Updates
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `sla_deadline` DATETIME NULL;
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `sla_paused_at` DATETIME NULL;
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `accumulated_pause_seconds` INT NOT NULL DEFAULT 0;
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `is_sla_waiting` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `last_assigned_at` DATETIME NULL;

-- Ticketing Category Settings Updates
CREATE TABLE IF NOT EXISTS `ticketing_configs` (
  `id` int NOT NULL,
  `assignment_strategy` varchar(50) NOT NULL DEFAULT 'CURRENT_AUTO',
  `round_robin_cap_hours` int NOT NULL DEFAULT 80,
  `auto_close_days` int NOT NULL DEFAULT 3,
  `smtp_host` varchar(255) NULL,
  `smtp_port` int NULL,
  `smtp_user` varchar(255) NULL,
  `smtp_pass` varchar(255) NULL,
  `smtp_from` varchar(255) NULL,
  `smtp_from_name` varchar(255) NULL,
  `primary_smtp_sent_today` int NOT NULL DEFAULT 0,
  `primary_smtp_last_sent_date` date NULL,
  `primary_smtp_daily_limit` int NOT NULL DEFAULT 500,
  `schedule_mode` varchar(20) NOT NULL DEFAULT 'OFFICE_HOURS',
  `office_clockin` time NOT NULL DEFAULT '08:00:00',
  `office_clockout` time NOT NULL DEFAULT '17:00:00',
  `cww_clockin_start` time NOT NULL DEFAULT '07:00:00',
  `cww_clockin_end` time NOT NULL DEFAULT '08:00:00',
  `cww_clockout_start` time NOT NULL DEFAULT '18:00:00',
  `cww_clockout_end` time NOT NULL DEFAULT '19:00:00',
  `is_flag_ceremony_paused` boolean NOT NULL DEFAULT false,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `ticket_categories` ADD COLUMN IF NOT EXISTS `sla_hours` int NULL;
ALTER TABLE `ticket_categories` ADD COLUMN IF NOT EXISTS `allowable_pause_hours` int NULL;

-- Fix incorrectly mapped relations causing metadata errors locally:
-- Make actor_id standard int instead of implicit FK object type inference
-- Ensure reviewer_id, unit_id, compared_by_id are standard ints.
-- (No SQL changes strictly required for the fix, as the staging database already has them as `int`.
-- The TypeORM entity mapping changes were sufficient to align the codebase with the staging DB).

USE `02_db_stg_compliance_hub_users`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `phone_number` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `sex` VARCHAR(255) NULL;
