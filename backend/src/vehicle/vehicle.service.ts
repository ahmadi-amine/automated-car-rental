import { Injectable, NotFoundException, ForbiddenException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { AiService } from '../ai/ai.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VehicleService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService
    ) { }

    private isRateLimitError(error: unknown): boolean {
        const anyError = error as any;
        const status = anyError?.status ?? anyError?.response?.status ?? anyError?.code;
        const message = String(anyError?.message ?? '');

        return status === 429
            || /429|too many requests|quota|rate limit|resource has been exhausted/i.test(message);
    }

    private async retryOnPriceRateLimit<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (!this.isRateLimitError(error)) {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                return await operation();
            } catch (retryError) {
                if (this.isRateLimitError(retryError)) {
                    throw new HttpException(
                        'Vehicle pricing suggestion failed after retry because the AI provider quota was exceeded.',
                        HttpStatus.TOO_MANY_REQUESTS
                    );
                }
                throw retryError;
            }
        }
    }

    async create(userId: string, dto: CreateVehicleDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { agency: true },
        });

        if (!user || !user.agency) {
            throw new NotFoundException('Agency not found for this user.');
        }

        if (!user.isApproved) {
            throw new ForbiddenException('Your agency must be approved to add vehicles.');
        }

        return this.prisma.vehicle.create({
            data: {
                ...dto,
                agencyId: user.agency.id,
            },
        });
    }

    async findAll(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { agency: true },
        });

        if (!user || !user.agency) {
            throw new NotFoundException('Agency not found.');
        }

        return this.prisma.vehicle.findMany({
            where: { agencyId: user.agency.id },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, userId: string) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
            include: { agency: { include: { user: true } } },
        });

        if (!vehicle) {
            throw new NotFoundException('Vehicle not found.');
        }

        if (vehicle.agency.userId !== userId) {
            throw new ForbiddenException('You do not have permission to view this vehicle.');
        }

        return vehicle;
    }

    async update(id: string, userId: string, dto: Partial<CreateVehicleDto>) {
        await this.findOne(id, userId);

        return this.prisma.vehicle.update({
            where: { id },
            data: dto,
        });
    }

    async updateImageUrl(id: string, userId: string, imageUrl: string) {
        const vehicle = await this.findOne(id, userId);

        // Delete old image if it exists
        if (vehicle.imageUrl) {
            this.deleteOldImage(vehicle.imageUrl);
        }

        return this.prisma.vehicle.update({
            where: { id },
            data: { imageUrl },
        });
    }

    async remove(id: string, userId: string) {
        const vehicle = await this.findOne(id, userId);

        // Delete image file if it exists
        if (vehicle.imageUrl) {
            this.deleteOldImage(vehicle.imageUrl);
        }

        return this.prisma.vehicle.delete({
            where: { id },
        });
    }

    async suggestPrice(
        id: string,
        userId: string,
        location?: string,
        newVehicleDto?: { make?: string; model?: string; year?: number; category?: string }
    ) {
        const resolvedLocation = location || 'Casablanca';
        let vehicle: { make: string; model: string; year: number; category: string };
        
        if (id === 'new') {
            if (!newVehicleDto?.make || !newVehicleDto?.model) {
                throw new BadRequestException('Make and model are required for pricing suggestion of a new vehicle.');
            }
            vehicle = {
                make: newVehicleDto.make,
                model: newVehicleDto.model,
                year: newVehicleDto.year ?? new Date().getFullYear(),
                category: newVehicleDto.category ?? 'SEDAN',
            };
        } else {
            const dbVehicle = await this.findOne(id, userId);
            vehicle = {
                make: dbVehicle.make,
                model: dbVehicle.model,
                year: dbVehicle.year,
                category: dbVehicle.category,
            };
        }
        return this.retryOnPriceRateLimit(() =>
            this.aiService.suggestPrice(vehicle, resolvedLocation)
        );
    }

    private deleteOldImage(imageUrl: string) {
        try {
            const fileName = imageUrl.split('/').pop();
            if (fileName) {
                const filePath = path.join(process.cwd(), 'uploads', fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (error) {
            console.error('Failed to delete old image:', error);
        }
    }
}
