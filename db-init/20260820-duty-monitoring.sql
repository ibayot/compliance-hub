-- Duty Monitoring schema and capability matrix additions.
-- Apply this once to existing environments; fresh Docker databases run it from db-init.

USE `02_db_stg_compliance_hub_users`;

ALTER TABLE `role_capabilities`
  ADD COLUMN IF NOT EXISTS `is_duty_viewer_access` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `is_duty_admin_access` tinyint(1) NOT NULL DEFAULT 0;

UPDATE `role_capabilities`
SET `is_duty_viewer_access` = 1,
    `is_duty_admin_access` = 1
WHERE `role_value` = 'super_admin';

USE `02_db_stg_compliance_hub_ticketing`;

CREATE TABLE IF NOT EXISTS `duty_roster_memberships` (
  `id` varchar(36) NOT NULL,
  `user_id` int NOT NULL,
  `duty_type` varchar(20) NOT NULL DEFAULT 'OD',
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_duty_roster_user` (`user_id`),
  KEY `idx_duty_roster_active_order` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `duty_assignments` (
  `id` varchar(36) NOT NULL,
  `duty_date` date NOT NULL,
  `user_id` int NOT NULL,
  `duty_type` varchar(20) NOT NULL,
  `remarks` text NULL,
  `source` varchar(20) NOT NULL DEFAULT 'manual',
  `created_by_id` int NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_duty_assignment` (`duty_date`, `user_id`, `duty_type`),
  KEY `idx_duty_assignment_rotation` (`duty_type`, `user_id`, `duty_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `duty_exceptions` (
  `id` varchar(36) NOT NULL,
  `exception_date` date NOT NULL,
  `user_id` int NOT NULL,
  `type` varchar(30) NOT NULL,
  `remarks` text NULL,
  `created_by_id` int NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_duty_exception_date_user` (`exception_date`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `duty_meeting_reservations` (
  `id` varchar(36) NOT NULL,
  `meeting_date` date NOT NULL,
  `venue_type` varchar(20) NOT NULL,
  `start_time` time NULL,
  `end_time` time NULL,
  `purpose` varchar(255) NULL,
  `remarks` text NULL,
  `status` varchar(20) NOT NULL DEFAULT 'scheduled',
  `created_by_id` int NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_duty_reservation_date_venue` (`meeting_date`, `venue_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `duty_daily_coverages` (
  `id` varchar(36) NOT NULL,
  `duty_date` date NOT NULL,
  `duty_type` varchar(20) NOT NULL,
  `primary_user_id` int NOT NULL,
  `assigned_user_id` int NULL,
  `is_substitute` tinyint(1) NOT NULL DEFAULT 0,
  `substitution_reason` text NULL,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `previous_attendance_status` varchar(20) NULL,
  `previous_attendance_notes` text NULL,
  `attendance_overridden` tinyint(1) NOT NULL DEFAULT 0,
  `released_at` datetime NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_duty_coverage_date_type` (`duty_date`, `duty_type`),
  KEY `idx_duty_coverage_assignment_block` (`duty_date`, `assigned_user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
