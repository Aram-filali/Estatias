#!/bin/bash

# Script d'installation et de configuration du système de proxy intelligent

# Vérifier si l'utilisateur est root
if [ "$EUID" -ne 0 ]; then
  echo "Ce script doit être exécuté en tant que root"
  exit 1
fi

# Variables de configuration
APP_DIR="/opt/site-generator"
NGINX_CONFIG_DIR="/etc/nginx"
NGINX_SITES_DIR="${NGINX_CONFIG_DIR}/sites-enabled"
DOMAIN="votre-domaine.com"
USE_HTTPS="false"
ENV_FILE="${APP_DIR}/.env"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages d'information
info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

# Fonction pour afficher les messages d'avertissement
warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Fonction pour afficher les messages d'erreur
error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si Nginx est installé
if ! command -v nginx &> /dev/null; then
  error "Nginx n'est pas installé. Installation en cours..."
  apt-get update
  apt-get install -y nginx
  
  if [ $? -ne 0 ]; then
    error "Échec de l'installation de Nginx. Veuillez l'installer manuellement."
    exit 1
  fi
  
  info "Nginx installé avec succès."
else
  info "Nginx est déjà installé."
fi

# Créer les répertoires nécessaires
info "Création des répertoires de configuration..."
mkdir -p "${NGINX_SITES_DIR}"
mkdir -p "${NGINX_CONFIG_DIR}/conf.d"

# Vérifier si le répertoire de l'application existe
if [ ! -d "${APP_DIR}" ]; then
  error "Le répertoire de l'application ${APP_DIR} n'existe pas."
  read -p "Voulez-vous le créer? (y/n): " CREATE_DIR
  
  if [[ "${CREATE_DIR}" =~ ^[Yy]$ ]]; then
    mkdir -p "${APP_DIR}"
    info "Répertoire ${APP_DIR} créé."
  else
    error "Impossible de continuer sans le répertoire de l'application."
    exit 1
  fi
fi

# Configurer le fichier .env
if [ ! -f "${ENV_FILE}" ]; then
  info "Création du fichier .env..."
  touch "${ENV_FILE}"
fi

# Ajouter ou mettre à jour les variables d'environnement
update_env_var() {
  local key=$1
  local value=$2
  
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

info "Configuration des variables d'environnement pour le proxy..."
update_env_var "NGINX_CONFIG_DIR" "${NGINX_CONFIG_DIR}"
update_env_var "NGINX_SITES_DIR" "${NGINX_SITES_DIR}"
update_env_var "PROXY_DOMAIN" "${DOMAIN}"
update_env_var "USE_HTTPS" "${USE_HTTPS}"
update_env_var "NGINX_RELOAD_COMMAND" "systemctl reload nginx"

# Configurer Nginx
info "Configuration de Nginx..."

# Créer la configuration principale
cat > "${NGINX_CONFIG_DIR}/conf.d/dynamic-sites.conf" << EOF
# Configuration dynamique pour les sites générés
# Géré automatiquement par ProxyManagerService
# Ne pas modifier manuellement

server {
    listen 80;
    server_name ~^(?<hostid>.+)\.${DOMAIN//./\\.};
    
    # Variable par défaut pour le port du proxy
    set \$proxy_port 3000;  # Valeur par défaut
    
    # Inclure les configurations spécifiques à chaque site
    include ${NGINX_SITES_DIR}/*.conf;
    
    location / {
        # Si pas de site actif pour ce domaine, rediriger vers une page d'erreur
        if (\$proxy_port = 3000) {
            return 404;
        }
        
        proxy_pass http://localhost:\$proxy_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Vérifier la configuration de Nginx
info "Vérification de la configuration de Nginx..."
nginx -t

if [ $? -ne 0 ]; then
  error "La configuration de Nginx est invalide. Veuillez vérifier les erreurs ci-dessus."
  exit 1
fi

# Redémarrer Nginx
info "Redémarrage de Nginx..."
systemctl restart nginx

if [ $? -ne 0 ]; then
  error "Échec du redémarrage de Nginx. Veuillez vérifier le statut du service."
  exit 1
fi

# Configuration DNS
info "===== CONFIGURATION DNS REQUISE ====="
info "Pour que cette solution fonctionne, vous devez configurer un enregistrement DNS wildcard:"
info "*.${DOMAIN} --> Pointant vers l'IP de ce serveur"
info "======================================"

# Instructions pour la suite
info "Configuration terminée!"
info "Assurez-vous que votre application NestJS est configurée pour utiliser ces variables d'environnement."
info "Redémarrez votre application pour activer le proxy intelligent."

# Informations de vérification
info "Pour vérifier le fonctionnement, lancez un site avec votre générateur,"
info "puis accédez à http://[hostId].${DOMAIN}"