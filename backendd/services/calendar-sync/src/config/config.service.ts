import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // Configuration générale
  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', { infer: true }) ?? 'development';
  }

  get port(): number {
    return parseInt(this.configService.get<string>('PORT', { infer: true }) ?? '3000', 10);
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // Configuration de la base de données MongoDB
  get dbHost(): string {
    return this.configService.get<string>('DB_HOST', { infer: true }) ?? 'localhost';
  }

  get dbPort(): number {
    return parseInt(this.configService.get<string>('DB_PORT', { infer: true }) ?? '27017', 10);
  }

  get dbUsername(): string {
    return this.configService.get<string>('DB_USERNAME', { infer: true }) ?? '';
  }

  get dbPassword(): string {
    return this.configService.get<string>('DB_PASSWORD', { infer: true }) ?? '';
  }

  get dbName(): string {
    return this.configService.get<string>('DB_NAME', { infer: true }) ?? 'calendar_sync';
  }

  get dbUrl(): string {
    return this.configService.get<string>('DATABASE_URL', { infer: true }) ?? 
      `mongodb://${this.dbUsername ? `${this.dbUsername}:${this.dbPassword}@` : ''}${this.dbHost}:${this.dbPort}/${this.dbName}`;
  }

  get dbAuthSource(): string {
    return this.configService.get<string>('DB_AUTH_SOURCE', { infer: true }) ?? 'admin';
  }

  get dbReplicaSet(): string | undefined {
    return this.configService.get<string>('DB_REPLICA_SET', { infer: true });
  }

  // Configuration du navigateur pour le scraping
  get browserHeadless(): boolean {
    return this.configService.get<string>('BROWSER_HEADLESS', { infer: true }) === 'true';
  }

  get scraperMaxRetries(): number {
    return parseInt(this.configService.get<string>('SCRAPER_MAX_RETRIES', { infer: true }) ?? '3', 10);
  }

  get scraperRetryDelay(): number {
    return parseInt(this.configService.get<string>('SCRAPER_RETRY_DELAY', { infer: true }) ?? '5000', 10);
  }

  // Configuration CAPTCHA
  get captchaManualFallback(): boolean {
    return this.configService.get<string>('CAPTCHA_MANUAL_FALLBACK', { infer: true }) === 'true';
  }

  get captchaMaxAttempts(): number {
    return parseInt(this.configService.get<string>('CAPTCHA_MAX_ATTEMPTS', { infer: true }) ?? '3', 10);
  }

  get captchaServiceUrl(): string {
    return this.configService.get<string>('CAPTCHA_SERVICE_URL', { infer: true }) ?? '';
  }

  get captchaApiKey(): string {
    return this.configService.get<string>('CAPTCHA_API_KEY', { infer: true }) ?? '';
  }

  // Configuration des planificateurs de synchronisation
  get syncEnabled(): boolean {
    return this.configService.get<string>('SYNC_ENABLED', { infer: true }) === 'true';
  }

  get syncCron(): string {
    return this.configService.get<string>('SYNC_CRON', { infer: true }) ?? '0 0 * * *';
  }

  get syncMaxProperties(): number {
    return parseInt(this.configService.get<string>('SYNC_MAX_PROPERTIES', { infer: true }) ?? '10', 10);
  }

  get syncConcurrency(): number {
    return parseInt(this.configService.get<string>('SYNC_CONCURRENCY', { infer: true }) ?? '2', 10);
  }

  // Obtenez n'importe quelle configuration personnalisée
  get(key: string, defaultValue: string = ''): string {
    return this.configService.get<string>(key, { infer: true }) ?? defaultValue;
  }

  getNumber(key: string, defaultValue: number = 0): number {
    const value = this.configService.get<string>(key, { infer: true });
    return value ? parseInt(value, 10) : defaultValue;
  }

  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.configService.get<string>(key, { infer: true });
    if (value === undefined) {
      return defaultValue;
    }
    return value.toLowerCase() === 'true';
  }
}