-- Create database if not exists
CREATE DATABASE IF NOT EXISTS rictms_compliance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rictms_compliance;

-- Insert default super admin (password: Admin@123)
-- Password hash for: Admin@123
INSERT INTO users (id, email, passwordHash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (1, 'admin@rictms.gov.ph', '$2b$10$YourHashedPasswordHere', 'System', 'Administrator', 'super_admin', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE email = email;

-- Note: You should run the schema.sql file after creating the database
-- mysql -u root -p rictms_compliance < src/database/schema.sql
