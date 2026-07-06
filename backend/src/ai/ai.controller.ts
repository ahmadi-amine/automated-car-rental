import { Controller, Post, Body, Param, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { AiService } from './ai.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as express from 'express';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat/:slug')
  async chat(
    @Param('slug') slug: string,
    @Body('message') message: string,
    @Body('history') history: { role: 'user' | 'assistant'; content: string }[] = [],
  ) {
    return this.aiService.ask(slug, message, history);
  }

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.transcribe(file);
  }

  @Post('synthesize')
  async synthesize(@Body('text') text: string, @Res() res: express.Response) {
    const buffer = await this.aiService.synthesize(text);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
