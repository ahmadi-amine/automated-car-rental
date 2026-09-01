import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
// A valid bcrypt hash used only to equalize login timing when no real password
// exists, so missing/guest accounts can't be distinguished by response time.
const DUMMY_PASSWORD_HASH = '$2b$10$rI7Leox2zuFwiAlfLNM6neQQMtj1lyaVXCQlU239sc5OYtJcI0BBa';

@Injectable()
export class CustomerAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly mail: MailService,
    ) { }

    private publicCustomer(c: any) {
        return { id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone };
    }

    private signToken(customer: any) {
        return this.jwt.signAsync({ sub: customer.id, email: customer.email, typ: 'customer' });
    }

    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private hashToken(raw: string): string {
        return crypto.createHash('sha256').update(raw).digest('hex');
    }

    /** Fresh single-use verification token plus the DB fields that persist its hash. */
    private newVerification() {
        const rawToken = this.generateToken();
        return {
            rawToken,
            verificationTokenHash: this.hashToken(rawToken),
            verificationTokenExpiry: new Date(Date.now() + VERIFICATION_TTL_MS),
        };
    }

    /** Build the verification link and email it to the customer (best-effort). */
    private async sendVerification(customer: { email: string; firstName: string }, rawToken: string) {
        const base = (this.config.get<string>('APP_URL') || 'http://localhost:3000').replace(/\/$/, '');
        const url = `${base}/verify-email?token=${rawToken}`;
        await this.mail.sendVerificationEmail(customer.email, customer.firstName, url);
    }

    async register(dto: CustomerRegisterDto) {
        const email = dto.email.trim().toLowerCase();
        const existing = await this.prisma.customer.findFirst({ where: { email } });
        // Only a *verified* account blocks re-registration; unverified/guest records
        // can be (re)claimed by whoever proves control of the mailbox.
        if (existing?.emailVerified) {
            throw new ConflictException('An account with this email already exists. Please log in.');
        }

        const hash = await bcrypt.hash(dto.password, 10);
        const parts = dto.fullName.trim().split(/\s+/);
        const firstName = parts.shift() || 'Client';
        const lastName = parts.join(' ');

        const { rawToken, ...verification } = this.newVerification();
        const data = {
            firstName,
            lastName,
            password: hash,
            emailVerified: false,
            ...verification,
        };

        // Upgrade an existing guest (preserving their booking history) or create a new account.
        const customer = existing
            ? await this.prisma.customer.update({ where: { id: existing.id }, data })
            : await this.prisma.customer.create({ data: { ...data, email } });

        // No session is issued until the email is verified — this is what prevents
        // an attacker from claiming someone else's email.
        await this.sendVerification(customer, rawToken);
        return { message: 'Account created. Check your email to verify your address before logging in.' };
    }

    async login(dto: CustomerLoginDto) {
        const email = dto.email.trim().toLowerCase();
        const customer = await this.prisma.customer.findFirst({ where: { email } });
        if (!customer || !customer.password) {
            // Run a throwaway compare so this path takes the same time as a real one.
            await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
            throw new UnauthorizedException('Invalid email or password.');
        }
        const ok = await bcrypt.compare(dto.password, customer.password);
        if (!ok) {
            throw new UnauthorizedException('Invalid email or password.');
        }
        if (!customer.emailVerified) {
            throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the verification link.');
        }
        return { access_token: await this.signToken(customer), customer: this.publicCustomer(customer) };
    }

    /** Confirm ownership of an email via the token from the verification link. */
    async verifyEmail(token: string) {
        const customer = token
            ? await this.prisma.customer.findFirst({ where: { verificationTokenHash: this.hashToken(token) } })
            : null;
        if (!customer || !customer.verificationTokenExpiry || customer.verificationTokenExpiry < new Date()) {
            throw new UnauthorizedException('This verification link is invalid or has expired.');
        }
        const updated = await this.prisma.customer.update({
            where: { id: customer.id },
            data: { emailVerified: true, verificationTokenHash: null, verificationTokenExpiry: null },
        });
        // Verified successfully — sign them in.
        return { access_token: await this.signToken(updated), customer: this.publicCustomer(updated) };
    }

    /** Re-send a verification link. Always reports success to avoid account enumeration. */
    async resendVerification(rawEmail: string) {
        const email = (rawEmail || '').trim().toLowerCase();
        const customer = email ? await this.prisma.customer.findFirst({ where: { email } }) : null;
        if (customer?.password && !customer.emailVerified) {
            const { rawToken, ...verification } = this.newVerification();
            await this.prisma.customer.update({ where: { id: customer.id }, data: verification });
            await this.sendVerification(customer, rawToken);
        }
        return { message: 'If an unverified account exists for this email, a new verification link has been sent.' };
    }

    async getMe(customerId: string) {
        const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            throw new NotFoundException('Customer not found.');
        }
        return this.publicCustomer(customer);
    }
}
