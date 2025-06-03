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
    const originalStart = this.siteGenerator.startSite.bind(this.siteGenerator);
    const originalStop = this.siteGenerator.stopSite.bind(this.siteGenerator);

    this.siteGenerator.startSite = async (hostId: string) => {
      const result = await originalStart(hostId);
      
      if (result.url) {
        try {
          const port = new URL(result.url).port;
          await this.proxyManager.createProxyConfig(hostId, parseInt(port));
          
          // Retourner l'URL avec le sous-domaine
          return {
            ...result,
            url: `http://${hostId}.${this.proxyManager['domain']}`
          };
        } catch (error) {
          this.logger.error(`Proxy setup failed: ${error.message}`);
          return result; // Retourner l'URL originale si le proxy échoue
        }
      }
      return result;
    };

    this.siteGenerator.stopSite = async (hostId: string) => {
      await this.proxyManager.removeProxyConfig(hostId);
      return await originalStop(hostId);
    };
  }
}