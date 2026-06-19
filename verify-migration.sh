#!/bin/bash

# Verify Database Migration Completeness

set -e

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ ERROR: SUPABASE_DB_URL environment variable not set"
    exit 1
fi

echo "╔═════════════════════════════════════════════════╗"
echo "║     Verifying Supabase Database Migration       ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""

echo "📋 Checking tables..."
psql "$SUPABASE_DB_URL" \
  --no-password \
  -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"

echo ""
echo "📊 Row counts by table:"
echo ""

for table in users locations media settings categories; do
    count=$(psql "$SUPABASE_DB_URL" --no-password -t -c "SELECT COUNT(*) FROM \"$table\";")
    printf "  %-15s %s rows\n" "$table:" "$count"
done

echo ""
echo "🔍 Checking foreign key constraints..."
psql "$SUPABASE_DB_URL" \
  --no-password \
  -t -c "SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';"

echo ""
echo "✅ Verification complete!"