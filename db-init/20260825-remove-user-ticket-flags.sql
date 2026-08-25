-- Remove legacy per-user ticket flags.
-- Ticket focal/technician behavior is now controlled by role capabilities.

USE `02_db_stg_compliance_hub_users`;

ALTER TABLE `users`
  DROP COLUMN IF EXISTS `ticket_main_focal`,
  DROP COLUMN IF EXISTS `ticket_technician`;
