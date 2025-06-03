// src/modules/scraper/trial-automation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ConfigService } from '@nestjs/config';
import { TempEmailService } from './temp-email.service';
import { ProxyService } from './proxy.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';

interface TrialAccount {
  provider: string;
  email: string;
  password: string;
  createdAt: string;
  apiKey?: string;
  endpoint?: string;
  proxies?: any[];
  expiresAt?: string;
  lastUsed?: string;
}

@Injectable()
export class TrialAutomationService {
  private readonly logger = new Logger(TrialAutomationService.name);
  private browser: Browser | null = null;
  private readonly accountsFilePath: string;
  private accounts: TrialAccount[] = [];
  private readonly providers = [
    {
      name: 'smartproxy',
      signupUrl: 'https://dashboard.smartproxy.com/register',
      loginUrl: 'https://dashboard.smartproxy.com/login',
      trialDays: 3,
    },
{
  name: 'soax',
  signupUrl: 'https://dashboard.soax.com/sign-up',
  loginUrl: 'https://dashboard.soax.com/login',
  trialDays: 3,
  apiUrl: 'https://api.soax.com/v1/trial',
  format: (data) => data.proxies.map(p => ({
    host: p.host,
    port: p.port,
    protocol: 'http',
    countryCode: p.country,
    username: p.username,
    password: p.password
  })),
  active: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
},
    {
      name: 'oxylabs',
      signupUrl: 'https://oxylabs.io/products/proxy-products/residential-proxies',
      loginUrl: 'https://dashboard.oxylabs.io/login',
      trialDays: 7,
    },
    {
      name: 'bright-data',
      signupUrl: 'https://brightdata.com/cp/signup',
      loginUrl: 'https://brightdata.com/cp/login',
      trialDays: 7,
    },
    {
      name: 'geosurf',
      signupUrl: 'https://www.geosurf.com/plans-pricing/',
      loginUrl: 'https://www.geosurf.com/login',
      trialDays: 7,
    },
    {
      name: 'luminati',
      signupUrl: 'https://luminati.io/trial',
      loginUrl: 'https://luminati.io/login',
      trialDays: 7,
    },

  ];

  constructor(
    private configService: ConfigService,
    private tempEmailService: TempEmailService,
    private proxyService: ProxyService,
  ) {
    // Configurer puppeteer avec le plugin stealth
    puppeteer.use(StealthPlugin());
    
    // Chemin du fichier pour stocker les informations des comptes
    this.accountsFilePath = path.join(process.cwd(), 'trial-accounts.json');
    
    // Charger les comptes existants
    this.loadAccounts();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private loadAccounts(): void {
    try {
      if (fs.existsSync(this.accountsFilePath)) {
        const data = fs.readFileSync(this.accountsFilePath, 'utf8');
        this.accounts = JSON.parse(data);
        this.logger.log(`${this.accounts.length} comptes d'essai chargés`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors du chargement des comptes: ${error.message}`);
      this.accounts = [];
    }
  }

  private saveAccounts(): void {
    try {
      fs.writeFileSync(this.accountsFilePath, JSON.stringify(this.accounts, null, 2));
      this.logger.log(`${this.accounts.length} comptes d'essai sauvegardés`);
    } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde des comptes: ${error.message}`);
    }
  }

  async initBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    this.browser = await puppeteer.launch({
      headless: false, // Utiliser headless: false pour déboguer
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-notifications',
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
      defaultViewport: { width: 1920, height: 1080 },
    });
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async getValidTrialAccount(): Promise<TrialAccount | null> {
    // Filtrer les comptes valides (non expirés)
    const now = new Date();
    const validAccounts = this.accounts.filter(account => {
      if (!account.expiresAt) return true;
      return new Date(account.expiresAt) > now;
    });

    if (validAccounts.length === 0) {
      this.logger.log('Aucun compte d\'essai valide trouvé. Création d\'un nouveau compte...');
      return await this.createNewTrialAccount();
    }

    // Utiliser le compte le moins récemment utilisé
    validAccounts.sort((a, b) => {
      const aLastUsed = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const bLastUsed = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return aLastUsed - bLastUsed;
    });

    const account = validAccounts[0];
    account.lastUsed = new Date().toISOString();
    this.saveAccounts();

    return account;
  }

  async createNewTrialAccount(): Promise<TrialAccount | null> {
    // Choisir un fournisseur au hasard
    const provider = this.providers[Math.floor(Math.random() * this.providers.length)];
    
    try {
      await this.initBrowser();
      if (!this.browser) {
        throw new Error('Erreur d\'initialisation du navigateur');
      }

      const page = await this.browser.newPage();
      
      // Configurer un User-Agent réaliste
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Générer une adresse email temporaire
      const { email, mailboxId } = await this.tempEmailService.generateTempEmail();
      
      // Générer un mot de passe aléatoire
      const password = this.generateStrongPassword();

      this.logger.log(`Création d'un compte d'essai pour ${provider.name} avec l'email ${email}`);
      
      // Processus d'inscription spécifique au fournisseur
      let success = false;
      
      switch (provider.name) {
        case 'smartproxy':
          success = await this.signupSmartProxy(page, email, password);
          break;
        case 'oxylabs':
          success = await this.signupOxylabs(page, email, password);
          break;
        case 'bright-data':
          success = await this.signupBrightData(page, email, password);
          break;
        case 'geosurf':
          success = await this.signupGeosurf(page, email, password);
          break;
        case 'luminati':
          success = await this.signupLuminati(page, email, password);
          break;
        default:
          this.logger.warn(`Processus d'inscription non implémenté pour ${provider.name}`);
          return null;
      }
      
      if (!success) {
        this.logger.warn(`Échec de l'inscription pour ${provider.name}`);
        return null;
      }
      
      // Vérification de l'email si nécessaire
      const confirmationLink = await this.tempEmailService.checkEmailForConfirmation(
        mailboxId,
        provider.name,
        180 // Attendre jusqu'à 3 minutes pour l'email de confirmation
      );
      
      if (confirmationLink) {
        this.logger.log(`Lien de confirmation reçu: ${confirmationLink}`);
        
        // Visiter le lien de confirmation si c'est une URL
        if (confirmationLink.startsWith('http')) {
          await page.goto(confirmationLink, { waitUntil: 'networkidle2' });
          await this.delay(5000); // Attendre que la page soit complètement chargée
        }
      }
      
      // Récupérer les informations du compte (API key, endpoints, etc.)
      const accountInfo = await this.extractAccountInfo(page, provider.name);
      
      // Créer et sauvegarder le compte
      const newAccount: TrialAccount = {
        provider: provider.name,
        email,
        password,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + provider.trialDays * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date().toISOString(),
        ...accountInfo
      };
      
      this.accounts.push(newAccount);
      this.saveAccounts();
      
      return newAccount;
    } catch (error) {
      this.logger.error(`Erreur lors de la création du compte d'essai: ${error.message}`);
      return null;
    } finally {
      await this.closeBrowser();
    }
  }

  private generateStrongPassword(): string {
    // Générer un mot de passe fort avec au moins 12 caractères
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  private async simulateHumanTyping(page: Page, selector: string, text: string): Promise<void> {
    await page.waitForSelector(selector);
    
    // Cliquer sur le champ pour le focus
    await page.click(selector);
    
    // Taper caractère par caractère avec un délai aléatoire
    for (const char of text) {
      await page.type(selector, char, { delay: Math.random() * 150 + 50 });
      
      // Petite pause aléatoire occasionnelle pour simuler la réflexion humaine
      if (Math.random() < 0.1) {
        await this.delay(Math.random() * 500 + 200);
      }
    }
  }

  private async simulateHumanBehavior(page: Page): Promise<void> {
    // Simuler des mouvements de souris aléatoires
    const { width, height } = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));
    
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      await page.mouse.move(x, y, { steps: 10 });
      await this.delay(Math.random() * 300 + 100);
    }
    
    // Scroll aléatoire
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 500);
    });
    
    await this.delay(Math.random() * 1000 + 500);
  }

  // Implémentations spécifiques pour chaque fournisseur
  private async signupSmartProxy(page: Page, email: string, password: string): Promise<boolean> {
    try {
      // Accéder à la page d'inscription
      await page.goto('https://dashboard.smartproxy.com/register', {
        waitUntil: 'networkidle2'
      });
      
      // Simuler un comportement humain
      await this.simulateHumanBehavior(page);
      
      // Remplir le formulaire d'inscription
      await this.simulateHumanTyping(page, 'input[name="email"]', email);
      await this.simulateHumanTyping(page, 'input[name="password"]', password);
      await this.simulateHumanTyping(page, 'input[name="confirmPassword"]', password);
      
      // Accepter les termes et conditions
      await page.click('input[type="checkbox"]');
      
      // Soumettre le formulaire
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
      
      // Vérifier si l'inscription a réussi
      const successIndicator = await page.evaluate(() => {
        return document.body.textContent?.includes('trial') || 
               document.body.textContent?.includes('dashboard') ||
               window.location.href.includes('dashboard');
      });
      
      return successIndicator;
    } catch (error) {
      this.logger.error(`Erreur lors de l'inscription à SmartProxy: ${error.message}`);
      return false;
    }
  }

  private async signupOxylabs(page: Page, email: string, password: string): Promise<boolean> {
    try {
      // Accéder à la page d'inscription
      await page.goto('https://dashboard.oxylabs.io/registration', {
        waitUntil: 'networkidle2'
      });
      
      // Simuler un comportement humain
      await this.simulateHumanBehavior(page);
      
      // Remplir le formulaire d'inscription
      await this.simulateHumanTyping(page, 'input[name="email"]', email);
      await this.simulateHumanTyping(page, 'input[name="password"]', password);
      await this.simulateHumanTyping(page, 'input[name="confirmPassword"]', password);
      
      // Choisir le type d'utilisation (souvent une question sur l'utilisation prévue)
      const useCaseSelect = await page.$('select[name="useCase"]');
      if (useCaseSelect) {
        await page.select('select[name="useCase"]', 'data_collection');
      }
      
      // Accepter les termes et conditions
      await page.click('input[type="checkbox"]');
      
      // Soumettre le formulaire
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
      
      // Vérifier si l'inscription a réussi
      const successIndicator = await page.evaluate(() => {
        return document.body.textContent?.includes('trial') || 
               document.body.textContent?.includes('dashboard') ||
               window.location.href.includes('dashboard');
      });
      
      return successIndicator;
    } catch (error) {
      this.logger.error(`Erreur lors de l'inscription à Oxylabs: ${error.message}`);
      return false;
    }
  }

  private async signupBrightData(page: Page, email: string, password: string): Promise<boolean> {
    try {
      // Accéder à la page d'inscription
      await page.goto('https://brightdata.com/cp/signup', {
        waitUntil: 'networkidle2'
      });
      
      // Simuler un comportement humain
      await this.simulateHumanBehavior(page);
      
      // Remplir le formulaire d'inscription
      await this.simulateHumanTyping(page, 'input[type="email"]', email);
      await this.simulateHumanTyping(page, 'input[type="password"]', password);
      
      // Remplir des informations supplémentaires si nécessaires
      const firstNameSelector = 'input[name="firstName"]';
      const lastNameSelector = 'input[name="lastName"]';
      
      if (await page.$(firstNameSelector)) {
        await this.simulateHumanTyping(page, firstNameSelector, 'John');
      }
      
      if (await page.$(lastNameSelector)) {
        await this.simulateHumanTyping(page, lastNameSelector, 'Doe');
      }

      // Choix de l'usage si présent
      const usageSelector = 'select[name="usage"]';
      if (await page.$(usageSelector)) {
        await page.select(usageSelector, 'web_scraping');
      }
      
      // Accepter les termes et conditions
      const termsSelector = 'input[type="checkbox"]';
      if (await page.$(termsSelector)) {
        await page.click(termsSelector);
      }
      
      // Soumettre le formulaire
      const submitButtonSelector = 'button[type="submit"]';
      await Promise.all([
        page.click(submitButtonSelector),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
      ]);
      
      // Vérifier si l'inscription a réussi
      const successIndicator = await page.evaluate(() => {
        return document.body.textContent?.includes('trial') || 
               document.body.textContent?.includes('dashboard') ||
               window.location.href.includes('dashboard');
      });
      
      return successIndicator;
    } catch (error) {
      this.logger.error(`Erreur lors de l'inscription à BrightData: ${error.message}`);
      return false;
    }
  }

  private async signupGeosurf(page: Page, email: string, password: string): Promise<boolean> {
    try {
      // Accéder à la page d'inscription
      await page.goto('https://www.geosurf.com/plans-pricing/', {
        waitUntil: 'networkidle2'
      });
      
      // Simuler un comportement humain
      await this.simulateHumanBehavior(page);
      
      // Chercher et cliquer sur le bouton d'essai gratuit
      const trialButtonSelectors = [
        'a[href*="signup"][href*="trial"]',
        'a:contains("Free Trial")',
        'button:contains("Start Free Trial")'
      ];
      
      let trialButtonFound = false;
      for (const selector of trialButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            trialButtonFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!trialButtonFound) {
        this.logger.warn('Bouton d\'essai gratuit non trouvé sur GeoSurf');
        return false;
      }
      
      // Remplir le formulaire d'inscription
      await this.simulateHumanTyping(page, 'input[type="email"]', email);
      await this.simulateHumanTyping(page, 'input[type="password"]', password);
      
      // Remplir des informations supplémentaires
      const nameSelector = 'input[name="name"]';
      if (await page.$(nameSelector)) {
        await this.simulateHumanTyping(page, nameSelector, 'John Doe');
      }
      
      const companySelector = 'input[name="company"]';
      if (await page.$(companySelector)) {
        await this.simulateHumanTyping(page, companySelector, 'Personal Use');
      }
      
      // Accepter les termes et conditions
      const termsSelector = 'input[type="checkbox"]';
      if (await page.$(termsSelector)) {
        await page.click(termsSelector);
      }
      
      // Soumettre le formulaire
      const submitButtonSelector = 'button[type="submit"]';
      await Promise.all([
        page.click(submitButtonSelector),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
      ]);
      
      // Vérifier si l'inscription a réussi
      const successIndicator = await page.evaluate(() => {
        return document.body.textContent?.includes('trial') || 
               document.body.textContent?.includes('dashboard') ||
               window.location.href.includes('dashboard');
      });
      
      return successIndicator;
    } catch (error) {
      this.logger.error(`Erreur lors de l'inscription à GeoSurf: ${error.message}`);
      return false;
    }
  }

  private async signupLuminati(page: Page, email: string, password: string): Promise<boolean> {
    try {
      // Accéder à la page d'inscription
      await page.goto('https://luminati.io/trial', {
        waitUntil: 'networkidle2'
      });
      
      // Simuler un comportement humain
      await this.simulateHumanBehavior(page);
      
      // Remplir le formulaire d'inscription
      await this.simulateHumanTyping(page, 'input[type="email"]', email);
      await this.simulateHumanTyping(page, 'input[type="password"]', password);
      
      // Remplir des informations supplémentaires
      const nameSelector = 'input[name="fullName"]';
      if (await page.$(nameSelector)) {
        await this.simulateHumanTyping(page, nameSelector, 'John Doe');
      }
      
      const phoneSelector = 'input[name="phone"]';
      if (await page.$(phoneSelector)) {
        await this.simulateHumanTyping(page, phoneSelector, '+33123456789');
      }
      
      // Choisir le cas d'utilisation
      const useCaseSelector = 'select[name="useCase"]';
      if (await page.$(useCaseSelector)) {
        await page.select(useCaseSelector, 'web_scraping');
      }
      
      // Accepter les termes et conditions
      const termsSelector = 'input[type="checkbox"]';
      if (await page.$(termsSelector)) {
        await page.click(termsSelector);
      }
      
      // Soumettre le formulaire
      const submitButtonSelector = 'button[type="submit"]';
      await Promise.all([
        page.click(submitButtonSelector),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
      ]);
      
      // Vérifier si l'inscription a réussi
      const successIndicator = await page.evaluate(() => {
        return document.body.textContent?.includes('trial') || 
               document.body.textContent?.includes('dashboard') ||
               window.location.href.includes('dashboard');
      });
      
      return successIndicator;
    } catch (error) {
      this.logger.error(`Erreur lors de l'inscription à Luminati: ${error.message}`);
      return false;
    }
  }

  /**
   * Extrait les informations du compte après l'inscription
   */
  private async extractAccountInfo(page: Page, providerName: string): Promise<Partial<TrialAccount>> {
    this.logger.log(`Extraction des informations du compte ${providerName}`);
    
    try {
      switch (providerName) {
        case 'smartproxy':
          return await this.extractSmartProxyInfo(page);
        case 'oxylabs':
          return await this.extractOxylabsInfo(page);
        case 'bright-data':
          return await this.extractBrightDataInfo(page);
        case 'geosurf':
          return await this.extractGeosurfInfo(page);
        case 'luminati':
          return await this.extractLuminatiInfo(page);
        default:
          return {};
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'extraction des informations: ${error.message}`);
      return {};
    }
  }

  private async extractSmartProxyInfo(page: Page): Promise<Partial<TrialAccount>> {
    await this.delay(2000); // Attendre un peu que la page soit stable
    
    // Naviguer vers la page des API keys si elle existe
    try {
      const apiKeyPageSelector = 'a[href*="api-keys"]';
      if (await page.$(apiKeyPageSelector)) {
        await page.click(apiKeyPageSelector);
        await this.delay(2000);
      }
    } catch (e) {
      this.logger.warn('Impossible de naviguer vers la page des API keys');
    }
    
    // Extraire l'API key si elle est disponible
    let apiKey = '';
    try {
        apiKey = await page.evaluate(() => {
            const apiKeyElement =
              document.querySelector('.api-key') ||
              document.querySelector('[data-testid="api-key"]') ||
              document.querySelector('input[placeholder*="API"]');
          
            if (!apiKeyElement) return '';
          
            if (apiKeyElement instanceof HTMLInputElement) {
              return apiKeyElement.value;
            }
          
            return apiKeyElement.textContent?.trim() || '';
          });
          
    } catch (e) {
      this.logger.warn(`Erreur lors de l'extraction de l'API key: ${e.message}`);
    }
    
    // Extraire les endpoints des proxies
    let endpoint: string | null = '';
    try {
      endpoint = await page.evaluate(() => {
        const endpointElement = document.querySelector('.endpoint-url') ||
                              document.querySelector('[data-testid="endpoint-url"]');
        return endpointElement ? endpointElement.textContent : '';
      });
    } catch (e) {
      this.logger.warn(`Erreur lors de l'extraction de l'endpoint: ${e.message}`);
    }
    
    return { 
      apiKey: apiKey || undefined,
      endpoint: endpoint || undefined
    };
  }

  private async extractOxylabsInfo(page: Page): Promise<Partial<TrialAccount>> {
    await this.delay(2000);
    
    // Naviguer vers la page des informations d'API si elle existe
    try {
      const apiPageSelector = 'a[href*="api"], a[href*="credentials"]';
      if (await page.$(apiPageSelector)) {
        await page.click(apiPageSelector);
        await this.delay(2000);
      }
    } catch (e) {
      this.logger.warn('Impossible de naviguer vers la page des credentials');
    }
    
    // Extraire l'API key et le username/password
    let apiKey = '';
    let username = '';
    let password = '';
    
    try {
        const credentials = await page.evaluate(() => {
            const apiKeyElement = document.querySelector('[data-testid="api-key"]') ||
                                 document.querySelector('input[placeholder*="API"]') as HTMLInputElement;
            
            const usernameElement = document.querySelector('[data-testid="username"]') ||
                                   document.querySelector('input[name="username"]') as HTMLInputElement;
            
            const passwordElement = document.querySelector('[data-testid="password"]') ||
                                   document.querySelector('input[name="password"]') as HTMLInputElement;
            
            return {
              apiKey: apiKeyElement ? (apiKeyElement.textContent || (apiKeyElement as HTMLInputElement).value) : '',
              username: usernameElement ? (usernameElement.textContent || (usernameElement as HTMLInputElement).value) : '',
              password: passwordElement ? (passwordElement.textContent || (passwordElement as HTMLInputElement).value) : ''
            };
          });
      
      apiKey = credentials.apiKey;
      username = credentials.username;
      password = credentials.password;
    } catch (e) {
      this.logger.warn(`Erreur lors de l'extraction des credentials: ${e.message}`);
    }
    
    // Extraire l'endpoint
    let endpoint: string | null = '';
    try {
      endpoint = await page.evaluate(() => {
        const endpointElement = document.querySelector('.endpoint-url') ||
                              document.querySelector('[data-testid="proxy-url"]');
        return endpointElement ? endpointElement.textContent : '';
      });
    } catch (e) {
      this.logger.warn(`Erreur lors de l'extraction de l'endpoint: ${e.message}`);
    }
    
    return { 
      apiKey: apiKey || undefined,
      endpoint: endpoint || undefined,
      proxies: username && password ? [{ username, password }] : undefined
    };
  }

// Correction pour la méthode extractBrightDataInfo autour de la ligne 880

private async extractBrightDataInfo(page: Page): Promise<Partial<TrialAccount>> {
    await this.delay(2000);
  
    // Naviguer vers la page des API si elle existe
    try {
      const apiPageSelector = 'a[href*="api"], a[href*="credentials"]';
      if (await page.$(apiPageSelector)) {
        await page.click(apiPageSelector);
        await this.delay(2000);
      }
    } catch (e) {
      this.logger.warn('Impossible de naviguer vers la page des API keys');
    }
  
    // Extraire l'API key
    let apiKey = '';
    try {
      apiKey = await page.evaluate(() => {
        const apiKeyElement =
          document.querySelector('[data-testid="api-key"]') ||
          document.querySelector('input[placeholder*="API"]') ||
          Array.from(document.querySelectorAll('code')).find(el => el.textContent?.includes('Bearer'));
  
        if (!apiKeyElement) return '';
  
        let text = '';
  
        if (apiKeyElement instanceof HTMLInputElement) {
          text = apiKeyElement.value;
        } else {
          text = apiKeyElement.textContent || '';
        }
  
        // Enlever "Bearer" si présent
        return text.replace(/Bearer\s*/i, '').trim();
      });
  
    } catch (e) {
      this.logger.warn(`Erreur lors de l'extraction de l'API key: ${e.message}`);
    }
  
    // Extraire les informations de proxy - CORRECTION ICI
    let proxyUsername = '';  // Changer de string | undefined à string
    let proxyPassword = '';  // Changer de string | undefined à string
    let proxyHost = '';      // Changer de string | undefined à string
    let proxyPort = '';      // Changer de string | undefined à string
  
    try {
      const proxyInfo = await page.evaluate(() => {
        const usernameElement = document.querySelector('[data-testid="proxy-username"]') ||
                              document.querySelector('input[name="proxy_username"]');
  
        const passwordElement = document.querySelector('[data-testid="proxy-password"]') ||
                              document.querySelector('input[name="proxy_password"]');
  
        const hostElement = document.querySelector('[data-testid="proxy-host"]') ||
                           document.querySelector('input[name="proxy_host"]');
  
        const portElement = document.querySelector('[data-testid="proxy-port"]') ||
                           document.querySelector('input[name="proxy_port"]');
  
        return {
          username: usernameElement ? 
            (usernameElement.textContent || (usernameElement as HTMLInputElement).value || '') : '',
          password: passwordElement ? 
            (passwordElement.textContent || (passwordElement as HTMLInputElement).value || '') : '',
          host: hostElement ? 
            (hostElement.textContent || (hostElement as HTMLInputElement).value || '') : '',
          port: portElement ? 
            (portElement.textContent || (portElement as HTMLInputElement).value || '') : ''
        };
      });
      
      // CORRECTION ICI - Utiliser l'opérateur || pour fournir une valeur par défaut
      proxyUsername = proxyInfo.username || '';
      proxyPassword = proxyInfo.password || '';
      proxyHost = proxyInfo.host || '';
      proxyPort = proxyInfo.port || '';
    } catch (e) {
      this.logger.warn(`Erreur lors de l'extraction des informations de proxy: ${e.message}`);
    }
  
    return {
      apiKey: apiKey || undefined,
      endpoint: proxyHost ? `${proxyHost}:${proxyPort}` : undefined,
      proxies: proxyUsername && proxyPassword ? [{
        username: proxyUsername,
        password: proxyPassword,
        host: proxyHost,
        port: parseInt(proxyPort) || 80
      }] : undefined
    };
  }

  private async extractGeosurfInfo(page: Page): Promise<Partial<TrialAccount>> {
    await this.delay(2000);
    
    // Extraire les informations de proxy depuis le dashboard
    let proxyUsername = '';
    let proxyPassword = '';
    let proxyHost = '';
    let proxyPort = '';
    
    try {
      const proxyInfo = await page.evaluate(() => {
        // Essayons de trouver les éléments contenant les infos de proxy
        const proxySection = document.querySelector('.proxy-info') ||
                            document.querySelector('.credentials') ||
                            document.querySelector('.account-details');
        
        if (!proxySection) return {
          username: '',
          password: '',
          host: '',
          port: '80'
        };
        
        const text = proxySection.textContent || '';
        
        // Extraction par pattern matching
        const usernameMatch = text.match(/username[:\s]+([^\s]+)/i);
        const passwordMatch = text.match(/password[:\s]+([^\s]+)/i);
        const hostMatch = text.match(/host[:\s]+([^\s]+)/i);
        const portMatch = text.match(/port[:\s]+([0-9]+)/i);
        
        return {
          username: usernameMatch ? usernameMatch[1] : '',
          password: passwordMatch ? passwordMatch[1] : '',
          host: hostMatch ? hostMatch[1] : '',
          port: portMatch ? portMatch[1] : '80'
        };
      });
      
      // CORRECTION: Utiliser l'opérateur || pour assigner une valeur par défaut
      proxyUsername = proxyInfo.username || '';
      proxyPassword = proxyInfo.password || '';
      proxyHost = proxyInfo.host || '';
      proxyPort = proxyInfo.port || '80';
    } catch (e) {
      this.logger.warn(`Erreur lors de l'extraction des informations de proxy: ${e.message}`);
    }
    
    return {
      proxies: proxyUsername && proxyPassword ? [{
        username: proxyUsername,
        password: proxyPassword,
        host: proxyHost || 'geo.geosurf.io',
        port: parseInt(proxyPort) || 80
      }] : undefined
    };
  }

  private async extractLuminatiInfo(page: Page): Promise<Partial<TrialAccount>> {
    await this.delay(2000);
    
    // Naviguer vers la page des API si elle existe
    try {
      const apiPageSelector = 'a[href*="api"], a[href*="credentials"]';
      if (await page.$(apiPageSelector)) {
        await page.click(apiPageSelector);
        await this.delay(2000);
      }
    } catch (e) {
      this.logger.warn('Impossible de naviguer vers la page des API keys');
    }
    
    // Extraire l'API key
    let apiKey = '';
    try {
        apiKey = await page.evaluate(() => {
            const apiKeyElement =
              document.querySelector('[data-testid="api-key"]') ||
              document.querySelector('input[placeholder*="API"]') ||
              Array.from(document.querySelectorAll('code')).find(el => el.textContent?.includes('Bearer'));
          
            if (!apiKeyElement) return '';
          
            let text = '';
          
            if (apiKeyElement instanceof HTMLInputElement) {
              text = apiKeyElement.value;
            } else {
              text = apiKeyElement.textContent || '';
            }
          
            return text.replace(/Bearer\s*/i, '').trim();
          });
          
    } catch (e) {
      this.logger.warn(`Erreur lors de l'extraction de l'API key: ${e.message}`);
    }
    
    // Extraire les informations de proxy
    let proxyUsername = '';
    let proxyPassword = '';
    let proxyZone = '';
    
    try {
        const proxyInfo = await page.evaluate(() => {
            const usernameElement = document.querySelector('[data-testid="proxy-username"]') ||
                                  document.querySelector('input[name="proxy_username"]');
            
            const passwordElement = document.querySelector('[data-testid="proxy-password"]') ||
                                  document.querySelector('input[name="proxy_password"]');
            
            const zoneElement = document.querySelector('[data-testid="proxy-zone"]') ||
                               document.querySelector('input[name="proxy_zone"]');
            
            return {
              username: usernameElement ? 
                (usernameElement.textContent || (usernameElement as HTMLInputElement).value || '') : '',
              password: passwordElement ? 
                (passwordElement.textContent || (passwordElement as HTMLInputElement).value || '') : '',
              zone: zoneElement ? 
                (zoneElement.textContent || (zoneElement as HTMLInputElement).value || '') : ''
            };
          });
      
      proxyUsername = proxyInfo.username;
      proxyPassword = proxyInfo.password;
      proxyZone = proxyInfo.zone;
    } catch (e) {
      this.logger.warn(`Erreur lors de l'extraction des informations de proxy: ${e.message}`);
    }
    
    return {
      apiKey: apiKey || undefined,
      endpoint: proxyZone ? `zproxy.luminati.io:22225` : undefined,
      proxies: proxyUsername && proxyPassword ? [{
        username: `${proxyUsername}-zone-${proxyZone}`,
        password: proxyPassword,
        host: 'zproxy.luminati.io',
        port: 22225
      }] : undefined
    };
  }

  /**
   * Méthode principale pour gérer l'automatisation complète
   */
  async runFullAutomation(): Promise<TrialAccount[]> {
    const successfulAccounts: TrialAccount[] = [];
    
    try {
      // Essayer de créer des comptes pour chaque fournisseur
      for (const provider of this.providers) {
        try {
          this.logger.log(`Tentative de création d'un compte pour ${provider.name}`);
          
          const account = await this.createNewTrialAccount();
          if (account) {
            successfulAccounts.push(account);
            this.logger.log(`Compte créé avec succès pour ${provider.name}`);
            
            // Attendre un peu avant le prochain essai
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        } catch (error) {
          this.logger.error(`Échec pour ${provider.name}: ${error.message}`);
        }
      }
      
      return successfulAccounts;
    } catch (error) {
      this.logger.error(`Erreur dans l'automatisation complète: ${error.message}`);
      return successfulAccounts;
    }
  }

  /**
   * Nettoie les comptes expirés
   */
  async cleanupExpiredAccounts(): Promise<void> {
    const now = new Date();
    const initialCount = this.accounts.length;
    
    this.accounts = this.accounts.filter(account => {
      if (!account.expiresAt) return true;
      return new Date(account.expiresAt) > now;
    });
    
    if (this.accounts.length < initialCount) {
      this.logger.log(`Suppression de ${initialCount - this.accounts.length} comptes expirés`);
      this.saveAccounts();
    }
  }

  /**
   * Vérifie la validité des comptes existants
   */
  async validateExistingAccounts(): Promise<{ valid: TrialAccount[]; invalid: TrialAccount[] }> {
    const result = {
      valid: [] as TrialAccount[],
      invalid: [] as TrialAccount[]
    };
    
    for (const account of this.accounts) {
      try {
        // Vérifier si le compte est expiré
        if (account.expiresAt && new Date(account.expiresAt) <= new Date()) {
          result.invalid.push(account);
          continue;
        }
        
        // Tester la connexion avec l'API du fournisseur
        let isValid = false;
        
        switch (account.provider) {
          case 'smartproxy':
            isValid = await this.testSmartProxyAccount(account);
            break;
          case 'oxylabs':
            isValid = await this.testOxylabsAccount(account);
            break;
          case 'bright-data':
            isValid = await this.testBrightDataAccount(account);
            break;
          case 'geosurf':
            isValid = await this.testGeosurfAccount(account);
            break;
          case 'luminati':
            isValid = await this.testLuminatiAccount(account);
            break;
          default:
            isValid = false;
        }
        
        if (isValid) {
          result.valid.push(account);
        } else {
          result.invalid.push(account);
        }
      } catch (error) {
        this.logger.warn(`Erreur lors de la validation du compte ${account.email}: ${error.message}`);
        result.invalid.push(account);
      }
    }
    
    // Mettre à jour la liste des comptes si certains sont invalides
    if (result.invalid.length > 0) {
      this.accounts = result.valid;
      this.saveAccounts();
    }
    
    return result;
  }

  // Méthodes de test pour chaque fournisseur
  private async testSmartProxyAccount(account: TrialAccount): Promise<boolean> {
    try {
      if (!account.apiKey) return false;
      
      const response = await axios.get('https://api.smartproxy.com/v1/account', {
        headers: {
          'Authorization': `Bearer ${account.apiKey}`
        },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async testOxylabsAccount(account: TrialAccount): Promise<boolean> {
    try {
      if (!account.apiKey) return false;
      
      const response = await axios.get('https://api.oxylabs.io/v1/account', {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${account.apiKey}:`).toString('base64')}`
        },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async testBrightDataAccount(account: TrialAccount): Promise<boolean> {
    try {
      if (!account.apiKey) return false;
      
      const response = await axios.get('https://api.brightdata.com/account', {
        headers: {
          'Authorization': `Bearer ${account.apiKey}`
        },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async testGeosurfAccount(account: TrialAccount): Promise<boolean> {
    try {
      if (!account.proxies || account.proxies.length === 0) return false;
      
      const proxy = account.proxies[0];
      const response = await axios.get('http://api.myip.com', {
        proxy: {
          host: proxy.host || 'geo.geosurf.io',
          port: proxy.port || 80,
          auth: {
            username: proxy.username,
            password: proxy.password
          }
        },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async testLuminatiAccount(account: TrialAccount): Promise<boolean> {
    try {
      if (!account.proxies || account.proxies.length === 0) return false;
      
      const proxy = account.proxies[0];
      const response = await axios.get('http://api.myip.com', {
        proxy: {
          host: proxy.host || 'zproxy.luminati.io',
          port: proxy.port || 22225,
          auth: {
            username: proxy.username,
            password: proxy.password
          }
        },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}