import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SiteGeneratorService } from './app.service';

@Controller()
export class SiteGeneratorController {
  private readonly logger = new Logger('SiteGeneratorController');
  
  constructor(private readonly siteGeneratorService: SiteGeneratorService) {}

  @MessagePattern({ cmd: 'generate_site' })
  async generateSite(@Payload() data: { hostId: string, sitePath?: string }) {
    const { hostId, sitePath } = data;
    this.logger.log(`Generating site for host: ${hostId}`);
    
    try {
      // Call service method - sitePath is optional and will be determined by the service if not provided
      const result = await this.siteGeneratorService.generateSite(sitePath || '', hostId);
      this.logger.log(`Site generation completed for ${hostId}, returning URL: ${result.url}`);
      
      return {
        message: result.message,
        url: result.url // This will now contain the domainName.localhost URL
      };
    } catch (error) {
      this.logger.error(`Error generating site for ${hostId}: ${error.message}`);
      return {
        message: `Site generation failed: ${error.message}`,
        error: true
      };
    }
  }

  @MessagePattern({ cmd: 'start_site' })
  async startSite(@Payload() data: { hostId: string }) {
    this.logger.log(`Starting site for host: ${data.hostId}`);
    
    try {
      const result = await this.siteGeneratorService.startSite(data.hostId);
      this.logger.log(`Site started for ${data.hostId}, returning URL: ${result.url}`);
      
      return {
        message: result.message,
        url: result.url // This will now contain the domainName.localhost URL
      };
    } catch (error) {
      this.logger.error(`Failed to start site for ${data.hostId}: ${error.message}`);
      return {
        message: `Failed to start site: ${error.message}`,
        error: true
      };
    }
  }

  @MessagePattern({ cmd: 'stop_site' })
  async stopSite(@Payload() data: { hostId: string }) {
    this.logger.log(`Stopping site for host: ${data.hostId}`);
    
    try {
      const result = await this.siteGeneratorService.stopSite(data.hostId);
      this.logger.log(`Site stopped for ${data.hostId}`);
      
      return {
        message: result.message,
        success: true
      };
    } catch (error) {
      this.logger.error(`Failed to stop site for ${data.hostId}: ${error.message}`);
      return {
        message: `Failed to stop site: ${error.message}`,
        success: false
      };
    }
  }
  
  @MessagePattern({ cmd: 'get_sites_status' })
  async getSitesStatus() {
    this.logger.log('Getting status for all sites');
    try {
      const result = await this.siteGeneratorService.getSitesStatus();
      
      // Make sure we're including the correct URLs in the response
      if (result.running && result.running.length > 0) {
        this.logger.log(`Found ${result.running.length} running sites with URLs`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to get sites status: ${error.message}`);
      return {
        message: `Failed to retrieve sites status: ${error.message}`,
        error: true
      };
    }
  }
}