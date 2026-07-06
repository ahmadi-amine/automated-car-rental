import { Controller, Get, Patch, Param, UseGuards, Req, Body, Query, Post, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import { AgencyService } from './agency.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('agency')
export class AgencyController {
    constructor(private readonly agencyService: AgencyService) { }

    @Get('public/:slug')
    findPublic(
        @Param('slug') slug: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.agencyService.findBySlug(slug, startDate, endDate);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.AGENCY)
    getMe(@Req() req: any) {
        return this.agencyService.getAgencyByUserId(req.user.userId);
    }

    @Patch('me')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.AGENCY)
    updateMe(@Req() req: any, @Body() data: UpdateAgencyDto) {
        return this.agencyService.updateProfile(req.user.userId, data);
    }

    @Post('banner')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.AGENCY)
    @UseInterceptors(
        FileInterceptor('banner', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    callback(null, `banner-${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
        }),
    )
    uploadBanner(
        @Req() req: any,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        const imageUrl = `http://localhost:3001/uploads/${file.filename}`;
        return this.agencyService.updateBannerUrl(req.user.userId, imageUrl);
    }

    @Post('logo')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.AGENCY)
    @UseInterceptors(
        FileInterceptor('logo', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    callback(null, `logo-${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
        }),
    )
    uploadLogo(
        @Req() req: any,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        const imageUrl = `http://localhost:3001/uploads/${file.filename}`;
        return this.agencyService.updateLogoUrl(req.user.userId, imageUrl);
    }

    @Get('admin-stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    getAdminStats() {
        return this.agencyService.getAdminStats();
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    findAll() {
        return this.agencyService.findAll();
    }

    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    approve(@Param('id') id: string) {
        return this.agencyService.approve(id);
    }

    @Patch(':id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    reject(@Param('id') id: string) {
        return this.agencyService.reject(id);
    }

    @Patch(':id/suspend')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    suspend(@Param('id') id: string) {
        return this.agencyService.suspend(id);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    findOne(@Param('id') id: string) {
        return this.agencyService.findOne(id);
    }
}
