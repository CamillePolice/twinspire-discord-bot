# Use Node.js 22 Alpine as base image
FROM node:22-alpine

# Install system dependencies including bash for Docker-in-Docker feature
RUN apk add --no-cache \
    git \
    openssh \
    bash \
    curl \
    wget \
    docker \
    docker-cli-compose

# Set the working directory
WORKDIR /workspaces/discord-bot

# The rest of the setup will be handled by the devcontainer configuration
# No need to copy files or install dependencies here as they will be mounted

# Expose port for potential API endpoints
EXPOSE 3000

# Set default command
CMD ["yarn", "dev"]