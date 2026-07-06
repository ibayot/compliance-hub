-- DROP TRIGGERS TO PREVENT DUPLICATES
USE 02_db_stg_compliance_hub_ticketing;

DROP TRIGGER IF EXISTS trg_comments_after_insert;
DROP TRIGGER IF EXISTS trg_comments_after_update;
DROP TRIGGER IF EXISTS trg_comments_after_delete;

DROP TRIGGER IF EXISTS trg_events_after_insert;

DROP TRIGGER IF EXISTS trg_tickets_after_insert;
DROP TRIGGER IF EXISTS trg_tickets_after_update;
DROP TRIGGER IF EXISTS trg_tickets_after_delete;
