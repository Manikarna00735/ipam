const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const migrationsDir = path.join(__dirname, '..', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL required in .env');
  process.exit(1);
}

for (const file of files) {
  const full = path.join(migrationsDir, file);
  console.log('Running', full);
  execSync(`psql ${databaseUrl} -f "${full}"`, { stdio: 'inherit' });
}
console.log('Migrations applied');
