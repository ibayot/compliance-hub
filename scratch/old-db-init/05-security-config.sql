USE 02_db_stg_compliance_hub_users;

-- 1. Create the security_config table
CREATE TABLE IF NOT EXISTS security_config (
  id INT NOT NULL,
  default_password VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insert default config row if not exists
-- The default password will be Changeme123!@#
INSERT IGNORE INTO security_config (id, default_password) VALUES (1, 'Changeme123!@#');

-- 3. Add capability to role_capabilities
ALTER TABLE role_capabilities ADD COLUMN IF NOT EXISTS is_security_settings_access TINYINT(1) NOT NULL DEFAULT 0;

-- 4. Grant access to super_admin
UPDATE role_capabilities SET is_security_settings_access = 1 WHERE role_value = 'super_admin';
