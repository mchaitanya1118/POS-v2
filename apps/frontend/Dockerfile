FROM node:20-alpine AS builder
WORKDIR /app

# Copy root and workspaces package.json files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy project files needed for Next.js build
COPY tsconfig.json ./
COPY apps/frontend ./apps/frontend

# Build-time environment variables required for Next.js static embedding
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Build the Next.js application
RUN npm run build -w frontend

# Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy Next.js standalone folder output
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

EXPOSE 3000

# Next.js standalone runs server.js inside the app workspace directory
CMD ["node", "apps/frontend/server.js"]
