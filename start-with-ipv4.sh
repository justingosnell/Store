#!/bin/bash
# Resolve Supabase hostname to IPv4 and update DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set, starting normally..."
  npm start
  exit $?
fi

# Extract hostname from DATABASE_URL
HOSTNAME=$(echo "$DATABASE_URL" | sed -E 's|postgresql://[^@]+@([^:]+):.*|\1|')

if [ -z "$HOSTNAME" ]; then
  echo "Could not parse hostname from DATABASE_URL, using original URL"
  npm start
  exit $?
fi

echo "🔍 Resolving $HOSTNAME to IPv4..."

# Resolve hostname to IPv4 using dig (should be available)
if command -v dig &> /dev/null; then
  IPV4=$(dig +short "$HOSTNAME" A | head -1)
elif command -v nslookup &> /dev/null; then
  IPV4=$(nslookup "$HOSTNAME" | grep -oP '(?<=Address: ).*' | head -1)
else
  echo "⚠️  Neither dig nor nslookup available, using original URL"
  npm start
  exit $?
fi

if [ -z "$IPV4" ] || [ "$IPV4" = ";" ]; then
  echo "⚠️  Failed to resolve $HOSTNAME to IPv4, using original URL"
  npm start
  exit $?
fi

echo "✅ Resolved to: $IPV4"

# Replace hostname with IP in DATABASE_URL
export DATABASE_URL=$(echo "$DATABASE_URL" | sed "s/$HOSTNAME/$IPV4/g")

echo "🚀 Starting app with IPv4: $IPV4"
npm start