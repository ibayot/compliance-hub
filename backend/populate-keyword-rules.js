const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'admin',
    database: '02_db_stg_compliance_hub_ticketing'
  });
  
  console.log('Connected to database.');

  // Clear existing keyword rules
  await connection.query('DELETE FROM ticket_keyword_rules');
  console.log('Cleared existing keyword rules.');

  // Fetch all issues with their categories
  const [issues] = await connection.query(`
    SELECT 
      i.id as issue_id, 
      i.name as issue_name, 
      c.id as category_id, 
      c.name as category_name,
      c.is_it, c.is_desktop, c.is_pantawid
    FROM ticket_issue_types i
    JOIN ticket_categories c ON i.category_id = c.id
  `);

  console.log(`Found ${issues.length} issues.`);

  const supportTypeMap = (isIt, isDesktop, isPantawid) => {
    if (isPantawid) return 'pantawid';
    if (isDesktop) return 'desktop';
    if (isIt) return 'it';
    return 'operations';
  };

  let insertedCount = 0;
  for (const issue of issues) {
    const targetTicketType = supportTypeMap(issue.is_it, issue.is_desktop, issue.is_pantawid);
    
    // Create a keyword rule based on the issue name and category name
    // Example: "hardware repair", "repair", "hardware"
    const keywords = Array.from(new Set([
      issue.issue_name.toLowerCase(),
      issue.category_name.toLowerCase(),
      `${issue.category_name.toLowerCase()} ${issue.issue_name.toLowerCase()}`
    ]));

    const ruleId = uuidv4();
    await connection.query(`
      INSERT INTO ticket_keyword_rules 
      (id, keyword, keywords, target_ticket_type, target_category_id, target_issue_type_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      ruleId,
      keywords[0], // primary keyword
      JSON.stringify(keywords),
      targetTicketType,
      issue.category_id,
      issue.issue_id,
      1
    ]);
    insertedCount++;
  }

  console.log(`Successfully populated ${insertedCount} keyword rules.`);
  
  process.exit(0);
}

run().catch(console.error);
