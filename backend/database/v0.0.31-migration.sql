-- =============================================================================
-- v0.0.31 Migration: role_capabilities table
-- Database: compliance_hub_users (BASE TABLE) + VIEWs in other DBs
-- Date: 2026-04-16
--
-- Changes:
--   1. Creates role_capabilities table in compliance_hub_users
--   2. Seeds capability matrix for all 20 system roles
--   3. Creates VIEWs in compliance_hub_ticketing and compliance_hub
--   4. Sub-Q: Sets role_code = 'focal' for desktop_sr, it_support_sr, pantawid_ict
--             so controller @Roles('focal') guard accepts them at endpoint level
--
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- ── 1. Create role_capabilities BASE TABLE in compliance_hub_users ───────────

CREATE TABLE IF NOT EXISTS `compliance_hub_users`.`role_capabilities` (
  `id`                  INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `role_value`          VARCHAR(50)  NOT NULL UNIQUE COMMENT 'Matches role_definitions.value',
  `is_focal`            TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Focal/compliance document access',
  `is_desktop`          TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Handles desktop/hardware support tickets',
  `is_it_support`       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Handles IT/software support tickets',
  `is_pantawid_ict`     TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Handles Pantawid ICT support tickets',
  `is_ito`              TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Non-tech ITO professional staff (attendance ITO group)',
  `is_escalation_focal` TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Can receive escalated tickets',
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Boolean capability matrix per role. One row per role_value.';

-- ── 2. Seed capability matrix (INSERT IGNORE = idempotent) ───────────────────
-- Columns: role_value, is_focal, is_desktop, is_it_support, is_pantawid_ict, is_ito, is_escalation_focal

INSERT IGNORE INTO `compliance_hub_users`.`role_capabilities`
  (role_value, is_focal, is_desktop, is_it_support, is_pantawid_ict, is_ito, is_escalation_focal)
VALUES
  -- Core admin (no functional capabilities; super_admin bypasses all checks directly)
  ('super_admin',        0, 0, 0, 0, 0, 0),

  -- Supervisorial (focal + ITO staff + can receive escalations)
  ('section_head',       1, 0, 0, 0, 1, 1),

  -- Compliance / review roles
  ('compliance_officer', 1, 0, 0, 0, 1, 1),
  ('cybersec',           1, 0, 0, 0, 1, 1),
  ('infosec',            1, 0, 0, 0, 1, 1),

  -- Named ITO professional staff (focal + ito group, no ticket-handling type)
  ('lead_infra',         1, 0, 0, 0, 1, 0),
  ('server_admin',       1, 0, 0, 0, 1, 0),
  ('db_admin',           1, 0, 0, 0, 1, 0),
  ('network_admin',      1, 0, 0, 0, 1, 0),
  ('project_mgr',        1, 0, 0, 0, 1, 0),
  ('dev_lead',           1, 0, 0, 0, 1, 0),
  ('sqa_lead',           1, 0, 0, 0, 1, 0),
  ('records_officer',    1, 0, 0, 0, 1, 0),
  ('hr_id_officer',      1, 0, 0, 0, 1, 0),

  -- Senior technicians: focal-elevated (Sub-Q), handle tickets, can receive escalations
  -- is_ito=0 because they appear in their own tech attendance group, not ITO staff group
  ('desktop_sr',         1, 1, 0, 0, 0, 1),
  ('it_support_sr',      1, 0, 1, 0, 0, 1),

  -- Junior technicians: NOT focal, handle tickets only
  ('desktop_jr',         0, 1, 0, 0, 0, 0),
  ('it_support_jr',      0, 0, 1, 0, 0, 0),

  -- Pantawid ICT: focal-elevated (Sub-Q), handles Pantawid-specific tickets
  ('pantawid_ict',       1, 0, 0, 1, 0, 0),

  -- End-user (no capabilities)
  ('user',               0, 0, 0, 0, 0, 0);

-- ── 3. Create VIEWs in other databases ───────────────────────────────────────

-- Ticketing DB VIEW
CREATE OR REPLACE VIEW `compliance_hub_ticketing`.`role_capabilities`
  AS SELECT * FROM `compliance_hub_users`.`role_capabilities`;

-- Compliance DB VIEW
CREATE OR REPLACE VIEW `compliance_hub`.`role_capabilities`
  AS SELECT * FROM `compliance_hub_users`.`role_capabilities`;

-- ── 4. Sub-Q: Elevate desktop_sr, it_support_sr, pantawid_ict to focal roleCode ──
-- This makes @Roles('focal') controller guards accept these roles at the API endpoint level.
-- Before this update, they were restricted to ticketing-only endpoints.
-- After: they gain the same endpoint access as named focal staff (lead_infra, server_admin, etc.)

UPDATE `compliance_hub_users`.`role_definitions`
SET `role_code` = 'focal'
WHERE `value` IN ('desktop_sr', 'it_support_sr', 'pantawid_ict')
  AND (`role_code` IS NULL OR `role_code` != 'focal');

-- ── Verification queries (run manually to confirm) ────────────────────────────
-- SELECT role_value, is_focal, is_ito, is_escalation_focal
--   FROM compliance_hub_users.role_capabilities
--  ORDER BY is_focal DESC, role_value;
--
-- SELECT value, label, role_code FROM compliance_hub_users.role_definitions
--  WHERE value IN ('desktop_sr', 'it_support_sr', 'pantawid_ict');
