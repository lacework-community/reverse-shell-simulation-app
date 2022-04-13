#!/bin/sh
# Minimal datacollector sidecar start script
#
# Environment Variables:
# LaceworkAccessToken="..."      (Required)
# LaceworkLogStdout="true"       (Optional, will tail datacollector.log)

echo "Setting up Lacework Agent"

# Check for Access Token
if [ -z "$LaceworkAccessToken" ]; then
  echo "Please set the LaceworkAccessToken environment variable"
  exit 1
fi

# Create config file
echo "Writing Lacework datacollector config file to /var/lib/lacework/config/config.json"
LW_CONFIG="{\"tokens\": {\"accesstoken\": \"${LaceworkAccessToken}\"}}"
echo $LW_CONFIG > /var/lib/lacework/config/config.json

# Start datacollector
/var/lib/lacework/datacollector &
echo "Lacework datacollector started"

# Run Docker CMD
exec "$@"
