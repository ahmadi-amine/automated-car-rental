const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function isVehicleAvailable(vehicleId, startDate, endDate) {
    const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId }
    });

    if (!vehicle || vehicle.status === 'MAINTENANCE' || vehicle.status === 'UNAVAILABLE') {
        console.log(`Vehicle ${vehicleId} is in ${vehicle?.status} status. Hard block.`);
        return false;
    }

    const overlappingBooking = await prisma.booking.findFirst({
        where: {
            vehicleId,
            status: { in: ['CONFIRMED', 'PENDING'] },
            AND: [
                { startDate: { lt: endDate } },
                { endDate: { gt: startDate } }
            ]
        },
    });

    if (overlappingBooking) {
        console.log(`Found overlapping booking: ${overlappingBooking.id}`);
    }

    return !overlappingBooking;
}

async function main() {
    // AUDI Q8 ID from previous check-db.js
    const audiId = '9e36f916-8391-4e7a-ae63-268e83297c50';
    const start = new Date('2026-10-01');
    const end = new Date('2026-10-05');
    
    console.log(`Checking availability for Audi Q8 from ${start.toISOString()} to ${end.toISOString()}...`);
    const available = await isVehicleAvailable(audiId, start, end);
    console.log(`Result: ${available ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
