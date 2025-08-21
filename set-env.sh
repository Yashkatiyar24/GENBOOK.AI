#!/bin/bash

# Check if .env file exists in server directory
ENV_FILE="server/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

# Read the current values
SUPABASE_URL=$(grep -oP '^SUPABASE_URL=\K.*' "$ENV_FILE" | tr -d '"' | tr -d "'" | tr -d ' ')
SUPABASE_SERVICE_KEY=$(grep -oP '^SUPABASE_SERVICE_KEY=\K.*' "$ENV_FILE" | tr -d '"' | tr -d "'" | tr -d ' ')

# Ensure the URL has the correct format
if [[ ! "$SUPABASE_URL" =~ ^https?:// ]]; then
  SUPABASE_URL="https://$SUPABASE_URL"
fi

# Ensure the URL ends with .supabase.co
if [[ ! "$SUPABASE_URL" =~ \.supabase\.co$ ]] && [[ ! "$SUPABASE_URL" =~ localhost ]]; then
  if [[ "$SUPABASE_URL" =~ \.supabase\.co/ ]]; then
    # Remove any path after .supabase.co
    SUPABASE_URL=$(echo "$SUPABASE_URL" | sed -E 's/(https?:\/\/[^/]+\.supabase\.co).*/\1/')
  else
    # Add .supabase.co if it's missing
    SUPABASE_URL="${SUPABASE_URL%.co}.supabase.co"
  fi
fi

# Create a backup of the original file
cp "$ENV_FILE" "${ENV_FILE}.bak"

# Update the .env file with the corrected values
sed -i '' -E "s|^SUPABASE_URL=.*$|SUPABASE_URL="$SUPABASE_URL"|" "$ENV_FILE"
sed -i '' -E "s|^SUPABASE_SERVICE_KEY=.*$|SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY"|" "$ENV_FILE"

echo "✅ Environment variables updated successfully:"
echo "SUPABASE_URL=$SUPABASE_URL"
echo "SUPABASE_SERVICE_KEY=********"
echo "\nOriginal file backed up to ${ENV_FILE}.bak"
