#!/bin/bash

# Deployment script for Lilys.AI Clone

set -e

echo "🚀 Starting deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please create it from .env.production"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Build and start services
echo "📦 Building Docker images..."
docker-compose build

# Run database migrations
echo "🗃️ Running database migrations..."
docker-compose --profile init run --rm db-init

# Start all services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=50

echo "✅ Deployment complete!"
echo "🌐 Application is running at http://localhost"
echo "📊 API is available at http://localhost:5000"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose ps               # Check status"
echo "  docker-compose down             # Stop services"
echo "  docker-compose restart backend  # Restart backend"