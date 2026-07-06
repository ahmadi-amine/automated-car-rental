# LuxDrive Frontend Architecture & Tenant Branding System

## 1. Dynamic Routing for Agencies (Tenant Isolation)
The application uses Next.js App Router with **dynamic route parameters** to serve unique landing pages for each agency:
- **Route Location**: `frontend/src/app/agency/[slug]/page.tsx`
- **Slug Extraction**: The `useParams()` hook retrieves the `slug` from the URL path (e.g., for `https://example.com/agency/agenceamine`, slug = `agenceamine`)
- **Route Responsibility**: This dynamic route acts as the tenant-specific entry point, holding all agency-specific content including fleet, contact info, and the conversational chatbot

## 2. Tenant Data Fetching & State Initialization
### 2.1 Data Flow on Page Load
When a user navigates to an agency URL (`/agency/[slug]`):
1. The `slug` parameter is extracted via `useParams()`
2. **`useEffect` Hook** triggers `fetchAgency()` function asynchronously
3. **Fetch Request**: Sends a GET request to `http://localhost:3001/api/agency/public/${slug}`
4. **State Management**: If successful, the agency data (including fleet, branding, policies, etc.) is stored in React `useState`
5. **Loading State**: A centered loader UI is shown while data is being fetched

### 2.2 Agency Data Payload
The fetched agency object contains:
- `id`, `name`, `slug`, `description`, `bio`
- **Branding**: `logoUrl`, `bannerUrl`, `primaryColor` (default: `#3b82f6`)
- **Policies**: `minAge`, `depositAmount`, `rentalConditions`
- **Contact**: `phone`, `address`, `publicEmail`
- **Fleet**: `vehicles` array

## 3. Branding Application Pipeline
### 3.1 Primary Color Extraction
- Line 121: `const primaryColor = agency.primaryColor || '#3b82f6'`
- Uses the agency-specific color if defined, otherwise falls back to the default blue

### 3.2 Banner & Logo Rendering
The agency's visual identity is rendered at the top of the landing page (lines 126‑153):
- **Banner**: 
  - If `agency.bannerUrl` exists: Shows a full-width cover image
  - If no banner: Shows a gradient fallback using `primaryColor`
- **Logo**: 
  - Floating 120x120px circle avatar at bottom center of the banner
  - If `agency.logoUrl` exists: Displays the image
  - If no logo: Shows a `<Car />` icon using the `primaryColor`

## 4. Chatbot Widget Mounting & Branding Injection
After the agency data is fully loaded and rendered (lines 431‑435):
```tsx
<ChatbotWidget 
    agencySlug={slug as string} 
    primaryColor={primaryColor} 
    agencyName={agency.name} 
/>
```

### 4.1 Props Received by `ChatbotWidget`
- `agencySlug`: Identifies which tenant/agency the chatbot is serving
- `primaryColor`: The tenant-specific brand color
- `agencyName`: The agency's business name for personalization

### 4.2 Branding Application in Chatbot
The `primaryColor` is used in numerous places in `ChatbotWidget.tsx` to ensure consistent theming:
- **Chat Bubble (User)**: Background color of user messages
- **Floating Action Button (Open Chat)**: Background of the fixed bottom-right icon
- **Chat Header**: Gradient background for the widget header
- **Bot Icons**: Color of the `<Bot />` icon
- **Prices**: Text color for car pricing
- **Confirm Button**: Background of the "Confirm Booking" button
- **Button Hover Effects**: Border and background transitions

### 4.3 Chat History Persistence
- The widget uses `localStorage` with a tenant‑specific key: `chat_history_${agencySlug}`
- Ensures chat history is isolated per agency (user doesn't see conversations from one agency when visiting another)

## 5. Overall Architecture Flow Summary
1. **URL → Slug**: `/agency/agenceamine` → `slug = agenceamine`
2. **Slug → API Request**: Fetch tenant data from backend
3. **API Response → UI State**: Store agency data in React state
4. **UI State → Branding**: Apply `primaryColor`, `bannerUrl`, `logoUrl`
5. **State → Widget Props**: Pass branding data down to `ChatbotWidget`
6. **Widget → Chat Logic**: Use tenant slug for AI API calls
