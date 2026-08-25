-- Fix ticket-settings create payload compatibility, regular-staff Units visibility,
-- roster-scoped duty exceptions, and permanent meeting deletion.
-- Run after 20260824-capability-refactor-complete.sql.

USE `02_db_stg_compliance_hub_users`;

-- Regular Staff must not see or access the Units module.
UPDATE `role_capabilities` rc
JOIN `role_definitions` rd ON rd.`value` = rc.`role_value`
SET rc.`is_units_access` = 0,
    rc.`is_units_manage` = 0
WHERE rd.`value` = 'user';
