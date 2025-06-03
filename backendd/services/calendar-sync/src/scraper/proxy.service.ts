// src/modules/scraper/proxy.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface Proxy {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  countryCode?: string;
  lastUsed?: Date;
  failCount?: number;
  provider?: string;
}

@Injectable()
export class ProxyService implements OnModuleInit {
  private readonly logger = new Logger(ProxyService.name);
  private proxies: Proxy[] = [];
  private activeProxies: Proxy[] = [];
  private currentProxyIndex = 0;
  private proxyRotationStrategy: 'round-robin' | 'random' | 'least-used' = 'round-robin';
  private proxySource: 'config' | 'api' | 'trial-accounts' | 'mixed' = 'mixed';
  private proxyApiUrl: string | null = null;
  private proxyApiKey: string | null = null;
  private maxProxyFailCount = 3;
  private proxyRefreshInterval = 60 * 60 * 1000;
  private trialAccountsFilePath: string;
  private proxyPerformanceMetrics: Map<string, { success: number; failures: number; avgResponseTime: number }> = new Map();

  constructor(private configService: ConfigService) {
    this.proxyRotationStrategy = this.configService.get<'round-robin' | 'random' | 'least-used'>('PROXY_ROTATION_STRATEGY') ?? 'round-robin';
    this.proxySource = this.configService.get<'config' | 'api' | 'trial-accounts' | 'mixed'>('PROXY_SOURCE') ?? 'mixed';
    this.proxyApiUrl = this.configService.get<string>('PROXY_API_URL') || null;
    this.proxyApiKey = this.configService.get<string>('PROXY_API_KEY') || null;
    this.maxProxyFailCount = this.configService.get<number>('MAX_PROXY_FAIL_COUNT') ?? 3;
    this.proxyRefreshInterval = this.configService.get<number>('PROXY_REFRESH_INTERVAL_MS') ?? 60 * 60 * 1000;
    
    this.trialAccountsFilePath = path.join(process.cwd(), 'trial-accounts.json');
  }

  async onModuleInit() {
    await this.loadProxies();
    
    if (this.proxyRefreshInterval > 0) {
      setInterval(() => this.loadProxies(), this.proxyRefreshInterval);
    }
  }

  async loadProxies(): Promise<void> {
    try {
      this.proxies = [];
      
      if (this.proxySource === 'config' || this.proxySource === 'mixed') {
        await this.loadProxiesFromConfig();
      }
      
      if (this.proxySource === 'api' || this.proxySource === 'mixed') {
        await this.loadProxiesFromApi();
      }
      
      if (this.proxySource === 'trial-accounts' || this.proxySource === 'mixed') {
        await this.loadProxiesFromTrialAccounts();
      }

      this.activeProxies = [...this.proxies];
      this.logger.log(`${this.activeProxies.length} proxies chargés et actifs`);
    } catch (error) {
      this.logger.error(`Erreur lors du chargement des proxies: ${error.message}`);
      throw error;
    }
  }

  private async loadProxiesFromConfig(): Promise<void> {
    const proxyList = this.configService.get<string>('PROXY_LIST') ?? '';
    const proxyCredentials = this.configService.get<string>('PROXY_CREDENTIALS') ?? '';
    const proxyProtocol = this.configService.get<'http' | 'https' | 'socks4' | 'socks5'>('PROXY_PROTOCOL') ?? 'http';
    
    if (!proxyList) {
      this.logger.warn('Aucun proxy trouvé dans la configuration');
      return;
    }

    const proxies = proxyList.split(',');
    const credentials = proxyCredentials ? proxyCredentials.split(',') : [];

    const configProxies = proxies.map((proxyStr, index) => {
      const [host, portStr] = proxyStr.trim().split(':');
      const port = parseInt(portStr, 10);
      
      let username: string | undefined;
      let password: string | undefined;
      
      if (credentials[index]) {
        const [user, pass] = credentials[index].split(':');
        username = user;
        password = pass;
      }

      return {
        host,
        port,
        username,
        password,
        protocol: proxyProtocol,
        failCount: 0,
        lastUsed: new Date(0),
        provider: 'config'
      };
    });
    
    this.proxies.push(...configProxies);
    this.logger.log(`${configProxies.length} proxies chargés depuis la configuration`);
  }

  private async loadProxiesFromApi(): Promise<void> {
    if (!this.proxyApiUrl || !this.proxyApiKey) {
      this.logger.warn('URL ou clé API pour les proxies non configurée');
      return;
    }

    try {
      const response = await axios.get(this.proxyApiUrl, {
        headers: {
          'Authorization': `Bearer ${this.proxyApiKey}`
        }
      });

      if (response.data && Array.isArray(response.data.proxies)) {
        const apiProxies = response.data.proxies.map(p => ({
          host: p.ip || p.host,
          port: parseInt(p.port, 10),
          username: p.username,
          password: p.password,
          protocol: p.protocol || 'http',
          countryCode: p.country,
          failCount: 0,
          lastUsed: new Date(0),
          provider: 'api'
        }));
        
        this.proxies.push(...apiProxies);
        this.logger.log(`${apiProxies.length} proxies chargés depuis l'API`);
      } else {
        this.logger.warn('Format de réponse API de proxy inattendu');
      }
    } catch (error) {
      this.logger.error(`Erreur lors du chargement des proxies depuis l'API: ${error.message}`);
    }
  }

  private async loadProxiesFromTrialAccounts(): Promise<void> {
    try {
      // Vérifier l'existence du fichier
      if (!fs.existsSync(this.trialAccountsFilePath)) {
        this.logger.warn(`Fichier de comptes d'essai non trouvé: ${this.trialAccountsFilePath}`);
        // Créer un fichier exemple vide
        await this.createEmptyTrialAccountsFile();
        return;
      }

      // Lire le contenu du fichier
      const data = fs.readFileSync(this.trialAccountsFilePath, 'utf8').trim();
      
      // Vérifier si le fichier est vide
      if (!data) {
        this.logger.warn('Fichier de comptes d\'essai vide');
        await this.createEmptyTrialAccountsFile();
        return;
      }

      // Tenter de parser le JSON
      let accounts;
      try {
        accounts = JSON.parse(data);
      } catch (parseError) {
        this.logger.error(`JSON malformé dans ${this.trialAccountsFilePath}: ${parseError.message}`);
        this.logger.warn('Création d\'un nouveau fichier de comptes d\'essai');
        await this.createEmptyTrialAccountsFile();
        return;
      }

      // Vérifier que accounts est un tableau
      if (!Array.isArray(accounts)) {
        this.logger.error('Le fichier de comptes d\'essai doit contenir un tableau');
        await this.createEmptyTrialAccountsFile();
        return;
      }
      
      // Filtrer les comptes non expirés
      const now = new Date();
      const validAccounts = accounts.filter(account => {
        if (!account || typeof account !== 'object') return false;
        if (!account.expiresAt) return true;
        return new Date(account.expiresAt) > now;
      });
      
      let trialProxies: Proxy[] = [];
      
      for (const account of validAccounts) {
        if (account.proxies && Array.isArray(account.proxies) && account.proxies.length > 0) {
          const accountProxies = account.proxies
            .filter(p => p && p.host && p.port) // Filtrer les proxies invalides
            .map(p => ({
              host: p.host,
              port: p.port || 80,
              username: p.username,
              password: p.password,
              protocol: p.protocol || 'http',
              countryCode: p.countryCode,
              failCount: 0,
              lastUsed: new Date(0),
              provider: account.provider || 'trial'
            }));
          
          trialProxies.push(...accountProxies);
        }
      }
      
      this.proxies.push(...trialProxies);
      this.logger.log(`${trialProxies.length} proxies chargés depuis les comptes d'essai`);
      
    } catch (error) {
      this.logger.error(`Erreur lors du chargement des proxies depuis les comptes d'essai: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);
    }
  }

  // Nouvelle méthode pour créer un fichier exemple
  private async createEmptyTrialAccountsFile(): Promise<void> {
    const exampleContent = [
      {
        "provider": "example-provider",
        "email": "example@email.com",
        "expiresAt": "2025-12-31T23:59:59.000Z",
        "proxies": [
          {
            "host": "proxy.example.com",
            "port": 8080,
            "username": "user123",
            "password": "pass123",
            "protocol": "http",
            "countryCode": "US"
          }
        ]
      }
    ];

    try {
      fs.writeFileSync(
        this.trialAccountsFilePath, 
        JSON.stringify(exampleContent, null, 2), 
        'utf8'
      );
      this.logger.log(`Fichier exemple créé: ${this.trialAccountsFilePath}`);
    } catch (error) {
      this.logger.error(`Impossible de créer le fichier exemple: ${error.message}`);
    }
  }

  reportProxyFailure(proxy: Proxy): void {
    const proxyIndex = this.activeProxies.findIndex(
      p => p.host === proxy.host && p.port === proxy.port
    );

    if (proxyIndex !== -1) {
      this.activeProxies[proxyIndex].failCount = (this.activeProxies[proxyIndex].failCount || 0) + 1;
      
      if (this.activeProxies[proxyIndex].failCount >= this.maxProxyFailCount) {
        this.logger.warn(`Proxy ${proxy.host}:${proxy.port} désactivé après ${this.maxProxyFailCount} échecs`);
        this.activeProxies.splice(proxyIndex, 1);
      }
    }
  }

  reportProxySuccess(proxy: Proxy): void {
    const proxyIndex = this.activeProxies.findIndex(
      p => p.host === proxy.host && p.port === proxy.port
    );

    if (proxyIndex !== -1) {
      this.activeProxies[proxyIndex].failCount = 0;
    }
  }

  getProxyCount(): number {
    return this.activeProxies.length;
  }

  getTrialProxyCount(): number {
    return this.activeProxies.filter(p => p.provider !== 'config' && p.provider !== 'api').length;
  }

  formatProxyUrl(proxy: Proxy): string {
    if (!proxy) return 'null';
    
    const auth = proxy.username && proxy.password 
      ? `${proxy.username}:${proxy.password}@` 
      : '';
      
    return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
  }

  async prioritizeResidentialProxies() {
    this.activeProxies = this.proxies.filter(p => 
      p.provider?.includes('residential') || p.provider?.includes('mobile')
    );
  }

  async prioritizeTrialProxies(): Promise<void> {
    this.proxies = [];
    await this.loadProxiesFromTrialAccounts();
    
    if (this.proxies.length < 5 && this.proxySource === 'mixed') {
      this.logger.log('Pas assez de proxies d\'essai, chargement des sources additionnelles');
      await this.loadProxiesFromConfig();
      await this.loadProxiesFromApi();
    }
    
    this.activeProxies = [...this.proxies];
    this.logger.log(`Proxies priorisés: ${this.getTrialProxyCount()} proxies d'essai sur ${this.activeProxies.length} total`);
  }

  async testProxyPerformance(proxy: Proxy): Promise<boolean> {
    const startTime = Date.now();
    try {
      const response = await axios.get('http://httpbin.org/ip', {
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.username && proxy.password ? {
            username: proxy.username,
            password: proxy.password
          } : undefined
        },
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      this.updateProxyMetrics(proxy, true, responseTime);
      return true;
    } catch (error) {
      this.updateProxyMetrics(proxy, false, 0);
      return false;
    }
  }

  private updateProxyMetrics(proxy: Proxy, success: boolean, responseTime: number) {
    const proxyKey = `${proxy.host}:${proxy.port}`;
    const metrics = this.proxyPerformanceMetrics.get(proxyKey) || { success: 0, failures: 0, avgResponseTime: 0 };
    
    if (success) {
      metrics.success++;
      metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.success - 1) + responseTime) / metrics.success;
    } else {
      metrics.failures++;
    }
    
    this.proxyPerformanceMetrics.set(proxyKey, metrics);
  }

  getNextProxy(): Proxy | null {
    if (this.activeProxies.length === 0) {
      this.logger.warn('Aucun proxy actif disponible');
      return null;
    }

    let selectedProxy: Proxy;

    switch (this.proxyRotationStrategy) {
      case 'random':
        const randomIndex = Math.floor(Math.random() * this.activeProxies.length);
        selectedProxy = this.activeProxies[randomIndex];
        break;

      case 'least-used':
        // Utiliser les métriques de performance pour sélectionner le meilleur proxy
        const scoredProxies = this.activeProxies.map(proxy => {
          const key = `${proxy.host}:${proxy.port}`;
          const metrics = this.proxyPerformanceMetrics.get(key) || { success: 1, failures: 0, avgResponseTime: 1000 };
          const successRate = metrics.success / (metrics.success + metrics.failures);
          const score = successRate * (1000 / Math.max(1, metrics.avgResponseTime));
          return { proxy, score };
        });
        
        selectedProxy = scoredProxies.sort((a, b) => b.score - a.score)[0].proxy;
        break;

      case 'round-robin':
      default:
        selectedProxy = this.activeProxies[this.currentProxyIndex];
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.activeProxies.length;
        break;
    }

    selectedProxy.lastUsed = new Date();
    
    this.logger.debug(`Utilisation du proxy: ${selectedProxy.host}:${selectedProxy.port} (${selectedProxy.provider || 'inconnu'})`);
    return selectedProxy;
  }

  // Dans ProxyService, ajouter une vérification :
async testProxy(proxy: Proxy): Promise<boolean> {
  try {
    const response = await axios.get('https://www.airbnb.com', {
      proxy: {
        host: proxy.host,
        port: proxy.port,
        auth: proxy.username && proxy.password ? {
          username: proxy.username,
          password: proxy.password
        } : undefined
      },
      timeout: 10000
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
}