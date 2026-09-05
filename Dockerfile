FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY prisma ./prisma/

RUN npm install
RUN npm --prefix backend install

# Copy source
COPY . .

# Generate Prisma and compile TypeScript
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm --prefix backend run build

# Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/Frontend ./Frontend

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && npx tsx prisma/seed.ts && node backend/dist/server.js"]
