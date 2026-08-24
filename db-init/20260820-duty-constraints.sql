-- Enforce one exception per technician per day.
-- The prepared statement keeps this migration safe to rerun on existing databases.
USE `02_db_stg_compliance_hub_ticketing`;
SET @constraint_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'duty_exceptions'
    AND index_name = 'uq_duty_exception_date_user'
);
SET @duplicate_exists := (
  SELECT COUNT(*) FROM (
    SELECT `exception_date`, `user_id`
    FROM `duty_exceptions`
    GROUP BY `exception_date`, `user_id`
    HAVING COUNT(*) > 1
  ) AS duplicate_rows
);
SET @constraint_sql := IF(
  @constraint_exists = 0 AND @duplicate_exists = 0,
  'ALTER TABLE `duty_exceptions` ADD UNIQUE KEY `uq_duty_exception_date_user` (`exception_date`, `user_id`)',
  'SELECT 1 /* Existing duplicate exceptions must be reviewed before adding the unique index. */'
);
PREPARE duty_constraint_stmt FROM @constraint_sql;
EXECUTE duty_constraint_stmt;
DEALLOCATE PREPARE duty_constraint_stmt;
