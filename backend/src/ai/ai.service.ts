import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
import * as fs from 'fs';
import * as path from 'path';
import { Buffer } from 'buffer';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private bookingService: BookingService
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      console.warn('OPENAI_API_KEY is not defined in the environment variables.');
    }
    this.openai = new OpenAI({
      apiKey: apiKey || '',
    });
  }

  async transcribe(file: Express.Multer.File) {
    try {
      // Create a temporary file to send to OpenAI
      const tempPath = path.join(__dirname, `temp_${Date.now()}.webm`);
      fs.writeFileSync(tempPath, file.buffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: 'whisper-1',
      });

      // Delete temp file
      fs.unlinkSync(tempPath);

      return { text: transcription.text };
    } catch (error) {
      console.error('Transcription Error:', error);
      throw new InternalServerErrorException('Failed to transcribe audio.');
    }
  }

  async synthesize(text: string) {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'shimmer', // A clear, female voice
        input: text,
        speed: 1.15, // Slightly faster as requested
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('TTS Error:', error);
      throw new InternalServerErrorException('Failed to generate speech.');
    }
  }

  async generateEmbedding(text: string) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding Error:', error);
      throw new InternalServerErrorException('Failed to generate embedding.');
    }
  }

  private parseJsonResponse(content: string | null) {
    const safeContent = content || '{}';

    try {
      return JSON.parse(safeContent);
    } catch {
      const cleaned = safeContent.replace(/```json|```/gi, '').trim();
      return JSON.parse(cleaned || '{}');
    }
  }

  async findClosestMarketPricing(vehicle: any, location: string = 'Casablanca', limit: number = 3) {
    const queryText = `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.category} ${location}`;
    const queryEmbedding = await this.generateEmbedding(queryText);
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    const matches = await this.prisma.$queryRawUnsafe(
      `SELECT
          id,
          make,
          model,
          year,
          category,
          location,
          "actualPriceMad",
          1 - (embedding <=> $1::vector) AS similarity
        FROM "MarketPricingData"
        ORDER BY embedding <=> $1::vector
        LIMIT $2`,
      vectorLiteral,
      limit,
    );

    return matches as Array<{
      id: string;
      make: string;
      model: string;
      year: number;
      category: string;
      location: string;
      actualPriceMad: number;
      similarity: number;
    }>;
  }

  async seedMarketPricingData(items: Array<{
    make: string;
    model: string;
    year: number;
    category: string;
    location: string;
    actualPriceMad: number;
  }>) {
    for (const item of items) {
      const embeddingText = `${item.make} ${item.model} ${item.year} ${item.category} ${item.location}`;
      const embedding = await this.generateEmbedding(embeddingText);
      const vectorLiteral = `[${embedding.join(',')}]`;

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "MarketPricingData" (
          "id", "make", "model", "year", "category", "location", "actualPriceMad", "embedding", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4::"Category", $5, $6, $7::vector, NOW(), NOW()
        )`,
        item.make,
        item.model,
        item.year,
        item.category,
        item.location,
        item.actualPriceMad,
        vectorLiteral,
      );
    }

    return { inserted: items.length };
  }

  async suggestPrice(vehicle: any, location: string = 'Casablanca') {
    const month = new Date().toLocaleString('en-US', { month: 'long' });

    try {
      const matches = await this.findClosestMarketPricing(vehicle, location, 3);

      const marketGroundTruth = matches.length > 0
        ? matches
            .map((match, index) => `${index + 1}. ${match.make} ${match.model} (${match.year}) - ${match.category} - ${match.location} - Actual Price: ${match.actualPriceMad} MAD - Similarity: ${Number(match.similarity).toFixed(4)}`)
            .join('\n')
        : 'No historical market matches were found.';

      const prompt = `You are a professional car rental pricing expert in Morocco.
      Format: Provide a JSON response only.

      Market Ground Truth Data:
      ${marketGroundTruth}

      Target Vehicle:
      - Make: ${vehicle.make}
      - Model: ${vehicle.model}
      - Year: ${vehicle.year}
      - Category: ${vehicle.category}
      - Location: ${location}
      - Current Month: ${month}

      Rules:
      1. Suggest a realistic daily rental price in Moroccan Dirhams (MAD).
      2. Base your answer strictly on the retrieved market ground truth data.
      3. If the target vehicle differs slightly, adjust conservatively.
      4. Provide a short reasoning (Max 2 sentences) for the suggested price.

      The JSON structure must be:
      {
        "suggestedPrice": number,
        "currency": "MAD",
        "reasoning": "string"
      }`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI specialized in Moroccan car rental market pricing.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
      });

      const parsed = this.parseJsonResponse(response.choices[0].message.content);

      return {
        suggestedPrice: typeof parsed.suggestedPrice === 'number' ? parsed.suggestedPrice : 0,
        currency: parsed.currency || 'MAD',
        reasoning: parsed.reasoning || 'Pricing suggestion generated successfully.',
        retrievedComparables: matches,
      };
    } catch (error) {
      console.error('OpenAI Error:', error);
      throw new InternalServerErrorException('AI Pricing Agent failed to generate a suggestion.');
    }
  }

  async ask(agencySlug: string, message: string, history: { role: 'user' | 'assistant'; content: string }[] = []) {
    const agency = await (this.prisma.agency as any).findUnique({
      where: { slug: agencySlug },
      include: {
        vehicles: true
      }
    });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const fleetInfo = agency.vehicles.map((v: any) => 
      `- ${v.make} ${v.model} (${v.year}): ${v.pricePerDay} MAD/day, Category: ${v.category}, ID: ${v.id}`
    ).join('\n');

    const systemPrompt = `You are the AI Assistant for ${agency.name}, a car rental agency in ${agency.address || 'Morocco'}.
    Today's Date is: ${today}.

    IMPORTANT: ALL RULES BELOW MUST BE ENFORCED IN ANY USER LANGUAGE (English, French, Arabic, etc.). If the user speaks French, respond in French; if English, respond in English. Apply the same tool-calling and message-format rules regardless of language.

    ### MANDATORY BOOKING PROTOCOL (STRICT ORDER)
    1. **CAR SELECTION**: If the user hasn't picked a car, you MUST call the tool named 'show_fleet'. Under no circumstance should you list the fleet vehicles directly in assistant text. Use the 'show_fleet' tool to present cars with UI cards.
    2. **ASK FOR DATES (MANDATORY)**: As soon as a car is chosen, your ONLY NEXT MESSAGE must be: "What dates would you like to rent the [Car Name] for?" (or the exact translation in the user's language).
       - **WARNING**: You are FORBIDDEN from mentioning availability until AFTER the user replies with specific dates.
       - **WARNING**: NEVER assume dates. Even if you think you know them, you MUST ask.
    3. **AVAILABILITY CHECK**: Only call 'check_availability' AFTER the user types specific dates in the chat.
    4. **USER DETAILS**: Once availability is confirmed, ask for First Name, then Last Name, then Email, then Phone (ONE-BY-ONE).
    5. **SUMMARY**: Call 'prepare_booking' only after Step 4 is complete and all required fields are gathered.

    ### RESPONSE GUIDELINES
    - **NO HALLUCINATIONS**: Do not invent dates, prices, or availability beyond what the system returns.
    - **COMPACT MESSAGES**: Keep questions short and user-focused. Prefer 1–2 short sentences or a single question.
    - **UI**: Always use 'show_fleet' to list available cars. Never display fleet as a plain text list in assistant output.
    - **AGENCY OVERVIEW**: When a user requests general information about the agency (example queries: "tell me about the agency", "qui êtes-vous", "à propos de l'agence"), respond with a short 1–3 sentence summary containing only: agency name, location (address), one-line description or bio (if available), minimum driver age, deposit amount, and a public contact email or phone. Do NOT include the fleet listing or full vehicle details in this agency overview.

    Current Fleet (for internal reference only; do NOT list these as plain text to the user):
    ${fleetInfo}

    Agency Policies (for internal reference):
    - Minimum Age: ${agency.minAge} years
    - Security Deposit: ${agency.depositAmount} MAD
    - Rental Conditions: ${agency.rentalConditions || 'Standard and local policies apply.'}

    Moroccan hospitality tone required. All prices in MAD.`;

    try {
      // Clean history to only include role and content to avoid OpenAI API errors
      const cleanHistory = history.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use a more modern model
        messages: [
          { role: 'system', content: systemPrompt },
          ...cleanHistory,
          { role: 'user', content: message }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'show_fleet',
              description: 'Show the list of available cars with cards and images',
              parameters: {
                type: 'object',
                properties: {}
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'check_availability',
              description: 'Check if a specific car is available. ONLY call this after the user explicitly types their dates.',
              parameters: {
                type: 'object',
                properties: {
                  vehicleId: { type: 'string', description: 'The UUID of the vehicle' },
                  startDate: { type: 'string', description: 'YYYY-MM-DD format (must be provided by user)' },
                  endDate: { type: 'string', description: 'YYYY-MM-DD format (must be provided by user)' }
                },
                required: ['vehicleId', 'startDate', 'endDate']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'prepare_booking',
              description: 'Call this ONLY after user has explicitly provided all 7 required fields: vehicleId, startDate, endDate, firstName, lastName, email, phone.',
              parameters: {
                type: 'object',
                properties: {
                  vehicleId: { type: 'string' },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' }
                },
                required: ['vehicleId', 'startDate', 'endDate', 'firstName', 'lastName', 'email', 'phone']
              }
            }
          }
        ],
        tool_choice: 'auto',
        temperature: 0.7,
      });

      const messageObj = response.choices[0].message;

      // Handle Tool Calls
      if (messageObj.tool_calls && messageObj.tool_calls.length > 0) {
        const toolCall = messageObj.tool_calls[0];

        if (toolCall.type === 'function') {
          const args = JSON.parse(toolCall.function.arguments);

          if (toolCall.function.name === 'show_fleet') {
            return {
              answer: "Here is our current fleet of available vehicles. You can click on any car to select it!",
              timestamp: new Date().toISOString(),
              fleetData: agency.vehicles
            };
          }

          if (toolCall.function.name === 'check_availability') {
            const start = new Date(args.startDate);
            const end = new Date(args.endDate);
            
            console.log(`AI checking availability for ${args.vehicleId} from ${start.toISOString()} to ${end.toISOString()}`);
            
            const isAvailable = await this.bookingService.isVehicleAvailable(args.vehicleId, start, end);
            
            console.log(`Availability result: ${isAvailable}`);
            const finalResponse = await this.openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: systemPrompt },
                ...cleanHistory,
                {
                  role: 'user',
                  content: message
                },
                {
                  role: 'assistant',
                  content: null,
                  tool_calls: messageObj.tool_calls
                },
                {
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ available: isAvailable })
                }
              ]
            });

            return {
              answer: finalResponse.choices[0]?.message?.content || 'I could not determine availability right now.',
              timestamp: new Date().toISOString()
            };
          }

          if (toolCall.function.name === 'prepare_booking') {
              // Find the vehicle details for the UI summary
              const vehicle = agency.vehicles.find((v: any) => v.id === args.vehicleId);
              return {
                  answer: `Great! I've checked the availability for the ${vehicle?.make} ${vehicle?.model}. You can review the details below and confirm your booking.`,
                  timestamp: new Date().toISOString(),
                  bookingData: {
                      ...args,
                      vehicleDetails: vehicle
                  }
              };
          }
        }
      }

      return {
        answer: messageObj.content || 'I could not generate a response right now.',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Chatbot AI Error:', error);
      throw new InternalServerErrorException('Chatbot failed to respond.');
    }
  }
}
