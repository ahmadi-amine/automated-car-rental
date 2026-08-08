import { Controller, Get, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { UpsertNoteDto } from './dto/upsert-note.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENCY)
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    @Get()
    findAll(@Req() req: any) {
        return this.customerService.findAllForAgency(req.user.userId);
    }

    @Get(':id')
    findOne(@Req() req: any, @Param('id') id: string) {
        return this.customerService.findOneForAgency(req.user.userId, id);
    }

    @Put(':id/notes')
    upsertNote(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertNoteDto) {
        return this.customerService.upsertNote(req.user.userId, id, dto.notes);
    }
}
