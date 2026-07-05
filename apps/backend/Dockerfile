FROM node:20-alpine AS builder
WORKDIR /app

# Copy root and workspaces package.json files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy project files needed for NestJS build
COPY tsconfig.json ./
COPY apps/backend ./apps/backend

# Generate Prisma Client
RUN cd apps/backend && npx prisma generate

# Build the NestJS application
RUN npm run build -w backend

# Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy dist build and prisma files from builder
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

# Copy generated Prisma client from builder
COPY --from=builder /app/apps/backend/node_modules/.prisma ./apps/backend/node_modules/.prisma
COPY --from=builder /app/apps/backend/node_modules/@prisma/client ./apps/backend/node_modules/@prisma/client

EXPOSE 3001

# Run migrations and start NestJS
CMD cd apps/backend && npx prisma db push --accept-data-loss && node dist/main
