# Multimodal Audio Pipeline Execution Flow

## 1. Speech-to-Text Ingestion

### Controller entry point
The audio upload endpoint is defined in `AiController`:

```ts
@Post('transcribe')
@UseInterceptors(FileInterceptor('audio'))
async transcribe(@UploadedFile() file: Express.Multer.File) {
  return this.aiService.transcribe(file);
}
```

- The controller uses `FileInterceptor('audio')` from `@nestjs/platform-express`.
- The frontend must send the multipart form field named `audio`.
- The handler receives the file as `Express.Multer.File`.

### Temporary audio handling before Whisper
The service writes the uploaded buffer to a temporary `.webm` file before calling OpenAI:

```ts
async transcribe(file: Express.Multer.File) {
  try {
    const tempPath = path.join(__dirname, `temp_${Date.now()}.webm`);
    fs.writeFileSync(tempPath, file.buffer);

    const transcription = await this.openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
    });

    fs.unlinkSync(tempPath);

    return { text: transcription.text };
  } catch (error) {
    console.error('Transcription Error:', error);
    throw new InternalServerErrorException('Failed to transcribe audio.');
  }
}
```

- The temporary file is stored under the service directory with a generated name like `temp_<timestamp>.webm`.
- The OpenAI Whisper request is streamed from disk using `fs.createReadStream(tempPath)`.
- The transcription model is `whisper-1`.
- The temp file is deleted immediately after transcription with `fs.unlinkSync(tempPath)`.

## 2. Text-to-Speech Generation

### TTS model and voice
The service converts text to speech using OpenAI's audio speech API:

```ts
async synthesize(text: string) {
  try {
    const mp3 = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice: 'shimmer',
      input: text,
      speed: 1.15,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error('TTS Error:', error);
    throw new InternalServerErrorException('Failed to generate speech.');
  }
}
```

- The TTS model is `tts-1`.
- The selected voice is `shimmer`.
- The speech speed is set to `1.15`.

### Response delivery to the frontend
The controller streams the returned audio buffer directly as an MPEG response:

```ts
@Post('synthesize')
async synthesize(@Body('text') text: string, @Res() res: express.Response) {
  const buffer = await this.aiService.synthesize(text);
  res.set({
    'Content-Type': 'audio/mpeg',
    'Content-Length': buffer.length,
  });
  res.send(buffer);
}
```

- The audio is returned as a raw `Buffer`, not as base64.
- The response headers explicitly set `Content-Type: audio/mpeg`.
- `Content-Length` is set to `buffer.length`.
- The buffer is sent directly with `res.send(buffer)`.

## 3. ReAct / Assistant Flow Context

The multimodal pipeline is separate from the pricing RAG flow. The assistant text generation path is handled by `ask(...)` in `AiService`, which uses the chat completion API and tool-calling for booking-related interactions. That text response can then be passed to `synthesize(...)` for audio output.

## 4. Error Resilience

The current implementation uses exception-based failure handling rather than fallback media generation:

- STT failures are caught and rethrown as `InternalServerErrorException('Failed to transcribe audio.')`.
- TTS failures are caught and rethrown as `InternalServerErrorException('Failed to generate speech.')`.
- There is no silent fallback to base64, cached audio, or a default speech clip.

## 5. Architectural Notes

- The upload contract is multipart form-data with field name `audio`.
- The transcriber expects the uploaded data to already be in a browser-recorded audio format compatible with `.webm` handling.
- The temporary file bridge is used to satisfy the OpenAI transcription SDK's file-stream input.
- The TTS endpoint returns binary audio directly, which is the most efficient transport for frontend playback.

## 6. Relevant Source References

- [ai.controller.ts](file:///c:/Users/amine/Desktop/Liadtech/personel%20project/Ai%20Car%20Rental/backend/src/ai/ai.controller.ts#L1-L34)
- [ai.service.ts](file:///c:/Users/amine/Desktop/Liadtech/personel%20project/Ai%20Car%20Rental/backend/src/ai/ai.service.ts#L28-L64)
