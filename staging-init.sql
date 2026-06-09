-- =========================================================================
-- COMPLIANCE HUB - STAGING DATABASE SEED & CLEANUP SCRIPT
-- =========================================================================
-- Run this script on the Database Server after the backend has connected
-- once (so TypeORM creates the tables via synchronize: true).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. CLEANUP USERS DATABASE
-- -------------------------------------------------------------------------
USE compliance_hub_users;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE user_unit_access;
TRUNCATE TABLE units;
TRUNCATE TABLE attendance;

-- Keep fo2admin@dswd.gov.ph and delete everyone else
DELETE FROM users WHERE email != 'fo2admin@dswd.gov.ph';

-- Update the remaining admin account's password to 'password123'
UPDATE users SET password = '$2b$10$upl93srKJZFgCKH/3ICv9udREjOiYBAfKnlugx4fR7oj56f/78vWW' WHERE email = 'fo2admin@dswd.gov.ph';

-- Add pantawid_ict_focal role if it doesn't exist
INSERT INTO role_definitions (value, label, description, assignable, is_system, technician_type, role_code, created_at, updated_at) 
SELECT 'pantawid_ict_focal', 'Pantawid ICT Focal', 'Lead Pantawid ICT Support Role', 1, 1, 'pantawid_ict_support', 'pantawid_ict_focal', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT * FROM role_definitions WHERE value='pantawid_ict_focal');

-- -------------------------------------------------------------------------
-- 2. CLEANUP TICKETING DATABASE
-- -------------------------------------------------------------------------
USE compliance_hub_ticketing;

TRUNCATE TABLE tickets;
TRUNCATE TABLE ticket_keyword_rules;
TRUNCATE TABLE issue_types;
TRUNCATE TABLE ticket_events;
TRUNCATE TABLE ticket_comments;
TRUNCATE TABLE office_days;
TRUNCATE TABLE mov_artifacts;
TRUNCATE TABLE escalation_focal_configs;

-- -------------------------------------------------------------------------
-- 3. CLEANUP COMPLIANCE DATABASE
-- -------------------------------------------------------------------------
USE compliance_hub;

-- Disable constraints temporarily to safely truncate all tables
SET FOREIGN_KEY_CHECKS = 0;

-- Assuming standard table names based on TypeORM generation.
-- Adjust these if there are other table names in compliance_hub.
TRUNCATE TABLE criteria;
TRUNCATE TABLE sub_criteria;
TRUNCATE TABLE compliance_entries;
TRUNCATE TABLE assessments;
TRUNCATE TABLE artifacts;
TRUNCATE TABLE templates;

SET FOREIGN_KEY_CHECKS = 1;
