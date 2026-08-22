import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface CustomerJwtPayload {
    sub: string;
    email: string;
    typ: string;
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')!,
        });
    }

    async validate(payload: CustomerJwtPayload) {
        // Reject agency/admin tokens — this strategy only accepts customer tokens.
        if (payload.typ !== 'customer') {
            throw new UnauthorizedException('Invalid token type.');
        }
        return { customerId: payload.sub, email: payload.email };
    }
}
