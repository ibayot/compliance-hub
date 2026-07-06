const fs = require('fs');
const file = 'tests/e2e/12-comprehensive-sla.spec.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/name:\s*'Sign In'\s*\}/g, "name: 'Sign In', exact: true }");
fs.writeFileSync(file, content);
