import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@vote.bd' }
  });

  if (existingAdmin) {
    console.log('ℹ️  Admin user already exists, skipping...');
  } else {
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123456', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@vote.bd',
        passwordHash: hashedPassword,
        role: 'super_admin',
        fullName: 'System Administrator'
      }
    });

    console.log('✅ Created admin user:');
    console.log('   Email: admin@vote.bd');
    console.log('   Password: admin123456');
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!');
  }

  // Create a sample election for testing (optional)
  const sampleElection = await prisma.election.findFirst({
    where: { name: 'Sample Election 2026' }
  });

  if (!sampleElection) {
    const election = await prisma.election.create({
      data: {
        name: 'Sample Election 2026',
        description: 'A sample election for testing the voting platform',
        startDate: new Date('2026-06-01T00:00:00Z'),
        endDate: new Date('2026-06-30T23:59:59Z'),
        status: 'draft',
        authConfig: {
          method: 'device_fingerprint',
          settings: { strictness: 'high' }
        },
        mapConfig: {
          color_mode: 'proportional',
          show_live_results: true
        }
      }
    });

    console.log('✅ Created sample election:', election.name);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
