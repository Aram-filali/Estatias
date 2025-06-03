import {Controller,Get,Post,Body, Param,Query,Logger,Inject,} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('cal-sync')
export class CalSyncController {
  private readonly logger = new Logger(CalSyncController.name);

  constructor(
    @Inject('CALENDAR_SERVICE') private readonly calendarClient: ClientProxy,
    @Inject('SYNC_SERVICE') private readonly syncClient: ClientProxy,
    @Inject('MONITORING_SERVICE') private readonly monitoringClient: ClientProxy,
    @Inject('SCRAPER_SERVICE') private readonly scraperClient: ClientProxy,
  ) {}

  @Post('properties')
  createProperty(@Body() dto: any) {
    this.logger.log(`Création d'une nouvelle propriété: ${JSON.stringify(dto)}`);
    return this.calendarClient.send('property.create', dto);
  }

  @Get('properties')
  getAllProperties() {
    this.logger.log('Récupération de toutes les propriétés');
    return this.calendarClient.send('properties.findAll', {});
  }

  @Get('properties/:id')
  getPropertyById(@Param('id') id: string) {
    this.logger.log(`Récupération de la propriété avec ID: ${id}`);
    return this.calendarClient.send('property.findById', id);
  }

  @Get('properties/by-url')
  getPropertyByUrl(@Query('url') url: string, @Query('platform') platform: string) {
    this.logger.log(`Récupération de la propriété par URL: ${url} (${platform})`);
    return this.calendarClient.send('property.findByUrl', { url, platform });
  }

  @Get('properties/by-site-id')
  getPropertyBySiteId(@Query('siteId') siteId: string, @Query('platform') platform: string) {
    this.logger.log(`Récupération de la propriété par siteId: ${siteId} (${platform})`);
    return this.calendarClient.send('property.findBySiteId', { siteId, platform });
  }

  @Get('properties/:id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.logger.log(`Disponibilités pour ${id} du ${startDate} au ${endDate}`);
    return this.calendarClient.send('calendar.detectConflicts', {
      propertyId: id,
      startDate,
      endDate,
    });
  }

  @Post('availability')
  updateAvailability(@Body() dto: any) {
    this.logger.log(`Mise à jour de disponibilité: ${JSON.stringify(dto)}`);
    return this.calendarClient.send('availability.update', dto);
  }

  @Get('properties/:id/export')
  exportCalendar(@Param('id') id: string, @Query('format') format = 'json') {
    this.logger.log(`Export du calendrier ${id} au format ${format}`);
    return this.calendarClient.send('calendar.export', {
      propertyId: id,
      options: { format },
    });
  }

  @Get('test-url')
  testUrl(@Query('url') url: string, @Query('platform') platform: string) {
    this.logger.log(`Test URL: ${url} (${platform})`);
    return this.calendarClient.send('property.testUrl', { 
      publicUrl: url,
      platform 
    });
  }

  @Post('sync/property/:id')
  syncProperty(@Param('id') id: string) {
    this.logger.log(`Sync propriété ${id}`);
    return this.syncClient.send('sync_property', { id: parseInt(id) });
  }

  @Post('sync/all')
  syncAllProperties(@Query('force') force = 'false') {
    this.logger.log(`Sync de toutes les propriétés (force: ${force})`);
    return this.syncClient.send('sync_all', { force: force === 'true' });
  }

  @Get('sync/status')
  getSyncStatus() {
    this.logger.log('Statut de synchronisation');
    return this.syncClient.send('sync_status', {});
  }

  @Post('sync/trigger-manual/:id')
  triggerManualSync(@Param('id') id: string) {
    this.logger.log(`Sync manuelle pour propriété ${id}`);
    return this.syncClient.send('trigger_manual_sync', { id: parseInt(id) });
  }

  @Get('monitoring/stats')
  getMonitoringStats() {
    this.logger.log('Statistiques de monitoring');
    return this.monitoringClient.send('get_stats', {});
  }

  @Get('monitoring/success-rate')
  getSuccessRate(@Query('platform') platform: string, @Query('hours') hours = '24') {
    this.logger.log(`Taux de succès pour ${platform} sur ${hours}h`);
    return this.monitoringClient.send('get_success_rate', {
      platform,
      hours: parseInt(hours),
    });
  }

  // CORRECTION: Nouveaux endpoints pour le scraping
  @Post('scraping/test')
  testScraping(@Body() body: { 
    propertyId?: string; 
    url?: string; 
    platform: string;
    testMode?: boolean;
  }) {
    this.logger.log(`Test scraping: ${JSON.stringify(body)}`);
    
    // Si propertyId est fourni, utiliser le scraping normal
    if (body.propertyId) {
      return this.scraperClient.send('scraper.calendar.scrape', {
        propertyId: body.propertyId
      });
    }
    
    // Si url est fourni, utiliser le test direct
    /*if (body.url) {
      return this.scraperClient.send('scraper.test.direct', {
        url: body.url,
        platform: body.platform,
        testMode: true
      });
    }*/
    
    return {
      success: false,
      error: 'propertyId ou url requis'
    };
  }

  // Nouveau endpoint pour test direct par URL
  @Post('scraping/test-direct')
  testScrapingDirect(@Body() body: { url: string; platform: string }) {
    this.logger.log(`Test scraping direct: ${body.url} (${body.platform})`);
    return this.scraperClient.send('scraper.test.direct', {
      url: body.url,
      platform: body.platform,
      testMode: true
    });
  }

  @Get('scraping/proxy-status')
  getProxyStatus() {
    this.logger.log('Statut des proxies');
    return this.scraperClient.send('get_proxy_status', {});
  }

  @Post('scraping/prioritize-trial-proxies')
  prioritizeTrialProxies() {
    this.logger.log('Priorisation des proxies de test');
    return this.scraperClient.send('prioritize_trial_proxies', {});
  }

  @Post('scraping/create-trial-account')
  createTrialAccount() {
    this.logger.log('Création compte d\'essai');
    return this.scraperClient.send('create_trial_account', {});
  }

  @Get('scraping/trial-accounts')
  getTrialAccounts() {
    this.logger.log('Comptes d\'essai disponibles');
    return this.scraperClient.send('get_trial_accounts', {});
  }

  @Get('health')
  healthCheck() {
    this.logger.log('Health check');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}