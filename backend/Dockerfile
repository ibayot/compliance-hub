# -------------------------------------
# 1. Base stage
# -------------------------------------
FROM node:20-alpine AS base

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./

# -------------------------------------
# 2. Dependencies stage
# -------------------------------------
FROM base AS deps
RUN npm ci

# -------------------------------------
# 3. Builder stage
# -------------------------------------
FROM deps AS builder
COPY . .
RUN npm run build

# -------------------------------------
# 4. Production stage
# -------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package info
COPY --from=base /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/dist ./dist

# The default command runs the gateway, but docker-compose will override this
# for users-service, ticketing-service, and compliance-service
CMD ["node", "dist/apps/gateway.main.js"]
