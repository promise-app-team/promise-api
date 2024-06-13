FROM node:20-alpine AS base

FROM base AS install
WORKDIR /app

COPY package* prisma ./
RUN npm ci && npx prisma generate

COPY . .
RUN . ./patch.sh && npm run build
