# Use Node.js 18 as base image (more stable for production)
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    openssh \
    bash \
    curl \
    wget

# Set working directory
WORKDIR /workspaces/discord-bot

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose port for potential API endpoints
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "dev"]