
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL;
let prisma;

if (!connectionString) {
  prisma = new PrismaClient();
} else {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

async function main() {
  console.log('Updating admin password to admin123...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Update existing or create if missing
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'ADMIN',
      isApproved: true,
    },
  });

  console.log('Admin password updated successfully!');
  console.log('Email:', admin.email);
  console.log('New password: admin123');
}

main()
  .catch((e) => {
    console.error('Error updating admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
