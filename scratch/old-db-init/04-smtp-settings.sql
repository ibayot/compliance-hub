-- Migration to add SMTP and capability columns

USE 02_db_stg_compliance_hub_users;
ALTER TABLE role_capabilities ADD COLUMN is_smtp_settings_access TINYINT(1) DEFAULT 0;
-- Super admins should have this by default
UPDATE role_capabilities SET is_smtp_settings_access = 1 WHERE role_value = 'super_admin';

USE 02_db_stg_compliance_hub_ticketing;
ALTER TABLE ticketing_configs ADD COLUMN smtp_host VARCHAR(255) NULL;
ALTER TABLE ticketing_configs ADD COLUMN smtp_port INT NULL;
ALTER TABLE ticketing_configs ADD COLUMN smtp_user VARCHAR(255) NULL;
ALTER TABLE ticketing_configs ADD COLUMN smtp_pass VARCHAR(255) NULL;
ALTER TABLE ticketing_configs ADD COLUMN smtp_from VARCHAR(255) NULL;
ALTER TABLE ticketing_configs ADD COLUMN smtp_from_name VARCHAR(255) NULL;

