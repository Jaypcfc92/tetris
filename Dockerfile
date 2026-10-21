# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Imagen de producción para NEON TETRIS (Next.js standalone-less build)
# Etapas: deps -> builder -> runner (multi-stage, imagen final pequeña)
# ---------------------------------------------------------------------------

FROM node:22-alpine AS deps
WORKDIR /app
# Solo los manifiestos primero: la capa de dependencias se cachea mientras
# el código fuente cambie.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Compila el bundle de producción (equivale a `npm run build`).
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios para la ejecución del servidor.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json ./package-lock.json

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
