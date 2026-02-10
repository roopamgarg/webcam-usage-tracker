#!/bin/bash

# =============================================================================
# Webcam Activity Logger - Universal macOS Script
# Auto-detects the correct subsystem for your macOS version
# =============================================================================

# Show help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --detect    Manual detection mode - show raw logs from all subsystems"
  echo "  --help      Show this help message"
  echo ""
  echo "Run without arguments to auto-detect and start webcam tracking."
  exit 0
fi

# Manual detection mode - shows raw logs from all camera-related subsystems
if [ "$1" = "--detect" ]; then
  echo "🔍 Detection mode - streaming camera-related logs..."
  echo "Open/close a camera app (FaceTime, Photo Booth, Zoom) to see which subsystem works."
  echo "Press Ctrl+C to stop"
  echo "--------------------------------"
  log stream --level info --predicate '
    (subsystem == "com.apple.controlcenter") OR
    (subsystem == "com.apple.cameracapture") OR
    (subsystem == "com.apple.cmio") OR
    (subsystem == "com.apple.SkyLight" AND eventMessage CONTAINS "camera") OR
    (subsystem == "com.apple.coremedia" AND eventMessage CONTAINS[c] "camera")
  ' --style compact | grep -iE "camera|capture|startRunning|stopRunning|activeCameraAttributions|camera status"
  exit 0
fi

# Check Full Disk Access
if ! log show --last 10s --info >/dev/null 2>&1; then
  echo "❌ Full Disk Access NOT granted"
  echo "Enable it for Terminal/iTerm in System Settings → Privacy & Security → Full Disk Access"
  exit 1
fi

echo "🔍 Auto-detecting camera subsystem for your macOS..."

# =============================================================================
# Auto-detection: Check which subsystem has camera-related logs
# =============================================================================
detect_subsystem() {
  # Check controlcenter (macOS Sonoma+)
  if log show --last 5m --predicate 'subsystem == "com.apple.controlcenter" AND eventMessage CONTAINS "activeCameraAttributions"' --info 2>/dev/null | grep -q "activeCameraAttributions"; then
    echo "controlcenter"
    return
  fi

  # Check SkyLight (common fallback)
  if log show --last 5m --predicate 'subsystem == "com.apple.SkyLight" AND eventMessage CONTAINS "camera status"' --info 2>/dev/null | grep -q "camera status"; then
    echo "skylight"
    return
  fi

  # Check cameracapture (older macOS)
  if log show --last 5m --predicate 'subsystem == "com.apple.cameracapture"' --info 2>/dev/null | grep -qE "startRunning|stopRunning"; then
    echo "cameracapture"
    return
  fi

  # Check cmio (CoreMediaIO)
  if log show --last 5m --predicate 'subsystem == "com.apple.cmio"' --info 2>/dev/null | grep -qE "startRunning|stopRunning|CMIODeviceStartStream|CMIODeviceStopStream"; then
    echo "cmio"
    return
  fi

  # Default fallback - try controlcenter
  echo "controlcenter"
}

SUBSYSTEM=$(detect_subsystem)
echo "✅ Detected subsystem: $SUBSYSTEM"
echo ""
echo "📷 Webcam activity logger started"
echo "Press Ctrl+C to stop"
echo "--------------------------------"

# Temp file to track state (persists across subshell)
state_file=$(mktemp)
echo "" > "$state_file"
trap "rm -f $state_file" EXIT

# =============================================================================
# Handler for: com.apple.controlcenter (macOS Sonoma+)
# Uses activeCameraAttributions with app names
# =============================================================================
run_controlcenter() {
  log stream --style syslog \
    --predicate '
      (subsystem == "com.apple.controlcenter")
       AND
       (eventMessage CONTAINS "activeCameraAttributions")
    ' --info |
  while read -r line; do
    # Skip non-relevant lines
    if echo "$line" | grep -qE "^Filtering the log"; then
      continue
    fi
    if ! echo "$line" | grep -q "activeCameraAttributions"; then
      continue
    fi

    timestamp=$(echo "$line" | awk '{print $1" "$2}')

    # Extract all app names from "[cam] AppName (bundle.id)" patterns
    current_apps=$(echo "$line" | grep -oE '\[cam\] [^)]+\)' | sed 's/\[cam\] //' | sed 's/ (.*//' | sort -u | tr '\n' ',' | sed 's/,$//')

    # Read previous state
    active_apps=$(cat "$state_file")

    # Skip if no change
    if [ "$current_apps" = "$active_apps" ]; then
      continue
    fi

    # Find newly opened apps
    if [ -n "$current_apps" ]; then
      for app in $(echo "$current_apps" | tr ',' ' '); do
        if [ -n "$app" ] && ! echo ",$active_apps," | grep -q ",$app,"; then
          echo "🟢 [$timestamp] Webcam OPENED  (app: $app)"
        fi
      done
    fi

    # Find closed apps
    if [ -n "$active_apps" ]; then
      for app in $(echo "$active_apps" | tr ',' ' '); do
        if [ -n "$app" ] && ! echo ",$current_apps," | grep -q ",$app,"; then
          echo "🔴 [$timestamp] Webcam CLOSED  (app: $app)"
        fi
      done
    fi

    # Update state
    echo "$current_apps" > "$state_file"
  done
}

# =============================================================================
# Handler for: com.apple.SkyLight
# Uses "camera status 0/1" messages
# =============================================================================
run_skylight() {
  log stream --style syslog \
    --predicate '
      (subsystem == "com.apple.SkyLight")
       AND
       (eventMessage CONTAINS "camera status")
    ' --info |
  while read -r line; do
    if echo "$line" | grep -qE "^Filtering the log"; then
      continue
    fi
    if ! echo "$line" | grep -q "camera status"; then
      continue
    fi

    timestamp=$(echo "$line" | awk '{print $1" "$2}')
    last_state=$(cat "$state_file")

    if echo "$line" | grep -q "camera status 0"; then
      if [ "$last_state" != "closed" ]; then
        echo "🔴 [$timestamp] Webcam CLOSED"
        echo "closed" > "$state_file"
      fi
    elif echo "$line" | grep -q "camera status 1"; then
      if [ "$last_state" != "open" ]; then
        echo "🟢 [$timestamp] Webcam OPENED"
        echo "open" > "$state_file"
      fi
    fi
  done
}

# =============================================================================
# Handler for: com.apple.cameracapture (older macOS)
# Uses startRunning/stopRunning method calls
# =============================================================================
run_cameracapture() {
  log stream --style syslog \
    --predicate '
      (subsystem == "com.apple.cameracapture")
       AND
       (eventMessage CONTAINS "startRunning]" OR
        eventMessage CONTAINS "stopRunning]")
    ' --info |
  while read -r line; do
    if echo "$line" | grep -qE "^Filtering the log|backtrace|<private>"; then
      continue
    fi
    if ! echo "$line" | grep -qE "startRunning\]|stopRunning\]"; then
      continue
    fi

    timestamp=$(echo "$line" | awk '{print $1" "$2}')
    app_name=$(echo "$line" | awk '{print $4}' | sed 's/\[.*//')

    if echo "$line" | grep -q "stopRunning"; then
      echo "🔴 [$timestamp] Webcam CLOSED  (app: $app_name)"
    elif echo "$line" | grep -q "startRunning"; then
      echo "🟢 [$timestamp] Webcam OPENED  (app: $app_name)"
    fi
  done
}

# =============================================================================
# Handler for: com.apple.cmio (CoreMediaIO)
# Uses CMIODeviceStartStream/StopStream or startRunning/stopRunning
# =============================================================================
run_cmio() {
  log stream --style syslog \
    --predicate '
      (subsystem == "com.apple.cmio")
       AND
       (eventMessage CONTAINS "startRunning" OR
        eventMessage CONTAINS "stopRunning" OR
        eventMessage CONTAINS "CMIODeviceStartStream" OR
        eventMessage CONTAINS "CMIODeviceStopStream")
    ' --info |
  while read -r line; do
    if echo "$line" | grep -qE "^Filtering the log|backtrace"; then
      continue
    fi

    timestamp=$(echo "$line" | awk '{print $1" "$2}')
    app_name=$(echo "$line" | awk '{print $4}' | sed 's/\[.*//')
    [ -z "$app_name" ] && app_name="Unknown"

    if echo "$line" | grep -qE "stopRunning|CMIODeviceStopStream"; then
      echo "🔴 [$timestamp] Webcam CLOSED  (app: $app_name)"
    elif echo "$line" | grep -qE "startRunning|CMIODeviceStartStream"; then
      echo "🟢 [$timestamp] Webcam OPENED  (app: $app_name)"
    fi
  done
}

# =============================================================================
# Run the appropriate handler based on detected subsystem
# =============================================================================
case "$SUBSYSTEM" in
  controlcenter)
    run_controlcenter
    ;;
  skylight)
    run_skylight
    ;;
  cameracapture)
    run_cameracapture
    ;;
  cmio)
    run_cmio
    ;;
  *)
    echo "❌ Unknown subsystem: $SUBSYSTEM"
    exit 1
    ;;
esac