# Pricing Agent Architecture Summary

## Vector Search
The retrieval layer uses a direct pgvector cosine-distance query through Prisma's unsafe raw SQL API:

```ts
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
```

- The `<=>` operator is the pgvector cosine-distance operator.
- The query projects a derived similarity score as `1 - (embedding <=> $1::vector) AS similarity`.
- The caller requests the top **3** matches via `this.findClosestMarketPricing(vehicle, location, 3)`.

## Contextual Prompt
The final prompt is built as a structured JSON-only instruction block:

```ts
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
```

Each retrieved record is injected as a numbered line in `marketGroundTruth`:

```ts
const marketGroundTruth = matches.length > 0
  ? matches
      .map((match, index) => `${index + 1}. ${match.make} ${match.model} (${match.year}) - ${match.category} - ${match.location} - Actual Price: ${match.actualPriceMad} MAD - Similarity: ${Number(match.similarity).toFixed(4)}`)
      .join('\n')
  : 'No historical market matches were found.';
```

## Embedding Logic
The query embedding is generated from a compact concatenation of vehicle attributes and location:

```ts
const queryText = `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.category} ${location}`;
const queryEmbedding = await this.generateEmbedding(queryText);
```

The embedding model is `text-embedding-3-small`.

## Error Resilience
The current implementation is fail-fast rather than fallback-based:

- Embedding generation failures bubble up from `generateEmbedding(...)`.
- Vector search failures bubble up from `findClosestMarketPricing(...)`.
- Chat completion failures bubble up from `this.openai.chat.completions.create(...)`.
- `suggestPrice(...)` catches all failures and returns an HTTP 500:

```ts
throw new InternalServerErrorException('AI Pricing Agent failed to generate a suggestion.');
```

There is no deterministic local fallback price, cache, or heuristic backup path in the current code.

## Data Model Support
The vector-backed market pricing table is defined in Prisma and the database migration:

- `MarketPricingData` stores `make`, `model`, `year`, `category`, `location`, `actualPriceMad`, and `embedding`.
- The migration enables the `vector` extension and creates the `embedding` column as `vector`.

## Relevant References
- [ai.service.ts](file:///c:/Users/amine/Desktop/Liadtech/personel%20project/Ai%20Car%20Rental/backend/src/ai/ai.service.ts#L125-L214)
- [vehicle.service.ts](file:///c:/Users/amine/Desktop/Liadtech/personel%20project/Ai%20Car%20Rental/backend/src/vehicle/vehicle.service.ts#L139-L169)
- [schema.prisma](file:///c:/Users/amine/Desktop/Liadtech/personel%20project/Ai%20Car%20Rental/backend/prisma/schema.prisma#L73-L121)
- [seed-market-pricing.ts](file:///c:/Users/amine/Desktop/Liadtech/personel%20project/Ai%20Car%20Rental/backend/seed-market-pricing.ts#L20-L137)
