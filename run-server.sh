#!/bin/bash
cd /Users/justingosnell/Dropbox/joe-main
export NODE_ENV=production
exec node dist/index.js >> server.log 2>&1