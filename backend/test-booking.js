const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const bookings = await prisma.booking.findMany();
    console.log(JSON.stringify(bookings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
