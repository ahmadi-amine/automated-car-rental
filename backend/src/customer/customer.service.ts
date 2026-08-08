import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class CustomerService {
    constructor(private readonly prisma: PrismaService) { }

    private async getAgency(userId: string) {
        const agency = await this.prisma.agency.findUnique({ where: { userId } });
        if (!agency) {
            throw new NotFoundException('Agency not found for this user.');
        }
        return agency;
    }

    /**
     * List every customer who has booked with this agency, with aggregated stats.
     * Aggregation is scoped to this agency's bookings only (multi-tenant safe).
     */
    async findAllForAgency(userId: string) {
        const agency = await this.getAgency(userId);

        const bookings = await this.prisma.booking.findMany({
            where: { agencyId: agency.id },
            include: { customer: true },
            orderBy: { startDate: 'desc' },
        });

        const byCustomer = new Map<string, any>();
        for (const b of bookings) {
            const c = b.customer;
            let row = byCustomer.get(c.id);
            if (!row) {
                row = {
                    id: c.id,
                    firstName: c.firstName,
                    lastName: c.lastName,
                    email: c.email,
                    phone: c.phone,
                    reservationsCount: 0,
                    confirmedCount: 0,
                    totalSpent: 0,
                    lastRentalDate: null as Date | null,
                };
                byCustomer.set(c.id, row);
            }
            row.reservationsCount += 1;
            if (b.status === BookingStatus.CONFIRMED) {
                row.confirmedCount += 1;
                row.totalSpent += b.totalPrice;
            }
            if (!row.lastRentalDate || b.startDate > row.lastRentalDate) {
                row.lastRentalDate = b.startDate;
            }
        }

        return Array.from(byCustomer.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    }

    /**
     * Full history for one customer, restricted to this agency's data,
     * plus the agency's private internal note.
     */
    async findOneForAgency(userId: string, customerId: string) {
        const agency = await this.getAgency(userId);

        const bookings = await this.prisma.booking.findMany({
            where: { agencyId: agency.id, customerId },
            include: { vehicle: true },
            orderBy: { startDate: 'desc' },
        });

        // A customer is only visible to an agency they have actually booked with.
        if (bookings.length === 0) {
            throw new NotFoundException('Customer not found for this agency.');
        }

        const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            throw new NotFoundException('Customer not found.');
        }

        const stats = bookings.reduce(
            (acc, b) => {
                acc.reservationsCount += 1;
                if (b.status === BookingStatus.CONFIRMED) {
                    acc.confirmedCount += 1;
                    acc.totalSpent += b.totalPrice;
                }
                if (!acc.lastRentalDate || b.startDate > acc.lastRentalDate) {
                    acc.lastRentalDate = b.startDate;
                }
                return acc;
            },
            { reservationsCount: 0, confirmedCount: 0, totalSpent: 0, lastRentalDate: null as Date | null },
        );

        const note = await this.prisma.agencyCustomerNote.findUnique({
            where: { agencyId_customerId: { agencyId: agency.id, customerId } },
        });

        return {
            customer: {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                phone: customer.phone,
                licenseNumber: customer.licenseNumber,
            },
            stats,
            bookings,
            note: note?.notes ?? '',
        };
    }

    /** Create or update the agency's private internal note for a customer. */
    async upsertNote(userId: string, customerId: string, notes: string) {
        const agency = await this.getAgency(userId);
        const record = await this.prisma.agencyCustomerNote.upsert({
            where: { agencyId_customerId: { agencyId: agency.id, customerId } },
            update: { notes },
            create: { agencyId: agency.id, customerId, notes },
        });
        return { notes: record.notes };
    }
}
