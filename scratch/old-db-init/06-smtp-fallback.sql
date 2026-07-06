USE 02_db_stg_compliance_hub_ticketing;

ALTER TABLE ticketing_configs
ADD COLUMN IF NOT EXISTS primary_smtp_sent_today INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS primary_smtp_last_sent_date DATE NULL,
ADD COLUMN IF NOT EXISTS primary_smtp_daily_limit INT NOT NULL DEFAULT 500;
