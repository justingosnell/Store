#!/bin/bash

# Kill any existing process on port 3000
lsof -i :3000 | grep -v COMMAND | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Start the server with proper error handling
cd /Users/justingosnell/Dropbox/joe-main

export NODE_ENV=production

# Use nohup with full stdout/stderr redirection
nohup node dist/index.js > server.log 2>&1 &

# Save PID
SERVER_PID=$!
echo $SERVER_PID > server.pid

# Give it a moment to start
sleep 2

# Check if it's still running
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Server started successfully (PID: $SERVER_PID)"
  echo "📍 Running on http://localhost:3000"
else
  echo "❌ Server failed to start. Check server.log for details:"
  cat server.log
  exit 1
fi