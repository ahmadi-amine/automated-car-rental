import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthGuard } from './customer-auth.guard';

@Controller('customer')
@UseGuards(CustomerAuthGuard)
export class CustomerProfileController {
    constructor(private readonly customerAuthService: CustomerAuthService) { }

    @Get('me')
    me(@Req() req: any) {
        return this.customerAuthService.getMe(req.user.customerId);
    }
}
