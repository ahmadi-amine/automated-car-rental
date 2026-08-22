import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';

@Injectable()
export class CustomerAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
    ) { }

    private publicCustomer(c: any) {
        return { id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone };
    }

    private signToken(customer: any) {
        return this.jwt.signAsync({ sub: customer.id, email: customer.email, typ: 'customer' });
    }

    async register(dto: CustomerRegisterDto) {
        const email = dto.email.trim().toLowerCase();
        const existing = await this.prisma.customer.findFirst({ where: { email } });
        if (existing?.password) {
            throw new ConflictException('An account with this email already exists. Please log in.');
        }

        const hash = await bcrypt.hash(dto.password, 10);
        const parts = dto.fullName.trim().split(/\s+/);
        const firstName = parts.shift() || 'Client';
        const lastName = parts.join(' ');

        // Upgrade an existing guest (preserving their booking history) or create a new account.
        const customer = existing
            ? await this.prisma.customer.update({ where: { id: existing.id }, data: { password: hash, firstName, lastName } })
            : await this.prisma.customer.create({ data: { firstName, lastName, email, password: hash } });

        return { access_token: await this.signToken(customer), customer: this.publicCustomer(customer) };
    }

    async login(dto: CustomerLoginDto) {
        const email = dto.email.trim().toLowerCase();
        const customer = await this.prisma.customer.findFirst({ where: { email } });
        if (!customer || !customer.password) {
            throw new UnauthorizedException('Invalid email or password.');
        }
        const ok = await bcrypt.compare(dto.password, customer.password);
        if (!ok) {
            throw new UnauthorizedException('Invalid email or password.');
        }
        return { access_token: await this.signToken(customer), customer: this.publicCustomer(customer) };
    }

    async getMe(customerId: string) {
        const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            throw new NotFoundException('Customer not found.');
        }
        return this.publicCustomer(customer);
    }
}
