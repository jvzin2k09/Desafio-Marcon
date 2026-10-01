const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.item.findMany({take: 5}).then(items => {
  console.dir(items, {depth: null});
  process.exit(0);
});
