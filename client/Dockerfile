FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_APP_DESCRIPTION
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG API_INTERNAL_BASE_URL
ARG NEXTAUTH_SECRET
ARG AUTH_SECRET

ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_DESCRIPTION=$NEXT_PUBLIC_APP_DESCRIPTION
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV API_INTERNAL_BASE_URL=$API_INTERNAL_BASE_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV AUTH_SECRET=$AUTH_SECRET

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN node -e "for (const name of ['NEXTAUTH_URL','NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_API_BASE_URL','API_INTERNAL_BASE_URL']) { const value = process.env[name]; if (!value) throw new Error(name + ' is required'); try { new URL(value); } catch { throw new Error(name + ' must be a valid URL'); } }"
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

USER node

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0"]
