import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums/role.enum';
import { BookingService } from '../booking/booking.service';

@Injectable()
export class AgencyService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly bookingService: BookingService
    ) { }

    async findAll() {
        // Return agency users with basic profile plus computed fleet count and confirmed revenue
        const users = await this.prisma.user.findMany({
            where: { role: Role.AGENCY },
            include: { agency: true },
            orderBy: { createdAt: 'desc' },
        });

        const enriched = await Promise.all(users.map(async (u) => {
            const agencyId = u.agency?.id;

            const fleetCount = agencyId
                ? await this.prisma.vehicle.count({ where: { agencyId } })
                : 0;

            const confirmedBookings = agencyId
                ? await this.prisma.booking.findMany({ where: { agencyId, status: 'CONFIRMED' }, select: { totalPrice: true } })
                : [];

            const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

            return {
                ...u,
                fleetCount,
                totalRevenue,
            };
        }));

        return enriched;
    }

    async approve(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || user.role !== Role.AGENCY) {
            throw new NotFoundException('Agency user not found.');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { isApproved: true },
        });
    }

    async reject(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== Role.AGENCY) {
            throw new NotFoundException('Agency user not found.');
        }

        return this.prisma.user.update({ where: { id: userId }, data: { isApproved: false } });
    }

    async suspend(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== Role.AGENCY) {
            throw new NotFoundException('Agency user not found.');
        }

        return this.prisma.user.update({ where: { id: userId }, data: { isApproved: false } });
    }

    async findOne(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { agency: true },
        });

        if (!user) {
            throw new NotFoundException('Agency user not found.');
        }

        return user;
    }

    async findBySlug(slug: string, startDate?: string, endDate?: string) {
        const agency = await (this.prisma.agency as any).findUnique({
            where: { slug },
            include: {
                vehicles: true,
                user: {
                    select: {
                        email: true
                    }
                }
            }
        });

        if (!agency) {
            throw new NotFoundException('Agency not found.');
        }

        // Always return all vehicles that are not in maintenance
        // If dates are provided, we mark them as available/booked
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        const vehiclesWithAvailability = await Promise.all(agency.vehicles.map(async (vehicle: any) => {
            let isBooked = false;
            if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const isAvailable = await this.bookingService.isVehicleAvailable(vehicle.id, start, end);
                isBooked = !isAvailable;
            }
            return { ...vehicle, isBooked };
        }));

        agency.vehicles = vehiclesWithAvailability;

        return agency;
    }

    async getAgencyByUserId(userId: string) {
        const agency = await this.prisma.agency.findUnique({
            where: { userId },
        });

        if (!agency) {
            throw new NotFoundException('Agency profile not found.');
        }

        return agency as any;
    }

    async updateProfile(userId: string, data: any) {
        const agency = await this.getAgencyByUserId(userId);

        const updateData: any = {
            description: data.description,
            bio: data.bio,
            logoUrl: data.logoUrl,
            bannerUrl: data.bannerUrl,
            primaryColor: data.primaryColor,
            minAge: typeof data.minAge === 'string' ? parseInt(data.minAge) : data.minAge,
            depositAmount: typeof data.depositAmount === 'string' ? parseFloat(data.depositAmount) : data.depositAmount,
            rentalConditions: data.rentalConditions,
            phone: data.phone,
            address: data.address,
            publicEmail: data.publicEmail,
        };

        if (data.name) {
            updateData.name = data.name;
        }

        if (data.slug && data.slug.trim() !== '') {
            const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
            if (cleanSlug !== agency.slug) {
                // Double check if slug is taken
                const existing = await (this.prisma.agency as any).findUnique({ where: { slug: cleanSlug } });
                if (existing && existing.id !== agency.id) {
                    throw new BadRequestException('This URL slug is already taken by another agency.');
                }
                updateData.slug = cleanSlug;
            }
        } else if (data.slug === '') {
            // If they explicitly cleared it, we keep it null to avoid unique constraint on ""
            updateData.slug = null;
        }

        return (this.prisma.agency as any).update({
            where: { id: agency.id },
            data: updateData,
        });
    }

    async updateBannerUrl(userId: string, bannerUrl: string) {
        const agency = await this.getAgencyByUserId(userId);
        return (this.prisma.agency as any).update({
            where: { id: agency.id },
            data: { bannerUrl },
        });
    }

    async updateLogoUrl(userId: string, logoUrl: string) {
        const agency = await this.getAgencyByUserId(userId);
        return (this.prisma.agency as any).update({
            where: { id: agency.id },
            data: { logoUrl },
        });
    }

    async getAdminStats() {
        const totalAgencies = await this.prisma.user.count({ where: { role: Role.AGENCY } });
        const pendingAgencies = await this.prisma.user.count({ where: { role: Role.AGENCY, isApproved: false } });
        const totalVehicles = await this.prisma.vehicle.count();
        const totalBookings = await this.prisma.booking.count();
        
        const confirmedBookings = await this.prisma.booking.findMany({
            where: { status: 'CONFIRMED' },
            select: { totalPrice: true }
        });
        const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

        return {
            totalAgencies,
            pendingAgencies,
            totalVehicles,
            totalBookings,
            totalRevenue
        };
    }
}
