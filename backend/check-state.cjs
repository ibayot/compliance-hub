const p = require("mysql2").createPool({host:"localhost",user:"root"});
const q = (sql) => new Promise((res,rej) => p.query(sql, [], (e,r) => e ? rej(e) : res(r)));

(async()=>{
  console.log("=== compliance_hub tables ===");
  const ch = await q("SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA='compliance_hub' ORDER BY TABLE_NAME");
  ch.forEach(r => console.log(r.TABLE_NAME+': '+r.TABLE_TYPE));

  console.log("\n=== compliance_hub_users tables ===");
  const chu = await q("SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA='compliance_hub_users' ORDER BY TABLE_NAME");
  chu.forEach(r => console.log(r.TABLE_NAME+': '+r.TABLE_TYPE));

  console.log("\n=== compliance_hub_ticketing tables ===");
  const cht = await q("SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA='compliance_hub_ticketing' ORDER BY TABLE_NAME");
  cht.forEach(r => console.log(r.TABLE_NAME+': '+r.TABLE_TYPE));

  console.log("\n=== role_definitions in compliance_hub_users ===");
  const roles = await q("SELECT value, label FROM compliance_hub_users.role_definitions ORDER BY value");
  roles.forEach(r => console.log(r.value+': '+r.label));

  p.end();
})().catch(e => console.error("ERR:", e.message));
