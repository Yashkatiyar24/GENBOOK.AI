#!/bin/bash

# Create server directory if it doesn't exist
mkdir -p server

# Create .env file with placeholders
cat > server/.env << 'EOL'
# Supabase Configuration

SUPABASE_URL=https://deddapftymntugxdxnmo.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZGRhcGZ0eW1udHVneGR4bm1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY0NzUwMCwiZXhwIjoyMDcwMjIzNTAwfQ.o-dxNHTHVr7OvCR0JkUcKkEBFdSzy1FAm78mDXA0avs

# Server Configuration
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=*

# Razorpay Configuration (optional)
RAZORPAY_KEY_ID=rzp_live_R6ThFyLXy8qK4r
RAZORPAY_KEY_SECRET=B4ktiZ3m3Blkvh2UNZMJJfmz
RAZORPAY_WEBHOOK_SECRET=Yashkatiyar@2405
SUBS_GRACE_DAYS=3
EOL

echo "✅ Created server/.env file with default values"
echo "Please edit server/.env and update the values with your actual credentials"
echo "You can find your Supabase credentials in the Supabase dashboard under Project Settings -> API"
