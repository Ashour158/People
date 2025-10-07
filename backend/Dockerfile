# Backend Dockerfile
FROM node:18-alpine AS backend-builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY backend/package*.json ./

EXPOSE 5000

CMD ["node", "dist/server.js"]
