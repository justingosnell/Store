#!/bin/bash

# Test script for bulk upload endpoint
# This will help diagnose the "failed to fetch" error

echo "Testing bulk upload endpoint..."
echo ""

# Read the sample file
CONTENT=$(cat sample-bulk-upload.txt)

# Test the endpoint (will fail with 401 if not authenticated)
curl -X POST http://localhost:5000/api/locations/bulk-upload \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$CONTENT\"}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "If you see 401 Unauthorized, you need to log in first."
echo "If you see 200 OK, the endpoint is working correctly."