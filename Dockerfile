# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ZPS live deploy does not support Spine CLI conversion in-container.
# Keep the client and server paths aligned at build time.
ENV NEXT_PUBLIC_SPINE_CONVERT_ENABLED=false
ENV SPINE_CLI_PATH=

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_SPINE_CONVERT_ENABLED=false
ENV SPINE_CLI_PATH=

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/.env.local ./.env.local

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
