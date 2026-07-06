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
