import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function generateTestToken() {
  try {
    // Buscar ou criar usuário de teste
    let user = await prisma.user.findUnique({
      where: { email: 'test@vozdelas.com' },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      // Criar usuário de teste
      const hashedPassword = await bcrypt.hash('test123', 10);
      
      user = await prisma.user.create({
        data: {
          name: 'Usuária de Teste',
          email: 'test@vozdelas.com',
          phone: '+5511999999999',
          passwordHash: hashedPassword,
          userRoles: {
            create: {
              role: {
                connect: { name: 'USER' },
              },
            },
          },
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
      
      console.log('✅ Usuário de teste criado:', user.id);
    } else {
      console.log('✅ Usuário de teste encontrado:', user.id);
    }

    // Gerar tokens
    const roles = user.userRoles.map((ur) => ur.role.name);
    
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles: roles,
      },
      process.env.JWT_ACCESS_SECRET || 'dev-secret-change-in-production',
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      },
    );

    const refreshToken = jwt.sign(
      { sub: user.id },
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },
    );

    console.log('\n=== TOKEN DE TESTE GERADO ===\n');
    console.log('Email: test@vozdelas.com');
    console.log('Senha: test123');
    console.log('\n--- ACCESS TOKEN ---');
    console.log(accessToken);
    console.log('\n--- REFRESH TOKEN ---');
    console.log(refreshToken);
    console.log('\n=== COMO USAR ===');
    console.log('1. No app mobile, faça login com: test@vozdelas.com / test123');
    console.log('2. Ou use o token diretamente no Postman/Insomnia:');
    console.log('   Header: Authorization: Bearer ' + accessToken.substring(0, 50) + '...');
    console.log('\n✅ Token válido por 15 minutos');
  } catch (error) {
    console.error('❌ Erro ao gerar token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestToken();

