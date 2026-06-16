-- Migration v0.0.51: Add feedback table and role capabilities access flags

-- 1. Create feedback table
CREATE TABLE IF NOT EXISTS `feedback` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `suggestion` TEXT NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `submitter_id` INT DEFAULT NULL,
  `acted_by_id` INT DEFAULT NULL,
  CONSTRAINT `fk_feedback_submitter` FOREIGN KEY (`submitter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_feedback_acted_by` FOREIGN KEY (`acted_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Alter role_capabilities table
ALTER TABLE `role_capabilities` 
ADD COLUMN `is_role_capabilities_access` TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN `is_system_roles_access` TINYINT(1) NOT NULL DEFAULT 0;
