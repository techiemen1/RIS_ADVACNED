# RIS-ADVANCED Backend Dockerfile
FROM node:18-alpine

# Security: Run as non-privileged user
RUN addgroup -S risgroup && adduser -S risuser -G risgroup

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --production

# Copy application data
COPY . .

# Set permissions
RUN chown -R risuser:risgroup /app
USER risuser

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); })"

CMD ["node", "server.js"]
