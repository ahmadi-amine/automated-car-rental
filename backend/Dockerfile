# Backend Dockerfile - NestJS with Prisma
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy the rest of the code (excluding dist via .dockerignore)
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the app inside the container
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy necessary files from build stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# prisma.config.js (CommonJS) supplies the datasource URL for `migrate deploy`
COPY --from=builder /app/prisma.config.js ./
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create uploads directory (persistent via volume)
RUN mkdir -p /app/uploads

# Expose the port the app runs on
EXPOSE 3001

# Apply migrations, then start the server
CMD ["./docker-entrypoint.sh"]
