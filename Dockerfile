# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Runtime stage (smaller final image)
FROM node:20-alpine

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY package.json package-lock.json ./
COPY src ./src

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port (Azure will use this)
EXPOSE 3001

# Run application
CMD ["node", "src/app.js"]