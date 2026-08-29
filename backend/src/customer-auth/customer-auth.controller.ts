import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { CustomerVerifyDto } from './dto/customer-verify.dto';
import { CustomerResendDto } from './dto/customer-resend.dto';

@Controller('auth/customer')
export class CustomerAuthController {
    constructor(private readonly customerAuthService: CustomerAuthService) { }

    @Post('register')
    register(@Body() dto: CustomerRegisterDto) {
        return this.customerAuthService.register(dto);
    }

    @Post('login')
    @HttpCode(200)
    login(@Body() dto: CustomerLoginDto) {
        return this.customerAuthService.login(dto);
    }

    @Post('verify')
    @HttpCode(200)
    verify(@Body() dto: CustomerVerifyDto) {
        return this.customerAuthService.verifyEmail(dto.token);
    }

    @Post('resend-verification')
    @HttpCode(200)
    resend(@Body() dto: CustomerResendDto) {
        return this.customerAuthService.resendVerification(dto.email);
    }
}
