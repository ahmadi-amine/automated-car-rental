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
        vehicles: true,
        user: { select: { email: true } }
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

    // Real contact + about data injected into the prompt so the AI never uses placeholders.
    const contactEmail = agency.publicEmail || agency.user?.email || null;
    const contactParts = [
      agency.address ? `Address: ${agency.address}` : null,
      agency.phone ? `Phone: ${agency.phone}` : null,
      contactEmail ? `Email: ${contactEmail}` : null,
    ].filter(Boolean);
    const contactInfo = contactParts.length
      ? contactParts.map((p: string) => `- ${p}`).join('\n    ')
      : '- No public contact details are on file for this agency.';
    const aboutInfo = agency.description || agency.bio || 'A trusted local car rental agency.';

    const systemPrompt = `You are the AI Assistant for ${agency.name}, a car rental agency in ${agency.address || 'Morocco'}.
    Today's Date is: ${today}.

    IMPORTANT: ALL RULES BELOW MUST BE ENFORCED IN ANY USER LANGUAGE (English, French, Arabic, etc.). If the user speaks French, respond in French; if English, respond in English. Apply the same tool-calling and message-format rules regardless of language.

    ### MANDATORY BOOKING PROTOCOL (STRICT ORDER)
    1. **CAR SELECTION (branch on dates)**:
       - If the user asks to rent WITHOUT giving dates, call 'show_fleet' to present the full fleet as UI cards.
       - If the user's message ALREADY contains specific rental dates (e.g. "I want a car from 2026-06-01 to 2026-06-05", "une voiture du 1 au 5 juin"), call 'show_available_fleet' with those dates to present ONLY the cars available for that period. Do NOT call 'show_fleet' in that case.
       - Never list vehicles as plain text — always use a fleet tool.
    2. **DATES**:
       - If dates are NOT yet known once a car is chosen, your ONLY NEXT MESSAGE must be: "What dates would you like to rent the [Car Name] for?" (or the exact translation), then wait for the user's dates.
       - If dates were ALREADY provided (e.g. via 'show_available_fleet'), do NOT ask for them again.
       - **WARNING**: NEVER assume or invent dates.
    3. **AVAILABILITY CHECK**: When a specific car is chosen and dates are known but availability was NOT already established via 'show_available_fleet', call 'check_availability'.
    4. **QUOTE / DEVIS (ON REQUEST ONLY)**: If — once a car and dates are known — the user asks for a quote, devis, estimate, or price breakdown, call 'prepare_quote' with the vehicleId and dates. This shows the user a button to view/print the quote. Do NOT call 'prepare_quote' unless the user explicitly asks. If the user's message explicitly asks for a quote/devis/estimate AND names a specific car AND dates, call 'prepare_quote' directly (do NOT call 'show_available_fleet' in that case). After a quote, simply continue the normal flow.
    5. **USER DETAILS**: To place a booking, ask for First Name, then Last Name, then Email, then Phone (ONE-BY-ONE).
    6. **SUMMARY**: Call 'prepare_booking' only after Step 5 is complete and all required fields are gathered.

    ### RESPONSE GUIDELINES
    - **TONE**: Warm, refined Moroccan hospitality — courteous, professional, and confident. Never robotic or over-eager. Always quote prices in MAD.
    - **NO HALLUCINATIONS**: Never invent dates, prices, availability, or contact details. Rely only on the data in "Agency Details" and on tool results.
    - **NO PLACEHOLDERS**: Never output bracketed placeholders such as [email], [phone], or [contact info]. Always use the exact values from "Agency Details" below. If a specific detail is genuinely missing, omit it gracefully rather than inventing or bracketing it.
    - **LENGTH**: Keep replies concise and scannable. While collecting booking details, ask ONE short question at a time (a single line). For overviews or informational answers, prefer a short intro line followed by a bulleted list over a long paragraph.
    - **FORMATTING (IMPORTANT — narrow chat widget)**: The chat window is small and narrow, so NEVER send one dense block of text. Structure every non-trivial reply:
       • Break content into short lines; keep each line easy to read on a phone-width screen.
       • When presenting two or more facts (policies, contact details, requirements, a summary), put each fact on its OWN line as a bullet beginning with "- ".
       • Separate a short intro line from a list with a single blank line.
       • You may bold a short label using **double asterisks** (e.g. "- **Deposit:** 100 MAD").
       • Do NOT use markdown headings (#), tables, or code blocks — only short lines and "- " bullets.
    - **UI**: Always use the 'show_fleet' tool to present cars. Never list vehicles as plain text in your reply.
    - **AGENCY OVERVIEW**: When the user asks about the agency ("tell me about the agency", "qui êtes-vous", "à propos de l'agence"), reply in this exact shape, using the REAL values from "Agency Details" (omit any that are missing, never use placeholders, do NOT list the fleet):
       A warm one-line intro with the agency name, location, and a few words on who they are.
       (blank line)
       - **Minimum age:** <value>
       - **Security deposit:** <value> MAD
       - **Phone:** <value>
       - **Email:** <value>
       Optionally close with one short line inviting them to book or reach out.

    ### AGENCY DETAILS (ground truth — use these exact values, never placeholders)
    - Name: ${agency.name}
    - Location: ${agency.address || 'Morocco'}
    - About: ${aboutInfo}
    - Minimum Driver Age: ${agency.minAge} years
    - Security Deposit: ${agency.depositAmount} MAD
    - Rental Conditions: ${agency.rentalConditions || 'Standard local rental policies apply.'}
    - Contact details:
    ${contactInfo}

    ### CURRENT FLEET (internal reference only — never list as plain text; always use 'show_fleet')
    ${fleetInfo}`;

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
              description: 'Show the full list of cars with cards and images. Use when the user wants to rent but has NOT provided dates.',
              parameters: {
                type: 'object',
                properties: {}
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'show_available_fleet',
              description: 'Show ONLY the cars available for a given date range, as UI cards. Use when the user provides rental dates in their request (e.g. "a car from June 1 to June 5").',
              parameters: {
                type: 'object',
                properties: {
                  startDate: { type: 'string', description: 'YYYY-MM-DD (provided by the user)' },
                  endDate: { type: 'string', description: 'YYYY-MM-DD (provided by the user)' }
                },
                required: ['startDate', 'endDate']
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
          },
          {
            type: 'function',
            function: {
              name: 'prepare_quote',
              description: 'Generate a printable price quote (devis) for a specific car and date range, shown to the user as a button to view/download. Call ONLY when the user explicitly asks for a quote/devis/estimate.',
              parameters: {
                type: 'object',
                properties: {
                  vehicleId: { type: 'string' },
                  startDate: { type: 'string', description: 'YYYY-MM-DD' },
                  endDate: { type: 'string', description: 'YYYY-MM-DD' }
                },
                required: ['vehicleId', 'startDate', 'endDate']
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

          if (toolCall.function.name === 'show_available_fleet') {
            const start = new Date(args.startDate);
            const end = new Date(args.endDate);
            const checked = await Promise.all(
              agency.vehicles.map(async (v: any) =>
                (await this.bookingService.isVehicleAvailable(v.id, start, end)) ? v : null
              )
            );
            const available = checked.filter(Boolean);
            return {
              answer: available.length
                ? `Here are the cars available from ${args.startDate} to ${args.endDate}. Click one to select it!`
                : `Unfortunately, no cars are available from ${args.startDate} to ${args.endDate}. Would you like to try different dates?`,
              timestamp: new Date().toISOString(),
              fleetData: available,
              quoteDates: { start: args.startDate, end: args.endDate }
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

          if (toolCall.function.name === 'prepare_quote') {
              const vehicle = agency.vehicles.find((v: any) => v.id === args.vehicleId);
              if (!vehicle) {
                  return { answer: 'I could not find that vehicle to prepare a quote.', timestamp: new Date().toISOString() };
              }
              const start = new Date(args.startDate);
              const end = new Date(args.endDate);
              const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1);
              const total = diffDays * vehicle.pricePerDay;
              return {
                  answer: `Here is your quote (devis) for the ${vehicle.make} ${vehicle.model} — ${diffDays} day(s), total ${total} MAD. Tap below to view or download it.`,
                  timestamp: new Date().toISOString(),
                  quoteData: {
                      vehicleDetails: vehicle,
                      startDate: args.startDate,
                      endDate: args.endDate,
                      days: diffDays,
                      total,
                      deposit: agency.depositAmount
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
