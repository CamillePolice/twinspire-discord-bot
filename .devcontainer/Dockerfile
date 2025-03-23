# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    openssh \
    bash \
    curl \
    wget

# Set the working directory
WORKDIR /workspaces/discord-bot

# Install global packages directly with npm
RUN npm install -g typescript ts-node

# The rest of the setup will be handled by the devcontainer configuration
# No need to copy files or install dependencies here as they will be mounted

# Expose port for potential API endpoints
EXPOSE 3000

# Set default command
CMD ["yarn", "dev"]