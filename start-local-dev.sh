#!/bin/bash

# 🎨 Organized Glitter - Local Development Setup
echo "🎨 Starting Local PocketBase Development Environment"
echo "===================================================="

# Create local-pb-db directory if it doesn't exist
mkdir -p local-pb-db

# Create pb_data directory inside local-pb-db if it doesn't exist
mkdir -p local-pb-db/pb_data

# Start PocketBase with CORS origins for development from local-pb-db directory
echo "🚀 Starting PocketBase locally with CORS enabled..."
echo "   • Admin Panel: http://localhost:8090/_/"
echo "   • API Base URL: http://localhost:8090"
echo "   • Database Location: ./local-pb-db/pb_data"
echo "   • Allowed Origins: localhost:3001, localhost:3000, localhost:5173"
echo ""

cd local-pb-db && ./pocketbase serve \
  --http=localhost:8090 \
  --origins="http://localhost:3001,http://localhost:3000,http://localhost:5173" 