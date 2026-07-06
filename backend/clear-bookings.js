const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- CLEARING ALL BOOKINGS ---');
    
    const deleteResult = await prisma.booking.deleteMany({});
    
    console.log(`Successfully deleted ${deleteResult.count} bookings.`);
}

main()
    .catch(e => {
        console.error('Error clearing bookings:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
