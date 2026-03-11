#!/bin/bash
# start_system.sh - Unified startup for RIS Backend, Frontend, and Vosk Engine

echo "🚀 Starting RIS Unified Platform (PM2 Ecosystem)..."

# Check if pm2 is installed
if ! command -v pm2 &> /dev/null
then
    echo "pm2 could not be found, installing..."
    npm install -g pm2
fi

# Check if python3 is installed
if ! command -v python3 &> /dev/null
then
    echo "❌ Error: python3 is required for the Vosk Voice Engine."
    exit 1
fi

# Kill any existing processes to ensure a clean start
pm2 delete all 2>/dev/null || true

# Start the ecosystem
pm2 start ecosystem.config.js

echo "🌟 System Started!"
echo "   - Frontend: https://localhost:3000"
echo "   - Backend:  https://localhost:5000"
echo "   - Vosk:     ws://localhost:5001"
echo ""
echo "📊 Monitoring commands:"
echo "   - View all logs:   pm2 logs"
echo "   - View status:     pm2 status"
echo "   - Stop all:        pm2 stop all"
echo "   - Dashboard:      pm2 monit"

