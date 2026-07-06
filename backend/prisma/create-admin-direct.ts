import 'dotenv/config';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not defined in .env');
    }

    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        await client.connect();
        console.log('✅ Connected to database directly');

        const email = 'admin@carrental.com';
        const password = 'adminPassword123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        // Check if user exists
        const res = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);

        if (res.rows.length > 0) {
            await client.query(
                'UPDATE "User" SET "isApproved" = true, "updatedAt" = NOW() WHERE email = $1',
                [email]
            );
            console.log('✅ Admin user updated to approved status.');
        } else {
            await client.query(
                'INSERT INTO "User" (id, email, password, role, "isApproved", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
                [id, email, hashedPassword, 'ADMIN', true]
            );
            console.log('✅ Admin user created successfully and approved:');
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
        }
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

main();
