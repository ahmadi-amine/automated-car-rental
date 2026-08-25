import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AgencyModule } from './agency/agency.module';
import { PrismaModule } from './prisma/prisma.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { BookingModule } from './booking/booking.module';
import { AiModule } from './ai/ai.module';
import { CustomerModule } from './customer/customer.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { ExpenseModule } from './expense/expense.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    AgencyModule,
    VehicleModule,
    BookingModule,
    AiModule,
    CustomerModule,
    CustomerAuthModule,
    ExpenseModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
