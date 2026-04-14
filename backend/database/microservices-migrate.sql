-- One-time data migration from the legacy shared DB into split service DBs.
--
-- Usage example:
--   mysql -h <host> -u <user> -p < backend/database/microservices-migrate.sql
--
-- This script is idempotent:
-- - Creates destination tables with CREATE TABLE IF NOT EXISTS ... LIKE ...
-- - Uses INSERT IGNORE so reruns do not duplicate rows.

SET @preferred_source_db = 'compliance_hub';
SET @legacy_source_db = 'ricms_compliance';
SET @legacy_source_db_alt = 'rictms_compliance';
SET @preferred_has_data = EXISTS(
  SELECT 1
    FROM information_schema.tables
   WHERE table_schema = @preferred_source_db
     AND table_name IN ('users', 'tickets', 'documents')
   LIMIT 1
);
SET @source_db = IF(
  @preferred_has_data,
  @preferred_source_db,
  IF(
    EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = @legacy_source_db),
    @legacy_source_db,
    IF(
      EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = @legacy_source_db_alt),
      @legacy_source_db_alt,
      @preferred_source_db
    )
  )
);
SET @users_db = 'compliance_hub_users';
SET @ticketing_db = 'compliance_hub_ticketing';
SET @compliance_db = 'compliance_hub';
SET @cleanup_source_tables = IF(@source_db = @compliance_db, 0, 1);

DELIMITER $$
DROP PROCEDURE IF EXISTS copy_table_if_exists $$
CREATE PROCEDURE copy_table_if_exists(IN src_db VARCHAR(128), IN dst_db VARCHAR(128), IN tbl VARCHAR(128))
BEGIN
  DECLARE table_exists INT DEFAULT 0;

  SELECT COUNT(*)
    INTO table_exists
    FROM information_schema.tables
   WHERE table_schema = src_db
     AND table_name = tbl
     AND table_type = 'BASE TABLE';

  IF table_exists > 0 AND src_db <> dst_db THEN
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
DROP PROCEDURE IF EXISTS copy_table_to_name_if_exists $$
CREATE PROCEDURE copy_table_to_name_if_exists(IN src_db VARCHAR(128), IN dst_db VARCHAR(128), IN src_tbl VARCHAR(128), IN dst_tbl VARCHAR(128))
BEGIN
  DECLARE table_exists INT DEFAULT 0;

  SELECT COUNT(*)
    INTO table_exists
    FROM information_schema.tables
   WHERE table_schema = src_db
     AND table_name = src_tbl
     AND table_type = 'BASE TABLE';

  IF table_exists > 0 AND src_db <> dst_db THEN
    SET @create_sql = CONCAT('CREATE TABLE IF NOT EXISTS `', dst_db, '`.`', dst_tbl, '` LIKE `', src_db, '`.`', src_tbl, '`;');
    PREPARE stmt_create FROM @create_sql;
    EXECUTE stmt_create;
    DEALLOCATE PREPARE stmt_create;

    SET @copy_sql = CONCAT('INSERT IGNORE INTO `', dst_db, '`.`', dst_tbl, '` SELECT * FROM `', src_db, '`.`', src_tbl, '`;');
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

DELIMITER $$
DROP PROCEDURE IF EXISTS drop_view_if_exists $$
CREATE PROCEDURE drop_view_if_exists(IN src_db VARCHAR(128), IN view_name VARCHAR(128))
BEGIN
  DECLARE view_exists INT DEFAULT 0;

  SELECT COUNT(*)
    INTO view_exists
    FROM information_schema.views
   WHERE table_schema = src_db
     AND table_name = view_name;

  IF view_exists > 0 THEN
    SET @drop_view_sql = CONCAT('DROP VIEW `', src_db, '`.`', view_name, '`;');
    PREPARE stmt_drop_view FROM @drop_view_sql;
    EXECUTE stmt_drop_view;
    DEALLOCATE PREPARE stmt_drop_view;
  END IF;
END $$
DELIMITER ;

DELIMITER $$
DROP PROCEDURE IF EXISTS create_passthrough_view_if_table_exists $$
CREATE PROCEDURE create_passthrough_view_if_table_exists(IN dst_db VARCHAR(128), IN view_name VARCHAR(128), IN src_db VARCHAR(128), IN src_tbl VARCHAR(128))
BEGIN
  DECLARE table_exists INT DEFAULT 0;

  SELECT COUNT(*)
    INTO table_exists
    FROM information_schema.tables
   WHERE table_schema = src_db
     AND table_name = src_tbl;

  IF table_exists > 0 THEN
    CALL drop_view_if_exists(dst_db, view_name);
    CALL drop_table_if_exists(dst_db, view_name);

    SET @create_view_sql = CONCAT(
      'CREATE VIEW `', dst_db, '`.`', view_name, '` AS SELECT * FROM `', src_db, '`.`', src_tbl, '`;'
    );
    PREPARE stmt_create_view FROM @create_view_sql;
    EXECUTE stmt_create_view;
    DEALLOCATE PREPARE stmt_create_view;
  END IF;
END $$
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 0;

-- Users service database tables
CALL copy_table_if_exists(@source_db, @users_db, 'users');
CALL copy_table_if_exists(@source_db, @users_db, 'role_definitions');
CALL copy_table_if_exists(@source_db, @users_db, 'user_unit_access');
CALL copy_table_if_exists(@source_db, @users_db, 'attendance');
CALL copy_table_to_name_if_exists(@source_db, @users_db, 'tech_attendance', 'attendance');
CALL copy_table_if_exists(@legacy_source_db, @users_db, 'users');
CALL copy_table_if_exists(@legacy_source_db_alt, @users_db, 'users');
CALL copy_table_if_exists(@legacy_source_db, @users_db, 'user_unit_access');
CALL copy_table_if_exists(@legacy_source_db_alt, @users_db, 'user_unit_access');
CALL copy_table_if_exists(@legacy_source_db, @users_db, 'attendance');
CALL copy_table_if_exists(@legacy_source_db_alt, @users_db, 'attendance');
CALL copy_table_to_name_if_exists(@legacy_source_db, @users_db, 'tech_attendance', 'attendance');
CALL copy_table_to_name_if_exists(@legacy_source_db_alt, @users_db, 'tech_attendance', 'attendance');

-- Ticketing service database tables
CALL copy_table_if_exists(@source_db, @ticketing_db, 'role_definitions');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'tickets');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_comments');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_events');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_categories');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_keyword_rules');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_issue_types');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'ticket_escalations');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'escalation_focal_configs');
CALL copy_table_if_exists(@source_db, @ticketing_db, 'office_days');

-- Compliance service database tables
CALL copy_table_if_exists(@source_db, @compliance_db, 'role_definitions');
CALL copy_table_if_exists(@source_db, @compliance_db, 'units');
CALL copy_table_if_exists(@legacy_source_db, @compliance_db, 'units');
CALL copy_table_if_exists(@legacy_source_db_alt, @compliance_db, 'units');
SET @ensure_units_sql = CONCAT(
  'CREATE TABLE IF NOT EXISTS `', @compliance_db, '`.`units` (',
  'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,',
  'name VARCHAR(255) NOT NULL UNIQUE,',
  'description TEXT NULL,',
  'active TINYINT(1) NOT NULL DEFAULT 1,',
  'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
  ')' 
);
PREPARE stmt_ensure_units FROM @ensure_units_sql;
EXECUTE stmt_ensure_units;
DEALLOCATE PREPARE stmt_ensure_units;
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

-- Enforce single-table ownership and provide compatibility views
-- Ownership policy:
--   users       -> compliance_hub_users
--   attendance  -> compliance_hub_users
--   units       -> compliance_hub

-- Users DB should not own units table (use view to compliance units instead)
CALL drop_view_if_exists(@users_db, 'units');
CALL drop_table_if_exists(@users_db, 'units');
CALL create_passthrough_view_if_table_exists(@users_db, 'units', @compliance_db, 'units');

-- Ticketing DB should not own users/units/attendance tables (use views)
CALL drop_view_if_exists(@ticketing_db, 'users');
CALL drop_view_if_exists(@ticketing_db, 'units');
CALL drop_view_if_exists(@ticketing_db, 'attendance');
CALL drop_table_if_exists(@ticketing_db, 'users');
CALL drop_table_if_exists(@ticketing_db, 'units');
CALL drop_table_if_exists(@ticketing_db, 'attendance');
CALL drop_table_if_exists(@ticketing_db, 'tech_attendance');
CALL create_passthrough_view_if_table_exists(@ticketing_db, 'users', @users_db, 'users');
CALL create_passthrough_view_if_table_exists(@ticketing_db, 'units', @compliance_db, 'units');
CALL create_passthrough_view_if_table_exists(@ticketing_db, 'attendance', @users_db, 'attendance');

-- Compliance DB should not own users table (use view to users DB)
CALL drop_view_if_exists(@compliance_db, 'users');
CALL drop_table_if_exists(@compliance_db, 'users');
CALL create_passthrough_view_if_table_exists(@compliance_db, 'users', @users_db, 'users');

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
    CALL drop_view_if_exists(src_db, 'user_unit_access');
    CALL drop_table_if_exists(src_db, 'user_unit_access');
    CALL drop_view_if_exists(src_db, 'users');
    CALL drop_table_if_exists(src_db, 'users');
    CALL drop_view_if_exists(src_db, 'role_definitions');
    CALL drop_table_if_exists(src_db, 'role_definitions');
    CALL drop_view_if_exists(src_db, 'units');
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
    CALL drop_view_if_exists(src_db, 'attendance');
    CALL drop_table_if_exists(src_db, 'attendance');
    CALL drop_view_if_exists(src_db, 'tech_attendance');
    CALL drop_table_if_exists(src_db, 'tech_attendance');
    CALL drop_view_if_exists(src_db, 'office_days');
    CALL drop_table_if_exists(src_db, 'office_days');

    SET FOREIGN_KEY_CHECKS = 1;
  END IF;
END $$
DELIMITER ;

CALL cleanup_source_non_compliance_tables(@source_db, IFNULL(@cleanup_source_tables, 0));

DROP PROCEDURE IF EXISTS cleanup_source_non_compliance_tables;
DROP PROCEDURE IF EXISTS copy_table_to_name_if_exists;
DROP PROCEDURE IF EXISTS create_passthrough_view_if_table_exists;
DROP PROCEDURE IF EXISTS drop_view_if_exists;
DROP PROCEDURE IF EXISTS drop_table_if_exists;
