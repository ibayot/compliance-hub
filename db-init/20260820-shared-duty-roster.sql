-- Consolidate legacy per-duty roster rows into one shared roster.
-- The OD list is the canonical source when it exists; otherwise the first
-- active membership for each technician is retained.

USE `02_db_stg_compliance_hub_ticketing`;

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
SELECT
  `id`, `user_id`, 'OD', `sort_order`, `is_active`, `created_at`, `updated_at`
FROM `tmp_shared_duty_roster`;

DROP TEMPORARY TABLE `tmp_shared_duty_roster`;

SET @drop_legacy_roster_unique = IF(
  EXISTS(
    SELECT 1
    FROM `information_schema`.`statistics`
    WHERE `table_schema` = DATABASE()
      AND `table_name` = 'duty_roster_memberships'
      AND `index_name` = 'uq_duty_roster_user_type'
  ),
  'ALTER TABLE `duty_roster_memberships` DROP INDEX `uq_duty_roster_user_type`',
  'SELECT 1'
);
PREPARE `shared_roster_stmt` FROM @drop_legacy_roster_unique;
EXECUTE `shared_roster_stmt`;
DEALLOCATE PREPARE `shared_roster_stmt`;

SET @add_shared_roster_unique = IF(
  NOT EXISTS(
    SELECT 1
    FROM `information_schema`.`statistics`
    WHERE `table_schema` = DATABASE()
      AND `table_name` = 'duty_roster_memberships'
      AND `index_name` = 'uq_duty_roster_user'
  ),
  'ALTER TABLE `duty_roster_memberships` ADD UNIQUE KEY `uq_duty_roster_user` (`user_id`)',
  'SELECT 1'
);
PREPARE `shared_roster_stmt` FROM @add_shared_roster_unique;
EXECUTE `shared_roster_stmt`;
DEALLOCATE PREPARE `shared_roster_stmt`;

ALTER TABLE `duty_roster_memberships`
  MODIFY COLUMN `duty_type` varchar(20) NOT NULL DEFAULT 'OD';
