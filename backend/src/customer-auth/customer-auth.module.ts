import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerProfileController } from './customer-profile.controller';
import { CustomerJwtStrategy } from './customer-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '30d') as any },
      }),
    }),
  ],
  controllers: [CustomerAuthController, CustomerProfileController],
  providers: [CustomerAuthService, CustomerJwtStrategy],
})
export class CustomerAuthModule {}
