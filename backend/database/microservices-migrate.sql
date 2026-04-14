-- One-time data migration from the legacy shared DB into split service DBs.
--
-- Usage example:
--   mysql -h <host> -u <user> -p < backend/database/microservices-migrate.sql
--
-- This script is idempotent:
-- - Creates destination tables with CREATE TABLE IF NOT EXISTS ... LIKE ...
-- - Uses INSERT IGNORE so reruns do not duplicate rows.

SET @source_db = 'ricms_compliance';
SET @users_db = 'ricms_users';
SET @ticketing_db = 'ricms_ticketing';
SET @compliance_db = 'ricms_compliance';
SET @cleanup_source_tables = 1;

DELIMITER $$
DROP PROCEDURE IF EXISTS copy_table_if_exists $$
CREATE PROCEDURE copy_table_if_exists(IN src_db VARCHAR(128), IN dst_db VARCHAR(128), IN tbl VARCHAR(128))
BEGIN
  DECLARE table_exists INT DEFAULT 0;

  SELECT COUNT(*)
    INTO table_exists
    FROM information_schema.tables
   WHERE table_schema = src_db
     AND table_name = tbl;

  IF table_exists > 0 THEN
    SET @create_sql = CONCAT('CREATE TABLE IF NOT EXISTS `', dst_db, '`.`', tbl, '` LIKE `', src_db, '`.`', tbl, '`;');
    PREPARE stmt_create FROM @create_sql;
    EXECUTE stmt_create;
    DEALLOCATE PREPARE stmt_create;

    SET @copy_sql = CONCAT('INSERT IGNORE INTO `', dst_db, '`.`', tbl, '` SELECT * FROM `', src_db, '`.`', tbl, '`;');
    PREPARE stmt_copy FROM @copy_sql;
    EXECUTE stmt_copy;
    DEALLOCATE PREPARE stmt_copy;
  END IF;
END $$
DELIMITER ;

DELIMITER $$
DROP PROCEDURE IF EXISTS drop_table_if_exists $$
CREATE PROCEDURE drop_table_if_exists(IN src_db VARCHAR(128), IN tbl VARCHAR(128))
BEGIN
  DECLARE table_exists INT DEFAULT 0;

  SELECT COUNT(*)
    INTO table_exists
    FROM information_schema.tables
   WHERE table_schema = src_db
     AND table_name = tbl;

  IF table_exists > 0 THEN
    SET @drop_sql = CONCAT('DROP TABLE `', src_db, '`.`', tbl, '`;');
    PREPARE stmt_drop FROM @drop_sql;
    EXECUTE stmt_drop;
    DEALLOCATE PREPARE stmt_drop;
  END IF;
END $$
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 0;

-- Users service database tables
CALL copy_table_if_exists(@source_db, @users_db, 'users');
CALL copy_table_if_exists(@source_db, @users_db, 'role_definitions');
CALL copy_table_if_exists(@source_db, @users_db, 'units');

-- Ticketing service database tables
CALL copy_table_if_exists(@source_db, @ticketing_db, 'users');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'role_definitions');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'units');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'tickets');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_comments');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_events');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_categories');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_keyword_rules');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_issue_types');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_escalations');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'escalation_focal_configs');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'tech_attendance');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'office_days');

-- Compliance service database tables
CALL copy_table_if_exists(@source_db, @compliance_db, 'users');
CALL copy_table_if_exists(@source_db, @compliance_db, 'role_definitions');
CALL copy_table_if_exists(@source_db, @compliance_db, 'units');
CALL copy_table_if_exists(@source_db, @compliance_db, 'documents');
CALL copy_table_if_exists(@source_db, @compliance_db, 'document_versions');
CALL copy_table_if_exists(@source_db, @compliance_db, 'document_references');
CALL copy_table_if_exists(@source_db, @compliance_db, 'document_assignments');
CALL copy_table_if_exists(@source_db, @compliance_db, 'reportorial_document_types');
CALL copy_table_if_exists(@source_db, @compliance_db, 'manual_reviews');
CALL copy_table_if_exists(@source_db, @compliance_db, 'version_comparisons');
CALL copy_table_if_exists(@source_db, @compliance_db, 'issuances');
CALL copy_table_if_exists(@source_db, @compliance_db, 'metrics');
CALL copy_table_if_exists(@source_db, @compliance_db, 'metric_templates');
CALL copy_table_if_exists(@source_db, @compliance_db, 'metric_applicability');
CALL copy_table_if_exists(@source_db, @compliance_db, 'metric_results');
CALL copy_table_if_exists(@source_db, @compliance_db, 'incidents');
CALL copy_table_if_exists(@source_db, @compliance_db, 'incident_daily_snapshots');
CALL copy_table_if_exists(@source_db, @compliance_db, 'cybersecurity_metrics');
CALL copy_table_if_exists(@source_db, @compliance_db, 'kpi_master');
CALL copy_table_if_exists(@source_db, @compliance_db, 'kpi_monitoring');
CALL copy_table_if_exists(@source_db, @compliance_db, 'kpi_thresholds');
CALL copy_table_if_exists(@source_db, @compliance_db, 'kpi_scoring_rules');
CALL copy_table_if_exists(@source_db, @compliance_db, 'mov_artifacts');

SET FOREIGN_KEY_CHECKS = 1;

DROP PROCEDURE IF EXISTS copy_table_if_exists;

-- Optional cleanup: retain only compliance-domain tables in the original source DB.
-- This removes users/ticketing tables from @source_db after successful copy.
DELIMITER $$
DROP PROCEDURE IF EXISTS cleanup_source_non_compliance_tables $$
CREATE PROCEDURE cleanup_source_non_compliance_tables(IN src_db VARCHAR(128), IN do_cleanup TINYINT)
BEGIN
  IF do_cleanup = 1 THEN
    SET FOREIGN_KEY_CHECKS = 0;

    -- Users-service tables
    CALL drop_table_if_exists(src_db, 'user_unit_access');
    CALL drop_table_if_exists(src_db, 'users');
    CALL drop_table_if_exists(src_db, 'role_definitions');
    CALL drop_table_if_exists(src_db, 'units');

    -- Ticketing-service tables
    CALL drop_table_if_exists(src_db, 'tickets');
    CALL drop_table_if_exists(src_db, 'ticket_comments');
    CALL drop_table_if_exists(src_db, 'ticket_events');
    CALL drop_table_if_exists(src_db, 'ticket_categories');
    CALL drop_table_if_exists(src_db, 'ticket_keyword_rules');
    CALL drop_table_if_exists(src_db, 'ticket_issue_types');
    CALL drop_table_if_exists(src_db, 'ticket_escalations');
    CALL drop_table_if_exists(src_db, 'escalation_focal_configs');
    CALL drop_table_if_exists(src_db, 'tech_attendance');
    CALL drop_table_if_exists(src_db, 'office_days');

    SET FOREIGN_KEY_CHECKS = 1;
  END IF;
END $$
DELIMITER ;

CALL cleanup_source_non_compliance_tables(@source_db, IFNULL(@cleanup_source_tables, 0));

DROP PROCEDURE IF EXISTS cleanup_source_non_compliance_tables;
DROP PROCEDURE IF EXISTS drop_table_if_exists;
