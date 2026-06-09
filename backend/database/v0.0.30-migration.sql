-- =======================================================================
-- v0.0.30 DB Migration
-- 1. Remove misplaced tables from compliance_hub_users and compliance_hub
-- 2. Create attendance base table in compliance_hub_users
-- 3. Delete 8 legacy roles from role_definitions
-- 4. Alter users.role ENUM to remove 8 legacy values
-- =======================================================================

USE compliance_hub_users;

-- 1. Drop tables that belong only in compliance_hub_ticketing
DROP TABLE IF EXISTS escalation_focal_configs;
DROP TABLE IF EXISTS office_days;
DROP TABLE IF EXISTS ticket_events;
DROP TABLE IF EXISTS ticket_keyword_rules;

-- 2. Create base attendance table (compliance_hub and compliance_hub_ticketing have VIEWs pointing here)
CREATE TABLE IF NOT EXISTS attendance (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     INT          NOT NULL,
  date        DATE         NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'present',
  set_by_id   INT          NULL,
  notes       TEXT         NULL,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Remove legacy roles from role_definitions
DELETE FROM role_definitions
WHERE value IN (
  'reviewer',
  'focal',
  'technician',
  'auditor',
  'technician_desktop',
  'technician_it_support',
  'technician_it_staff',
  'technician_desktop_staff'
);

-- 4. Alter users.role ENUM — remove 8 legacy values, change DEFAULT to 'user'
ALTER TABLE users
  MODIFY COLUMN role ENUM(
    'super_admin',
    'section_head',
    'user',
    'compliance_officer',
    'cybersec',
    'infosec',
    'project_mgr',
    'dev_lead',
    'sqa_lead',
    'lead_infra',
    'server_admin',
    'db_admin',
    'network_admin',
    'desktop_sr',
    'it_support_sr',
    'desktop_jr',
    'it_support_jr',
    'pantawid_ict',
    'records_officer',
    'hr_id_officer'
  ) NOT NULL DEFAULT 'user';

-- =======================================================================

USE compliance_hub;

-- 5. Drop tables that belong only in compliance_hub_ticketing
DROP TABLE IF EXISTS escalation_focal_configs;
DROP TABLE IF EXISTS office_days;
DROP TABLE IF EXISTS ticket_events;
DROP TABLE IF EXISTS ticket_keyword_rules;
