import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import * as os from 'os';
import { SiteInfo, SiteInfoDocument } from '../schema/site-info.schema';
import { SiteGeneratorService } from '../app.service';
import { Host, HostDocument } from '../schema/host.schema';

@Injectable()
export class ProxyManagerService implements OnApplicationShutdown {
  private readonly logger = new Logger('ProxyManagerService');
  
  private nginxConfigDir: string;
  private nginxSitesDir: string;
  private domain: string;
  private useHttps: boolean;
  private nginxReloadCommand: string;
  private isWindows: boolean;
  private nginxExecutable: string;
  private nginxBaseDir: string;
  private isDevelopment: boolean;
  
  constructor(
    @InjectModel(SiteInfo.name) private readonly siteInfoModel: Model<SiteInfoDocument>,
    @InjectModel(Host.name) private readonly hostModel: Model<HostDocument>,
    private readonly siteGeneratorService: SiteGeneratorService
  ) {
    // Detect if running on Windows
    this.isWindows = os.platform() === 'win32';
        
    // Detect development mode
    this.isDevelopment = process.env.NODE_ENV !== 'production';

    // Configuration from environment variables with better defaults for development
    if (this.isWindows) {
      // Use Windows-style paths and account for potential differences
      this.nginxExecutable = process.env.NGINX_EXECUTABLE || 'nginx.exe';
      this.nginxConfigDir = process.env.NGINX_CONFIG_DIR || 'C:/nginx/conf';
      this.nginxSitesDir = process.env.NGINX_SITES_DIR || path.join(this.nginxConfigDir, 'sites-enabled');
      // On Windows, nginx is typically reloaded with nginx -s reload
      this.nginxReloadCommand = `"${this.nginxExecutable}" -s reload`;
    } else {
      this.nginxConfigDir = process.env.NGINX_CONFIG_DIR || '/etc/nginx';
      this.nginxSitesDir = process.env.NGINX_SITES_DIR || `${this.nginxConfigDir}/sites-enabled`;
      // On Linux/Unix systems, use systemctl by default or the configured command
      this.nginxReloadCommand = process.env.NGINX_RELOAD_COMMAND || 'systemctl reload nginx';
    }

    // Use appropriate domain for dev/prod environments
    this.domain = process.env.PROXY_DOMAIN || (this.isDevelopment ? 'localhost' : 'example.com');
    this.useHttps = process.env.USE_HTTPS === 'true';

    this.logger.log(`Proxy Service initialized with domain: ${this.domain}`);
    this.logger.log(`Environment: ${this.isDevelopment ? 'Development' : 'Production'}`);
    this.logger.log(`HTTPS enabled: ${this.useHttps}`);
    this.logger.log(`Operating System: ${this.isWindows ? 'Windows' : 'Linux/Unix'}`);
    this.logger.log(`Nginx config directory: ${this.nginxConfigDir}`);
    this.logger.log(`Nginx sites directory: ${this.nginxSitesDir}`);
    this.logger.log(`Nginx reload command: ${this.nginxReloadCommand}`);

    // Initialize the service
    this.init();
  }

  // Add getter for domain to allow access from other services
  public getDomain(): string {
    return this.domain;
  }

  // Add method to generate site URL
public async generateSiteUrl(hostId: string): Promise<string> {
  const host = await this.hostModel.findOne({ firebaseUid: hostId }).exec();
  
  if (host && host.domainName) {
    return `http://${host.domainName}.${this.domain}`;
  }
  
  return `http://${hostId}.${this.domain}`;
}

  private async init(): Promise<void> {
    try {
      // Ensure the Nginx config directory exists
      await fs.ensureDir(this.nginxSitesDir);
      
      // Verify Nginx installation on Windows
      if (this.isWindows) {
        await this.verifyNginxInstallation();
      }
        
      // Create the main configuration if it doesn't exist
      await this.ensureMainConfig();
        
      // Synchronize configurations with active sites
      await this.syncProxyConfigs();
        
      // Subscribe to SiteGeneratorService events
      this.subscribeToSiteEvents();
        
      this.logger.log('ProxyManagerService initialized successfully');
    } catch (error) {
      this.logger.error(`Initialization error: ${error.message}`);
      
      if (this.isDevelopment) {
        this.logger.warn('In development mode - continuing despite Nginx configuration errors');
      }
    }
  }
  
  /**
   * Creates or updates proxy configuration for a specific host
   */
  async createProxyConfig(hostId: string, port: number | undefined | null): Promise<string> {
    try {
      // Log les valeurs reçues pour aider au débogage
      this.logger.log(`Creating proxy config for hostId: ${hostId}, port: ${port}`);
      
      // Validation de l'hostId
      if (!this.isValidHostId(hostId)) {
        throw new Error(`Invalid hostId: ${hostId}`);
      }
      
      // Récupérer l'information de site pour obtenir le port valide si nécessaire
      if (port === undefined || port === null || isNaN(port)) {
        const siteInfo = await this.siteInfoModel.findOne({ hostId }).exec();
        if (siteInfo && siteInfo.port && !isNaN(siteInfo.port)) {
          port = siteInfo.port;
          this.logger.log(`Port not provided or invalid, using port from database: ${port}`);
        } else {
          throw new Error(`No valid port available for hostId: ${hostId}`);
        }
      }
      
      // Vérification du port après récupération potentielle depuis la base
      if (!this.isValidPort(port)) {
        throw new Error(`Invalid port: ${port} for hostId: ${hostId}`);
      }
      
      // Trouver le domainName correspondant à ce hostId (firebaseUid)
      const host = await this.hostModel.findOne({ firebaseUid: hostId }).exec();
      
      // Utiliser le domainName s'il existe, sinon utiliser l'hostId comme fallback
      const subdomain = host?.domainName || hostId;
      const serverName = `${subdomain}.${this.domain}`;

      this.logger.log(`Using server name: ${serverName} for hostId: ${hostId}`);

      const configPath = path.join(this.nginxSitesDir, `${hostId}.conf`);

      // Configuration améliorée pour tous les environnements
      const configContent = `# Configuration for ${serverName}
server {
    listen 80;
    server_name ${serverName};
    
    # Increased buffer size
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    
    # Increased timeout values
    proxy_connect_timeout 600;
    proxy_send_timeout 600;
    proxy_read_timeout 600;
    send_timeout 600;
    
    # Root location directive
    location / {
        proxy_pass http://localhost:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
        
        # Disable buffering for better streaming experience
        proxy_buffering off;
    }
    
    # Additional location for static assets with caching
    location ~ ^/(images|javascript|js|css|fonts|static)/ {
        proxy_pass http://localhost:${port};
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    
    # Error page
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}`;

      await fs.writeFile(configPath, configContent);
      this.logger.log(`Created proxy config for ${serverName} at ${configPath}`);
      
      // Try to reload nginx to apply changes
      try {
        await this.reloadNginx();
        this.logger.log(`Nginx reloaded successfully for ${serverName}`);
      } catch (reloadError) {
        this.logger.error(`Failed to reload Nginx after creating config: ${reloadError.message}`);
        
        if (this.isDevelopment) {
          this.logger.warn('Development mode: continuing despite Nginx reload failure');
        } else {
          throw reloadError;
        }
      }
      
      // Return the complete URL
      return `http://${serverName}`;
    } catch (error) {
      this.logger.error(`Error creating proxy config for ${hostId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Synchronize Nginx configurations with active sites
   */
  private async syncProxyConfigs(): Promise<void> {
    try {
      // Get all running sites
      const runningSites = await this.siteInfoModel.find({
        port: { $exists: true, $ne: null } // S'assurer que le port existe et n'est pas null
      }).exec();
        
      this.logger.log(`Syncing proxy configs for ${runningSites.length} sites`);
        
      // Create or update configurations for each site
      for (const site of runningSites) {
        try {
          // Vérifier que le port est bien défini et valide
          if (site.port && !isNaN(site.port)) {
            await this.createProxyConfig(site.hostId, site.port);
          } else {
            this.logger.warn(`Skipping site ${site.hostId} due to invalid port: ${site.port}`);
          }
        } catch (siteError) {
          // Loguer l'erreur mais continuer avec les autres sites
          this.logger.error(`Error creating proxy config for site ${site.hostId}: ${siteError.message}`);
        }
      }
        
      // Reload Nginx after creating all configurations
      await this.reloadNginx();
      this.logger.log(`Nginx reloaded after syncing ${runningSites.length} proxy configurations`);
    } catch (error) {
      this.logger.error(`Error synchronizing proxy configs: ${error.message}`);
    }
  }
  
  private async reloadNginx(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDevelopment) {
        this.logger.log('Development mode: attempting to reload Nginx configuration');
      }
      
      if (this.isWindows) {
        // First check if nginx is running, if not, start it
        this.checkNginxRunning().then(running => {
          const command = running ? this.nginxReloadCommand : `"${this.nginxExecutable}"`;
          const action = running ? "Reloading" : "Starting";
          
          this.logger.log(`${action} Nginx with command: ${command}`);
          
          // Change working directory before executing nginx
          const options = {
            cwd: this.nginxBaseDir || path.dirname(this.nginxExecutable)
          };
          
          exec(command, options, (error, stdout, stderr) => {
            if (error) {
              this.logger.error(`Failed to ${action.toLowerCase()} Nginx: ${error.message}`);
              if (stderr) this.logger.error(stderr);
              
              if (this.isDevelopment) {
                this.logger.warn(`Development mode: continuing despite Nginx ${action.toLowerCase()} failure`);
                resolve();
                return;
              }
              
              reject(error);
              return;
            }
            
            this.logger.log(`Nginx ${action.toLowerCase()} successful`);
            resolve();
          });
        });
      } else {
        // On Linux/Unix, use the configured reload command
        exec(this.nginxReloadCommand, (error, stdout, stderr) => {
          if (error) {
            this.logger.error(`Failed to reload Nginx: ${error.message}`);
            if (stderr) this.logger.error(stderr);
            
            if (this.isDevelopment) {
              this.logger.warn('Development mode: continuing despite Nginx reload failure');
              resolve();
              return;
            }
            
            reject(error);
            return;
          }
          
          this.logger.log('Nginx configuration reloaded successfully');
          resolve();
        });
      }
    });
  }
  
  private async verifyNginxInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      // First, check if nginx is in PATH
      exec('where nginx', async (err, stdout) => {
        if (err) {
          this.logger.warn('Nginx not found in PATH, checking common installation locations...');
          
          // List of common Nginx installation locations on Windows
          const commonLocations = [
            'C:/nginx/nginx.exe',
            'C:/Program Files/nginx/nginx.exe',
            'C:/Program Files (x86)/nginx/nginx.exe'
          ];
          
          // Check each location
          for (const location of commonLocations) {
            try {
              if (await fs.pathExists(location)) {
                this.nginxExecutable = location;
                this.nginxBaseDir = path.dirname(location);
                this.nginxConfigDir = path.join(this.nginxBaseDir, 'conf');
                this.nginxSitesDir = path.join(this.nginxConfigDir, 'sites-enabled');
                this.nginxReloadCommand = `"${this.nginxExecutable}" -s reload`;
                
                this.logger.log(`Found Nginx at: ${location}`);
                this.logger.log(`Updated base directory: ${this.nginxBaseDir}`);
                this.logger.log(`Updated config directory: ${this.nginxConfigDir}`);
                this.logger.log(`Updated sites directory: ${this.nginxSitesDir}`);
                
                // Create sites-enabled directory if it doesn't exist
                await fs.ensureDir(this.nginxSitesDir);
                
                resolve();
                return;
              }
            } catch (error) {
              // Continue to next location
            }
          }
          
          this.logger.warn('Nginx not found in common locations. Please install Nginx or set correct path in environment variables.');
          this.logger.warn('Continuing without Nginx integration...');
          resolve();
        } else {
          // Nginx is in PATH, get its location
          const nginxPath = stdout.trim();
          this.nginxExecutable = nginxPath;
          
          // Update config directories based on nginx location
          this.nginxBaseDir = path.dirname(nginxPath);
          this.nginxConfigDir = path.join(this.nginxBaseDir, 'conf');
          this.nginxSitesDir = path.join(this.nginxConfigDir, 'sites-enabled');
          
          this.logger.log(`Found Nginx in PATH at: ${nginxPath}`);
          this.logger.log(`Updated base directory: ${this.nginxBaseDir}`);
          this.logger.log(`Updated config directory: ${this.nginxConfigDir}`);
          this.logger.log(`Updated sites directory: ${this.nginxSitesDir}`);
          
          // Create sites-enabled directory if it doesn't exist
          await fs.ensureDir(this.nginxSitesDir);
          
          // Create logs directory if it doesn't exist
          await fs.ensureDir(path.join(this.nginxBaseDir, 'logs'));
          
          resolve();
        }
      });
    });
  }
  
  private async ensureMainConfig(): Promise<void> {
    try {
      // For Windows, we'll create a main sites configuration
      const confDir = path.join(this.nginxConfigDir, 'conf.d');
      await fs.ensureDir(confDir);
      
      // First, ensure the nginx.conf is set up correctly with an http block that includes our configs
      await this.ensureMainNginxConf();
      
      // Now set up the site configurations directory
      await fs.ensureDir(this.nginxSitesDir);
      
      // Create a default site configuration to handle localhost without subdomain
      const defaultSitePath = path.join(this.nginxSitesDir, 'default-site.conf');
      const defaultSiteConfig = `# Default site configuration
# Managed automatically by ProxyManagerService
# Do not modify manually

server {
    listen 80;
    server_name ${this.domain};
    
    location / {
        return 200 'Dynamic site generator is running. Access specific sites using subdomains.';
        add_header Content-Type text/plain;
    }
}

# Wildcard server for unmatched subdomains
server {
    listen 80 default_server;
    server_name _;
    
    # Return a custom error message for unmatched domains
    location / {
        return 404 'Site not found. Please check your URL or contact support.';
        add_header Content-Type text/plain;
    }
}`;

      await fs.writeFile(defaultSitePath, defaultSiteConfig);
      this.logger.log(`Default site config written to ${defaultSitePath}`);
      
      // Reload Nginx to apply the main configuration
      await this.reloadNginx();
    } catch (error) {
      this.logger.error(`Error writing main config: ${error.message}`);
      throw error;
    }
  }

  private async ensureMainNginxConf(): Promise<void> {
    try {
      const mainNginxConfPath = path.join(this.nginxConfigDir, 'nginx.conf');
      
      // Determine the event type based on the operating system
      // Windows does not support epoll, so we'll use select for Windows
      const eventType = this.isWindows ? 'select' : 'epoll';
      
      // Create a proper nginx.conf with http block including our sites
      const basicConfig = `
  # Nginx configuration
  # Managed automatically by ProxyManagerService
  # Last updated: ${new Date().toISOString()}
  
  worker_processes auto;
  worker_rlimit_nofile 65535;
  
  events {
      worker_connections 4096;
      multi_accept on;
      use ${eventType};
  }
  
  http {
      include       mime.types;
      default_type  application/octet-stream;
      
      # Enhanced logging
      log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';
      
      access_log  logs/access.log  main;
      error_log   logs/error.log warn;
      
      # Performance options
      sendfile        on;
      tcp_nopush      on;
      tcp_nodelay     on;
      keepalive_timeout  65;
      
      # Buffering configuration
      client_body_buffer_size 128k;
      client_max_body_size 10m;
      client_header_buffer_size 1k;
      large_client_header_buffers 4 4k;
      output_buffers 1 32k;
      postpone_output 1460;
      
      # Increase hash bucket size to accommodate longer server names
      server_names_hash_bucket_size 128;
      server_names_hash_max_size 1024;
      
      # Gzip compression
      gzip on;
      gzip_disable "msie6";
      gzip_vary on;
      gzip_proxied any;
      gzip_comp_level 6;
      gzip_buffers 16 8k;
      gzip_http_version 1.1;
      gzip_min_length 256;
      gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/vnd.ms-fontobject application/x-font-ttf font/opentype image/svg+xml image/x-icon;
      
      # Include all site-specific configurations
      include ${this.nginxSitesDir.replace(/\\/g, '/')}/*.conf;
  }
  `;
      
      // Backup the existing nginx.conf if it exists
      if (await fs.pathExists(mainNginxConfPath)) {
        const backupPath = `${mainNginxConfPath}.bak.${Date.now()}`;
        await fs.copy(mainNginxConfPath, backupPath);
        this.logger.log(`Backed up existing nginx.conf to ${backupPath}`);
      }
      
      // Write the new nginx.conf
      await fs.writeFile(mainNginxConfPath, basicConfig);
      this.logger.log(`Created new nginx.conf with proper structure at ${mainNginxConfPath}`);
      
      return;
    } catch (error) {
      this.logger.error(`Error ensuring main nginx.conf: ${error.message}`);
      throw error;
    }
  }
  
  private subscribeToSiteEvents(): void {
    // Poll for changes in the database more frequently in development
    const pollInterval = this.isDevelopment ? 5000 : 10000; // 5 seconds in dev, 10 in prod
    
    this.logger.log(`Setting up site events polling every ${pollInterval}ms`);
    
    setInterval(async () => {
      try {
        const activeSites = await this.siteInfoModel.find({
          port: { $exists: true, $ne: null }
        }).exec();
            
        // Vérifier si des sites actifs ont été trouvés
        this.logger.debug(`Found ${activeSites.length} active sites during polling`);
            
        // Get existing configuration files
        const configFiles = await fs.readdir(this.nginxSitesDir);
        const existingConfigs = configFiles
          .filter(file => file.endsWith('.conf') && file !== 'default-site.conf')
          .map(file => file.replace('.conf', ''));
            
        // Active sites that need configuration
        const activeHostIds = activeSites.map(site => site.hostId);
            
        // Create configurations for new sites
        for (const site of activeSites) {
          if (!existingConfigs.includes(site.hostId)) {
            this.logger.log(`Creating new config for site: ${site.hostId} with port: ${site.port}`);
            await this.createProxyConfig(site.hostId, site.port!);
          }
        }
            
        // Remove configurations for inactive sites
        for (const existingHost of existingConfigs) {
          if (!activeHostIds.includes(existingHost)) {
            this.logger.log(`Removing config for inactive site: ${existingHost}`);
            await this.removeProxyConfig(existingHost);
          }
        }
            
        // Reload Nginx if changes were made
        if (
          activeHostIds.some(id => !existingConfigs.includes(id)) ||
          existingConfigs.some(id => !activeHostIds.includes(id))
        ) {
          this.logger.log('Changes detected in site configurations, reloading Nginx');
          await this.reloadNginx();
        }
      } catch (error) {
        this.logger.error(`Error in subscription handler: ${error.message}`);
      }
    }, pollInterval);
  }
  
  async removeProxyConfig(hostId: string): Promise<void> {
    try {
      // Validate input to prevent malicious deletion
      if (!this.isValidHostId(hostId)) {
        throw new Error(`Invalid hostId: ${hostId}`);
      }
        
      const configPath = path.join(this.nginxSitesDir, `${hostId}.conf`);
        
      if (await fs.pathExists(configPath)) {
        await fs.remove(configPath);
        this.logger.log(`Removed proxy config for ${hostId}`);
        
        // Reload Nginx after removing configuration
        await this.reloadNginx();
      }
        
      return;
    } catch (error) {
      this.logger.error(`Error removing proxy config for ${hostId}: ${error.message}`);
      throw error;
    }
  }
  
  private async checkNginxRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isWindows) {
        resolve(true); // Assume running on non-Windows systems
        return;
      }
      
      exec('tasklist | findstr nginx.exe', (error) => {
        if (error) {
          this.logger.log('Nginx is not running');
          resolve(false);
          return;
        }
        
        this.logger.log('Nginx is already running');
        resolve(true);
      });
    });
  }
  
  /**
   * Check if a hostId is valid (prevent injections)
   */
  private isValidHostId(hostId: string): boolean {
    // Allow only alphanumeric characters and dashes
    return /^[a-zA-Z0-9-]+$/.test(hostId);
  }
  
  /**
   * Check if a port is valid
   */
  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port > 1000 && port < 65536;
  }
  
  /**
   * Clean up resources when the application shuts down
   */
  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application is shutting down (signal: ${signal})`);
    // No need to clean up Nginx configurations, they will be recreated on restart
  }
}