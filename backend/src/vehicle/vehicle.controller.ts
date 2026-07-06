import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Req,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleController {
    constructor(private readonly vehicleService: VehicleService) { }

    @Post()
    @Roles(Role.AGENCY)
    create(@Req() req: any, @Body() createVehicleDto: CreateVehicleDto) {
        return this.vehicleService.create(req.user.userId, createVehicleDto);
    }

    @Get()
    @Roles(Role.AGENCY)
    findAll(@Req() req: any) {
        return this.vehicleService.findAll(req.user.userId);
    }

    @Get(':id')
    @Roles(Role.AGENCY)
    findOne(@Req() req: any, @Param('id') id: string) {
        return this.vehicleService.findOne(id, req.user.userId);
    }

    @Patch(':id')
    @Roles(Role.AGENCY)
    update(
        @Req() req: any,
        @Param('id') id: string,
        @Body() updateDto: Partial<CreateVehicleDto>,
    ) {
        return this.vehicleService.update(id, req.user.userId, updateDto);
    }

    @Post(':id/image')
    @Roles(Role.AGENCY)
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
        }),
    )
    uploadImage(
        @Req() req: any,
        @Param('id') id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        // Manual check for image types if validator is being finicky
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const extension = extname(file.originalname).toLowerCase();

        if (!allowedExtensions.includes(extension)) {
            throw new Error('Invalid file type. Only JPG, PNG and WebP are allowed.');
        }

        const imageUrl = `http://localhost:3001/uploads/${file.filename}`;
        return this.vehicleService.updateImageUrl(id, req.user.userId, imageUrl);
    }

    @Delete(':id')
    @Roles(Role.AGENCY)
    remove(@Req() req: any, @Param('id') id: string) {
        return this.vehicleService.remove(id, req.user.userId);
    }

    @Get(':id/suggest-price')
    @Roles(Role.AGENCY)
    suggestPrice(
        @Req() req: any,
        @Param('id') id: string,
        @Query('location') location: string,
    ) {
        return this.vehicleService.suggestPrice(id, req.user.userId, location);
    }
}
