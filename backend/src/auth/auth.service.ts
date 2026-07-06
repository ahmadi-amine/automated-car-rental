import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async login(dto: LoginDto): Promise<{ access_token: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new NotFoundException('No user found with this email address.');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials.');
        }

        if (!user.isApproved && user.role !== Role.ADMIN) {
            throw new ForbiddenException(
                'Your account is pending approval by an administrator.',
            );
        }

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }

    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already in use.');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                role: Role.AGENCY,
                isApproved: false, // Explicitly false for agencies
                agency: {
                    create: {
                        name: dto.agencyName || 'New Agency',
                        depositAmount: 0, // Initial values
                        rentalConditions: 'Default conditions',
                    },
                },
            },
        });

        return {
            message:
                'Registration successful. Your account is pending administrator approval.',
            userId: user.id,
        };
    }
}
