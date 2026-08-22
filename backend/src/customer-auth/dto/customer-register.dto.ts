import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class CustomerRegisterDto {
    @IsString()
    @MaxLength(120)
    fullName: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    @MaxLength(72)
    password: string;
}
