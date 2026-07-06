
# LuxDrive: AI-Powered Multi-Tenant Car Rental Platform
## Technical Report for Master's Thesis in Data Science and Intelligent Systems

---

## Table of Contents
1. [Global Architecture &amp; Multi-Tenancy Logic](#1-global-architecture--multi-tenancy-logic)
2. [The Multi-Agent AI System](#2-the-multi-agent-ai-system)
3. [Tool Calling &amp; Deterministic Execution](#3-tool-calling--deterministic-execution)
4. [Multimodal Audio Pipeline](#4-multimodal-audio-pipeline)
5. [Database Schema &amp; State Machines](#5-database-schema--state-machines)

---

---

## 1. Global Architecture &amp; Multi-Tenancy Logic

### 1.1 Frontend Architecture
- **Framework**: Next.js 14 with React 18
- **Routing**: Next.js App Router with dynamic slug-based routes (`/app/agency/[slug]/page.tsx`)
- **State Management**: React hooks (`useState`, `useEffect`, `useRef`) for local state, `localStorage` for persistent chat history
- **Styling**: Custom CSS with inline styles + utility CSS classes like `glass`, `input`, `statusTag`
- **Key Frontend Files**:
  - `agency/[slug]/page.tsx`: Public-facing agency landing page
  - `AgencyDashboard.tsx`: Admin dashboard for agencies
  - `ChatbotWidget.tsx`: Embedded AI chat widget
  - `AdminDashboard.tsx`: Super admin dashboard

### 1.2 Backend Architecture
- **Framework**: NestJS 10 with TypeScript
- **Database ORM**: Prisma Client with PostgreSQL
- **Database**: PostgreSQL (hosted on Neon.tech)
- **File Uploads**: Express `multer` middleware
- **Key Backend Modules**:
  - `app.module.ts`: Root module
  - `ai/`: AI services
  - `vehicle/`: Vehicle management
  - `booking/`: Booking management
  - `agency/`: Agency profile management
  - `auth/`: Authentication
  - `prisma/`: Prisma service

### 1.3 Multi-Tenancy Implementation
Multi-tenancy in LuxDrive is **agency-slug based**, with tenant isolation enforced at the data model and query level:

#### 1.3.1 Slug-Based Route &amp; Tenant Identification
- Frontend uses a dynamic `[slug]` URL parameter to identify the current agency
- Example routes:
  - `http://localhost:3000/agency/agence-amina` → Amina's agency
  - `http://localhost:3000/agency/rentacar-casablanca` → Another agency

#### 1.3.2 Data Isolation (Prisma Schema)
Every core business model includes an explicit `agencyId` relation field:
```prisma
model Agency {
  id          String  @id @default(uuid())
  slug        String? @unique
  // ...
  vehicles    Vehicle[]
  bookings    Booking[]
}

model Vehicle {
  // ...
  agencyId String
  agency   Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)
}

model Booking {
  // ...
  agencyId String
  agency   Agency @relation(fields: [agencyId], references: [id])
}
```

#### 1.3.3 Query-Level Tenant Isolation
All NestJS services use `agencyId` or `userId` (which links to `Agency`) to scope queries, ensuring tenants cannot access each other's data:

Example from `vehicle.service.ts`:
```typescript
async findAll(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { agency: true },
  });
  // Only return vehicles belonging to this user's agency
  return this.prisma.vehicle.findMany({
    where: { agencyId: user.agency.id },
  });
}
```

#### 1.3.4 Branding Application Flow
The frontend fetches agency-specific branding dynamically:

1. **Slug Extraction**: `useParams()` from `next/navigation` retrieves the `slug`
2. **Branding Fetch**: `GET /api/agency/public/{slug}`
3. **Branding Application**:
   - `primaryColor`: Applied as a CSS variable to buttons, gradients, and text
   - `logoUrl`: Used for agency favicon/logo
   - `bannerUrl`: Used as the hero banner
   - Agency name, bio, policies: Displayed as content on the page

```tsx
// Example from [slug]/page.tsx
const primaryColor = agency.primaryColor || '#3b82f6';

return (
  &lt;div style={{ 
    background: agency.bannerUrl ? `url(${agency.bannerUrl}) center/cover` : `linear-gradient(135deg, ${primaryColor}dd 0%, #0a0b10 100%)`
  }}&gt;
    {/* ... */}
  &lt;/div&gt;
);
```

---

---

## 2. The Multi-Agent AI System

### 2.1 Agent 1: B2C Conversational Booking Agent
- **Entry Point**: Embedded in every agency landing page via `ChatbotWidget.tsx`
- **Backend Endpoint**: `POST /api/ai/chat/{slug}`
- **Technology Stack**: OpenAI GPT-3.5 Turbo + OpenAI Function Calling (tool-calling)

#### 2.1.1 System Prompt
The agent has an explicit, structured **mandatory booking protocol**:

```typescript
const systemPrompt = `
You are the AI Assistant for ${agency.name}, a car rental agency.
Today's Date is: ${today}.

MANDATORY BOOKING PROTOCOL (STRICT ORDER):
1. CAR SELECTION: If the user hasn't picked a car, call show_fleet.
2. ASK FOR DATES (MANDATORY): As soon as a car is chosen, your ONLY NEXT MESSAGE must be: "What dates would you like to rent the [Car Name] for?"
   WARNING: You are FORBIDDEN from mentioning availability until AFTER the user replies with specific dates.
3. AVAILABILITY CHECK: Only call check_availability AFTER the user types specific dates.
4. USER DETAILS: Once confirmed, ask for First Name, Last Name, Email, Phone (ONE-BY-ONE).
5. SUMMARY: Call prepare_booking only after Step 4 is complete.

Current Fleet:
${fleetInfo}

Agency Policies:
- Minimum Age: ${agency.minAge} years
- Security Deposit: ${agency.depositAmount} MAD
- Rental Conditions: ${agency.rentalConditions}
`;
```

#### 2.1.2 Chat History &amp; Session Context
- **Frontend Storage**: Chat history is persisted per-agency using `localStorage` with the key `chat_history_${agencySlug}`
- **History Management**: Only `role` and `content` fields are sent to OpenAI to avoid errors; frontend-specific fields (`bookingData`, `fleetData`, etc.) are stripped before API call

```typescript
// From frontend ChatbotWidget.tsx
const storageKey = `chat_history_${agencySlug}`;
useEffect(() => {
  const savedHistory = localStorage.getItem(storageKey);
  if (savedHistory) {
    try { setMessages(JSON.parse(savedHistory)); } 
    catch (e) { console.error("Failed to parse chat history", e); }
  }
}, [agencySlug]);

// Before sending to backend
const cleanHistory = updatedHistory.slice(0, -1).map(m => ({ 
  role: m.role, 
  content: m.content 
}));
```

### 2.2 Agent 2: B2B Pricing Estimation Agent
- **Trigger**: From the agency dashboard's vehicle management section
- **Parameters**: Vehicle details (`make`, `model`, `year`, `category`) + optional `location` (default: Casablanca, Morocco)
- **Output**: JSON with `suggestedPrice` (MAD), `currency: "MAD"`, and `reasoning`
- **System Prompt**:
  ```typescript
  You are a professional car rental pricing expert in Morocco.
  Format: Provide a JSON response only.
  ```

---

---

## 3. Tool Calling &amp; Deterministic Execution

### 3.1 Registered Tools
The conversational booking agent has three (3) custom tools registered via OpenAI's Function Calling API:

#### Tool 1: `show_fleet`
- **Description**: Show the list of available cars with cards and images
- **Parameters**: Empty object (`{}`)
- **JSON Schema**:
  ```json
  {
    "name": "show_fleet",
    "description": "Show the list of available cars with cards and images",
    "parameters": { "type": "object", "properties": {} }
  }
  ```
- **Execution Logic**: Returns `agency.vehicles` array directly from Prisma
- **Output Sent to Model**: None; response structured for frontend display

#### Tool 2: `check_availability`
- **Description**: Check if a specific car is available. Only call after the user explicitly types dates.
- **JSON Schema**:
  ```json
  {
    "name": "check_availability",
    "parameters": {
      "type": "object",
      "properties": {
        "vehicleId": { "type": "string", "description": "The UUID of the vehicle" },
        "startDate": { "type": "string", "description": "YYYY-MM-DD format" },
        "endDate": { "type": "string", "description": "YYYY-MM-DD format" }
      },
      "required": ["vehicleId", "startDate", "endDate"]
    }
  }
  ```
- **Execution Logic**:
  1. Parse dates from string to `Date` objects
  2. Call `bookingService.isVehicleAvailable()`
  3. Send `{ "available": boolean }` back to OpenAI as a tool response

#### Tool 3: `prepare_booking`
- **Description**: Call only after all required fields are collected
- **Required Fields**: `vehicleId`, `startDate`, `endDate`, `firstName`, `lastName`, `email`, `phone`
- **JSON Schema**:
  ```json
  {
    "name": "prepare_booking",
    "parameters": {
      "type": "object",
      "properties": {
        "vehicleId": { "type": "string" },
        "startDate": { "type": "string" },
        "endDate": { "type": "string" },
        "firstName": { "type": "string" },
        "lastName": { "type": "string" },
        "email": { "type": "string" },
        "phone": { "type": "string" }
      },
      "required": ["vehicleId", "startDate", "endDate", "firstName", "lastName", "email", "phone"]
    }
  }
  ```
- **Execution Logic**: Find the vehicle object by ID and inject into the response as `bookingData.vehicleDetails`

### 3.2 Tool Execution Loop
The execution flow is implemented in `ai.service.ts` → `async ask()`:

```
1. User sends message
   ↓
2. Retrieve agency data + fleet
   ↓
3. Build system prompt
   ↓
4. Call OpenAI chat.completions.create
   ↓
5. Check if response has tool_calls
   ↓
6. Handle tool_calls
   - show_fleet → return fleetData
   - check_availability → run Prisma query, send tool response to GPT again, then return final answer
   - prepare_booking → return bookingData
   ↓
7. Return final response to frontend
```

### 3.3 `isVehicleAvailable` Implementation
The availability check ensures a vehicle is not double-booked:

```typescript
// From booking.service.ts
async isVehicleAvailable(vehicleId: string, startDate: Date, endDate: Date): Promise&lt;boolean&gt; {
  const overlappingBooking = await this.prisma.booking.findFirst({
    where: {
      vehicleId,
      status: { in: ['PENDING', 'CONFIRMED'] }, // Only consider active bookings
      AND: [
        { startDate: { lt: endDate } },  // Existing start &lt; new end
        { endDate: { gt: startDate } }   // Existing end &gt; new start
      ]
    },
  });
  return !overlappingBooking;
}
```

---

---

## 4. Multimodal Audio Pipeline

### 4.1 Speech-to-Text (STT) with OpenAI Whisper
**Flow**:
1. Frontend: Capture microphone input using `MediaRecorder`
2. Frontend: Record in WEBM format
3. Frontend: POST to `http://localhost:3001/api/ai/transcribe` as `FormData` with key `audio`
4. Backend: Save blob to temporary file
5. Backend: Call `openai.audio.transcriptions.create({ model: 'whisper-1', ... })`
6. Backend: Return transcription text

#### 4.1.1 Backend Transcribe Endpoint
```typescript
// ai.controller.ts
@Post('transcribe')
@UseInterceptors(FileInterceptor('audio'))
async transcribe(@UploadedFile() file: Express.Multer.File) {
  return this.aiService.transcribe(file);
}

// ai.service.ts
async transcribe(file: Express.Multer.File) {
  const tempPath = path.join(__dirname, `temp_${Date.now()}.webm`);
  fs.writeFileSync(tempPath, file.buffer);

  const transcription = await this.openai.audio.transcriptions.create({
    file: fs.createReadStream(tempPath),
    model: 'whisper-1',
  });

  fs.unlinkSync(tempPath); // Cleanup
  return { text: transcription.text };
}
```

#### 4.1.2 Frontend Recording
```typescript
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  mediaRecorderRef.current = mediaRecorder;
  audioChunksRef.current = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size &gt; 0) audioChunksRef.current.push(event.data);
  };
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    await handleVoiceUpload(audioBlob);
  };
  mediaRecorder.start();
  setIsRecording(true);
};
```

### 4.2 Text-to-Speech (TTS) with OpenAI TTS
**Voice**: `shimmer` (professional female voice)  
**Speed**: 1.15x  
**Format**: MP3

**Flow**:
1. Frontend: Click "Read aloud" button
2. Frontend: POST `{ "text": "..."}` to `http://localhost:3001/api/ai/synthesize`
3. Backend: Call `openai.audio.speech.create()`
4. Backend: Returns binary audio buffer with `Content-Type: audio/mpeg`
5. Frontend: Create blob URL and play via `new Audio()`

```typescript
async synthesize(text: string) {
  const mp3 = await this.openai.audio.speech.create({
    model: 'tts-1',
    voice: 'shimmer',
    input: text,
    speed: 1.15,
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  return buffer;
}
```

---

---

## 5. Database Schema &amp; State Machines

### 5.1 Core Prisma Models &amp; Relations

#### Model 1: User
```prisma
model User {
  id         String   @id @default(uuid())
  email      String   @unique
  password   String   // Hashed using bcrypt
  role       Role     @default(AGENCY) // Role.ADMIN, Role.AGENCY
  isApproved Boolean  @default(false)  // Admin approves new agencies
  createdAt  DateTime @default(now())
  agency     Agency?
}
```

#### Model 2: Agency (Tenant)
```prisma
model Agency {
  id               String   @id @default(uuid())
  name             String
  slug             String?  @unique // URL slug
  description      String?
  bio              String?
  logoUrl          String?
  bannerUrl        String?
  primaryColor     String?  @default("#3b82f6")
  minAge           Int      @default(21)
  depositAmount    Float    @default(0)
  rentalConditions String
  phone            String?
  address          String?
  publicEmail      String?
  // Relations
  userId           String    @unique
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicles         Vehicle[]
  bookings         Booking[]
}
```

#### Model 3: Vehicle
```prisma
model Vehicle {
  id                 String        @id @default(uuid())
  make               String
  model              String
  year               Int
  registrationNumber String        @unique
  pricePerDay        Float
  category           Category      @default(SEDAN) // ECONOMY, SUV, LUXURY, etc.
  features           String[]      @default([])
  imageUrl           String?
  // Relations
  agencyId           String
  agency             Agency        @relation(...)
  bookings           Booking[]
}
```

#### Model 4: Booking
```prisma
model Booking {
  id          String         @id @default(uuid())
  startDate   DateTime
  endDate     DateTime
  totalPrice  Float
  status      BookingStatus  @default(PENDING) // PENDING, CONFIRMED, CANCELLED, DRAFT
  // Relations
  customerId  String
  customer    Customer       @relation(...)
  vehicleId   String
  vehicle     Vehicle        @relation(...)
  agencyId    String
  agency      Agency         @relation(...)
}
```

#### Model 5: Customer
```prisma
model Customer {
  id            String    @id @default(uuid())
  firstName     String
  lastName      String
  email         String
  phone         String
  licenseNumber String?
  bookings      Booking[]
}
```

### 5.2 Booking State Machine (FSM)
The booking status is modeled as a finite state machine:

```
PENDING ← (initial state when created)
  ↓
[ Agency confirms ]
  ↓
CONFIRMED
  ↓
[ Agency cancels ]
  ↓
CANCELLED

Or: PENDING → CANCELLED (direct)
```

Transitions are handled in `booking.service.ts`:
```typescript
async updateStatus(bookingId: string, userId: string, status: BookingStatus) {
  // ...
  return this.prisma.booking.update({
    where: { id: bookingId },
    data: { status },
  });
}
```

### 5.3 Overlap Protection (Prisma Query)
The `isVehicleAvailable` query uses PostgreSQL range logic:
```typescript
where: {
  vehicleId,
  status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
  AND: [
    { startDate: { lt: endDate } },
    { endDate: { gt: startDate } }
  ]
}
```
This ensures no overlapping bookings.

---
---

## Appendices

### A: Full File List
- Frontend (Next.js):
  - `frontend/src/app/agency/[slug]/page.tsx`
  - `frontend/src/components/ChatbotWidget.tsx`
  - `frontend/src/components/AgencyDashboard.tsx`
- Backend (NestJS):
  - `backend/src/ai/ai.service.ts`
  - `backend/src/ai/ai.controller.ts`
  - `backend/src/booking/booking.service.ts`
  - `backend/src/vehicle/vehicle.service.ts`
  - `backend/prisma/schema.prisma`

### B: Environment Variables (Example)
```env
# .env
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
JWT_SECRET="your-super-secret-jwt-key"
```

