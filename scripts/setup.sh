#!/bin/bash

# Create MongoDB initialization script
cat > database/init/001-create-collections.js << 'EOF'
// Create collections with validation
db = db.getSiblingDB('twinspire');

// Create users collection
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['discordId', 'username', 'joinedAt', 'lastActive', 'experience', 'level'],
      properties: {
        discordId: {
          bsonType: 'string',
          description: 'Discord user ID'
        },
        username: {
          bsonType: 'string',
          description: 'Discord username'
        },
        joinedAt: {
          bsonType: 'date',
          description: 'When the user first joined'
        },
        lastActive: {
          bsonType: 'date',
          description: 'When the user was last active'
        },
        experience: {
          bsonType: 'int',
          minimum: 0,
          description: 'User experience points'
        },
        level: {
          bsonType: 'int',
          minimum: 1,
          description: 'User level'
        }
      }
    }
  }
});

// Create guild configs collection
db.createCollection('guildConfigs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'prefix', 'createdAt', 'updatedAt'],
      properties: {
        guildId: {
          bsonType: 'string',
          description: 'Discord guild/server ID'
        },
        prefix: {
          bsonType: 'string',
          description: 'Custom command prefix'
        },
        welcomeChannelId: {
          bsonType: ['string', 'null'],
          description: 'Welcome message channel ID'
        },
        logChannelId: {
          bsonType: ['string', 'null'],
          description: 'Logging channel ID'
        },
        moderationRoles: {
          bsonType: ['array', 'null'],
          description: 'Array of role IDs with moderation permissions',
          items: {
            bsonType: 'string'
          }
        },
        createdAt: {
          bsonType: 'date',
          description: 'When the config was created'
        },
        updatedAt: {
          bsonType: 'date',
          description: 'When the config was last updated'
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ "discordId": 1 }, { unique: true });
db.guildConfigs.createIndex({ "guildId": 1 }, { unique: true });

print("Database initialization completed successfully");
EOF

# Make the script executable
chmod +x database/init/001-create-collections.js

# Update .env file with MongoDB credentials if it exists
if [ -f .env ]; then
    # Check if MongoDB variables already exist
    if ! grep -q "MONGO_ROOT_USERNAME" .env; then
        echo "" >> .env
        echo "# MongoDB credentials" >> .env
        echo "MONGO_ROOT_USERNAME=admin" >> .env
        echo "MONGO_ROOT_PASSWORD=password" >> .env
        echo "MONGODB_URI=mongodb://admin:password@mongo:27017/twinspire?authSource=admin" >> .env
    fi
else
    # Create .env file with MongoDB credentials
    cp .env.example .env
    echo "" >> .env
    echo "# MongoDB credentials" >> .env
    echo "MONGO_ROOT_USERNAME=admin" >> .env
    echo "MONGO_ROOT_PASSWORD=password" >> .env
    echo "MONGODB_URI=mongodb://admin:password@mongo:27017/twinspire?authSource=admin" >> .env
fi

echo "Setup completed successfully! Directory structure and MongoDB initialization created."
echo "You can now run 'docker-compose up -d' to start the services."