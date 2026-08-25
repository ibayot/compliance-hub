-- Ensure the users table contains every column required by the current
-- authentication and profile entity after the staging database reset.

USE `02_db_stg_compliance_hub_users`;

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `mfa_code` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `mfa_expires_at` TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS `mfa_last_verified_at` TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS `mfa_attempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `mfa_challenge_attempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `mfa_locked_until` TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS `phone_number` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `sex` VARCHAR(255) NULL;

-- Older staging scripts used this name. The entity uses mfa_expires_at.
ALTER TABLE `users`
  DROP COLUMN IF EXISTS `mfa_code_expires_at`;

USE `02_db_stg_compliance_hub_ticketing`;

DROP VIEW IF EXISTS `users`;
CREATE VIEW `users` AS
SELECT u.*
FROM `02_db_stg_compliance_hub_users`.`users` AS u;

USE `02_db_stg_compliance_hub`;

DROP VIEW IF EXISTS `users`;
CREATE VIEW `users` AS
SELECT u.*
FROM `02_db_stg_compliance_hub_users`.`users` AS u;
