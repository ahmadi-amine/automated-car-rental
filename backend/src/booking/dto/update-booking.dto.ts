import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateBookingDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    vehicleId?: string;
}
