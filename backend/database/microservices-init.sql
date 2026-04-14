CREATE DATABASE IF NOT EXISTS ricms_users;
CREATE DATABASE IF NOT EXISTS ricms_ticketing;
CREATE DATABASE IF NOT EXISTS ricms_compliance;

GRANT ALL PRIVILEGES ON ricms_users.* TO 'ricms_user'@'%';
GRANT ALL PRIVILEGES ON ricms_ticketing.* TO 'ricms_user'@'%';
GRANT ALL PRIVILEGES ON ricms_compliance.* TO 'ricms_user'@'%';

FLUSH PRIVILEGES;
