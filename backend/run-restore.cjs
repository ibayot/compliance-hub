const mysql = require("mysql2");

function makeConn() {
  return mysql.createConnection({ host: "localhost", user: "root", database: "compliance_hub_users" });
}

function query(conn, sql) {
  return new Promise((res, rej) => conn.query(sql, (e, r) => e ? rej(e) : res(r)));
}

async function run() {
  const c = makeConn();
  c.connect();

  // Create users table
  await query(c, `CREATE TABLE IF NOT EXISTS users (
    id int(11) NOT NULL AUTO_INCREMENT,
    email varchar(255) NOT NULL,
    passwordHash varchar(255) NOT NULL DEFAULT '',
    first_name varchar(255) DEFAULT NULL,
    middle_name varchar(255) DEFAULT NULL,
    last_name varchar(255) DEFAULT NULL,
    suffix varchar(255) DEFAULT NULL,
    staff_id varchar(255) DEFAULT NULL,
    position varchar(255) DEFAULT NULL,
    position_full varchar(255) DEFAULT NULL,
    designation varchar(255) DEFAULT NULL,
    ticket_main_focal tinyint(1) NOT NULL DEFAULT 0,
    ticket_technician tinyint(1) NOT NULL DEFAULT 0,
    auth_provider enum('local','google') NOT NULL DEFAULT 'local',
    google_sub varchar(255) DEFAULT NULL,
    role enum('super_admin','reviewer','focal','section_head','technician','auditor','user','compliance_officer','cybersec','infosec','lead_infra','server_admin','db_admin','network_admin','project_mgr','dev_lead','sqa_lead','records_officer','hr_id_officer','technician_desktop','technician_it_support','technician_it_staff','technician_desktop_staff','desktop_sr','it_support_sr','desktop_jr','it_support_jr','pantawid_ict') NOT NULL DEFAULT 'user',
    active tinyint(1) NOT NULL DEFAULT 1,
    last_login datetime DEFAULT NULL,
    created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY UQ_email (email),
    UNIQUE KEY UQ_google_sub (google_sub)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log("? users table created");

  // Create role_definitions table
  await query(c, `CREATE TABLE IF NOT EXISTS role_definitions (
    id int(11) NOT NULL AUTO_INCREMENT,
    value varchar(255) NOT NULL,
    label varchar(255) NOT NULL,
    description text NOT NULL,
    assignable tinyint(1) NOT NULL DEFAULT 1,
    is_system tinyint(1) NOT NULL DEFAULT 1,
    technician_type varchar(30) DEFAULT NULL,
    role_code varchar(50) DEFAULT NULL,
    created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY ux_role_definitions_value (value)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log("? role_definitions table created");

  // Create units table if not present
  await query(c, `CREATE TABLE IF NOT EXISTS units (
    id int(11) NOT NULL AUTO_INCREMENT,
    name varchar(255) NOT NULL,
    description text DEFAULT NULL,
    active tinyint(1) NOT NULL DEFAULT 1,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log("? units table ensured");

  // Create user_unit_access junction table
  await query(c, `CREATE TABLE IF NOT EXISTS user_unit_access (
    user_id int(11) NOT NULL,
    unit_id int(11) NOT NULL,
    PRIMARY KEY (user_id, unit_id),
    CONSTRAINT fk_uua_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_uua_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log("? user_unit_access table created");

  // Seed units
  await query(c, `INSERT IGNORE INTO units (id, name, description, active) VALUES
    (1, 'Information Technology Unit', 'Handles ICT compliance and digital services.', 1),
    (2, 'Finance Unit', 'Handles financial compliance and reporting.', 1)`);
  console.log("? units seeded");

  // Seed admin user
  await query(c, `INSERT INTO users (id, email, passwordHash, first_name, last_name, role, active)
    VALUES (1, 'fo2admin@dswd.gov.ph', '$2b$10$wExFeL3AKrVppNFF1AzSPuc6.W3Mu8wBNrYfLIsx7LF.fXgWmNlJ2', 'System', 'Admin', 'super_admin', 1)
    ON DUPLICATE KEY UPDATE email=VALUES(email)`);
  console.log("? admin user seeded (password: Admin@123)");

  await query(c, `INSERT IGNORE INTO user_unit_access (user_id, unit_id) VALUES (1,1),(1,2)`);
  console.log("? admin unit access seeded");

  // Seed role_definitions
  const roles = [
    ['super_admin', 'Super Admin', 'Full system access.', 0, 1, null, null],
    ['reviewer', 'Reviewer (Legacy/Compat)', 'Legacy compliance oversight. Maps to compliance_officer.', 1, 1, 'compliance_officer', null],
    ['focal', 'Focal Person', 'Unit-level focal. Uploads documents.', 1, 1, 'focal', null],
    ['section_head', 'Section Head', 'Section-level supervisor.', 1, 1, 'section_head', null],
    ['technician', 'Technician (General)', 'General ICT support technician.', 1, 1, 'technician', null],
    ['auditor', 'Auditor', 'Read-only compliance access for audit.', 1, 1, 'auditor', null],
    ['user', 'Regular Staff', 'Standard staff user.', 1, 1, null, null],
    ['compliance_officer', 'Compliance Officer', 'Primary compliance and quality management role.', 1, 1, null, null],
    ['cybersec', 'Cybersecurity Officer', 'Cybersecurity-focused compliance officer.', 1, 1, 'compliance_officer', null],
    ['infosec', 'Information Security Officer', 'Information security governance.', 1, 1, 'compliance_officer', null],
    ['lead_infra', 'Lead Infrastructure Officer', 'Leads infrastructure operations.', 1, 1, 'focal', null],
    ['server_admin', 'Server Administrator', 'Manages server infrastructure.', 1, 1, 'focal', null],
    ['db_admin', 'Database Administrator', 'Manages database systems.', 1, 1, 'focal', null],
    ['network_admin', 'Network Administrator', 'Manages network infrastructure.', 1, 1, 'focal', null],
    ['project_mgr', 'Project Manager', 'Manages ICT projects.', 1, 1, 'focal', null],
    ['dev_lead', 'Development Lead', 'Leads software development.', 1, 1, 'focal', null],
    ['sqa_lead', 'SQA Lead', 'Leads software quality assurance.', 1, 1, 'focal', null],
    ['records_officer', 'Records Officer', 'Manages administrative records.', 1, 1, 'focal', null],
    ['hr_id_officer', 'HR / ID Officer', 'HR and identification management.', 1, 1, 'focal', null],
    ['technician_desktop', 'Desktop Technician', 'Desktop support technician.', 1, 1, 'technician', 'desktop_support'],
    ['technician_it_support', 'IT Support Technician', 'IT support technician.', 1, 1, 'technician', 'it_support'],
    ['technician_it_staff', 'IT Support Staff', 'IT support staff under supervision.', 1, 1, 'technician', 'it_support'],
    ['technician_desktop_staff', 'Desktop Support Staff', 'Desktop support staff under supervision.', 1, 1, 'technician', 'desktop_support'],
    ['desktop_sr', 'Desktop Support Senior', 'Senior desktop technician.', 1, 1, 'focal', 'desktop_support'],
    ['it_support_sr', 'IT Support Senior', 'Senior IT support technician.', 1, 1, 'focal', 'it_support'],
    ['desktop_jr', 'Desktop Support Junior', 'Junior desktop technician.', 1, 1, 'technician', 'desktop_support'],
    ['it_support_jr', 'IT Support Junior', 'Junior IT support.', 1, 1, 'technician', 'it_support'],
    ['pantawid_ict', 'Pantawid ICT Support', 'ICT support for Pantawid program.', 1, 1, 'focal', 'pantawid_ict_support'],
  ];
  for (const [value, label, description, assignable, is_system, role_code, technician_type] of roles) {
    await query(c, `INSERT INTO role_definitions (value,label,description,assignable,is_system,role_code,technician_type)
      VALUES (?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE label=VALUES(label),description=VALUES(description),role_code=VALUES(role_code),technician_type=VALUES(technician_type)`,
      [value, label, description, assignable, is_system, role_code, technician_type]);
  }
  console.log("? role_definitions seeded (" + roles.length + " roles)");

  // Verify
  const [u] = await query(c, "SELECT COUNT(*) as cnt FROM users");
  const [r] = await query(c, "SELECT COUNT(*) as cnt FROM role_definitions");
  console.log("\n-- Verification ------------------------------");
  console.log("users table rows:", u.cnt);
  console.log("role_definitions rows:", r.cnt);
  console.log("----------------------------------------------");
  console.log("? RESTORE COMPLETE. Login with fo2admin@dswd.gov.ph / Admin@123");

  c.end();
}

run().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
