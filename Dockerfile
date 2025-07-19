# Use official Node.js LTS image
FROM node:22

# Set working directory
WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Copy the rest of the app
COPY . .

# Install PostgreSQL client for health checks
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Generate Prisma client with updated schema
RUN pnpm prisma generate

# Build TypeScript with updated configuration
RUN pnpm build

# Expose the port your app runs on
EXPOSE 4000

# Use the entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]