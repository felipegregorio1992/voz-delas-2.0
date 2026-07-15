import { PrismaClient, SupportServiceType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: 'ADMIN_PANEL', label: 'Painel Admin', description: 'Gerenciar usuários e cargos' },
  { code: 'DASHBOARD_VIEW', label: 'Dashboard', description: 'Acessar o dashboard web' },
  { code: 'INCIDENTS_VIEW', label: 'Denúncias', description: 'Ver denúncias e locais' },
  { code: 'PANIC_VIEW', label: 'Pânico', description: 'Ver eventos de pânico e locais' },
  { code: 'MERCHANT_REQUESTS_MANAGE', label: 'Solicitações', description: 'Aprovar/rejeitar solicitações de lojistas' },
  { code: 'MERCHANTS_VIEW', label: 'Lojas', description: 'Ver lojas e produtos' },
  { code: 'MERCHANTS_MANAGE', label: 'Lojas (gestão)', description: 'Ativar/desativar lojas' },
  { code: 'SUPPORT_SERVICES_MANAGE', label: 'Serviços de Apoio', description: 'Gerenciar serviços de apoio' },
  { code: 'SALA_LILAS_ACCESS', label: 'Sala Lilás', description: 'Acessar a Sala Lilás' },
  { code: 'SALA_LILAS_SCHEDULE_MANAGE', label: 'Agendamentos', description: 'Aprovar/rejeitar agendamentos' },
  { code: 'OPERATING_HOURS_MANAGE', label: 'Horários', description: 'Editar horários de funcionamento' },
  { code: 'ANNOUNCEMENTS_MANAGE', label: 'Banners e Avisos', description: 'Gerenciar banners e avisos do app' },
  { code: 'EVENTS_MANAGE', label: 'Eventos', description: 'Gerenciar eventos, cursos e atividades' },
  { code: 'TOTEMS_MANAGE', label: 'Totems', description: 'Gerenciar totens de apoio no mapa' },
] as const;

async function main() {
  console.log('🌱 Iniciando seed...');

  const permissions: any[] = [];
  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { label: p.label, description: p.description },
      create: { code: p.code, label: p.label, description: p.description },
    });
    permissions.push(perm);
  }

  const permissionIdByCode = new Map<string, string>(
    permissions.map((p) => [p.code, p.id]),
  );

  const upsertRoleWithPermissions = async (name: string, permissionCodes: string[]) => {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionCodes.map((code) => ({
        roleId: role.id,
        permissionId: permissionIdByCode.get(code)!,
      })),
      skipDuplicates: true,
    });

    return role;
  };

  const roles: any[] = [];
  roles.push(
    await upsertRoleWithPermissions('ADMIN', PERMISSIONS.map((p) => p.code)),
  );
  roles.push(
    await upsertRoleWithPermissions('OPERATOR', [
      'DASHBOARD_VIEW',
      'INCIDENTS_VIEW',
      'PANIC_VIEW',
      'MERCHANT_REQUESTS_MANAGE',
      'MERCHANTS_VIEW',
      'MERCHANTS_MANAGE',
      'SUPPORT_SERVICES_MANAGE',
      'SALA_LILAS_ACCESS',
      'SALA_LILAS_SCHEDULE_MANAGE',
      'OPERATING_HOURS_MANAGE',
      'ANNOUNCEMENTS_MANAGE',
      'EVENTS_MANAGE',
      'TOTEMS_MANAGE',
    ]),
  );
  roles.push(
    await upsertRoleWithPermissions('ATTENDANT', [
      'DASHBOARD_VIEW',
      'SALA_LILAS_ACCESS',
      'SALA_LILAS_SCHEDULE_MANAGE',
      'OPERATING_HOURS_MANAGE',
    ]),
  );
  roles.push(
    await upsertRoleWithPermissions('PSYCHOLOGIST', [
      'SALA_LILAS_ACCESS',
    ]),
  );
  roles.push(
    await upsertRoleWithPermissions('SECURITY', [
      'DASHBOARD_VIEW',
      'INCIDENTS_VIEW',
      'PANIC_VIEW',
    ]),
  );
  roles.push(
    await upsertRoleWithPermissions('GUARD', [
      'DASHBOARD_VIEW',
      'INCIDENTS_VIEW',
      'PANIC_VIEW',
    ]),
  );
  roles.push(
    await upsertRoleWithPermissions('USER', []),
  );

  console.log('✅ Permissões e roles criadas');

  // ── Conta Admin Geral ────────────────────────────────────────────────────
  // Senha: Admin@VozDelas2026
  const adminPasswordHash = await bcrypt.hash('Admin@VozDelas2026', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vozdelas.com' },
    update: {},
    create: {
      name: 'Administrador Geral',
      email: 'admin@vozdelas.com',
      passwordHash: adminPasswordHash,
      userRoles: {
        create: {
          roleId: roles.find((r) => r.name === 'ADMIN')!.id,
        },
      },
    },
  });

  // Marcar como conta WEB
  await prisma.$executeRawUnsafe(
    `UPDATE users SET source = 'WEB' WHERE id = ?`,
    admin.id,
  );

  console.log('✅ Admin criado:', admin.email, '| Senha: Admin@VozDelas2026');

  // ── Usuário de teste (app mobile) ────────────────────────────────────────
  const userPasswordHash = await bcrypt.hash('user123', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@vozdelas.com' },
    update: {},
    create: {
      name: 'Usuária Teste',
      email: 'user@vozdelas.com',
      phone: '+5511888888888',
      passwordHash: userPasswordHash,
      userRoles: {
        create: {
          roleId: roles.find((r) => r.name === 'USER')!.id,
        },
      },
    },
  });

  console.log('✅ Usuário de teste criado:', testUser.email);

  // ── Serviços de apoio ────────────────────────────────────────────────────
  const supportServices = [
    {
      name: 'CEAM - Centro Especializado de Atendimento à Mulher - Zona Sul',
      type: SupportServiceType.CEAM,
      phone: '(21) 2222-2222',
      address: 'Rua Exemplo, 123 - Zona Sul',
      hours: 'Segunda a Sexta, 8h às 17h',
      city: 'Rio de Janeiro',
    },
    {
      name: 'CEAM - Centro Especializado de Atendimento à Mulher - Zona Norte',
      type: SupportServiceType.CEAM,
      phone: '(21) 3333-3333',
      address: 'Av. Exemplo, 456 - Zona Norte',
      hours: 'Segunda a Sexta, 8h às 17h',
      city: 'Rio de Janeiro',
    },
    {
      name: 'DEAM - Delegacia Especializada de Atendimento à Mulher',
      type: SupportServiceType.DEAM,
      phone: '(21) 2332-9999',
      address: 'Rua da Delegacia, 789',
      hours: '24 horas',
      city: 'Rio de Janeiro',
    },
    {
      name: 'Defensoria Pública - Núcleo de Defesa da Mulher',
      type: SupportServiceType.DEFENSORIA,
      phone: '(21) 3113-8000',
      address: 'Av. da Defensoria, 100',
      hours: 'Segunda a Sexta, 9h às 18h',
      city: 'Rio de Janeiro',
    },
    {
      name: 'Ligue 180 - Central de Atendimento à Mulher',
      type: SupportServiceType.OUTRO,
      phone: '180',
      address: null,
      hours: '24 horas',
      city: null,
    },
  ];

  for (const service of supportServices) {
    const existing = await prisma.supportService.findFirst({
      where: { name: service.name },
    });
    if (!existing) {
      await prisma.supportService.create({ data: service });
    }
  }

  console.log('✅ Serviços de apoio criados');
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  🔑 CREDENCIAIS DO ADMIN');
  console.log('  Email: admin@vozdelas.com');
  console.log('  Senha: Admin@VozDelas2026');
  console.log('  URL:   http://localhost:5173/login');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('🎉 Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

