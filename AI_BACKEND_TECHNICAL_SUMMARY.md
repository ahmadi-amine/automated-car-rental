# LuxDrive AI ReAct Loop & Function Calling Technical Summary
## NestJS Backend Implementation Details

---

## 1. LLM Tools Registration
The AiService (`backend/src/ai/ai.service.ts`) registers **three custom tools/functions** with OpenAI's GPT-3.5-turbo:

### 1.1 `show_fleet`
- **Description**: Show the list of available cars with cards and images
- **Parameters**: `{}` (no input arguments required)
- **Purpose**: Triggered by the AI to fetch and display visual vehicle listings instead of plain text

### 1.2 `check_availability`
- **Description**: Check if a specific car is available. ONLY call this after the user explicitly types their dates.
- **Required Parameters**:
  - `vehicleId`: UUID string of the vehicle
  - `startDate`: YYYY-MM-DD string
  - `endDate`: YYYY-MM-DD string
- **Purpose**: Database query for conflicting bookings

### 1.3 `prepare_booking`
- **Description**: Call this ONLY after user has explicitly provided all 7 required fields.
- **Required Parameters**:
  - `vehicleId`, `startDate`, `endDate`
  - `firstName`, `lastName`, `email`, `phone`
- **Purpose**: Prepare the UI summary card for user confirmation

---

## 2. High-Level Processing Workflow (ReAct Loop)
The core method is `AiService.ask()`:

1.  **Context Bootstrapping**:
    - Fetch Agency + Fleet data using Prisma
    - Inject today's date and agency policies into the system prompt
    - Clean history to only `role` and `content` to avoid API errors

2.  **First LLM Call**:
    - Send messages including user input, history, and system prompt
    - Provide the registered tools array with tool definitions
    - Use `tool_choice: 'auto'` to let GPT decide whether to use a tool or just respond with text

3.  **Tool Call Handling (JSON Output Parsing)**:
    - Check `response.choices[0].message.tool_calls`
    - If tools are present: parse the `toolCall.function.arguments` as JSON
    - Execute the corresponding backend logic based on `toolCall.function.name`

---

## 3. Prisma Query Execution Logic

### 3.1 Handling `check_availability`
When the LLM calls `check_availability`:
1.  The service invokes `BookingService.isVehicleAvailable()`
2.  **Prisma Database Query Steps**:
    a. Verify the vehicle exists and is not in `MAINTENANCE` or `UNAVAILABLE` status
    b. Query for **overlapping bookings** using `findFirst` with a logical `AND` condition:
        - `startDate < endDate` and `endDate > startDate` (standard date overlap algorithm)
        - Only checks bookings in `PENDING` or `CONFIRMED` status
    c. Returns boolean (`true` = available, `false` = booked)
3.  **Second LLM Call**: The availability boolean is sent back to the model in a `tool` role message to generate a natural language response

### 3.2 Handling `prepare_booking`
When the LLM calls `prepare_booking`:
1.  It does **NOT** call Prisma to create a booking yet
2.  It locates the full vehicle details from the pre-fetched agency data
3.  It returns all booking parameters + vehicle data to the frontend for user confirmation (the actual booking creation happens later via the dedicated Booking API when the user clicks "Confirm")

### 3.3 Handling `show_fleet`
When the LLM calls `show_fleet`:
1.  No Prisma query needed because fleet was already fetched during context bootstrapping
2.  Returns the cached `agency.vehicles` array directly to the frontend for card rendering

---

## 4. Key Architectural Choices
- **Dynamic System Prompt**: Every chat request has a fresh prompt with current time and agency-specific data
- **Single Tool Chain**: ReAct loop is limited to one tool call per interaction (picks first tool and processes it)
- **Prisma Service Injection**: AiService uses Dependency Injection to access Prisma and BookingService for clean separation of concerns
- **Error Handling**: Wrapped in try/catch blocks that log errors and throw NestJS HTTP exceptions
