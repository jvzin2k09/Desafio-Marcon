const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  const sqlString = fs.readFileSync(path.join(__dirname, 'database_seed.sql'), 'utf-8');
  const statements = sqlString.split(';');
  for (let s of statements) {
    s = s.trim();
    if (s.length > 0 && !s.startsWith('--')) {
      try { await prisma.$executeRawUnsafe(s); } catch (e) { }
    }
  }
  console.log('Seed completed!');
}
main().finally(() => prisma.$disconnect());
