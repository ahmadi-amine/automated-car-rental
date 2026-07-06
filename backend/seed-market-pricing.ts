import 'dotenv/config';
import OpenAI from 'openai';
import { Category, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return new PrismaClient();
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

async function generateEmbedding(openai: OpenAI, text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

type MarketSeedItem = {
  make: string;
  model: string;
  year: number;
  category: Category;
  location: string;
  actualPriceMad: number;
};

function generateMarketData(count: number) {
  const locations = ['Casablanca', 'Marrakech', 'Rabat', 'Tangier', 'Agadir', 'Fes'];

  const fleetMatrix: Array<{ make: string; model: string; category: Category; min: number; max: number }> = [
    { make: 'Dacia', model: 'Logan', category: 'ECONOMY', min: 200, max: 280 },
    { make: 'Renault', model: 'Clio', category: 'ECONOMY', min: 220, max: 320 },
    { make: 'Peugeot', model: '208', category: 'ECONOMY', min: 250, max: 350 },
    { make: 'Hyundai', model: 'i10', category: 'ECONOMY', min: 200, max: 270 },
    { make: 'Skoda', model: 'Octavia', category: 'SEDAN', min: 400, max: 600 },
    { make: 'Volkswagen', model: 'Passat', category: 'SEDAN', min: 500, max: 700 },
    { make: 'Toyota', model: 'Corolla', category: 'SEDAN', min: 350, max: 550 },
    { make: 'Dacia', model: 'Duster', category: 'SUV', min: 350, max: 450 },
    { make: 'Hyundai', model: 'Tucson', category: 'SUV', min: 600, max: 800 },
    { make: 'Volkswagen', model: 'Tiguan', category: 'SUV', min: 700, max: 900 },
    { make: 'Jeep', model: 'Grand Cherokee', category: 'LUXURY', min: 1000, max: 1500 },
    { make: 'Range Rover', model: 'Evoque', category: 'LUXURY', min: 1200, max: 2000 },
    { make: 'Mercedes-Benz', model: 'C-Class', category: 'LUXURY', min: 1500, max: 2500 }
  ];

  const generatedData: MarketSeedItem[] = [];

  for (let i = 0; i < count; i++) {
    const car = fleetMatrix[Math.floor(Math.random() * fleetMatrix.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const currentYear = new Date().getFullYear();
    const year = Math.floor(Math.random() * (currentYear - 2020 + 1)) + 2020;

    const basePrice = Math.floor(Math.random() * (car.max - car.min + 1)) + car.min;
    const ageDepreciation = (currentYear - year) * 15;
    const finalPrice = Math.max(car.min, basePrice - ageDepreciation);

    generatedData.push({
      make: car.make,
      model: car.model,
      year: year,
      category: car.category,
      location: location,
      actualPriceMad: finalPrice,
    });
  }

  return generatedData;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing.');
  }

  const openai = new OpenAI({ apiKey });
  const prisma = createPrismaClient();

  console.log('Generating 120 synthetic market records...');
  const sampleData = generateMarketData(120);

  try {
    await prisma.$connect();
    console.log('Connected to the database. Beginning embedding and insertion process...');

    for (let i = 0; i < sampleData.length; i++) {
      const item = sampleData[i];

      const embeddingText = `${item.make} ${item.model} ${item.year} ${item.category} ${item.location}`;
      const embedding = await generateEmbedding(openai, embeddingText);
      const vectorLiteral = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "MarketPricingData" (
          "id", "make", "model", "year", "category", "location", "actualPriceMad", "embedding", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5::"Category", $6, $7, $8::vector, NOW(), NOW()
        )`,
        randomUUID(),
        item.make,
        item.model,
        item.year,
        item.category,
        item.location,
        item.actualPriceMad,
        vectorLiteral,
      );
      if ((i + 1) % 20 === 0) {
        console.log(`Inserted ${i + 1}/${sampleData.length} records...`);
      }
    }

    console.log(`✅ Market pricing seed complete: successfully inserted ${sampleData.length} embedded records.`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Market pricing seed failed:', error);
    process.exitCode = 1;
  });
