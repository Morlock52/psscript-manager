# Use Node.js LTS as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for production
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript code
RUN npm install --only=development
RUN npm run build

# Create directories for uploads and logs
RUN mkdir -p uploads logs

# Expose the port the app runs on
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/index.js"]
