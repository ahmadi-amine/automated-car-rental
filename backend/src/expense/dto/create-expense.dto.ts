import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';
import { ExpenseType } from '@prisma/client';

export class CreateExpenseDto {
    @IsString()
    vehicleId: string;

    @IsEnum(ExpenseType)
    type: ExpenseType;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    date?: string;
}
