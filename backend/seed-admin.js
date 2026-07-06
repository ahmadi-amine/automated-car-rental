
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
  console.log('Creating admin user...');

  const hashedPassword = await bcrypt.hash('admin', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'ADMIN',
      isApproved: true,
    },
  });

  console.log('Admin created successfully!');
  console.log('Email:', admin.email);
  console.log('Password: admin');
}

main()
  .catch((e) => {
    console.error('Error seeding admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

