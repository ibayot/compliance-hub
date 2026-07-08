-- Local-only maintenance script.
-- Do not place this in db-init/, because db-init runs automatically on fresh volume boot.

USE `02_db_stg_compliance_hub_users`;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `attendance`;
TRUNCATE TABLE `feedback`;
SET FOREIGN_KEY_CHECKS = 1;

USE `02_db_stg_compliance_hub_ticketing`;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `escalation_focal_configs`;
TRUNCATE TABLE `office_days`;
TRUNCATE TABLE `ticket_comments`;
TRUNCATE TABLE `ticket_escalations`;
TRUNCATE TABLE `ticket_events`;
TRUNCATE TABLE `tickets`;
TRUNCATE TABLE `ticket_number_counters`;
SET FOREIGN_KEY_CHECKS = 1;

-- Optional, only if you want to clear local compliance-side sample data too:
-- USE `02_db_stg_compliance_hub`;
-- SET FOREIGN_KEY_CHECKS = 0;
-- TRUNCATE TABLE `mov_artifacts`;
-- SET FOREIGN_KEY_CHECKS = 1;