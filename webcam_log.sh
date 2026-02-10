#!/bin/bash
if ! log show --last 10s --predicate 'subsystem == "com.apple.cameracapture"' --info >/dev/null 2>&1; then
  echo "❌ Full Disk Access NOT granted"
  echo "Enable it for Terminal and restart this script."
  exit 1
fi

echo "✅ Full Disk Access detected"
echo "📷 Webcam activity logger started"
echo "Press Ctrl+C to stop"
echo "--------------------------------"

log stream --style syslog \
  --predicate '
    (subsystem == "com.apple.cameracapture")
     AND
     (eventMessage CONTAINS "startRunning]" OR
      eventMessage CONTAINS "stopRunning]")
  ' --info |
while read -r line; do
  # Skip the filter header line, backtrace lines, and <private> redacted lines
  if echo "$line" | grep -qE "^Filtering the log|backtrace|<private>"; then
    continue
  fi

  # Only match the actual startRunning / stopRunning method call lines
  if ! echo "$line" | grep -qE "startRunning\]:|stopRunning\]:"; then
    continue
  fi

  timestamp=$(echo "$line" | awk '{print $1" "$2}')
  # Extract app name from syslog field 4: "AppName[PID]:" → "AppName"
  app_name=$(echo "$line" | awk '{print $4}' | sed 's/\[.*//')

  if echo "$line" | grep -q "stopRunning"; then
    echo "🔴 [$timestamp] Webcam CLOSED  (app: $app_name)"
  elif echo "$line" | grep -q "startRunning"; then
    echo "🟢 [$timestamp] Webcam OPENED  (app: $app_name)"
  fi
done
