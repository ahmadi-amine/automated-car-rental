import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config'; // Ensure .env is loaded before PrismaService runs

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            super(); // fallback if for some reason it's not present
        } else {
            // Use a pg Pool with reasonable timeouts to avoid silent socket timeouts
            const pool = new Pool({
                connectionString,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            });

            // Ensure each new client session has a statement_timeout to prevent runaway queries
            pool.on('connect', (client) => {
                // 10 minutes by default (adjust if you want shorter)
                client.query(`SET statement_timeout = 600000`).catch(() => {
                    // ignore errors setting session param
                });
            });

            const adapter = new PrismaPg(pool);
            super({ adapter });
        }
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
