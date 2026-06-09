CREATE DATABASE IF NOT EXISTS compliance_hub_users;
CREATE DATABASE IF NOT EXISTS compliance_hub_ticketing;
CREATE DATABASE IF NOT EXISTS compliance_hub;

GRANT ALL PRIVILEGES ON compliance_hub_users.* TO 'ricms_user'@'%';
GRANT ALL PRIVILEGES ON compliance_hub_ticketing.* TO 'ricms_user'@'%';
GRANT ALL PRIVILEGES ON compliance_hub.* TO 'ricms_user'@'%';

FLUSH PRIVILEGES;
