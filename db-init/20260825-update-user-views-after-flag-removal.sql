-- Recreate service-database users views after removing legacy ticket flags.
-- The views must be refreshed because their previous definitions referenced
-- users.ticket_main_focal and users.ticket_technician.

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
