#!/bin/bash
# setup-local-dev.sh - Script for setting up local development environment

# Check if running with appropriate permissions
if [ "$(id -u)" -ne 0 ]; then
  echo "This script needs to be run with sudo" >&2
  exit 1
fi

# Define variables
HOSTNAME="utapiknfknza3shpn4kccxg0x2k1.localhost"
IP_ADDRESS="127.0.0.1"

# Add entry to hosts file if it doesn't exist
if ! grep -q "$HOSTNAME" /etc/hosts; then
  echo "Adding $HOSTNAME to /etc/hosts"
  echo "$IP_ADDRESS $HOSTNAME" >> /etc/hosts
  echo "Host added successfully"
else
  echo "$HOSTNAME already exists in /etc/hosts"
fi

# Create directories for Nginx if they don't exist
mkdir -p /etc/nginx/sites-enabled
mkdir -p /etc/nginx/conf.d

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
  echo "Nginx is not installed. Installing..."
  apt-get update
  apt-get install -y nginx
fi

# Create a basic nginx configuration
cat > /etc/nginx/conf.d/local-dev.conf << EOF
server {
    listen 80;
    server_name ~^(?.+)\\.localhost;
    
    location / {
        proxy_pass http://localhost:\$http_x_forwarded_port;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Restart Nginx
echo "Restarting Nginx..."
systemctl restart nginx

echo "Setup complete. You can now access your application at http://$HOSTNAME"