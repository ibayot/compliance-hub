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
