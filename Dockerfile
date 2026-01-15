FROM node:18-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY apps ./apps
COPY src ./src

RUN npm run build

CMD ["node", "dist/apps/api/main.js"]
