const fs = require('fs');
const file = 'tests/e2e/12-comprehensive-sla.spec.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/await expect\(page\.getByRole\('alert'\)\)\.toBeVisible\(\);/g, "await expect(page.getByRole('alert').first()).toBeVisible();");
fs.writeFileSync(file, content);
