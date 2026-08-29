import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class CustomerResendDto {
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(254)
    email: string;
}
