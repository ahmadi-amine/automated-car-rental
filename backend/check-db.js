const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const vehicles = await prisma.vehicle.findMany();
    console.log('--- VEHICLES ---');
    console.log(JSON.stringify(vehicles, null, 2));

    const agencies = await prisma.agency.findMany();
    console.log('--- AGENCIES ---');
    console.log(JSON.stringify(agencies, null, 2));

    const users = await prisma.user.findMany();
    console.log('--- USERS ---');
    console.log(JSON.stringify(users, null, 2));

    const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Agency'`;
    console.log('--- AGENCY COLUMNS ---');
    console.log(JSON.stringify(columns, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
