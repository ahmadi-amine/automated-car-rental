import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateBookingDto) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: dto.vehicleId },
            include: { agency: true }
        });

        if (!vehicle) {
            throw new NotFoundException('Vehicle not found');
        }

        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);

        const isAvailable = await this.isVehicleAvailable(dto.vehicleId, start, end);
        if (!isAvailable) {
            throw new BadRequestException('Vehicle is not available for these dates');
        }

        // Create or find customer
        let customer = await this.prisma.customer.findFirst({
            where: { email: dto.email }
        });

        if (!customer) {
            customer = await this.prisma.customer.create({
                data: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    email: dto.email,
                    phone: dto.phone,
                    licenseNumber: dto.licenseNumber
                }
            });
        }

        // Calculate price
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const totalPrice = diffDays * vehicle.pricePerDay;

        return this.prisma.booking.create({
            data: {
                startDate: start,
                endDate: end,
                totalPrice,
                status: BookingStatus.PENDING,
                customerId: customer.id,
                vehicleId: vehicle.id,
                agencyId: vehicle.agencyId
            },
            include: {
                customer: true,
                vehicle: true
            }
        });
    }

    async findAllForAgency(userId: string) {
        const agency = await this.prisma.agency.findUnique({
            where: { userId }
        });

        if (!agency) {
            throw new NotFoundException('Agency not found');
        }

        return this.prisma.booking.findMany({
            where: { agencyId: agency.id },
            include: {
                customer: true,
                vehicle: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateStatus(bookingId: string, userId: string, status: BookingStatus) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { agency: true }
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.agency.userId !== userId) {
            throw new BadRequestException('You do not have permission to manage this booking');
        }

        return this.prisma.booking.update({
            where: { id: bookingId },
            data: { status },
            include: { vehicle: true }
        });
    }

    async isVehicleAvailable(vehicleId: string, startDate: Date, endDate: Date): Promise<boolean> {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: vehicleId }
        });

        if (!vehicle) {
            return false;
        }

        const overlappingBooking = await this.prisma.booking.findFirst({
            where: {
                vehicleId,
                status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
                AND: [
                    { startDate: { lt: endDate } },
                    { endDate: { gt: startDate } }
                ]
            },
        });

        return !overlappingBooking;
    }
}
