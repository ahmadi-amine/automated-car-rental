import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENCY)
export class ExpenseController {
    constructor(private readonly expenseService: ExpenseService) { }

    @Post()
    create(@Req() req: any, @Body() dto: CreateExpenseDto) {
        return this.expenseService.create(req.user.userId, dto);
    }

    @Get()
    findAll(@Req() req: any, @Query('vehicleId') vehicleId?: string) {
        return this.expenseService.findAllForAgency(req.user.userId, vehicleId);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id') id: string) {
        return this.expenseService.remove(req.user.userId, id);
    }
}
