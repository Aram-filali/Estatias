import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SiteGeneratorService } from '../app.service';
import { ProxyManagerService } from './proxyManager.service';

@Injectable()
export class ProxyIntegrationService implements OnModuleInit {
  private readonly logger = new Logger('ProxyIntegrationService');
  
  constructor(
    private readonly siteGenerator: SiteGeneratorService,
    private readonly proxyManager: ProxyManagerService
  ) {}

  async onModuleInit() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Store original methods
    const originalStart = this.siteGenerator.startSite.bind(this.siteGenerator);
    const originalStop = this.siteGenerator.stopSite.bind(this.siteGenerator);

    // Override startSite method
    this.siteGenerator.startSite = async (hostId: string) => {
      try {
        const result = await originalStart(hostId);
        
        if (result.url) {
          try {
            // Get the running sites status to extract the actual port
            const sitesStatus = await this.siteGenerator.getSitesStatus();
            const runningSite = sitesStatus.running.find(site => site.hostId === hostId);
            
            if (runningSite && runningSite.port) {
              // Create the localhost URL with port instead of the domain URL
              const localhostUrl = `http://localhost:${runningSite.port}`;
              
              this.logger.log(`Using localhost URL for ${hostId}: ${localhostUrl}`);
              
              // Return the localhost URL with port
              return {
                ...result,
                url: localhostUrl
              };
            } else {
              this.logger.warn(`No running site found for ${hostId}, returning original URL`);
              return result;
            }
          } catch (error) {
            this.logger.error(`Error getting localhost URL for ${hostId}: ${error.message}`);
            // Return the original URL if extraction fails
            return result;
          }
        }
        
        return result;
      } catch (error) {
        this.logger.error(`Error in enhanced startSite for ${hostId}: ${error.message}`);
        throw error;
      }
    };

    // Override stopSite method
    this.siteGenerator.stopSite = async (hostId: string) => {
      try {
        // Remove proxy configuration first
        await this.proxyManager.removeProxyConfig(hostId);
        this.logger.log(`Proxy configuration removed for ${hostId}`);
        
        // Then stop the site
        return await originalStop(hostId);
      } catch (error) {
        this.logger.error(`Error in enhanced stopSite for ${hostId}: ${error.message}`);
        // Still try to stop the original site even if proxy removal fails
        return await originalStop(hostId);
      }
    };

    this.logger.log('Proxy integration event handlers set up successfully');
  }
}