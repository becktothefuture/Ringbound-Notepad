#!/bin/bash

LOGFILE="devserver.log"
PORT=3000

# Clean up any previous log
rm -f "$LOGFILE"

# Start live-server in the background, output to log
live-server src --port=$PORT --wait=500 --no-cache --browser=chrome --verbose > "$LOGFILE" 2>&1 &
SERVER_PID=$!

# Wait for server to respond (max 20s)
TRIES=0
MAX_TRIES=40
until curl -s --head http://127.0.0.1:$PORT | grep "200 OK" > /dev/null; do
  sleep 0.5
  TRIES=$((TRIES+1))
  if [ $TRIES -ge $MAX_TRIES ]; then
    echo "\n==============================="
    echo "❌ Dev server did NOT start correctly after 20s. Check $LOGFILE for details."
    echo "===============================\n"
    kill $SERVER_PID 2>/dev/null
    exit 1
  fi
done

# Wait a bit for assets to finish loading (simulate browser asset requests)
sleep 2

# Print big confirmation message
clear
cat <<EOF

===============================
✅ Dev server started and ready at http://localhost:$PORT
All assets should now be available.
===============================

(Live server logs below)
EOF

# Tail the log file so user sees live-server output
trap "kill $SERVER_PID; rm -f $LOGFILE" EXIT
# Print log output, but keep confirmation message as last before tailing
exec tail -f "$LOGFILE" 