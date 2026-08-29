import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CustomerVerifyDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    token: string;
}
