import { IsString, IsInt, IsNumber, IsArray, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Category } from '@prisma/client';

export class CreateVehicleDto {
    @IsString()
    make: string;

    @IsString()
    model: string;

    @IsInt()
    @Min(1900)
    @Max(new Date().getFullYear() + 1)
    year: number;

    @IsString()
    registrationNumber: string;

    @IsNumber()
    @Min(0)
    pricePerDay: number;

    @IsEnum(Category)
    @IsOptional()
    category?: Category;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    features?: string[];

    @IsString()
    @IsOptional()
    imageUrl?: string;
}
