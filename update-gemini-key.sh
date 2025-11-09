#!/bin/bash

# Script to safely update Gemini API key without exposing it
# Usage: ./update-gemini-key.sh

echo "🔐 Safe Gemini API Key Updater"
echo "================================"
echo ""
echo "This script will update your Gemini API key in .env.local"
echo "The key will NOT be displayed in the terminal."
echo ""

# Read the API key securely (without echoing)
read -p "Enter your new Gemini API key: " -s GEMINI_KEY
echo ""

# Validate the key format (should start with AIza and be ~39 chars)
if [[ ! $GEMINI_KEY =~ ^AIza ]]; then
    echo "❌ Invalid API key format. Gemini keys should start with 'AIza'"
    exit 1
fi

if [ ${#GEMINI_KEY} -lt 30 ]; then
    echo "❌ API key seems too short. Please check and try again."
    exit 1
fi

echo ""
echo "✅ API key format looks valid"
echo "📝 Updating .env.local..."

# Update the .env.local file
cd "$(dirname "$0")/frontend"

if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found!"
    exit 1
fi

# Create a backup
cp .env.local .env.local.backup

# Update both GEMINI_API_KEY variables
sed -i "s/^NEXT_PUBLIC_GEMINI_API_KEY=.*/NEXT_PUBLIC_GEMINI_API_KEY=$GEMINI_KEY/" .env.local
sed -i "s/^GEMINI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_KEY/" .env.local

echo "✅ API key updated successfully!"
echo "📋 Backup saved to .env.local.backup"
echo ""
echo "🔄 Now restart your Next.js server:"
echo "   1. Stop the current server (Ctrl+C)"
echo "   2. Run: cd frontend && npm run dev"
echo ""
echo "🎨 Then test image generation in the app!"
