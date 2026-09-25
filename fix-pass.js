const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function update() {
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.update({
    where: { email: 'admin@tilmarcon.com.br' },
    data: { senha: hash }
  });
  console.log('Senha do admin atualizada com bcrypt!');
}
update().then(() => process.exit(0));
