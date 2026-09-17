-- Run this once after selecting the TICKETING database for the target environment.
-- Adds the fourth support type category flag and a general category so
-- Specialized Concerns can be submitted immediately. Issue/SLA definitions
-- remain administrator-configured because specialized work has no universal SLA.

ALTER TABLE `ticket_categories`
  ADD COLUMN IF NOT EXISTS `is_specialized` TINYINT(1) NOT NULL DEFAULT 0
  AFTER `is_pantawid`;

INSERT INTO `ticket_categories` (
  `id`, `key`, `name`, `description`, `is_active`, `is_deleted`,
  `is_it`, `is_desktop`, `is_pantawid`, `is_specialized`
)
VALUES (
  UUID(),
  'specialized_concern_general',
  'General Specialized Concern',
  'Document reviews, assessments, governance work, upgrades, project charters, and other specialist concerns.',
  1, 0, 0, 0, 0, 1
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `is_active` = 1,
  `is_deleted` = 0,
  `is_specialized` = 1;
