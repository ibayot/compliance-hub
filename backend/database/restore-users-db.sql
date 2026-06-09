-- ============================================================
-- RESTORE SCRIPT: compliance_hub_users missing tables
-- Run with: mysql -u root < backend/database/restore-users-db.sql
-- Date: 2026-04-16
--
-- SAFE: Only creates missing tables and seeds data.
-- Does NOT drop any existing tables.
-- Does NOT modify compliance_hub or compliance_hub_ticketing.
-- ============================================================

USE compliance_hub_users;

-- ── 1. Create users table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL DEFAULT '',
  `first_name` varchar(255) DEFAULT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `suffix` varchar(255) DEFAULT NULL,
  `staff_id` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `position_full` varchar(255) DEFAULT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `ticket_main_focal` tinyint(1) NOT NULL DEFAULT 0,
  `ticket_technician` tinyint(1) NOT NULL DEFAULT 0,
  `auth_provider` enum('local','google') NOT NULL DEFAULT 'local',
  `google_sub` varchar(255) DEFAULT NULL,
  `role` enum(
    'super_admin','reviewer','focal','section_head','technician','auditor','user',
    'compliance_officer','cybersec','infosec',
    'lead_infra','server_admin','db_admin','network_admin',
    'project_mgr','dev_lead','sqa_lead',
    'records_officer','hr_id_officer',
    'technician_desktop','technician_it_support','technician_it_staff','technician_desktop_staff',
    'desktop_sr','it_support_sr','desktop_jr','it_support_jr','pantawid_ict'
  ) NOT NULL DEFAULT 'user',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_email` (`email`),
  UNIQUE KEY `UQ_google_sub` (`google_sub`),
  KEY `idx_role` (`role`),
  KEY `idx_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Create role_definitions table ─────────────────────────
CREATE TABLE IF NOT EXISTS `role_definitions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `value` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `assignable` tinyint(1) NOT NULL DEFAULT 1,
  `is_system` tinyint(1) NOT NULL DEFAULT 1,
  `technician_type` varchar(30) DEFAULT NULL,
  `role_code` varchar(50) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_role_definitions_value` (`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Create units table (if not already present) ───────────
CREATE TABLE IF NOT EXISTS `units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Create junction table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_unit_access` (
  `user_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`,`unit_id`),
  KEY `fk_uua_user` (`user_id`),
  KEY `fk_uua_unit` (`unit_id`),
  CONSTRAINT `fk_uua_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uua_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Seed units (safe: INSERT IGNORE) ──────────────────────
INSERT IGNORE INTO units (id, name, description, active) VALUES
(1, 'Information Technology Unit', 'Handles ICT compliance and digital services.', 1),
(2, 'Finance Unit', 'Handles financial compliance and reporting.', 1);

-- ── 6. Seed admin user (password: Admin@123) ──────────────────
-- Hash: $2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2
INSERT INTO users (id, email, passwordHash, first_name, last_name, role, active)
VALUES (1, 'admin@rictms.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'System', 'Admin', 'super_admin', 1)
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT IGNORE INTO user_unit_access (user_id, unit_id) VALUES (1, 1), (1, 2);

-- ── 7. Seed all role_definitions ─────────────────────────────
INSERT INTO role_definitions (`value`, `label`, `description`, `assignable`, `is_system`, `role_code`, `technician_type`) VALUES
('super_admin',               'Super Admin',                  'Full system access. Manages users, roles, settings, and all data.',                                                              0, 1, NULL,                NULL),
('reviewer',                  'Reviewer (Legacy/Compat)',      'Legacy compliance oversight role retained for backward compatibility. Maps to compliance_officer feature set.',               1, 1, 'compliance_officer', NULL),
('focal',                     'Focal Person',                  'Unit-level focal. Uploads documents, manages unit compliance activities.',                                                      1, 1, 'focal',              NULL),
('section_head',              'Section Head',                  'Section-level supervisor. Manages staff tickets and unit attendance within their section.',                                    1, 1, 'section_head',       NULL),
('technician',                'Technician (General)',           'General ICT support technician. Handles tickets and operational support tasks.',                                              1, 1, 'technician',         NULL),
('auditor',                   'Auditor',                       'Read-only compliance, KPI, and document access for internal/external audit.',                                                  1, 1, 'auditor',            NULL),
('user',                      'Regular Staff',                 'Standard staff user. Can submit tickets and view personal dashboards.',                                                        1, 1, NULL,                 NULL),
('compliance_officer',        'Compliance Officer',            'Primary compliance and quality management role. Full access to documents, KPI, MOV, reviews, and issuances.',                1, 1, NULL,                 NULL),
('cybersec',                  'Cybersecurity Officer',         'Cybersecurity-focused compliance officer. Manages cybersecurity metrics, reviews, and IAM-related compliance.',               1, 1, 'compliance_officer', NULL),
('infosec',                   'Information Security Officer',  'Information security governance and compliance. Reviews documents and manages security-related policy compliance.',            1, 1, 'compliance_officer', NULL),
('lead_infra',                'Lead Infrastructure Officer',   'Leads infrastructure operations. Focal-level access to tickets, attendance management, and compliance.',                      1, 1, 'focal',              NULL),
('server_admin',              'Server Administrator',          'Manages server infrastructure. Focal-level access for compliance and ticket management.',                                      1, 1, 'focal',              NULL),
('db_admin',                  'Database Administrator',        'Manages database systems. Focal-level access for compliance and ticket management.',                                           1, 1, 'focal',              NULL),
('network_admin',             'Network Administrator',         'Manages network infrastructure. Focal-level access for compliance and ticket management.',                                     1, 1, 'focal',              NULL),
('project_mgr',               'Project Manager',               'Manages ICT projects. Focal-level access for compliance documentation and ticket management.',                                 1, 1, 'focal',              NULL),
('dev_lead',                  'Development Lead',              'Leads software development. Focal-level access for compliance and ticket management.',                                          1, 1, 'focal',              NULL),
('sqa_lead',                  'SQA Lead',                      'Leads software quality assurance. Focal-level access for compliance and review participation.',                                1, 1, 'focal',              NULL),
('records_officer',           'Records Officer',               'Manages administrative records. Focal-level access for document handling and compliance tracking.',                             1, 1, 'focal',              NULL),
('hr_id_officer',             'HR / ID Officer',               'HR and identification management. Focal-level access for compliance and operational documentation.',                           1, 1, 'focal',              NULL),
('technician_desktop',        'Desktop Technician',            'Desktop support technician. Handles hardware and peripheral support tickets.',                                                  1, 1, 'technician',         'desktop_support'),
('technician_it_support',     'IT Support Technician',         'IT support technician. Handles connectivity, software, and network-level support tickets.',                                   1, 1, 'technician',         'it_support'),
('technician_it_staff',       'IT Support Staff',              'IT support staff under supervision. Handles assigned IT tickets and support tasks.',                                           1, 1, 'technician',         'it_support'),
('technician_desktop_staff',  'Desktop Support Staff',         'Desktop support staff under supervision. Handles assigned desktop-related tickets.',                                           1, 1, 'technician',         'desktop_support'),
('desktop_sr',                'Desktop Support Senior',        'Senior desktop technician with attendance management authority over their team.',                                               1, 1, 'focal',              'desktop_support'),
('it_support_sr',             'IT Support Senior',             'Senior IT support technician with attendance management authority over their team.',                                            1, 1, 'focal',              'it_support'),
('desktop_jr',                'Desktop Support Junior',        'Junior desktop technician assigned to escalate unresolved hardware issues.',                                                    1, 1, 'technician',         'desktop_support'),
('it_support_jr',             'IT Support Junior',             'Junior IT support assigned to resolve basic network and software support tickets.',                                             1, 1, 'technician',         'it_support'),
('pantawid_ict',              'Pantawid ICT Support',          'ICT support for the Pantawid Pamilyang Pilipino program. Manages Pantawid-specific ICT tickets with focal-level oversight.',  1, 1, 'focal',              'pantawid_ict_support')
ON DUPLICATE KEY UPDATE label=VALUES(label), description=VALUES(description), assignable=VALUES(assignable), role_code=VALUES(role_code), technician_type=VALUES(technician_type);

SELECT CONCAT('users: ', COUNT(*)) AS status FROM users;
SELECT CONCAT('role_definitions: ', COUNT(*)) AS status FROM role_definitions;
SELECT CONCAT('units: ', COUNT(*)) AS status FROM units;
SELECT '✓ compliance_hub_users restore complete' AS status;
