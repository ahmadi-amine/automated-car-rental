import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard that allows only authenticated customers (customer-jwt strategy). */
@Injectable()
export class CustomerAuthGuard extends AuthGuard('customer-jwt') {}
