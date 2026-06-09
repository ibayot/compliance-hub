-- RICTMS Compliance Hub Database Schema
-- MariaDB 11.x
-- Database: rictms_compliance

-- =============================================
-- USERS AND AUTHENTICATION
-- =============================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL UNIQUE,
  `passwordHash` varchar(255) NOT NULL,
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
  `google_sub` varchar(255) DEFAULT NULL UNIQUE,
  `role` enum(
    'super_admin','reviewer','focal','section_head','technician','auditor','user',
    'compliance_officer','cybersec','infosec',
    'lead_infra','server_admin','db_admin','network_admin',
    'project_mgr','dev_lead','sqa_lead',
    'records_officer','hr_id_officer',
    'technician_desktop','technician_it_support','technician_it_staff','technician_desktop_staff',
    'desktop_sr','it_support_sr','desktop_jr','it_support_jr','pantawid_ict'
  ) NOT NULL DEFAULT 'focal',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- =============================================
-- ORGANIZATIONAL UNITS
-- =============================================

CREATE TABLE IF NOT EXISTS `units` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `abbreviation` varchar(50) NOT NULL,
  `parent_id` varchar(36) DEFAULT NULL,
  `head_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_unit_parent` (`parent_id`),
  KEY `fk_unit_head` (`head_id`),
  CONSTRAINT `fk_unit_parent` FOREIGN KEY (`parent_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_unit_head` FOREIGN KEY (`head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- DOCUMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS `documents` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `period` varchar(20) NOT NULL,
  `year` varchar(4) NOT NULL,
  `status` enum('pending','processing','ready','failed') NOT NULL DEFAULT 'pending',
  `current_version` int(11) NOT NULL DEFAULT 1,
  `extracted_text` longtext DEFAULT NULL,
  `file_blob` longblob DEFAULT NULL,
  `unit_id` varchar(36) NOT NULL,
  `uploaded_by` varchar(36) NOT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_document_unit` (`unit_id`),
  KEY `fk_document_uploader` (`uploaded_by`),
  KEY `idx_document_type` (`document_type`),
  KEY `idx_period` (`period`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_document_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_versions` (
  `id` varchar(36) NOT NULL,
  `document_id` varchar(36) NOT NULL,
  `version_number` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_blob` longblob DEFAULT NULL,
  `mime_type` varchar(50) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `preview_path` varchar(255) DEFAULT NULL,
  `preview_blob` longblob DEFAULT NULL,
  `extracted_text` longtext DEFAULT NULL,
  `change_notes` text DEFAULT NULL,
  `uploaded_by` varchar(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_version_document` (`document_id`),
  KEY `idx_version_number` (`document_id`, `version_number`),
  CONSTRAINT `fk_version_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- COMPLIANCE METRICS
-- =============================================

CREATE TABLE IF NOT EXISTS `metric_templates` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `metric_type` enum('section_check','keyword_check','property_check','date_check') NOT NULL,
  `rule_config` json NOT NULL,
  `pass_criteria` json NOT NULL,
  `weight` decimal(5,2) NOT NULL DEFAULT 1.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_metric_type` (`metric_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `metric_applicability` (
  `id` varchar(36) NOT NULL,
  `metric_id` varchar(36) NOT NULL,
  `unit_id` varchar(36) DEFAULT NULL,
  `document_type` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_applicability_metric` (`metric_id`),
  KEY `fk_applicability_unit` (`unit_id`),
  KEY `idx_document_type` (`document_type`),
  CONSTRAINT `fk_applicability_metric` FOREIGN KEY (`metric_id`) REFERENCES `metric_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_applicability_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `metric_results` (
  `id` varchar(36) NOT NULL,
  `version_id` varchar(36) NOT NULL,
  `metric_id` varchar(36) NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `passed` tinyint(1) NOT NULL,
  `evidence` json DEFAULT NULL,
  `computed_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_result_version` (`version_id`),
  KEY `fk_result_metric` (`metric_id`),
  KEY `idx_passed` (`passed`),
  CONSTRAINT `fk_result_version` FOREIGN KEY (`version_id`) REFERENCES `document_versions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_result_metric` FOREIGN KEY (`metric_id`) REFERENCES `metric_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- KPI MONITORING AND DASHBOARD
-- =============================================

CREATE TABLE IF NOT EXISTS `kpi_master` (
  `code` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `unit_id` int(11) NOT NULL,
  `type` enum('measurement','yes_no') NOT NULL DEFAULT 'measurement',
  `unit_of_measure` varchar(80) DEFAULT NULL,
  `direction` enum('higher_is_better','lower_is_better') NOT NULL,
  `target_value` float NOT NULL,
  `weight` float NOT NULL DEFAULT 1,
  `frequency` enum('monthly','quarterly','annual') NOT NULL DEFAULT 'monthly',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`code`),
  KEY `idx_kpi_master_unit` (`unit_id`),
  KEY `idx_kpi_master_active` (`active`),
  CONSTRAINT `fk_kpi_master_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kpi_monitoring` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kpi_master_code` varchar(80) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `period_year` int(11) NOT NULL,
  `period_month` int(11) NOT NULL,
  `actual_value` float NOT NULL,
  `remarks` text DEFAULT NULL,
  `entered_by_user_id` int(11) DEFAULT NULL,
  `entered_by_staff_id` varchar(120) DEFAULT NULL,
  `entered_by_name` varchar(255) DEFAULT NULL,
  `status` enum('draft','locked') NOT NULL DEFAULT 'draft',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_kpi_monitoring_period` (`kpi_master_code`, `unit_id`, `period_year`, `period_month`),
  KEY `idx_kpi_monitoring_unit` (`unit_id`),
  KEY `idx_kpi_monitoring_period` (`period_year`, `period_month`),
  CONSTRAINT `fk_kpi_monitoring_master` FOREIGN KEY (`kpi_master_code`) REFERENCES `kpi_master` (`code`) ON DELETE CASCADE,
  CONSTRAINT `fk_kpi_monitoring_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_kpi_monitoring_user` FOREIGN KEY (`entered_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kpi_thresholds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `band` varchar(40) NOT NULL,
  `min_score` float NOT NULL,
  `max_score` float NOT NULL,
  `color` varchar(40) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_kpi_thresholds_band` (`band`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kpi_scoring_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL DEFAULT 'default',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `cap_score` float NOT NULL DEFAULT 100,
  `floor_score` float NOT NULL DEFAULT 0,
  `yes_score` float NOT NULL DEFAULT 100,
  `no_score` float NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- REVIEWS AND COMPARISONS
-- =============================================

CREATE TABLE IF NOT EXISTS `manual_reviews` (
  `id` varchar(36) NOT NULL,
  `document_id` varchar(36) NOT NULL,
  `version_id` varchar(36) NOT NULL,
  `decision` enum('compliant','non_compliant','needs_revision') NOT NULL,
  `remarks` text DEFAULT NULL,
  `findings` json DEFAULT NULL,
  `reviewer_id` varchar(36) NOT NULL,
  `reviewed_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_review_document` (`document_id`),
  KEY `fk_review_version` (`version_id`),
  KEY `idx_decision` (`decision`),
  CONSTRAINT `fk_review_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_version` FOREIGN KEY (`version_id`) REFERENCES `document_versions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `version_comparisons` (
  `id` varchar(36) NOT NULL,
  `document_id` varchar(36) NOT NULL,
  `version_a_id` varchar(36) NOT NULL,
  `version_b_id` varchar(36) NOT NULL,
  `compared_by_id` varchar(36) NOT NULL,
  `diff_output` json NOT NULL,
  `compared_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_comparison_document` (`document_id`),
  KEY `fk_comparison_version_a` (`version_a_id`),
  KEY `fk_comparison_version_b` (`version_b_id`),
  CONSTRAINT `fk_comparison_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comparison_version_a` FOREIGN KEY (`version_a_id`) REFERENCES `document_versions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comparison_version_b` FOREIGN KEY (`version_b_id`) REFERENCES `document_versions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- REFERENCES (ISSUANCES)
-- =============================================

CREATE TABLE IF NOT EXISTS `issuances` (
  `id` varchar(36) NOT NULL,
  `issuance_number` varchar(100) NOT NULL UNIQUE,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `issuance_type` varchar(80) DEFAULT NULL,
  `applicability_scope` text DEFAULT NULL,
  `relevance_notes` text DEFAULT NULL,
  `binding_nature` varchar(60) DEFAULT NULL,
  `adoption_basis` text DEFAULT NULL,
  `applicable_provisions` text DEFAULT NULL,
  `compliance_obligations` text DEFAULT NULL,
  `required_evidence` text DEFAULT NULL,
  `evidence_location` text DEFAULT NULL,
  `process_owner` varchar(160) DEFAULT NULL,
  `frequency_cadence` varchar(80) DEFAULT NULL,
  `compliance_status` varchar(40) DEFAULT NULL,
  `gap_summary` text DEFAULT NULL,
  `action_required` text DEFAULT NULL,
  `target_date` date DEFAULT NULL,
  `last_review_date` date DEFAULT NULL,
  `quarterly_readiness` varchar(40) DEFAULT NULL,
  `q1_compliance_status` varchar(40) DEFAULT NULL,
  `q2_compliance_status` varchar(40) DEFAULT NULL,
  `q3_compliance_status` varchar(40) DEFAULT NULL,
  `q4_compliance_status` varchar(40) DEFAULT NULL,
  `register_added_at` date DEFAULT NULL,
  `is_amendment` tinyint(1) NOT NULL DEFAULT 0,
  `amended_issuance_number` varchar(100) DEFAULT NULL,
  `ict_amendment_notes` text DEFAULT NULL,
  `issuing_authority` varchar(100) NOT NULL,
  `issue_date` date NOT NULL,
  `effectivity_date` date DEFAULT NULL,
  `source_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_issuance_number` (`issuance_number`),
  KEY `idx_issuing_authority` (`issuing_authority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_issuances` (
  `issuance_id` varchar(36) NOT NULL,
  `document_id` varchar(36) NOT NULL,
  PRIMARY KEY (`issuance_id`, `document_id`),
  KEY `fk_doc_issuance_document` (`document_id`),
  CONSTRAINT `fk_doc_issuance_issuance` FOREIGN KEY (`issuance_id`) REFERENCES `issuances` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doc_issuance_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TICKETS
-- =============================================

CREATE TABLE IF NOT EXISTS `tickets` (
  `id` varchar(36) NOT NULL,
  `ticket_number` varchar(50) NOT NULL UNIQUE,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `category` enum('document_related','system_issue','compliance_query','training_request','other') NOT NULL DEFAULT 'other',
  `status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `reported_by_id` varchar(36) NOT NULL,
  `assigned_to_id` varchar(36) DEFAULT NULL,
  `unit_id` varchar(36) DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_ticket_number` (`ticket_number`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `fk_ticket_unit` (`unit_id`),
  CONSTRAINT `fk_ticket_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ticket_comments` (
  `id` varchar(36) NOT NULL,
  `ticket_id` varchar(36) NOT NULL,
  `comment` text NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_comment_ticket` (`ticket_id`),
  CONSTRAINT `fk_comment_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- MOV (MEANS OF VERIFICATION) ARTIFACTS
-- =============================================

CREATE TABLE IF NOT EXISTS `mov_artifacts` (
  `id` varchar(36) NOT NULL,
  `artifact_type` varchar(60) NOT NULL,
  `scope` varchar(30) NOT NULL DEFAULT 'regional',
  `title` varchar(255) NOT NULL,
  `period_year` int(11) NOT NULL,
  `quarter` int(11) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'draft',
  `content_markdown` longtext NOT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_mov_type_period` (`artifact_type`, `period_year`, `quarter`),
  KEY `idx_mov_scope` (`scope`),
  KEY `idx_mov_unit` (`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Additional indexes for common queries
CREATE INDEX idx_documents_unit_type ON documents(unit_id, document_type);
CREATE INDEX idx_documents_year_period ON documents(year, period);
CREATE INDEX idx_metric_results_version_metric ON metric_results(version_id, metric_id);
CREATE INDEX idx_reviews_document_date ON manual_reviews(document_id, reviewed_at);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to_id, status);
CREATE INDEX idx_kpi_monitoring_status ON kpi_monitoring(status);
CREATE INDEX idx_mov_artifacts_period ON mov_artifacts(period_year, quarter);
