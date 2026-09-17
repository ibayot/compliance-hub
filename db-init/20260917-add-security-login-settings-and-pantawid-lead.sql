-- Run this once after selecting the USERS database for the target environment.
-- Adds configurable account domains, the Google sign-in visibility/enforcement
-- switch, and splits Pantawid ICT into junior and lead roles.

ALTER TABLE `security_config`
  ADD COLUMN IF NOT EXISTS `google_sign_in_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `app_mode`,
  ADD COLUMN IF NOT EXISTS `allowed_email_domains` TEXT NULL AFTER `google_sign_in_enabled`;

UPDATE `security_config`
SET `allowed_email_domains` = '["dswd.gov.ph","gmail.com","yahoo.com","yahoomail.com","hotmail.com","rocketmail.com","outlook.com","icloud.com","aol.com"]'
WHERE `allowed_email_domains` IS NULL OR TRIM(`allowed_email_domains`) = '';

ALTER TABLE `role_capabilities`
  ADD COLUMN IF NOT EXISTS `is_specialized_support` TINYINT(1) NOT NULL DEFAULT 0
  AFTER `is_pantawid_ict`;
INSERT INTO `role_definitions` (`value`, `label`, `description`, `assignable`, `is_system`)
VALUES (
  'pantawid_ict_lead',
  'Pantawid ICT Lead',
  'Leads Pantawid ICT support with the same focal and assignment authority as other senior technician roles.',
  1,
  1
)
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `assignable` = VALUES(`assignable`),
  `is_system` = VALUES(`is_system`);

INSERT INTO `role_capabilities` (`role_value`)
VALUES ('pantawid_ict_lead')
ON DUPLICATE KEY UPDATE `role_value` = VALUES(`role_value`);

-- Copy every current capability from the corresponding IT Support level. This
-- keeps the junior/senior behavior aligned even when a deployment customized
-- capabilities through the matrix before applying this migration.
SET SESSION group_concat_max_len = 100000;
SET @capability_assignments = (
  SELECT GROUP_CONCAT(
    CONCAT('target.`', `COLUMN_NAME`, '` = source.`', `COLUMN_NAME`, '`')
    ORDER BY `ORDINAL_POSITION`
    SEPARATOR ', '
  )
  FROM `information_schema`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'role_capabilities'
    AND `COLUMN_NAME` NOT IN ('id', 'role_value', 'created_at', 'updated_at')
);

SET @copy_pantawid_junior = CONCAT(
  'UPDATE `role_capabilities` target ',
  'JOIN `role_capabilities` source ON source.`role_value` = ''it_support_jr'' ',
  'SET ', @capability_assignments, ' ',
  'WHERE target.`role_value` = ''pantawid_ict'''
);
PREPARE copy_pantawid_junior_stmt FROM @copy_pantawid_junior;
EXECUTE copy_pantawid_junior_stmt;
DEALLOCATE PREPARE copy_pantawid_junior_stmt;

SET @copy_pantawid_lead = CONCAT(
  'UPDATE `role_capabilities` target ',
  'JOIN `role_capabilities` source ON source.`role_value` = ''it_support_sr'' ',
  'SET ', @capability_assignments, ' ',
  'WHERE target.`role_value` = ''pantawid_ict_lead'''
);
PREPARE copy_pantawid_lead_stmt FROM @copy_pantawid_lead;
EXECUTE copy_pantawid_lead_stmt;
DEALLOCATE PREPARE copy_pantawid_lead_stmt;

UPDATE `role_capabilities`
SET `is_desktop` = 0,
    `is_it_support` = 0,
    `is_pantawid_ict` = 1,
    `is_focal` = 0,
    `is_attendance_eligible` = 1
WHERE `role_value` = 'pantawid_ict';

UPDATE `role_capabilities`
SET `is_desktop` = 0,
    `is_it_support` = 0,
    `is_pantawid_ict` = 1,
    `is_focal` = 1,
    `is_attendance_eligible` = 1
WHERE `role_value` = 'pantawid_ict_lead';

-- End Users never participate in automatic ticket assignment.
UPDATE `users`
SET `auto_assignment_eligible` = 0
WHERE `role` = 'user';
