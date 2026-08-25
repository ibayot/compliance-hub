-- Ticketing UI CRUD and CSAT precision migration.
-- Run this script against the staging ticketing database before deploying the
-- matching backend/frontend changes.

USE `02_db_stg_compliance_hub_ticketing`;

-- CSAT is the average of the answered form items, so it must retain decimals.
ALTER TABLE `tickets`
  MODIFY COLUMN `satisfaction_rating` DECIMAL(4,2) NULL;
