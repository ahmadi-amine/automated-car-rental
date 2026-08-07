# Frontend Dockerfile - Next.js
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# The public API URL is inlined by Next.js at BUILD time (NEXT_PUBLIC_*),
# so it must be provided as a build argument, not just a runtime env var.
# Point this at the deployed backend origin (e.g. https://api.example.com).
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build for production
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.* ./

# Expose the port Next.js runs on
EXPOSE 3000

# Command to run the app
CMD ["npm", "start"]
