import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { BookingStatus } from '@prisma/client';

@Controller('bookings')
export class BookingController {
    constructor(private readonly bookingService: BookingService) { }

    @Post('public')
    create(@Body() createBookingDto: CreateBookingDto) {
        return this.bookingService.create(createBookingDto);
    }

    @Get('agency')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.AGENCY)
    findAllForAgency(@Req() req: any) {
        return this.bookingService.findAllForAgency(req.user.userId);
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.AGENCY)
    updateStatus(
        @Req() req: any,
        @Param('id') id: string,
        @Body('status') status: BookingStatus
    ) {
        return this.bookingService.updateStatus(id, req.user.userId, status);
    }
}
