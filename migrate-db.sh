#!/bin/bash

# Database Migration Script: Render → Supabase

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     Database Migration: Render PostgreSQL → Supabase      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo "   Please export it before running this script:"
    echo "   export DATABASE_URL='your_render_db_url'"
    exit 1
fi

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ ERROR: SUPABASE_DB_URL environment variable not set"
    echo "   Please export it before running this script:"
    echo "   export SUPABASE_DB_URL='your_supabase_db_url'"
    exit 1
fi

echo "📦 Step 1: Exporting data from Render PostgreSQL..."
echo "   Source: $DATABASE_URL"

# Export from Render
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-password \
  --file=db_backup.dump \
  --verbose

if [ $? -eq 0 ]; then
    echo "✅ Export successful! Created db_backup.dump"
    echo "   File size: $(du -h db_backup.dump | cut -f1)"
else
    echo "❌ Export failed!"
    exit 1
fi

echo ""
echo "📥 Step 2: Importing data to Supabase PostgreSQL..."
echo "   Target: $SUPABASE_DB_URL"

# Import to Supabase
pg_restore "$SUPABASE_DB_URL" \
  --format=custom \
  --no-password \
  --verbose \
  db_backup.dump

if [ $? -eq 0 ]; then
    echo "✅ Import successful!"
else
    echo "❌ Import failed!"
    exit 1
fi

echo ""
echo "✨ Migration complete!"
echo ""
echo "Next steps:"
echo "  1. Update your .env.local with SUPABASE_DB_URL as DATABASE_URL"
echo "  2. Restart your server"
echo "  3. Verify all data is present"
echo ""
echo "📝 To restore from backup later, run:"
echo "   pg_restore 'your_db_url' --format=custom --no-password db_backup.dump"
echo ""