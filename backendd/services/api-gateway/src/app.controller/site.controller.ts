import { Controller, Post, Get, Param, HttpException, HttpStatus, Inject, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Controller('site-generator')
export class SiteController {
  constructor(
    @Inject('SITE_GENERATOR_SERVICE') private readonly siteGeneratorClient: ClientProxy
  ) {}

  @Post(':hostId/generate')
  async generateSite(
    @Param('hostId') hostId: string,
    @Query('sitePath') sitePath?: string
  ) {
    console.log(`API Gateway received request to generate site for host: ${hostId}`);
    
    try {
      // Include sitePath if provided, otherwise it will be determined by the service
      const payload = { hostId, sitePath };
      
      // Set a longer timeout for the site generation (10 minutes)
      const response = await firstValueFrom(
        this.siteGeneratorClient.send({ cmd: 'generate_site' }, payload).pipe(
          timeout(600000) // 10 minutes timeout
        )
      );
      
      console.log(`Site generation response from microservice:`, response);
      
      // Return the complete response from the microservice
      return {
        message: response.message || 'Site generated successfully',
        url: response.url // This will now contain the domainName.localhost URL
      };
    } catch (error) {
      console.error(`Error generating site for host ${hostId}:`, error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `Failed to generate site: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':hostId/start')
  async startSite(@Param('hostId') hostId: string) {
    try {
      const response = await firstValueFrom(
        this.siteGeneratorClient.send({ cmd: 'start_site' }, { hostId }).pipe(
          timeout(60000) // 1 minute timeout
        )
      );
      
      return {
        message: response.message,
        url: response.url // This will now contain the domainName.localhost URL
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `Failed to start site: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':hostId/stop')
  async stopSite(@Param('hostId') hostId: string) {
    try {
      const response = await firstValueFrom(
        this.siteGeneratorClient.send({ cmd: 'stop_site' }, { hostId }).pipe(
          timeout(60000) // 1 minute timeout
        )
      );
      
      return {
        message: response.message,
        success: response.success
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `Failed to stop site: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status')
  async getSitesStatus() {
    try {
      const response = await firstValueFrom(
        this.siteGeneratorClient.send({ cmd: 'get_sites_status' }, {}).pipe(
          timeout(30000)
        )
      );
      
      // Add explicit structure to the response
      return {
        running: response.running || [],
        all: response.all || []
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `Failed to get sites status: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}