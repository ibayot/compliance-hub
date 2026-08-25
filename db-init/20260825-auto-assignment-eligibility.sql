-- Add a per-user automatic-assignment opt-out.
-- Existing users remain eligible so current routing behavior is preserved.

USE `02_db_stg_compliance_hub_users`;

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `auto_assignment_eligible` TINYINT(1) NOT NULL DEFAULT 1;

-- Refresh service-database users views so the new column is visible after the
-- underlying users table changes. Manual assignment still reads the same view.
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
