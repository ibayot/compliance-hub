/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.18-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: compliance_hub_users
-- ------------------------------------------------------
-- Server version	10.11.18-MariaDB-ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `compliance_hub_users`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `compliance_hub_users` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `compliance_hub_users`;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'present',
  `set_by_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_user_date` (`user_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_capabilities`
--

DROP TABLE IF EXISTS `role_capabilities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_capabilities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_value` varchar(50) NOT NULL COMMENT 'Matches role_definitions.value',
  `is_focal` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Focal/compliance document access',
  `is_desktop` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Handles desktop/hardware support tickets',
  `is_it_support` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Handles IT/software support tickets',
  `is_pantawid_ict` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Handles Pantawid ICT support tickets',
  `is_ito` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Non-tech ITO professional staff (attendance ITO group)',
  `is_escalation_focal` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Can receive escalated tickets',
  `is_ticket_settings_focal` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Can access and manage full ticket settings/reports (vs. own-data-only view)',
  `is_all_tickets` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Can see all tickets in the system (not restricted to own-submitted / own-assigned)',
  `is_ticket_focal` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Can manually assign/reassign tickets to any technician',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_kpi_access` tinyint(1) NOT NULL DEFAULT 0,
  `is_kpi_manage` tinyint(1) NOT NULL DEFAULT 0,
  `is_attendance_access` tinyint(1) NOT NULL DEFAULT 0,
  `is_attendance_manage` tinyint(1) NOT NULL DEFAULT 0,
  `is_reports_access` tinyint(1) NOT NULL DEFAULT 0,
  `is_reviews_access` tinyint(1) NOT NULL DEFAULT 0,
  `is_mov_access` tinyint(1) NOT NULL DEFAULT 0,
  `is_documents_access` tinyint(1) NOT NULL DEFAULT 0,
  `is_repository_access` tinyint(1) NOT NULL DEFAULT 0,
  `is_issuances_access` tinyint(1) NOT NULL DEFAULT 0,
  `is_metrics_access` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_value` (`role_value`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Boolean capability matrix per role. One row per role_value.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_definitions`
--

DROP TABLE IF EXISTS `role_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_definitions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `value` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `assignable` tinyint(1) NOT NULL DEFAULT 1,
  `is_system` tinyint(1) NOT NULL DEFAULT 1,
  `technician_type` varchar(30) DEFAULT NULL,
  `role_code` varchar(50) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_role_definitions_value` (`value`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `units`
--

DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `units_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_unit_access`
--

DROP TABLE IF EXISTS `user_unit_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_unit_access` (
  `user_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`,`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL DEFAULT '',
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
  `google_sub` varchar(255) DEFAULT NULL,
  `role` enum('super_admin','section_head','user','compliance_officer','cybersec','infosec','project_mgr','dev_lead','sqa_lead','lead_infra','server_admin','db_admin','network_admin','desktop_sr','it_support_sr','desktop_jr','it_support_jr','pantawid_ict','records_officer','hr_id_officer') NOT NULL DEFAULT 'user',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_email` (`email`),
  UNIQUE KEY `UQ_google_sub` (`google_sub`),
  UNIQUE KEY `uq_users_google_sub` (`google_sub`)
) ENGINE=InnoDB AUTO_INCREMENT=97 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Current Database: `compliance_hub_ticketing`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `compliance_hub_ticketing` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `compliance_hub_ticketing`;

--
-- Temporary table structure for view `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!50001 DROP VIEW IF EXISTS `attendance`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `attendance` AS SELECT
 NULL AS `id`,
 NULL AS `user_id`,
 NULL AS `date`,
 NULL AS `status`,
 NULL AS `set_by_id`,
 NULL AS `notes`,
 NULL AS `created_at` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `escalation_focal_configs`
--

DROP TABLE IF EXISTS `escalation_focal_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `escalation_focal_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_type` varchar(30) NOT NULL,
  `role_value` varchar(50) NOT NULL,
  `label` varchar(100) NOT NULL,
  `created_by_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_efc_type_role` (`ticket_type`,`role_value`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mov_artifacts`
--

DROP TABLE IF EXISTS `mov_artifacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mov_artifacts` (
  `id` char(36) NOT NULL,
  `artifact_type` varchar(60) NOT NULL,
  `scope` varchar(30) NOT NULL DEFAULT 'regional',
  `title` varchar(255) NOT NULL,
  `period_year` int(11) NOT NULL,
  `quarter` int(11) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'draft',
  `content_markdown` longtext NOT NULL,
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata_json`)),
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_mov_type_period` (`artifact_type`,`period_year`,`quarter`),
  KEY `idx_mov_scope` (`scope`),
  KEY `idx_mov_unit` (`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `office_days`
--

DROP TABLE IF EXISTS `office_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_days` (
  `id` varchar(36) NOT NULL,
  `date` date NOT NULL,
  `is_office_day` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `set_by_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `role_capabilities`
--

DROP TABLE IF EXISTS `role_capabilities`;
/*!50001 DROP VIEW IF EXISTS `role_capabilities`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `role_capabilities` AS SELECT
 NULL AS `id`,
 NULL AS `role_value`,
 NULL AS `is_focal`,
 NULL AS `is_desktop`,
 NULL AS `is_it_support`,
 NULL AS `is_pantawid_ict`,
 NULL AS `is_ito`,
 NULL AS `is_escalation_focal`,
 NULL AS `is_ticket_settings_focal`,
 NULL AS `is_all_tickets`,
 NULL AS `is_ticket_focal`,
 NULL AS `created_at`,
 NULL AS `updated_at`,
 NULL AS `is_kpi_access`,
 NULL AS `is_kpi_manage`,
 NULL AS `is_attendance_access`,
 NULL AS `is_attendance_manage`,
 NULL AS `is_reports_access`,
 NULL AS `is_reviews_access`,
 NULL AS `is_mov_access`,
 NULL AS `is_documents_access`,
 NULL AS `is_repository_access`,
 NULL AS `is_issuances_access`,
 NULL AS `is_metrics_access` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `role_definitions`
--

DROP TABLE IF EXISTS `role_definitions`;
/*!50001 DROP VIEW IF EXISTS `role_definitions`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `role_definitions` AS SELECT
 NULL AS `id`,
 NULL AS `value`,
 NULL AS `label`,
 NULL AS `description`,
 NULL AS `assignable`,
 NULL AS `is_system`,
 NULL AS `technician_type`,
 NULL AS `role_code`,
 NULL AS `created_at`,
 NULL AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `ticket_categories`
--

DROP TABLE IF EXISTS `ticket_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_categories` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `ticket_type` varchar(30) NOT NULL DEFAULT 'it_support',
  `sla_hours` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_707fba2f54e788a80ceedbc4c8` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ticket_comments`
--

DROP TABLE IF EXISTS `ticket_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_comments` (
  `id` varchar(36) NOT NULL,
  `ticket_id` varchar(36) NOT NULL,
  `comment` text NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `is_internal` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `FK_4ee48e3e18e7c3ac35152a9fb7b` (`ticket_id`),
  KEY `FK_895b64a0c9a2eaa9f514dd95bcb` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ticket_escalations`
--

DROP TABLE IF EXISTS `ticket_escalations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_escalations` (
  `id` varchar(36) NOT NULL,
  `ticket_id` varchar(36) NOT NULL,
  `escalated_by_id` int(11) NOT NULL,
  `escalated_to_id` int(11) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `return_reason` text DEFAULT NULL,
  `proof_files` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`proof_files`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_te_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ticket_events`
--

DROP TABLE IF EXISTS `ticket_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_events` (
  `id` varchar(36) NOT NULL,
  `ticket_id` varchar(36) NOT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `meta` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_te_ticket_id` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ticket_issue_types`
--

DROP TABLE IF EXISTS `ticket_issue_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_issue_types` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `category_id` varchar(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_9c222de31ef44a155093ec6c46` (`key`),
  KEY `fk_issue_type_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ticket_keyword_rules`
--

DROP TABLE IF EXISTS `ticket_keyword_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_keyword_rules` (
  `id` varchar(36) NOT NULL,
  `keyword` varchar(100) NOT NULL,
  `target_ticket_type` varchar(30) NOT NULL,
  `target_category_id` varchar(36) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `keywords` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id` varchar(36) NOT NULL,
  `ticket_number` varchar(50) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `issue_type_id` varchar(36) DEFAULT NULL,
  `issue_type` enum('policy_gap','missing_evidence','data_inconsistency','late_submission','security_incident','other') NOT NULL DEFAULT 'other',
  `category` enum('document_related','system_issue','compliance_query','training_request','other') NOT NULL DEFAULT 'other',
  `category_id` varchar(36) DEFAULT NULL,
  `status` enum('open','assigned','in_progress','resolved','closed','freeze','duplicate') NOT NULL DEFAULT 'open',
  `priority` varchar(10) DEFAULT NULL,
  `reported_by_id` int(11) DEFAULT NULL,
  `assigned_to_id` int(11) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolution_steps` text DEFAULT NULL,
  `resolution_date` timestamp NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `ticket_type` varchar(30) NOT NULL DEFAULT 'it_support',
  `requester_id` int(11) DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  `satisfaction_rating` tinyint(4) DEFAULT NULL,
  `satisfaction_comment` text DEFAULT NULL,
  `satisfaction_submitted_at` datetime DEFAULT NULL,
  `duplicate_of_id` varchar(36) DEFAULT NULL,
  `user_closed` tinyint(1) NOT NULL DEFAULT 0,
  `sla_deadline` datetime DEFAULT NULL,
  `satisfaction_form_data` text DEFAULT NULL,
  `created_by_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8d7b9a157280caf57aa0282e72` (`ticket_number`),
  UNIQUE KEY `uq_tickets_ticket_number` (`ticket_number`),
  KEY `FK_b7727d55e780e042d7a16565916` (`reported_by_id`),
  KEY `FK_b564a18159530b5a56aeac33d1a` (`assigned_to_id`),
  KEY `FK_3d0c67ec73177527aa3dc57bca2` (`unit_id`),
  KEY `fk_tickets_issue_type_id` (`issue_type_id`),
  KEY `fk_tickets_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `units`
--

DROP TABLE IF EXISTS `units`;
/*!50001 DROP VIEW IF EXISTS `units`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `units` AS SELECT
 NULL AS `id`,
 NULL AS `name`,
 NULL AS `description`,
 NULL AS `active`,
 NULL AS `created_at` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `users`
--

DROP TABLE IF EXISTS `users`;
/*!50001 DROP VIEW IF EXISTS `users`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `users` AS SELECT
 NULL AS `id`,
 NULL AS `email`,
 NULL AS `passwordHash`,
 NULL AS `first_name`,
 NULL AS `middle_name`,
 NULL AS `last_name`,
 NULL AS `suffix`,
 NULL AS `staff_id`,
 NULL AS `position`,
 NULL AS `position_full`,
 NULL AS `designation`,
 NULL AS `ticket_main_focal`,
 NULL AS `ticket_technician`,
 NULL AS `auth_provider`,
 NULL AS `google_sub`,
 NULL AS `role`,
 NULL AS `active`,
 NULL AS `last_login`,
 NULL AS `created_at`,
 NULL AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Current Database: `compliance_hub`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `compliance_hub` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `compliance_hub`;

--
-- Temporary table structure for view `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!50001 DROP VIEW IF EXISTS `attendance`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `attendance` AS SELECT
 NULL AS `id`,
 NULL AS `user_id`,
 NULL AS `date`,
 NULL AS `status`,
 NULL AS `set_by_id`,
 NULL AS `notes`,
 NULL AS `created_at` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `cybersecurity_metrics`
--

DROP TABLE IF EXISTS `cybersecurity_metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cybersecurity_metrics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `metric_type` enum('firewall_status','antivirus_status','user_training','backup_status','patch_management','access_control','encryption','incident_response') NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('compliant','warning','non_compliant','unknown') NOT NULL DEFAULT 'unknown',
  `value` varchar(255) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `last_checked` timestamp NULL DEFAULT NULL,
  `api_endpoint` varchar(255) DEFAULT NULL,
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8a52414f6e1ee17ced3ad5591c` (`metric_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_assignments`
--

DROP TABLE IF EXISTS `document_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_assignments` (
  `id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `report_name` varchar(255) DEFAULT NULL,
  `filename_prefix` varchar(100) DEFAULT NULL,
  `submission_frequency` enum('monthly','quarterly','annual','custom') NOT NULL DEFAULT 'monthly',
  `submission_month` tinyint(4) DEFAULT NULL,
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assignment_user_unit_type` (`user_id`,`unit_id`,`document_type`),
  KEY `FK_3e770637148998569bef7f813f7` (`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_references`
--

DROP TABLE IF EXISTS `document_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_references` (
  `id` varchar(36) NOT NULL,
  `source_document_id` varchar(36) NOT NULL,
  `target_document_id` varchar(36) NOT NULL,
  `relationship_type` varchar(50) NOT NULL DEFAULT 'references',
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_document_reference_pair` (`source_document_id`,`target_document_id`),
  KEY `FK_fdeca59563acc1de1b9365654df` (`target_document_id`),
  KEY `FK_367e568d1dae54fd8e43245765e` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_versions`
--

DROP TABLE IF EXISTS `document_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_versions` (
  `id` varchar(36) NOT NULL,
  `document_id` varchar(255) NOT NULL,
  `version_number` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_blob` longblob DEFAULT NULL,
  `mime_type` varchar(50) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `preview_path` varchar(255) DEFAULT NULL,
  `preview_blob` longblob DEFAULT NULL,
  `preview_mime_type` varchar(50) DEFAULT NULL,
  `extracted_text` text DEFAULT NULL,
  `change_notes` text DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `FK_ac75577bca976d6d581b0f459b6` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `period` varchar(20) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `reportorial_doc_type_id` int(11) DEFAULT NULL,
  `status` enum('pending','processing','ready','failed') NOT NULL DEFAULT 'pending',
  `current_version` int(11) NOT NULL DEFAULT 1,
  `extracted_text` text DEFAULT NULL,
  `file_blob` longblob DEFAULT NULL,
  `unit_id` int(11) NOT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `FK_0aee8d71991bb7846ed4016d5af` (`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incident_daily_snapshots`
--

DROP TABLE IF EXISTS `incident_daily_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `incident_daily_snapshots` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `snapshot_date` date NOT NULL,
  `snapshot_time` time NOT NULL,
  `snapshot_type` varchar(10) NOT NULL,
  `low_count` int(11) NOT NULL DEFAULT 0,
  `medium_count` int(11) NOT NULL DEFAULT 0,
  `high_count` int(11) NOT NULL DEFAULT 0,
  `critical_count` int(11) NOT NULL DEFAULT 0,
  `total_count` int(11) NOT NULL DEFAULT 0,
  `low_added` int(11) DEFAULT 0,
  `medium_added` int(11) DEFAULT 0,
  `high_added` int(11) DEFAULT 0,
  `critical_added` int(11) DEFAULT 0,
  `total_added` int(11) DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incidents`
--

DROP TABLE IF EXISTS `incidents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `category` enum('security_breach','system_outage','data_loss','malware','unauthorized_access','phishing','ddos','other') NOT NULL DEFAULT 'other',
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `reported_by_id` int(11) NOT NULL,
  `assigned_to_id` int(11) DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `FK_3f25378f332890bea45df59b5e1` (`reported_by_id`),
  KEY `FK_9036c3f88d411562af1241e404b` (`assigned_to_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `issuances`
--

DROP TABLE IF EXISTS `issuances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issuances` (
  `id` varchar(36) NOT NULL,
  `issuance_number` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `issuance_type` varchar(80) DEFAULT NULL,
  `applicability_scope` text DEFAULT NULL,
  `relevance_notes` text DEFAULT NULL,
  `is_amendment` tinyint(1) NOT NULL DEFAULT 0,
  `amended_issuance_number` varchar(100) DEFAULT NULL,
  `ict_amendment_notes` text DEFAULT NULL,
  `issuing_authority` varchar(100) NOT NULL,
  `issue_date` date NOT NULL,
  `effectivity_date` date DEFAULT NULL,
  `source_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `attachment_file_name` varchar(255) DEFAULT NULL,
  `attachment_mime_type` varchar(120) DEFAULT NULL,
  `attachment_blob` longblob DEFAULT NULL,
  `attachment_uploaded_at` datetime DEFAULT NULL,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_2feaf6362fee95952b67c779aa` (`issuance_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kpi_master`
--

DROP TABLE IF EXISTS `kpi_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_master` (
  `code` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `unit_id` int(11) NOT NULL,
  `type` enum('measurement','yes_no') NOT NULL DEFAULT 'measurement',
  `unit_of_measure` varchar(80) DEFAULT NULL,
  `direction` enum('higher_is_better','lower_is_better') NOT NULL,
  `target_value` float NOT NULL,
  `weight` float NOT NULL DEFAULT 1,
  `frequency` enum('monthly','quarterly','semestral','annual') NOT NULL DEFAULT 'monthly',
  `active` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`code`),
  KEY `FK_94bb86e65183a600557b3bbdb29` (`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kpi_monitoring`
--

DROP TABLE IF EXISTS `kpi_monitoring`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_monitoring` (
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
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_kpi_period_unit` (`kpi_master_code`,`unit_id`,`period_year`,`period_month`),
  KEY `FK_ced131d8a762189745b37679334` (`unit_id`),
  KEY `FK_a7c9e338436d6cb056814782814` (`entered_by_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kpi_scoring_rules`
--

DROP TABLE IF EXISTS `kpi_scoring_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_scoring_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL DEFAULT 'default',
  `active` tinyint(4) NOT NULL DEFAULT 1,
  `cap_score` float NOT NULL DEFAULT 100,
  `floor_score` float NOT NULL DEFAULT 0,
  `yes_score` float NOT NULL DEFAULT 100,
  `no_score` float NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kpi_thresholds`
--

DROP TABLE IF EXISTS `kpi_thresholds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_thresholds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `band` varchar(40) NOT NULL,
  `min_score` float NOT NULL,
  `max_score` float NOT NULL,
  `color` varchar(40) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_34e661627ae5169a0fa6bcf250` (`band`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `manual_reviews`
--

DROP TABLE IF EXISTS `manual_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `manual_reviews` (
  `id` varchar(36) NOT NULL,
  `document_id` varchar(255) NOT NULL,
  `version_id` varchar(255) NOT NULL,
  `decision` enum('compliant','non_compliant','needs_revision') NOT NULL,
  `remarks` text DEFAULT NULL,
  `reviewer_id` int(11) DEFAULT NULL,
  `reviewed_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `findings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`findings`)),
  PRIMARY KEY (`id`),
  KEY `FK_25966a220b7ac04853cc15bd66c` (`document_id`),
  KEY `FK_325916abcb09c37ad968a377a72` (`version_id`),
  KEY `FK_44631dd1f6229975c6776273446` (`reviewer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `metric_applicability`
--

DROP TABLE IF EXISTS `metric_applicability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `metric_applicability` (
  `id` varchar(36) NOT NULL,
  `metric_id` varchar(255) NOT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `document_type` varchar(100) DEFAULT NULL,
  `reportorial_doc_type_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_2de2c661f602dccb1592fdf52ea` (`metric_id`),
  KEY `FK_f863131172404f7ebb7d7d9e2aa` (`unit_id`),
  KEY `FK_8e0e2b062bacfed05b60378ea03` (`reportorial_doc_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `metric_results`
--

DROP TABLE IF EXISTS `metric_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `metric_results` (
  `id` varchar(36) NOT NULL,
  `version_id` varchar(255) NOT NULL,
  `metric_template_id` varchar(255) NOT NULL,
  `status` enum('pass','fail','warning','error') NOT NULL,
  `message` text DEFAULT NULL,
  `score` float DEFAULT NULL,
  `computed_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `evidence` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`evidence`)),
  PRIMARY KEY (`id`),
  KEY `FK_ecbdaf8a6ebaf125b546641404a` (`version_id`),
  KEY `FK_7f77ed112e7c399a037de374a4c` (`metric_template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `metric_templates`
--

DROP TABLE IF EXISTS `metric_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `metric_templates` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `metric_type` enum('section_check','keyword_check','property_check','date_check') NOT NULL,
  `rule_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`rule_config`)),
  `pass_criteria` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`pass_criteria`)),
  `weight` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mov_artifacts`
--

DROP TABLE IF EXISTS `mov_artifacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mov_artifacts` (
  `id` char(36) NOT NULL,
  `artifact_type` varchar(60) NOT NULL,
  `scope` varchar(30) NOT NULL DEFAULT 'regional',
  `title` varchar(255) NOT NULL,
  `period_year` int(11) NOT NULL,
  `quarter` int(11) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'draft',
  `content_markdown` longtext NOT NULL,
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata_json`)),
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_mov_type_period` (`artifact_type`,`period_year`,`quarter`),
  KEY `idx_mov_scope` (`scope`),
  KEY `idx_mov_unit` (`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reportorial_document_types`
--

DROP TABLE IF EXISTS `reportorial_document_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reportorial_document_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unit_id` int(11) NOT NULL,
  `base_name` varchar(100) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `submission_frequency` enum('monthly','quarterly','annual') NOT NULL DEFAULT 'monthly',
  `active` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `FK_85017c96613e60a7bf2ddbb4155` (`unit_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `role_capabilities`
--

DROP TABLE IF EXISTS `role_capabilities`;
/*!50001 DROP VIEW IF EXISTS `role_capabilities`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `role_capabilities` AS SELECT
 NULL AS `id`,
 NULL AS `role_value`,
 NULL AS `is_focal`,
 NULL AS `is_desktop`,
 NULL AS `is_it_support`,
 NULL AS `is_pantawid_ict`,
 NULL AS `is_ito`,
 NULL AS `is_escalation_focal`,
 NULL AS `is_ticket_settings_focal`,
 NULL AS `is_all_tickets`,
 NULL AS `is_ticket_focal`,
 NULL AS `created_at`,
 NULL AS `updated_at`,
 NULL AS `is_kpi_access`,
 NULL AS `is_kpi_manage`,
 NULL AS `is_attendance_access`,
 NULL AS `is_attendance_manage`,
 NULL AS `is_reports_access`,
 NULL AS `is_reviews_access`,
 NULL AS `is_mov_access`,
 NULL AS `is_documents_access`,
 NULL AS `is_repository_access`,
 NULL AS `is_issuances_access`,
 NULL AS `is_metrics_access` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `role_definitions`
--

DROP TABLE IF EXISTS `role_definitions`;
/*!50001 DROP VIEW IF EXISTS `role_definitions`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `role_definitions` AS SELECT
 NULL AS `id`,
 NULL AS `value`,
 NULL AS `label`,
 NULL AS `description`,
 NULL AS `assignable`,
 NULL AS `is_system`,
 NULL AS `technician_type`,
 NULL AS `role_code`,
 NULL AS `created_at`,
 NULL AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `units`
--

DROP TABLE IF EXISTS `units`;
/*!50001 DROP VIEW IF EXISTS `units`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `units` AS SELECT
 NULL AS `id`,
 NULL AS `name`,
 NULL AS `description`,
 NULL AS `active`,
 NULL AS `created_at` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `users`
--

DROP TABLE IF EXISTS `users`;
/*!50001 DROP VIEW IF EXISTS `users`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `users` AS SELECT
 NULL AS `id`,
 NULL AS `email`,
 NULL AS `passwordHash`,
 NULL AS `first_name`,
 NULL AS `middle_name`,
 NULL AS `last_name`,
 NULL AS `suffix`,
 NULL AS `staff_id`,
 NULL AS `position`,
 NULL AS `position_full`,
 NULL AS `designation`,
 NULL AS `ticket_main_focal`,
 NULL AS `ticket_technician`,
 NULL AS `auth_provider`,
 NULL AS `google_sub`,
 NULL AS `role`,
 NULL AS `active`,
 NULL AS `last_login`,
 NULL AS `created_at`,
 NULL AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `version_comparisons`
--

DROP TABLE IF EXISTS `version_comparisons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `version_comparisons` (
  `id` varchar(36) NOT NULL,
  `document_id` varchar(255) NOT NULL,
  `version_a_id` varchar(255) NOT NULL,
  `version_b_id` varchar(255) NOT NULL,
  `compared_by_id` int(11) DEFAULT NULL,
  `diff_output` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`diff_output`)),
  `compared_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `FK_6dfc1bb3d4d63bedcb9d9c95f14` (`document_id`),
  KEY `FK_7ceb7166c1ae49ceda359f55b07` (`version_a_id`),
  KEY `FK_26749431ec6396a8c6eeeae99de` (`version_b_id`),
  KEY `FK_a74cb202efa308933c1fa9c830b` (`compared_by_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Current Database: `compliance_hub_users`
--

USE `compliance_hub_users`;

--
-- Current Database: `compliance_hub_ticketing`
--

USE `compliance_hub_ticketing`;

--
-- Final view structure for view `attendance`
--

/*!50001 DROP VIEW IF EXISTS `attendance`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `attendance` AS select `compliance_hub_users`.`attendance`.`id` AS `id`,`compliance_hub_users`.`attendance`.`user_id` AS `user_id`,`compliance_hub_users`.`attendance`.`date` AS `date`,`compliance_hub_users`.`attendance`.`status` AS `status`,`compliance_hub_users`.`attendance`.`set_by_id` AS `set_by_id`,`compliance_hub_users`.`attendance`.`notes` AS `notes`,`compliance_hub_users`.`attendance`.`created_at` AS `created_at` from `compliance_hub_users`.`attendance` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `role_capabilities`
--

/*!50001 DROP VIEW IF EXISTS `role_capabilities`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `role_capabilities` AS select `compliance_hub_users`.`role_capabilities`.`id` AS `id`,`compliance_hub_users`.`role_capabilities`.`role_value` AS `role_value`,`compliance_hub_users`.`role_capabilities`.`is_focal` AS `is_focal`,`compliance_hub_users`.`role_capabilities`.`is_desktop` AS `is_desktop`,`compliance_hub_users`.`role_capabilities`.`is_it_support` AS `is_it_support`,`compliance_hub_users`.`role_capabilities`.`is_pantawid_ict` AS `is_pantawid_ict`,`compliance_hub_users`.`role_capabilities`.`is_ito` AS `is_ito`,`compliance_hub_users`.`role_capabilities`.`is_escalation_focal` AS `is_escalation_focal`,`compliance_hub_users`.`role_capabilities`.`is_ticket_settings_focal` AS `is_ticket_settings_focal`,`compliance_hub_users`.`role_capabilities`.`is_all_tickets` AS `is_all_tickets`,`compliance_hub_users`.`role_capabilities`.`is_ticket_focal` AS `is_ticket_focal`,`compliance_hub_users`.`role_capabilities`.`created_at` AS `created_at`,`compliance_hub_users`.`role_capabilities`.`updated_at` AS `updated_at`,`compliance_hub_users`.`role_capabilities`.`is_kpi_access` AS `is_kpi_access`,`compliance_hub_users`.`role_capabilities`.`is_kpi_manage` AS `is_kpi_manage`,`compliance_hub_users`.`role_capabilities`.`is_attendance_access` AS `is_attendance_access`,`compliance_hub_users`.`role_capabilities`.`is_attendance_manage` AS `is_attendance_manage`,`compliance_hub_users`.`role_capabilities`.`is_reports_access` AS `is_reports_access`,`compliance_hub_users`.`role_capabilities`.`is_reviews_access` AS `is_reviews_access`,`compliance_hub_users`.`role_capabilities`.`is_mov_access` AS `is_mov_access`,`compliance_hub_users`.`role_capabilities`.`is_documents_access` AS `is_documents_access`,`compliance_hub_users`.`role_capabilities`.`is_repository_access` AS `is_repository_access`,`compliance_hub_users`.`role_capabilities`.`is_issuances_access` AS `is_issuances_access`,`compliance_hub_users`.`role_capabilities`.`is_metrics_access` AS `is_metrics_access` from `compliance_hub_users`.`role_capabilities` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `role_definitions`
--

/*!50001 DROP VIEW IF EXISTS `role_definitions`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `role_definitions` AS select `compliance_hub_users`.`role_definitions`.`id` AS `id`,`compliance_hub_users`.`role_definitions`.`value` AS `value`,`compliance_hub_users`.`role_definitions`.`label` AS `label`,`compliance_hub_users`.`role_definitions`.`description` AS `description`,`compliance_hub_users`.`role_definitions`.`assignable` AS `assignable`,`compliance_hub_users`.`role_definitions`.`is_system` AS `is_system`,`compliance_hub_users`.`role_definitions`.`technician_type` AS `technician_type`,`compliance_hub_users`.`role_definitions`.`role_code` AS `role_code`,`compliance_hub_users`.`role_definitions`.`created_at` AS `created_at`,`compliance_hub_users`.`role_definitions`.`updated_at` AS `updated_at` from `compliance_hub_users`.`role_definitions` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `units`
--

/*!50001 DROP VIEW IF EXISTS `units`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `units` AS select `units`.`id` AS `id`,`units`.`name` AS `name`,`units`.`description` AS `description`,`units`.`active` AS `active`,`units`.`created_at` AS `created_at` from `compliance_hub`.`units` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `users`
--

/*!50001 DROP VIEW IF EXISTS `users`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `users` AS select `compliance_hub_users`.`users`.`id` AS `id`,`compliance_hub_users`.`users`.`email` AS `email`,`compliance_hub_users`.`users`.`passwordHash` AS `passwordHash`,`compliance_hub_users`.`users`.`first_name` AS `first_name`,`compliance_hub_users`.`users`.`middle_name` AS `middle_name`,`compliance_hub_users`.`users`.`last_name` AS `last_name`,`compliance_hub_users`.`users`.`suffix` AS `suffix`,`compliance_hub_users`.`users`.`staff_id` AS `staff_id`,`compliance_hub_users`.`users`.`position` AS `position`,`compliance_hub_users`.`users`.`position_full` AS `position_full`,`compliance_hub_users`.`users`.`designation` AS `designation`,`compliance_hub_users`.`users`.`ticket_main_focal` AS `ticket_main_focal`,`compliance_hub_users`.`users`.`ticket_technician` AS `ticket_technician`,`compliance_hub_users`.`users`.`auth_provider` AS `auth_provider`,`compliance_hub_users`.`users`.`google_sub` AS `google_sub`,`compliance_hub_users`.`users`.`role` AS `role`,`compliance_hub_users`.`users`.`active` AS `active`,`compliance_hub_users`.`users`.`last_login` AS `last_login`,`compliance_hub_users`.`users`.`created_at` AS `created_at`,`compliance_hub_users`.`users`.`updated_at` AS `updated_at` from `compliance_hub_users`.`users` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Current Database: `compliance_hub`
--

USE `compliance_hub`;

--
-- Final view structure for view `attendance`
--

/*!50001 DROP VIEW IF EXISTS `attendance`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY INVOKER */
/*!50001 VIEW `attendance` AS select `compliance_hub_users`.`attendance`.`id` AS `id`,`compliance_hub_users`.`attendance`.`user_id` AS `user_id`,`compliance_hub_users`.`attendance`.`date` AS `date`,`compliance_hub_users`.`attendance`.`status` AS `status`,`compliance_hub_users`.`attendance`.`set_by_id` AS `set_by_id`,`compliance_hub_users`.`attendance`.`notes` AS `notes`,`compliance_hub_users`.`attendance`.`created_at` AS `created_at` from `compliance_hub_users`.`attendance` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `role_capabilities`
--

/*!50001 DROP VIEW IF EXISTS `role_capabilities`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `role_capabilities` AS select `compliance_hub_users`.`role_capabilities`.`id` AS `id`,`compliance_hub_users`.`role_capabilities`.`role_value` AS `role_value`,`compliance_hub_users`.`role_capabilities`.`is_focal` AS `is_focal`,`compliance_hub_users`.`role_capabilities`.`is_desktop` AS `is_desktop`,`compliance_hub_users`.`role_capabilities`.`is_it_support` AS `is_it_support`,`compliance_hub_users`.`role_capabilities`.`is_pantawid_ict` AS `is_pantawid_ict`,`compliance_hub_users`.`role_capabilities`.`is_ito` AS `is_ito`,`compliance_hub_users`.`role_capabilities`.`is_escalation_focal` AS `is_escalation_focal`,`compliance_hub_users`.`role_capabilities`.`is_ticket_settings_focal` AS `is_ticket_settings_focal`,`compliance_hub_users`.`role_capabilities`.`is_all_tickets` AS `is_all_tickets`,`compliance_hub_users`.`role_capabilities`.`is_ticket_focal` AS `is_ticket_focal`,`compliance_hub_users`.`role_capabilities`.`created_at` AS `created_at`,`compliance_hub_users`.`role_capabilities`.`updated_at` AS `updated_at`,`compliance_hub_users`.`role_capabilities`.`is_kpi_access` AS `is_kpi_access`,`compliance_hub_users`.`role_capabilities`.`is_kpi_manage` AS `is_kpi_manage`,`compliance_hub_users`.`role_capabilities`.`is_attendance_access` AS `is_attendance_access`,`compliance_hub_users`.`role_capabilities`.`is_attendance_manage` AS `is_attendance_manage`,`compliance_hub_users`.`role_capabilities`.`is_reports_access` AS `is_reports_access`,`compliance_hub_users`.`role_capabilities`.`is_reviews_access` AS `is_reviews_access`,`compliance_hub_users`.`role_capabilities`.`is_mov_access` AS `is_mov_access`,`compliance_hub_users`.`role_capabilities`.`is_documents_access` AS `is_documents_access`,`compliance_hub_users`.`role_capabilities`.`is_repository_access` AS `is_repository_access`,`compliance_hub_users`.`role_capabilities`.`is_issuances_access` AS `is_issuances_access`,`compliance_hub_users`.`role_capabilities`.`is_metrics_access` AS `is_metrics_access` from `compliance_hub_users`.`role_capabilities` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `role_definitions`
--

/*!50001 DROP VIEW IF EXISTS `role_definitions`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `role_definitions` AS select `compliance_hub_users`.`role_definitions`.`id` AS `id`,`compliance_hub_users`.`role_definitions`.`value` AS `value`,`compliance_hub_users`.`role_definitions`.`label` AS `label`,`compliance_hub_users`.`role_definitions`.`description` AS `description`,`compliance_hub_users`.`role_definitions`.`assignable` AS `assignable`,`compliance_hub_users`.`role_definitions`.`is_system` AS `is_system`,`compliance_hub_users`.`role_definitions`.`technician_type` AS `technician_type`,`compliance_hub_users`.`role_definitions`.`role_code` AS `role_code`,`compliance_hub_users`.`role_definitions`.`created_at` AS `created_at`,`compliance_hub_users`.`role_definitions`.`updated_at` AS `updated_at` from `compliance_hub_users`.`role_definitions` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `units`
--

/*!50001 DROP VIEW IF EXISTS `units`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `units` AS select 1 AS `id`,1 AS `name`,1 AS `description`,1 AS `active`,1 AS `created_at` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `users`
--

/*!50001 DROP VIEW IF EXISTS `users`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `users` AS select `compliance_hub_users`.`users`.`id` AS `id`,`compliance_hub_users`.`users`.`email` AS `email`,`compliance_hub_users`.`users`.`passwordHash` AS `passwordHash`,`compliance_hub_users`.`users`.`first_name` AS `first_name`,`compliance_hub_users`.`users`.`middle_name` AS `middle_name`,`compliance_hub_users`.`users`.`last_name` AS `last_name`,`compliance_hub_users`.`users`.`suffix` AS `suffix`,`compliance_hub_users`.`users`.`staff_id` AS `staff_id`,`compliance_hub_users`.`users`.`position` AS `position`,`compliance_hub_users`.`users`.`position_full` AS `position_full`,`compliance_hub_users`.`users`.`designation` AS `designation`,`compliance_hub_users`.`users`.`ticket_main_focal` AS `ticket_main_focal`,`compliance_hub_users`.`users`.`ticket_technician` AS `ticket_technician`,`compliance_hub_users`.`users`.`auth_provider` AS `auth_provider`,`compliance_hub_users`.`users`.`google_sub` AS `google_sub`,`compliance_hub_users`.`users`.`role` AS `role`,`compliance_hub_users`.`users`.`active` AS `active`,`compliance_hub_users`.`users`.`last_login` AS `last_login`,`compliance_hub_users`.`users`.`created_at` AS `created_at`,`compliance_hub_users`.`users`.`updated_at` AS `updated_at` from `compliance_hub_users`.`users` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-09  7:06:29
/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.18-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: email=fo2admin@dswd.gov.ph\ compliance_hub_users users 
-- ------------------------------------------------------
-- Server version	10.11.18-MariaDB-ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

��/ * M ! 9 9 9 9 9 9 \ -   e n a b l e   t h e   s a n d b o x   m o d e   * /    
 - -   M a r i a D B   d u m p   1 0 . 1 9     D i s t r i b   1 0 . 1 1 . 1 8 - M a r i a D B ,   f o r   d e b i a n - l i n u x - g n u   ( x 8 6 _ 6 4 )  
 - -  
 - -   H o s t :   l o c a l h o s t         D a t a b a s e :   c o m p l i a n c e _ h u b _ u s e r s  
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  
 - -   S e r v e r   v e r s i o n 	 1 0 . 1 1 . 1 8 - M a r i a D B - u b u 2 2 0 4  
  
 / * ! 4 0 1 0 1   S E T   @ O L D _ C H A R A C T E R _ S E T _ C L I E N T = @ @ C H A R A C T E R _ S E T _ C L I E N T   * / ;  
 / * ! 4 0 1 0 1   S E T   @ O L D _ C H A R A C T E R _ S E T _ R E S U L T S = @ @ C H A R A C T E R _ S E T _ R E S U L T S   * / ;  
 / * ! 4 0 1 0 1   S E T   @ O L D _ C O L L A T I O N _ C O N N E C T I O N = @ @ C O L L A T I O N _ C O N N E C T I O N   * / ;  
 / * ! 4 0 1 0 1   S E T   N A M E S   u t f 8 m b 4   * / ;  
 / * ! 4 0 1 0 3   S E T   @ O L D _ T I M E _ Z O N E = @ @ T I M E _ Z O N E   * / ;  
 / * ! 4 0 1 0 3   S E T   T I M E _ Z O N E = ' + 0 0 : 0 0 '   * / ;  
 / * ! 4 0 0 1 4   S E T   @ O L D _ F O R E I G N _ K E Y _ C H E C K S = @ @ F O R E I G N _ K E Y _ C H E C K S ,   F O R E I G N _ K E Y _ C H E C K S = 0   * / ;  
 / * ! 4 0 1 0 1   S E T   @ O L D _ S Q L _ M O D E = @ @ S Q L _ M O D E ,   S Q L _ M O D E = ' N O _ A U T O _ V A L U E _ O N _ Z E R O '   * / ;  
 / * ! 4 0 1 1 1   S E T   @ O L D _ S Q L _ N O T E S = @ @ S Q L _ N O T E S ,   S Q L _ N O T E S = 0   * / ;  
  
 - -  
 - -   D u m p i n g   d a t a   f o r   t a b l e   ` r o l e _ d e f i n i t i o n s `  
 - -  
  
 L O C K   T A B L E S   ` r o l e _ d e f i n i t i o n s `   W R I T E ;  
 / * ! 4 0 0 0 0   A L T E R   T A B L E   ` r o l e _ d e f i n i t i o n s `   D I S A B L E   K E Y S   * / ;  
 I N S E R T   I N T O   ` r o l e _ d e f i n i t i o n s `   V A L U E S  
 ( 1 , ' s u p e r _ a d m i n ' , ' S u p e r   A d m i n ' , ' F u l l   s y s t e m   a c c e s s . ' , 0 , 1 , N U L L , N U L L , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 3 9 6 9 3 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 3 9 6 9 3 ' ) ,  
 ( 4 , ' s e c t i o n _ h e a d ' , ' S e c t i o n   H e a d ' , ' S e c t i o n - l e v e l   s u p e r v i s o r . ' , 1 , 1 , N U L L , ' s e c t i o n _ h e a d ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 6 2 6 4 4 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 6 2 6 4 4 ' ) ,  
 ( 7 , ' u s e r ' , ' R e g u l a r   S t a f f ' , ' S t a n d a r d   s t a f f   u s e r . ' , 1 , 1 , N U L L , N U L L , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 7 7 5 5 1 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 7 7 5 5 1 ' ) ,  
 ( 8 , ' c o m p l i a n c e _ o f f i c e r ' , ' C o m p l i a n c e   O f f i c e r ' , ' P r i m a r y   c o m p l i a n c e   m a n a g e m e n t . ' , 1 , 1 , N U L L , N U L L , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 8 2 0 6 1 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 8 2 0 6 1 ' ) ,  
 ( 9 , ' c y b e r s e c ' , ' C y b e r s e c u r i t y   O f f i c e r ' , ' C y b e r s e c u r i t y   c o m p l i a n c e   o f f i c e r . ' , 1 , 1 , N U L L , ' c o m p l i a n c e _ o f f i c e r ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 8 6 7 2 3 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 8 6 7 2 3 ' ) ,  
 ( 1 0 , ' i n f o s e c ' , ' I n f o r m a t i o n   S e c u r i t y   O f f i c e r ' , ' I n f o S e c   g o v e r n a n c e . ' , 1 , 1 , N U L L , ' c o m p l i a n c e _ o f f i c e r ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 9 0 2 8 3 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 9 0 2 8 3 ' ) ,  
 ( 1 1 , ' l e a d _ i n f r a ' , ' L e a d   I n f r a s t r u c t u r e   O f f i c e r ' , ' L e a d s   i n f r a s t r u c t u r e   o p s . ' , 1 , 1 , N U L L , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 9 3 7 8 9 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 9 3 7 8 9 ' ) ,  
 ( 1 2 , ' s e r v e r _ a d m i n ' , ' S e r v e r   A d m i n i s t r a t o r ' , ' M a n a g e s   s e r v e r   i n f r a s t r u c t u r e . ' , 1 , 1 , N U L L , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 9 7 4 9 9 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 6 9 7 4 9 9 ' ) ,  
 ( 1 3 , ' d b _ a d m i n ' , ' D a t a b a s e   A d m i n i s t r a t o r ' , ' M a n a g e s   d a t a b a s e   s y s t e m s . ' , 1 , 1 , N U L L , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 0 1 7 9 7 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 0 1 7 9 7 ' ) ,  
 ( 1 4 , ' n e t w o r k _ a d m i n ' , ' N e t w o r k   A d m i n i s t r a t o r ' , ' M a n a g e s   n e t w o r k   i n f r a s t r u c t u r e . ' , 1 , 1 , N U L L , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 0 5 9 4 2 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 0 5 9 4 2 ' ) ,  
 ( 1 5 , ' p r o j e c t _ m g r ' , ' P r o j e c t   M a n a g e r ' , ' M a n a g e s   I C T   p r o j e c t s . ' , 1 , 1 , N U L L , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 1 0 3 4 4 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 1 0 3 4 4 ' ) ,  
 ( 1 6 , ' d e v _ l e a d ' , ' D e v e l o p m e n t   L e a d ' , ' L e a d s   s o f t w a r e   d e v e l o p m e n t . ' , 1 , 1 , N U L L , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 1 4 4 9 1 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 1 4 4 9 1 ' ) ,  
 ( 1 7 , ' s q a _ l e a d ' , ' S Q A   L e a d ' , ' L e a d s   s o f t w a r e   Q A . ' , 1 , 1 , N U L L , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 1 9 3 8 3 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 1 9 3 8 3 ' ) ,  
 ( 1 8 , ' r e c o r d s _ o f f i c e r ' , ' R e c o r d s   O f f i c e r ' , ' M a n a g e s   a d m i n i s t r a t i v e   r e c o r d s . ' , 1 , 1 , N U L L , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 2 4 0 6 2 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 2 4 0 6 2 ' ) ,  
 ( 1 9 , ' h r _ i d _ o f f i c e r ' , ' H R   /   I D   O f f i c e r ' , ' H R   a n d   i d e n t i f i c a t i o n   m a n a g e m e n t . ' , 1 , 1 , N U L L , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 2 7 1 0 8 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 2 7 1 0 8 ' ) ,  
 ( 2 4 , ' d e s k t o p _ s r ' , ' D e s k t o p   S u p p o r t   S e n i o r ' , ' S e n i o r   d e s k t o p   t e c h n i c i a n . ' , 1 , 1 , ' d e s k t o p _ s u p p o r t ' , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 4 7 7 9 6 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 4 7 7 9 6 ' ) ,  
 ( 2 5 , ' i t _ s u p p o r t _ s r ' , ' I T   S u p p o r t   S e n i o r ' , ' S e n i o r   I T   s u p p o r t . ' , 1 , 1 , ' i t _ s u p p o r t ' , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 5 3 0 4 3 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 5 3 0 4 3 ' ) ,  
 ( 2 6 , ' d e s k t o p _ j r ' , ' D e s k t o p   S u p p o r t   J u n i o r ' , ' J u n i o r   d e s k t o p   t e c h n i c i a n . ' , 1 , 1 , ' d e s k t o p _ s u p p o r t ' , ' t e c h n i c i a n ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 5 7 2 8 6 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 5 7 2 8 6 ' ) ,  
 ( 2 7 , ' i t _ s u p p o r t _ j r ' , ' I T   S u p p o r t   J u n i o r ' , ' J u n i o r   I T   s u p p o r t . ' , 1 , 1 , ' i t _ s u p p o r t ' , ' t e c h n i c i a n ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 6 1 0 1 7 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 6 1 0 1 7 ' ) ,  
 ( 2 8 , ' p a n t a w i d _ i c t ' , ' P a n t a w i d   I C T   S u p p o r t ' , ' I C T   s u p p o r t   f o r   P a n t a w i d . ' , 1 , 1 , ' p a n t a w i d _ i c t _ s u p p o r t ' , ' f o c a l ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 6 5 1 1 3 ' , ' 2 0 2 6 - 0 4 - 1 6   1 0 : 0 7 : 2 6 . 7 6 5 1 1 3 ' ) ;  
 / * ! 4 0 0 0 0   A L T E R   T A B L E   ` r o l e _ d e f i n i t i o n s `   E N A B L E   K E Y S   * / ;  
 U N L O C K   T A B L E S ;  
 / * ! 4 0 1 0 3   S E T   T I M E _ Z O N E = @ O L D _ T I M E _ Z O N E   * / ;  
  
 / * ! 4 0 1 0 1   S E T   S Q L _ M O D E = @ O L D _ S Q L _ M O D E   * / ;  
 / * ! 4 0 0 1 4   S E T   F O R E I G N _ K E Y _ C H E C K S = @ O L D _ F O R E I G N _ K E Y _ C H E C K S   * / ;  
 / * ! 4 0 1 0 1   S E T   C H A R A C T E R _ S E T _ C L I E N T = @ O L D _ C H A R A C T E R _ S E T _ C L I E N T   * / ;  
 / * ! 4 0 1 0 1   S E T   C H A R A C T E R _ S E T _ R E S U L T S = @ O L D _ C H A R A C T E R _ S E T _ R E S U L T S   * / ;  
 / * ! 4 0 1 0 1   S E T   C O L L A T I O N _ C O N N E C T I O N = @ O L D _ C O L L A T I O N _ C O N N E C T I O N   * / ;  
 / * ! 4 0 1 1 1   S E T   S Q L _ N O T E S = @ O L D _ S Q L _ N O T E S   * / ;  
  
 - -   D u m p   c o m p l e t e d   o n   2 0 2 6 - 0 6 - 0 9     7 : 0 6 : 5 8  
 
INSERT INTO `role_definitions` VALUES (29,'pantawid_ict_focal','Pantawid ICT Focal','Lead Pantawid ICT Support Role',1,1,'pantawid_ict_support','pantawid_ict_focal','2026-06-09 10:00:00','2026-06-09 10:00:00');

USE compliance_hub_users;
LOCK TABLES `users` WRITE;
INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `employee_id`, `position`, `role`, `unit_id`, `is_active`) VALUES (1, 'fo2admin@dswd.gov.ph', '$2b$10$upl93srKJZFgCKH/3ICv9udREjOiYBAfKnlugx4fR7oj56f/78vWW', 'System', 'Admin', '00-0000', 'Administrator', 'super_admin', NULL, 1);
UNLOCK TABLES;
