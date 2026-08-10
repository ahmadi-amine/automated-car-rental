import {
    Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req,
    UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENCY)
export class ExpenseController {
    constructor(private readonly expenseService: ExpenseService) { }

    @Post()
    create(@Req() req: any, @Body() dto: CreateExpenseDto) {
        return this.expenseService.create(req.user.userId, dto);
    }

    @Get()
    findAll(@Req() req: any, @Query('vehicleId') vehicleId?: string) {
        return this.expenseService.findAllForAgency(req.user.userId, vehicleId);
    }

    @Post(':id/invoice')
    @UseInterceptors(
        FileInterceptor('invoice', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
        }),
    )
    uploadInvoice(
        @Req() req: any,
        @Param('id') id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 })], // 10MB
            }),
        )
        file: Express.Multer.File,
    ) {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
        if (!allowed.includes(extname(file.originalname).toLowerCase())) {
            throw new BadRequestException('Invalid file type. Allowed: JPG, PNG, WebP, PDF.');
        }
        const invoiceUrl = `http://localhost:3001/uploads/${file.filename}`;
        return this.expenseService.updateInvoiceUrl(req.user.userId, id, invoiceUrl);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id') id: string) {
        return this.expenseService.remove(req.user.userId, id);
    }
}
