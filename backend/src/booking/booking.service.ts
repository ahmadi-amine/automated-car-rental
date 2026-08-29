import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { bookingRef } from '../common/booking-ref';

@Injectable()
export class BookingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mail: MailService,
    ) { }

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

        // Create or find customer (normalize email so the same person maps to one record)
        const email = dto.email.trim().toLowerCase();
        let customer = await this.prisma.customer.findFirst({
            where: { email }
        });

        if (!customer) {
            customer = await this.prisma.customer.create({
                data: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    email,
                    phone: dto.phone,
                    licenseNumber: dto.licenseNumber
                }
            });
        }

        // Calculate price
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const totalPrice = diffDays * vehicle.pricePerDay;

        const booking = await this.prisma.booking.create({
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

        // Acknowledge the request to the client. Best-effort — never break the booking.
        void this.mail.sendBookingReceived({
            customerEmail: customer.email,
            customerFirstName: customer.firstName,
            reference: bookingRef(booking.id),
            agencyName: vehicle.agency.name,
            agencyReplyTo: vehicle.agency.publicEmail ?? undefined,
            vehicleMake: vehicle.make,
            vehicleModel: vehicle.model,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            totalPrice,
        });

        // Notify the agency (if it has a public email) that a request needs review.
        if (vehicle.agency.publicEmail) {
            void this.mail.sendNewBookingAgencyNotice({
                agencyEmail: vehicle.agency.publicEmail,
                agencyName: vehicle.agency.name,
                reference: bookingRef(booking.id),
                customerFullName: `${customer.firstName} ${customer.lastName}`.trim(),
                customerEmail: customer.email,
                customerPhone: customer.phone ?? undefined,
                vehicleMake: vehicle.make,
                vehicleModel: vehicle.model,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                totalPrice,
            });
        }

        return booking;
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
            include: { agency: true, customer: true, vehicle: true }
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.agency.userId !== userId) {
            throw new BadRequestException('You do not have permission to manage this booking');
        }

        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status },
            include: { vehicle: true }
        });

        // Notify the client when the agency transitions the booking. Best-effort:
        // a mail failure must never break the status update.
        const changed = booking.status !== status;
        const emailData = {
            customerEmail: booking.customer.email,
            customerFirstName: booking.customer.firstName,
            reference: bookingRef(booking.id),
            agencyName: booking.agency.name,
            agencyReplyTo: booking.agency.publicEmail ?? undefined,
            vehicleMake: booking.vehicle.make,
            vehicleModel: booking.vehicle.model,
            startDate: booking.startDate.toISOString(),
            endDate: booking.endDate.toISOString(),
            totalPrice: booking.totalPrice,
        };
        if (changed && status === BookingStatus.CONFIRMED) {
            void this.mail.sendBookingConfirmation(emailData);
        } else if (changed && status === BookingStatus.CANCELLED) {
            void this.mail.sendBookingCancellation(emailData);
        }

        return updated;
    }

    async update(bookingId: string, userId: string, dto: UpdateBookingDto) {
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

        const vehicleId = dto.vehicleId || booking.vehicleId;
        const start = dto.startDate ? new Date(dto.startDate) : booking.startDate;
        const end = dto.endDate ? new Date(dto.endDate) : booking.endDate;

        if (end < start) {
            throw new BadRequestException('End date cannot be before the start date');
        }

        const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle || vehicle.agencyId !== booking.agencyId) {
            throw new BadRequestException('Vehicle does not belong to this agency');
        }

        // Availability check excluding the booking being edited.
        const overlap = await this.prisma.booking.findFirst({
            where: {
                vehicleId,
                id: { not: bookingId },
                status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
                AND: [
                    { startDate: { lt: end } },
                    { endDate: { gt: start } }
                ]
            }
        });
        if (overlap) {
            throw new BadRequestException('Vehicle is not available for these dates');
        }

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const totalPrice = diffDays * vehicle.pricePerDay;

        return this.prisma.booking.update({
            where: { id: bookingId },
            data: { startDate: start, endDate: end, vehicleId, totalPrice },
            include: { customer: true, vehicle: true }
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
