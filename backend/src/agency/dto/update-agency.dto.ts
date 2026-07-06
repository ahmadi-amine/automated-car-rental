import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';

export class UpdateAgencyDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    slug?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    logoUrl?: string;

    @IsString()
    @IsOptional()
    bannerUrl?: string;

    @IsString()
    @IsOptional()
    primaryColor?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    minAge?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    depositAmount?: number;

    @IsString()
    @IsOptional()
    rentalConditions?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    publicEmail?: string;
}
