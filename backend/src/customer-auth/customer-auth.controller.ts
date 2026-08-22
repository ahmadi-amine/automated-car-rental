import { Controller, Post, Body } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';

@Controller('auth/customer')
export class CustomerAuthController {
    constructor(private readonly customerAuthService: CustomerAuthService) { }

    @Post('register')
    register(@Body() dto: CustomerRegisterDto) {
        return this.customerAuthService.register(dto);
    }

    @Post('login')
    login(@Body() dto: CustomerLoginDto) {
        return this.customerAuthService.login(dto);
    }
}
