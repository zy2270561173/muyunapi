const db = require('./db/init');
const cfg = {};
db.prepare('SELECT key,value FROM configs WHERE key LIKE "smtp%"').all().forEach(r => cfg[r.key] = r.value);
console.log(JSON.stringify(cfg, null, 2));
