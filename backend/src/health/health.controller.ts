import { Controller, Get, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Liveness + readiness probe for load balancers / orchestrators / uptime monitors.
     * Returns 200 when the API and its database are reachable, 503 otherwise.
     */
    @Get()
    @HttpCode(200)
    async check() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch {
            throw new HttpException(
                { status: 'error', database: 'down' },
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
        return { status: 'ok', database: 'up', uptime: Math.round(process.uptime()) };
    }
}
