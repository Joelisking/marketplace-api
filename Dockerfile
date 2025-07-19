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
RUN pnpm prisma generate

# Build TypeScript
RUN pnpm build

# Expose the port your app runs on
EXPOSE 4000

# Start the app
CMD ["pnpm", "dev"]