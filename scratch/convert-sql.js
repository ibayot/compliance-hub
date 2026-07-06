const fs = require('fs');

try {
    const buffer = fs.readFileSync('db-init/01-dump.sql.bak');
    const out = Buffer.alloc(buffer.length / 2);
    for (let i = 0; i < out.length; i++) {
        out[i] = buffer[i * 2 + 1];
    }
    fs.writeFileSync('db-init/01-dump-fixed.sql', out);
    console.log("Fixed first 50:", out.slice(0, 50).toString('utf8'));
} catch (e) {
    console.error(e);
}
