import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Verificar usuário ricardo
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'ricardo' } },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) {
    console.log('Usuário não encontrado');
    return;
  }

  console.log('Usuário:', user.name);
  console.log('Roles:', user.userRoles.map(ur => ur.role.name));

  // Verificar source
  const src = (await prisma.$queryRawUnsafe(
    `SELECT source FROM users WHERE id = ?`, user.id
  )) as { source: string }[];
  console.log('Source:', src[0]?.source);

  // Contar incidents
  const count = await prisma.incident.count();
  console.log('Total incidents no banco:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
