# Steg 1: Bygg React-frontenden
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm ci --quiet || npm install --quiet

WORKDIR /app
COPY client ./client

WORKDIR /app/client
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN V_VERSION=$(node -p "require('../package.json').version") && \
    echo "Bygger anna-lea.com version: ${V_VERSION}" && \
    VITE_APP_VERSION="${V_VERSION}" npm run build

# Steg 2: Produktion (Node/Express + optimerad sharp + byggd frontend)
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/

WORKDIR /app/server
RUN npm ci --omit=dev --quiet || npm install --omit=dev --quiet

WORKDIR /app
COPY server ./server
COPY --from=builder /app/client/dist ./server/public

RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3004
ENV UPLOAD_PATH=/app/uploads

EXPOSE 3004

WORKDIR /app/server
CMD ["node", "index.js"]
