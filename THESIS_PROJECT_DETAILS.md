# Master's Thesis Project Documentation: LuxDrive AI Car Rental

## 1. Project Overview & Goals
**Project Name:** LuxDrive (AI-Powered Car Rental Platform)
**Primary Goal:** To revolutionize the traditional car rental experience by integrating Advanced Artificial Intelligence to automate customer service, fleet exploration, and the booking process.
**Target Audience:** Car rental agencies (B2B) and their customers (B2C).
**Key Innovation:** A multi-tenant platform where each agency gets a customized, AI-driven landing page capable of handling voice/text inquiries and autonomous booking placement.

---

## 2. System Architecture
The application follows a modern **Decoupled Client-Server Architecture**:

### **A. Frontend (Client-Side)**
- **Framework:** Next.js 15+ (React-based) using the **App Router**.
- **State Management:** React Hooks (`useState`, `useEffect`, `useRef`).
- **Styling:** Custom CSS with a focus on **Glassmorphism** and a dark, futuristic aesthetic.
- **Iconography:** Lucide-React.
- **Multi-Tenancy:** Dynamic routing using `[slug]` to generate unique pages for different agencies (e.g., `/agency/agenceamine`).

### **B. Backend (Server-Side)**
- **Framework:** NestJS (Node.js framework for scalable server-side apps).
- **Language:** TypeScript.
- **ORM:** Prisma (Object-Relational Mapping) for type-safe database interactions.
- **Security:** JWT (JSON Web Tokens) for authentication and Role-Based Access Control (RBAC).

### **C. Database**
- **Type:** PostgreSQL.
- **Hosting:** Neon (Serverless Postgres) with connection pooling for high performance.

### **D. AI Integration Layer**
- **Provider:** OpenAI API.
- **Models Used:**
  - `gpt-3.5-turbo`: Core conversational engine and decision-making.
  - `whisper-1`: Speech-to-Text (STT) for voice message transcription.
  - `tts-1`: Text-to-Speech (TTS) with the `shimmer` female voice for response reading.

---

## 3. Detailed Technology Stack
| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js, React | User Interface and Client-side logic |
| **Backend** | NestJS | API endpoints, business logic, and security |
| **Database** | PostgreSQL, Prisma | Persistent data storage and relational management |
| **AI** | OpenAI SDK | Powering the Chatbot, STT, and TTS |
| **Storage** | Local FS (DiskStorage) | Storing vehicle images, agency banners, and logos |
| **Authentication** | Passport.js, JWT | Secure login for Admins and Agency owners |
| **Communication** | Fetch API | HTTP communication between Client and Server |

---

## 4. Key Features & Functionality

### **A. Agency Management (B2B)**
- **Dashboard:** A comprehensive management panel for agency owners.
- **Fleet Management:** CRUD operations for vehicles (Add, Edit, Delete).
- **Branding Customization:** Ability to upload custom **Banners** and **Logos**, and set a **Primary Brand Color** that updates the UI dynamically.
- **Booking Management:** Interface to view, confirm, or cancel incoming booking requests.

### **B. AI Chatbot Widget (The Core Innovation)**
- **Autonomous Booking:** The agent follows a strict protocol to collect Car choice, Dates, and User info (Name, Email, Phone) one-by-one.
- **Interactive UI:** Instead of plain text, the AI uses **Tool Calling** to display visual **Car Cards** that users can click to select.
- **Real-time Availability:** The AI calls a `check_availability` tool to query the database before promising a rental.
- **Context Awareness:** The system injects the current date and day into the prompt to handle relative time requests (e.g., "next week").

### **C. Voice Integration**
- **Speech-to-Text:** Users can record voice messages; the system transcribes them using Whisper.
- **Text-to-Speech:** A manual "Read Aloud" feature allows users to hear the agent's responses in a clear, female voice at 1.15x speed.

---

## 5. Database Schema (Prisma Models)
- **User:** Manages credentials and roles (ADMIN, AGENCY).
- **Agency:** Stores profile data, branding assets (banner/logo), and contact info.
- **Vehicle:** Contains technical specs, pricing, category, and status (AVAILABLE, RENTED, MAINTENANCE).
- **Customer:** Stores details of users who have made bookings.
- **Booking:** Relational table linking Customers, Vehicles, and Agencies with status tracking (PENDING, CONFIRMED, CANCELLED).

---

## 6. AI Theory & Prompt Engineering
The application leverages **Instruction-based Prompting** and **Function Calling (Tools)**:
- **System Prompting:** A highly detailed set of instructions that defines the AI's persona (Moroccan hospitality), strict booking sequence, and "ground truth" data (fleet info).
- **Tool Calling Logic:** The AI doesn't just talk; it performs actions. It decides when to "Show Fleet," "Check Database," or "Prepare Summary" based on user intent.
- **Hallucination Prevention:** Strict rules prevent the AI from assuming dates or availability, forcing it to rely on user input and database tool results.

---

## 7. Thesis Potential Research Topics
1. **Automation of the Rental Funnel:** How LLMs reduce friction in B2C service industries.
2. **Multi-Tenant AI Architectures:** Scalability of personalized AI agents for small businesses.
3. **Multimodal Interaction in Chatbots:** The impact of combining visual cards, voice, and text on user conversion rates.
4. **Reliability in Conversational Commerce:** Strategies for preventing LLM hallucinations in transactional workflows.
