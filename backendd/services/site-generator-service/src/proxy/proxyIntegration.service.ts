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
        // Retourner l'URL avec le chemin Render
        return {
          ...result,
          url: `${process.env.RENDER_EXTERNAL_URL}/preview/${hostId}`
        };
      }
      return result;
    };}
}