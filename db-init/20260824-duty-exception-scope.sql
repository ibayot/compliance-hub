-- Scope Duty skip exceptions to one duty rotation.
-- Existing rows remain global when duty_type is NULL.
USE `02_db_stg_compliance_hub_ticketing`;

SET @column_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'duty_exceptions'
    AND column_name = 'duty_type'
);
SET @column_sql := IF(
  @column_exists = 0,
  'ALTER TABLE `duty_exceptions` ADD COLUMN `duty_type` varchar(20) NULL AFTER `user_id`',
  'SELECT 1'
);
PREPARE duty_exception_column_stmt FROM @column_sql;
EXECUTE duty_exception_column_stmt;
DEALLOCATE PREPARE duty_exception_column_stmt;

SET @old_index_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'duty_exceptions'
    AND index_name = 'uq_duty_exception_date_user'
);
SET @drop_old_index_sql := IF(
  @old_index_exists > 0,
  'ALTER TABLE `duty_exceptions` DROP INDEX `uq_duty_exception_date_user`',
  'SELECT 1'
);
PREPARE duty_exception_old_index_stmt FROM @drop_old_index_sql;
EXECUTE duty_exception_old_index_stmt;
DEALLOCATE PREPARE duty_exception_old_index_stmt;

SET @new_index_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'duty_exceptions'
    AND index_name = 'uq_duty_exception_scope'
);
SET @new_index_sql := IF(
  @new_index_exists = 0,
  'ALTER TABLE `duty_exceptions` ADD UNIQUE KEY `uq_duty_exception_scope` (`exception_date`, `user_id`, `duty_type`)',
  'SELECT 1'
);
PREPARE duty_exception_new_index_stmt FROM @new_index_sql;
EXECUTE duty_exception_new_index_stmt;
DEALLOCATE PREPARE duty_exception_new_index_stmt;
