-- Create 02_db_audit_stg and audit_log
CREATE DATABASE IF NOT EXISTS `02_db_audit_stg`;
USE `02_db_audit_stg`;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_email` VARCHAR(255) DEFAULT NULL,
  `action` VARCHAR(50) DEFAULT NULL,
  `database_name` VARCHAR(100) DEFAULT NULL,
  `table_name` VARCHAR(100) DEFAULT NULL,
  `operation_type` VARCHAR(50) DEFAULT NULL,
  `row_id` VARCHAR(100) DEFAULT NULL,
  `description` TEXT,
  `old_values` JSON DEFAULT NULL,
  `new_values` JSON DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `session_id` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create document_issuances in the compliance database
USE 02_db_stg_compliance_hub;

CREATE TABLE IF NOT EXISTS document_issuances (
  issuance_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  PRIMARY KEY (issuance_id, document_id),
  KEY idx_document_issuances_document_id (document_id),
  CONSTRAINT fk_document_issuances_issuance FOREIGN KEY (issuance_id) REFERENCES issuances(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_document_issuances_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create incidents in the compliance database
CREATE TABLE IF NOT EXISTS `incidents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('security_breach', 'system_outage', 'data_loss', 'malware', 'unauthorized_access', 'phishing', 'ddos', 'other') NOT NULL DEFAULT 'other',
  `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `reported_by_id` INT NOT NULL,
  `assigned_to_id` INT NULL,
  `resolution_notes` TEXT NULL,
  `resolved_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create feedback in the users database
USE 02_db_stg_compliance_hub_users;

CREATE TABLE IF NOT EXISTS feedback (
  id INT NOT NULL AUTO_INCREMENT,
  suggestion TEXT NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  submitter_id INT NULL,
  acted_by_id INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY FK_feedback_submitter (submitter_id),
  KEY FK_feedback_acted_by (acted_by_id),
  CONSTRAINT FK_feedback_submitter FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT FK_feedback_acted_by FOREIGN KEY (acted_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add new columns to role_capabilities
ALTER TABLE role_capabilities
ADD COLUMN IF NOT EXISTS is_role_capabilities_access TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_system_roles_access TINYINT(1) NOT NULL DEFAULT 0;

-- --------------------------------------------------------------------------------
-- Ticketing DB Modifications
-- --------------------------------------------------------------------------------
USE 02_db_stg_compliance_hub_ticketing;

-- 1. tickets table modifications
ALTER TABLE tickets
MODIFY COLUMN status ENUM('open', 'assigned', 'in_progress', 'resolved', 'closed', 'freeze', 'pause', 'duplicate') NOT NULL DEFAULT 'open',
ADD COLUMN IF NOT EXISTS sla_paused_at DATETIME NULL,
ADD COLUMN IF NOT EXISTS accumulated_pause_seconds INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_assigned_at DATETIME NULL,
ADD COLUMN IF NOT EXISTS requester_id INT NOT NULL DEFAULT 1;

-- 2. ticket_categories modifications
ALTER TABLE ticket_categories
DROP COLUMN IF EXISTS allowable_freeze_hours;

ALTER TABLE ticket_categories
ADD COLUMN IF NOT EXISTS allowable_pause_hours INT NOT NULL DEFAULT 48;

-- 3. ticketing_configs table
CREATE TABLE IF NOT EXISTS ticketing_configs (
  id INT NOT NULL,
  assignment_strategy VARCHAR(50) NOT NULL DEFAULT 'CURRENT_AUTO',
  round_robin_cap_hours INT NOT NULL DEFAULT 80,
  auto_close_days INT NOT NULL DEFAULT 3,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE ticketing_configs ADD COLUMN IF NOT EXISTS auto_close_days INT NOT NULL DEFAULT 3;

-- Insert default config row if not exists
INSERT IGNORE INTO ticketing_configs (id, assignment_strategy, round_robin_cap_hours, auto_close_days) VALUES (1, 'CURRENT_AUTO', 80, 3);

-- 4. knowledge_base_articles table
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags VARCHAR(255) NULL,
  helpful_count INT NOT NULL DEFAULT 0,
  unhelpful_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO knowledge_base_articles (title, content, tags, helpful_count, unhelpful_count, created_at, updated_at) VALUES 
('Printer is not printing or showing offline', '1. Check if the printer is turned on and connected to the network or computer.\n2. Restart the printer.\n3. Check if there is enough paper and ink/toner.\n4. Reinstall printer drivers if necessary.\n5. Restart the Print Spooler service in Windows.', 'printer,hardware,offline', 15, 2, NOW(), NOW()),
('Cannot connect to the Internet / No Network', '1. Verify the network cable is plugged in or Wi-Fi is connected.\n2. Restart the router or modem.\n3. Run Windows Network Troubleshooter.\n4. Check IP configuration using ipconfig /release and ipconfig /renew.\n5. Flush DNS using ipconfig /flushdns.\n6. If using VPN, disconnect and reconnect.', 'internet,network,wifi,connection', 34, 5, NOW(), NOW()),
('Laptop is not turning on / Black screen', '1. Ensure the laptop is plugged into a working power outlet.\n2. Check if the power adapter has a light indicator on.\n3. Perform a hard reset by holding the power button for 30 seconds.\n4. Disconnect all external devices and try again.\n5. If the battery is removable, take it out, hold power for 30 seconds, put it back and turn on.', 'laptop,power,hardware,black screen', 22, 3, NOW(), NOW()),
('Desktop PC is completely dead / No power', '1. Verify the power cable is securely plugged into the PC and the outlet.\n2. Check the switch on the back of the power supply (PSU) is set to I (On).\n3. Test the wall outlet with another device.\n4. Check for any loose internal cables if authorized.\n5. Try a different power cord.', 'desktop,power,hardware,dead', 18, 1, NOW(), NOW());
-- Migration to add SMTP and capability columns

USE 02_db_stg_compliance_hub_users;
ALTER TABLE role_capabilities ADD COLUMN IF NOT EXISTS is_smtp_settings_access TINYINT(1) DEFAULT 0;
-- Super admins should have this by default
UPDATE role_capabilities SET is_smtp_settings_access = 1 WHERE role_value = 'super_admin';

USE 02_db_stg_compliance_hub_ticketing;
ALTER TABLE ticketing_configs ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255) NULL;
ALTER TABLE ticketing_configs ADD COLUMN IF NOT EXISTS smtp_port INT NULL;
ALTER TABLE ticketing_configs ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255) NULL;
ALTER TABLE ticketing_configs ADD COLUMN IF NOT EXISTS smtp_pass VARCHAR(255) NULL;
ALTER TABLE ticketing_configs ADD COLUMN IF NOT EXISTS smtp_from VARCHAR(255) NULL;
ALTER TABLE ticketing_configs ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(255) NULL;

USE 02_db_stg_compliance_hub_users;

-- 1. Create the security_config table
CREATE TABLE IF NOT EXISTS `security_config` (
  `id` INT NOT NULL,
  `default_password` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insert default config row if not exists
-- The default password will be Changeme123!@#
INSERT IGNORE INTO `security_config` (`id`, `default_password`) VALUES (1, 'Changeme123!@#');

-- 3. Add capability to role_capabilities
ALTER TABLE role_capabilities ADD COLUMN IF NOT EXISTS is_security_settings_access TINYINT(1) NOT NULL DEFAULT 0;

-- 4. Grant access to super_admin
UPDATE role_capabilities SET is_security_settings_access = 1 WHERE role_value = 'super_admin';
USE 02_db_stg_compliance_hub_ticketing;

ALTER TABLE ticketing_configs
ADD COLUMN IF NOT EXISTS primary_smtp_sent_today INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS primary_smtp_last_sent_date DATE NULL,
ADD COLUMN IF NOT EXISTS primary_smtp_daily_limit INT NOT NULL DEFAULT 500;
-- DROP TRIGGERS TO PREVENT DUPLICATES
USE 02_db_stg_compliance_hub_ticketing;

DROP TRIGGER IF EXISTS trg_comments_after_insert;
DROP TRIGGER IF EXISTS trg_comments_after_update;
DROP TRIGGER IF EXISTS trg_comments_after_delete;

DROP TRIGGER IF EXISTS trg_events_after_insert;

DROP TRIGGER IF EXISTS trg_tickets_after_insert;
DROP TRIGGER IF EXISTS trg_tickets_after_update;
DROP TRIGGER IF EXISTS trg_tickets_after_delete;
USE 02_db_stg_compliance_hub_ticketing;

ALTER TABLE ticketing_configs
ADD COLUMN IF NOT EXISTS schedule_mode VARCHAR(20) NOT NULL DEFAULT 'OFFICE_HOURS',
ADD COLUMN IF NOT EXISTS office_clockin TIME NOT NULL DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS office_clockout TIME NOT NULL DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS cww_clockin_start TIME NOT NULL DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS cww_clockin_end TIME NOT NULL DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS cww_clockout_start TIME NOT NULL DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS cww_clockout_end TIME NOT NULL DEFAULT '19:00:00',
ADD COLUMN IF NOT EXISTS is_flag_ceremony_paused BOOLEAN NOT NULL DEFAULT 0;

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS is_sla_waiting BOOLEAN NOT NULL DEFAULT 0;

-- Additional Phase 1 and 2 Database Changes

-- Note: The following schemas are applied manually because TypeORM's DB_SYNCHRONIZE is disabled in staging.

USE `02_db_stg_compliance_hub_users`;

-- Users Service Phase 1 Updates
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mfa_code` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mfa_code_expires_at` DATETIME NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mfa_last_verified_at` DATETIME NULL;

USE `02_db_stg_compliance_hub_ticketing`;

-- Ticketing Service Phase 2 Updates
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `sla_deadline` DATETIME NULL;
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `sla_paused_at` DATETIME NULL;
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `accumulated_pause_seconds` INT NOT NULL DEFAULT 0;
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `is_sla_waiting` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `tickets` ADD COLUMN IF NOT EXISTS `last_assigned_at` DATETIME NULL;

-- Ticketing Category Settings Updates
CREATE TABLE IF NOT EXISTS `ticketing_configs` (
  `id` int NOT NULL,
  `assignment_strategy` varchar(50) NOT NULL DEFAULT 'CURRENT_AUTO',
  `round_robin_cap_hours` int NOT NULL DEFAULT 80,
  `auto_close_days` int NOT NULL DEFAULT 3,
  `smtp_host` varchar(255) NULL,
  `smtp_port` int NULL,
  `smtp_user` varchar(255) NULL,
  `smtp_pass` varchar(255) NULL,
  `smtp_from` varchar(255) NULL,
  `smtp_from_name` varchar(255) NULL,
  `primary_smtp_sent_today` int NOT NULL DEFAULT 0,
  `primary_smtp_last_sent_date` date NULL,
  `primary_smtp_daily_limit` int NOT NULL DEFAULT 500,
  `schedule_mode` varchar(20) NOT NULL DEFAULT 'OFFICE_HOURS',
  `office_clockin` time NOT NULL DEFAULT '08:00:00',
  `office_clockout` time NOT NULL DEFAULT '17:00:00',
  `cww_clockin_start` time NOT NULL DEFAULT '07:00:00',
  `cww_clockin_end` time NOT NULL DEFAULT '08:00:00',
  `cww_clockout_start` time NOT NULL DEFAULT '18:00:00',
  `cww_clockout_end` time NOT NULL DEFAULT '19:00:00',
  `is_flag_ceremony_paused` boolean NOT NULL DEFAULT false,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `ticket_categories` ADD COLUMN IF NOT EXISTS `sla_hours` int NULL;
ALTER TABLE `ticket_categories` ADD COLUMN IF NOT EXISTS `allowable_pause_hours` int NULL;

-- Fix incorrectly mapped relations causing metadata errors locally:
-- Make actor_id standard int instead of implicit FK object type inference
-- Ensure reviewer_id, unit_id, compared_by_id are standard ints.
-- (No SQL changes strictly required for the fix, as the staging database already has them as `int`.
-- The TypeORM entity mapping changes were sufficient to align the codebase with the staging DB).

USE `02_db_stg_compliance_hub_users`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `phone_number` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `sex` VARCHAR(255) NULL;

USE `02_db_stg_compliance_hub_ticketing`;
ALTER TABLE `ticket_comments` ADD COLUMN IF NOT EXISTS `attachment_path` VARCHAR(255) NULL;

DELIMITER //
DROP PROCEDURE IF EXISTS `migrate_escalation_focals`//

CREATE PROCEDURE `migrate_escalation_focals`()
BEGIN
    DECLARE col_count INT;
    SELECT COUNT(*) INTO col_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '02_db_stg_compliance_hub_ticketing'
      AND TABLE_NAME = 'escalation_focal_configs'
      AND COLUMN_NAME = 'user_id';

    IF col_count = 0 THEN
        ALTER TABLE `escalation_focal_configs`
          ADD COLUMN IF NOT EXISTS `user_id` int(11) NULL AFTER `ticket_type`;

        UPDATE `escalation_focal_configs`
        SET `user_id` = CAST(`role_value` AS UNSIGNED);

        ALTER TABLE `escalation_focal_configs`
          MODIFY `user_id` int(11) NOT NULL;

        ALTER TABLE `escalation_focal_configs`
          ADD UNIQUE KEY `uq_efc_type_user` (`ticket_type`,`user_id`);

        ALTER TABLE `escalation_focal_configs`
          ADD CONSTRAINT `fk_efc_user`
          FOREIGN KEY (`user_id`) REFERENCES `02_db_stg_compliance_hub_users`.`users` (`id`)
          ON DELETE RESTRICT;

        ALTER TABLE `escalation_focal_configs`
          DROP KEY `uq_efc_type_role`;

        ALTER TABLE `escalation_focal_configs`
          DROP COLUMN `role_value`;
    END IF;
END//

DELIMITER ;

USE `02_db_stg_compliance_hub_ticketing`;
CALL `migrate_escalation_focals`();
DROP PROCEDURE `migrate_escalation_focals`;

USE `02_db_stg_compliance_hub_users`;

ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mfa_code` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mfa_expires_at` TIMESTAMP NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mfa_last_verified_at` TIMESTAMP NULL;
ALTER TABLE `users` DROP COLUMN IF EXISTS `mfa_code_expires_at`;

-- Create table to track remembered devices for 1 week
CREATE TABLE IF NOT EXISTS `user_trusted_devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `device_token` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_trusted_devices_user_id FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

USE `02_db_stg_compliance_hub_ticketing`;
CREATE OR REPLACE VIEW `users` AS SELECT * FROM `02_db_stg_compliance_hub_users`.`users`;
USE `02_db_stg_compliance_hub`;
CREATE OR REPLACE VIEW `users` AS SELECT * FROM `02_db_stg_compliance_hub_users`.`users`;

USE `02_db_stg_compliance_hub_ticketing`;

-- Add table for ticket counter.
DROP TABLE IF EXISTS `ticket_number_counters`;
CREATE TABLE IF NOT EXISTS `ticket_number_counters` (
  `ticket_year` int(11) NOT NULL,
  `last_sequence` int(11) NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ticket_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



DELIMITER //

DROP TRIGGER IF EXISTS `bi_tickets_ticket_number`//
CREATE TRIGGER `bi_tickets_ticket_number`
BEFORE INSERT ON `tickets`
FOR EACH ROW
BEGIN
  DECLARE v_year INT;
  DECLARE v_seq INT;

  SET v_year = YEAR(COALESCE(NEW.created_at, NOW()));

  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    INSERT INTO ticket_number_counters (ticket_year, last_sequence)
    VALUES (v_year, 0)
    ON DUPLICATE KEY UPDATE ticket_year = ticket_year;

    UPDATE ticket_number_counters
      SET last_sequence = LAST_INSERT_ID(last_sequence + 1)
      WHERE ticket_year = v_year;

    SET v_seq = LAST_INSERT_ID();
    SET NEW.ticket_number = CONCAT('TKT-', v_year, '-', LPAD(v_seq, 4, '0'));
  END IF;
END//

DELIMITER ;

INSERT INTO `ticket_number_counters` (`ticket_year`, `last_sequence`)
SELECT
  CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(`ticket_number`, '-', 2), '-', -1) AS UNSIGNED) AS ticket_year,
  MAX(CAST(SUBSTRING_INDEX(`ticket_number`, '-', -1) AS UNSIGNED)) AS last_sequence
FROM `tickets`
WHERE `ticket_number` LIKE 'TKT-%'
GROUP BY ticket_year
ON DUPLICATE KEY UPDATE
  `last_sequence` = GREATEST(`last_sequence`, VALUES(`last_sequence`));

-- Ticket Module Loading Optimization Indexes
USE `02_db_stg_compliance_hub_ticketing`;

ALTER TABLE `tickets` ADD INDEX `idx_tickets_status_assigned` (`status`, `assigned_to_id`);
ALTER TABLE `tickets` ADD INDEX `idx_tickets_created_at` (`created_at`);

-- Data Cleanup: Reset SLA deadlines for old unassigned tickets
USE `02_db_stg_compliance_hub_ticketing`;
UPDATE tickets SET sla_deadline = NULL, sla_paused_at = NULL, accumulated_pause_seconds = 0 WHERE status = 'open';
USE `02_db_stg_compliance_hub_users`;
ALTER TABLE `security_config` ADD COLUMN IF NOT EXISTS `mfa_test_mode` TINYINT(1) DEFAULT 0;

-- Recreate shared views to include newly added columns (mfa_expires_at, phone_number, sex, etc.)

CREATE OR REPLACE VIEW `users` AS SELECT * FROM `02_db_stg_compliance_hub_users`.`users`;
CREATE OR REPLACE VIEW `attendance` AS SELECT * FROM `02_db_stg_compliance_hub_users`.`attendance`;
CREATE OR REPLACE VIEW `role_capabilities` AS SELECT * FROM `02_db_stg_compliance_hub_users`.`role_capabilities`;
CREATE OR REPLACE VIEW `role_definitions` AS SELECT * FROM `02_db_stg_compliance_hub_users`.`role_definitions`;

CREATE OR REPLACE VIEW `users` AS SELECT * FROM `02_db_stg_compliance_hub_users`.`users`;

-- Added KB Generation Pending flag for Retry Queue
USE `02_db_stg_compliance_hub_ticketing`;
ALTER TABLE tickets ADD COLUMN is_kb_generation_pending TINYINT DEFAULT 0;

-- Added Email Override and Notifications Enabled for Ticketing Config
USE `02_db_stg_compliance_hub_ticketing`;
ALTER TABLE ticketing_configs ADD COLUMN is_email_notifications_enabled TINYINT(1) DEFAULT 1;
ALTER TABLE ticketing_configs ADD COLUMN email_test_override VARCHAR(255) DEFAULT NULL;
