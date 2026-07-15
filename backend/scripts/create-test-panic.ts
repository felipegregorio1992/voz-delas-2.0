import { PrismaClient, PanicStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function createTestPanic() {
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
      const hashedPassword = await bcrypt.hash('test123', 10);
      
      // Tentar criar com telefone único
      let phone = '+5511999999998'; // Telefone diferente do admin
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { phone },
          });
          
          if (!existingUser) {
            user = await prisma.user.create({
              data: {
                name: 'Usuária de Teste',
                email: 'test@vozdelas.com',
                phone: phone,
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
            break;
          } else {
            // Se telefone já existe, tentar próximo
            const lastDigit = parseInt(phone.slice(-1));
            phone = phone.slice(0, -1) + (lastDigit + 1).toString();
            attempts++;
          }
        } catch (error: any) {
          if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
            // Telefone duplicado, tentar próximo
            const lastDigit = parseInt(phone.slice(-1));
            phone = phone.slice(0, -1) + (lastDigit + 1).toString();
            attempts++;
          } else {
            throw error;
          }
        }
      }
      
      if (!user) {
        throw new Error('Não foi possível criar usuário de teste após várias tentativas');
      }
    } else {
      console.log('✅ Usuário de teste encontrado:', user.id);
    }

    // Encerrar pânicos ativos anteriores
    await prisma.panicEvent.updateMany({
      where: {
        userId: user.id,
        status: PanicStatus.ACTIVE,
      },
      data: {
        status: PanicStatus.ENDED,
        endedAt: new Date(),
      },
    });

    // Criar evento de pânico de teste
    const panicEvent = await prisma.panicEvent.create({
      data: {
        userId: user.id,
        status: PanicStatus.ACTIVE,
      },
    });

    console.log('✅ Evento de pânico criado:', panicEvent.id);

    // Adicionar localizações de teste (Rio de Janeiro - pontos próximos)
    const locations = [
      { lat: -22.9068, lng: -43.1729, accuracy: 10 }, // Centro do Rio
      { lat: -22.9100, lng: -43.1750, accuracy: 15 }, // 300m ao sul
      { lat: -22.9080, lng: -43.1700, accuracy: 12 }, // 200m ao leste
      { lat: -22.9050, lng: -43.1740, accuracy: 8 },  // 200m ao norte
    ];

    for (const loc of locations) {
      await prisma.panicLocation.create({
        data: {
          panicEventId: panicEvent.id,
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
        },
      });
    }

    console.log(`✅ ${locations.length} localizações adicionadas`);

    // Buscar o evento completo
    const fullEvent = await prisma.panicEvent.findUnique({
      where: { id: panicEvent.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        locations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    console.log('\n=== EVENTO DE PÂNICO DE TESTE CRIADO ===\n');
    console.log('ID:', fullEvent?.id);
    console.log('Status:', fullEvent?.status);
    console.log('Usuária:', fullEvent?.user.name);
    console.log('Telefone:', fullEvent?.user.phone);
    console.log('\nLocalizações:');
    fullEvent?.locations.forEach((loc, idx) => {
      console.log(`  ${idx + 1}. Lat: ${loc.lat}, Lng: ${loc.lng}, Precisão: ${loc.accuracy}m`);
    });

    console.log('\n=== COMO VERIFICAR NO DASHBOARD ===');
    console.log('1. Acesse: http://localhost:5173');
    console.log('2. Faça login com: admin@vozdelas.com / admin123');
    console.log('3. O evento de pânico deve aparecer no mapa com marcadores vermelhos');
    console.log('4. A linha vermelha conecta as localizações em sequência');

    // Gerar token para teste no app mobile
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

    console.log('\n=== TOKEN PARA TESTE NO APP MOBILE ===');
    console.log('Email: test@vozdelas.com');
    console.log('Senha: test123');
    console.log('\nAccess Token:');
    console.log(accessToken);
    console.log('\nRefresh Token:');
    console.log(refreshToken);
  } catch (error) {
    console.error('❌ Erro ao criar evento de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPanic();

