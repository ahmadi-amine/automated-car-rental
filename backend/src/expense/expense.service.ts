import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpenseService {
    constructor(private readonly prisma: PrismaService) { }

    private async getAgency(userId: string) {
        const agency = await this.prisma.agency.findUnique({ where: { userId } });
        if (!agency) {
            throw new NotFoundException('Agency not found for this user.');
        }
        return agency;
    }

    private async assertVehicleOwned(agencyId: string, vehicleId: string) {
        const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle || vehicle.agencyId !== agencyId) {
            throw new ForbiddenException('This vehicle does not belong to your agency.');
        }
        return vehicle;
    }

    async create(userId: string, dto: CreateExpenseDto) {
        const agency = await this.getAgency(userId);
        await this.assertVehicleOwned(agency.id, dto.vehicleId);

        return this.prisma.expense.create({
            data: {
                type: dto.type,
                amount: dto.amount,
                description: dto.description,
                date: dto.date ? new Date(dto.date) : new Date(),
                vehicleId: dto.vehicleId,
                agencyId: agency.id,
            },
            include: { vehicle: { select: { make: true, model: true, year: true } } },
        });
    }

    async findAllForAgency(userId: string, vehicleId?: string) {
        const agency = await this.getAgency(userId);
        return this.prisma.expense.findMany({
            where: { agencyId: agency.id, ...(vehicleId ? { vehicleId } : {}) },
            include: { vehicle: { select: { make: true, model: true, year: true } } },
            orderBy: { date: 'desc' },
        });
    }

    /** Fetch one expense and confirm it belongs to the caller's agency. */
    private async getOwnedExpense(userId: string, id: string) {
        const agency = await this.getAgency(userId);
        const expense = await this.prisma.expense.findUnique({ where: { id } });
        if (!expense || expense.agencyId !== agency.id) {
            throw new NotFoundException('Expense not found.');
        }
        return expense;
    }

    async remove(userId: string, id: string) {
        await this.getOwnedExpense(userId, id);
        await this.prisma.expense.delete({ where: { id } });
        return { deleted: true };
    }
}
