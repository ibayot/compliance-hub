CREATE DATABASE IF NOT EXISTS compliance_hub_users
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS compliance_hub_ticketing
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS compliance_hub_compliance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Optional: Create a shared application user and grant permissions
-- CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'app_password';
-- GRANT ALL PRIVILEGES ON compliance_hub_users.* TO 'app_user'@'%';
-- GRANT ALL PRIVILEGES ON compliance_hub_ticketing.* TO 'app_user'@'%';
-- GRANT ALL PRIVILEGES ON compliance_hub_compliance.* TO 'app_user'@'%';
-- FLUSH PRIVILEGES;
