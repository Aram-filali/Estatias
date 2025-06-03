import { Injectable, Logger } from '@nestjs/common';
import { Browser, Page, ElementHandle, HTTPRequest, HTTPResponse } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface CaptchaServiceProviderConfig {
  apiKey: string;
  serviceUrl: string;
  active: boolean;
  priority: number;
  successRate: number;
}

interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'socks5';
  location: string;
  active: boolean;
}

interface BrowserProfile {
  userAgent: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  locale: string;
  timezone: string;
  acceptLanguage: string;
}

declare global {
  interface Window {
    grecaptcha?: {
      reset(widgetId: number): void;
      execute(widgetId: number): void;
      getResponse(widgetId?: number): string;
    };
    hcaptcha?: {
      reset(widgetId: number): void;
      execute(widgetId: number): void;
      getResponse(widgetId?: number): string;
    };
  }
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly tempDir: string;
  private readonly manualFallback: boolean;
  private readonly maxAttempts: number;
  private  serviceProviders: Map<string, CaptchaServiceProviderConfig>;
  private readonly proxies: ProxyConfig[];
  private readonly browserProfiles: BrowserProfile[];
  private readonly captchaTimeout: number;
  private readonly siteSpecificConfig: Map<string, any>;
  
  // Statistiques et optimisation
  private captchaStats: {
    totalDetected: number;
    byType: Record<string, number>;
    solved: number;
    failed: number;
    byService: Record<string, { success: number; failure: number }>;
  } = {
    totalDetected: 0,
    byType: {},
    solved: 0,
    failed: 0,
    byService: {}
  };

  constructor(private configService: ConfigService) {
    // Configuration des répertoires
    this.tempDir = path.join(process.cwd(), 'captcha_temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // Configuration générale
    this.manualFallback = this.configService.get<string>('CAPTCHA_MANUAL_FALLBACK') !== 'false';
    this.maxAttempts = parseInt(this.configService.get<string>('CAPTCHA_MAX_ATTEMPTS', '5'), 10);
    this.captchaTimeout = parseInt(this.configService.get<string>('CAPTCHA_TIMEOUT', '180000'), 10);
    
    // Configuration des services de résolution
    this.initializeServiceProviders();
    
    // Configuration des proxies
    this.proxies = this.initializeProxies();
    
    // Configuration des profils de navigateur
    this.browserProfiles = this.initializeBrowserProfiles();
    
    // Configuration spécifique par site
    this.siteSpecificConfig = this.initializeSiteConfig();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gestion avancée de Cloudflare
   */
  async handleCloudflareAdvanced(page: Page): Promise<boolean> {
    this.logger.log('Gestion avancée Cloudflare');
    
    try {
      // 1. Attendre le chargement initial
      await this.delay(5000);
      
      // 2. Simuler un comportement humain
      await this.simulateHumanBehavior(page);
      
      // 3. Attendre la résolution automatique
      const maxWaitTime = 45000; // 45 secondes
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        // Vérifier si la page a changé
        const currentUrl = page.url();
        const content = await page.content();
        
        if (!content.toLowerCase().includes('just a moment') && 
            !content.toLowerCase().includes('checking your browser') &&
            !currentUrl.includes('__cf_chl_')) {
          
          this.logger.log('Cloudflare contourné avec succès');
          await this.delay(2000); // Attendre la stabilisation
          return true;
        }
        
        // Simuler des interactions périodiques
        if ((Date.now() - startTime) % 10000 < 1000) {
          await this.simulateHumanBehavior(page);
        }
        
        await this.delay(2000);
      }
      
      // Si l'attente n'a pas suffi, essayer un refresh
      this.logger.log('Tentative de refresh pour Cloudflare');
      await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
      await this.delay(10000);
      
      return !(await this.detectCaptcha(page));
    } catch (error) {
      this.logger.error(`Erreur Cloudflare avancé: ${error.message}`);
      return false;
    }
  }

  /**
   * Gestion de Cloudflare Turnstile
   */
  async handleCloudflareTurnstile(page: Page): Promise<boolean> {
    this.logger.log('Gestion Cloudflare Turnstile');
    
    try {
      // Essayer les services externes prioritaires pour Turnstile
      const prioritizedServices = this.getPrioritizedServices('cloudflare_turnstile');
      
      for (const serviceName of prioritizedServices) {
        const config = this.serviceProviders.get(serviceName);
        if (!config?.active) continue;
        
        this.logger.log(`Tentative avec ${serviceName} pour Turnstile`);
        
        if (await this.solveTurnstileWithService(page, serviceName, config)) {
          this.updateServiceStats(serviceName, true);
          return true;
        } else {
          this.updateServiceStats(serviceName, false);
        }
      }
      
      // Fallback vers attente passive
      return await this.handleCloudflareAdvanced(page);
    } catch (error) {
      this.logger.error(`Erreur Turnstile: ${error.message}`);
      return false;
    }
  }

  /**
   * Simulation de comportement humain avancée
   */
  async simulateHumanBehavior(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        // Simuler des mouvements de souris naturels
        const moveCount = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < moveCount; i++) {
          setTimeout(() => {
            const x = Math.floor(Math.random() * window.innerWidth);
            const y = Math.floor(Math.random() * window.innerHeight);
            
            const event = new MouseEvent('mousemove', {
              clientX: x,
              clientY: y,
              bubbles: true
            });
            
            document.dispatchEvent(event);
          }, Math.random() * 1000);
        }
        
        // Simuler des événements de clavier
        setTimeout(() => {
          const keyEvent = new KeyboardEvent('keydown', {
            key: 'Tab',
            code: 'Tab',
            bubbles: true
          });
          document.dispatchEvent(keyEvent);
        }, Math.random() * 2000);
        
        // Simuler un scroll léger
        setTimeout(() => {
          window.scrollBy(0, Math.floor(Math.random() * 100) + 50);
        }, Math.random() * 3000);
      });
      
      // Attendre un délai aléatoire
      await this.delay(Math.random() * 2000 + 1000);
    } catch (error) {
      this.logger.warn(`Erreur simulation comportement: ${error.message}`);
    }
  }

  /**
   * Résolution Turnstile avec service externe
   */
  async solveTurnstileWithService(
    page: Page, 
    serviceName: string, 
    config: CaptchaServiceProviderConfig
  ): Promise<boolean> {
    try {
      // Extraire les paramètres Turnstile
      const siteKey = await page.evaluate(() => {
        const turnstileElement = document.querySelector('[data-sitekey]');
        if (turnstileElement) {
          return turnstileElement.getAttribute('data-sitekey');
        }
        
        // Chercher dans les scripts
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
          const content = script.textContent || '';
          const match = content.match(/sitekey['"]\s*:\s*['"]([^'"]+)['"]/);
          if (match) return match[1];
        }
        
        return null;
      });
      
      if (!siteKey) {
        this.logger.warn('Impossible de trouver la clé Turnstile');
        return false;
      }
      
      const url = page.url();
      
      // Utiliser le service approprié
      if (serviceName === 'capsolver') {
        return await this.solveTurnstileWithCapSolver(page, siteKey, url, config);
      } else if (serviceName === '2captcha') {
        return await this.solveTurnstileWith2Captcha(page, siteKey, url, config);
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Erreur résolution Turnstile: ${error.message}`);
      return false;
    }
  }

  /**
   * Résolution avec CapSolver (service performant pour Turnstile)
   */
  async solveTurnstileWithCapSolver(
    page: Page,
    siteKey: string,
    url: string,
    config: CaptchaServiceProviderConfig
  ): Promise<boolean> {
    try {
      // Créer la tâche
      const createResponse = await axios.post(`${config.serviceUrl}/createTask`, {
        clientKey: config.apiKey,
        task: {
          type: 'AntiTurnstileTaskProxyLess',
          websiteURL: url,
          websiteKey: siteKey,
          metadata: {
            action: 'verify',
            cdata: ''
          }
        }
      });
      
      if (createResponse.data.errorId !== 0) {
        this.logger.error(`Erreur CapSolver: ${createResponse.data.errorDescription}`);
        return false;
      }
      
      const taskId = createResponse.data.taskId;
      
      // Attendre la résolution
      let solution: string | null = null;
      const startTime = Date.now();
      
      while (Date.now() - startTime < this.captchaTimeout) {
        await this.delay(5000);
        
        const resultResponse = await axios.post(`${config.serviceUrl}/getTaskResult`, {
          clientKey: config.apiKey,
          taskId: taskId
        });
        
        if (resultResponse.data.status === 'ready') {
          solution = resultResponse.data.solution.token;
          break;
        }
        
        if (resultResponse.data.status === 'failed') {
          this.logger.error(`CapSolver failed: ${resultResponse.data.errorDescription}`);
          return false;
        }
      }
      
      if (!solution) {
        this.logger.error('Timeout CapSolver');
        return false;
      }
      
      // Injecter la solution
      await page.evaluate((token) => {
        const responseInputs = document.querySelectorAll('input[name="cf-turnstile-response"]');
        responseInputs.forEach(input => {
          (input as HTMLInputElement).value = token;
        });
        
        // Déclencher l'événement de changement
        responseInputs.forEach(input => {
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        });
      }, solution);
      
      await this.delay(2000);
      
      // Soumettre le formulaire ou déclencher la validation
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.submit();
        } else {
          // Chercher un bouton de soumission
          const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
          if (submitBtn) {
            (submitBtn as HTMLElement).click();
          }
        }
      });return !(await this.detectCaptcha(page));
    } catch (error) {
      this.logger.error(`Erreur injection solution: ${error.message}`);
      return false;
    }
  }

  /**
   * Résolution avec 2Captcha pour Turnstile
   */
  async solveTurnstileWith2Captcha(
    page: Page,
    siteKey: string,
    url: string,
    config: CaptchaServiceProviderConfig
  ): Promise<boolean> {
    try {
      // Soumettre la tâche
      const submitResponse = await axios.post(config.serviceUrl, {
        key: config.apiKey,
        method: 'turnstile',
        sitekey: siteKey,
        pageurl: url,
        json: 1
      });

      if (submitResponse.data.status !== 1) {
        this.logger.error(`Erreur 2Captcha: ${submitResponse.data.error_text}`);
        return false;
      }

      const taskId = submitResponse.data.request;
      
      // Attendre la résolution
      let solution: string | null = null;
      const startTime = Date.now();
      
      while (Date.now() - startTime < this.captchaTimeout) {
        await this.delay(10000);
        
        const resultResponse = await axios.get(`https://2captcha.com/res.php?key=${config.apiKey}&action=get&id=${taskId}&json=1`);
        
        if (resultResponse.data.status === 1) {
          solution = resultResponse.data.request;
          break;
        }
        
        if (resultResponse.data.error_text && !resultResponse.data.error_text.includes('CAPCHA_NOT_READY')) {
          this.logger.error(`2Captcha error: ${resultResponse.data.error_text}`);
          return false;
        }
      }

      if (!solution) {
        this.logger.error('Timeout 2Captcha');
        return false;
      }

      // Injecter la solution
      return await this.injectTurnstileSolution(page, solution);
    } catch (error) {
      this.logger.error(`Erreur 2Captcha Turnstile: ${error.message}`);
      return false;
    }
  }

  /**
   * Injection de solution Turnstile
   */
  async injectTurnstileSolution(page: Page, token: string): Promise<boolean> {
    try {
      await page.evaluate((token) => {
        // Injecter dans les champs de réponse
        const responseInputs = document.querySelectorAll('input[name="cf-turnstile-response"]');
        responseInputs.forEach(input => {
          (input as HTMLInputElement).value = token;
        });

        // Déclencher les callbacks Turnstile
        if ((window as any).turnstile && (window as any).turnstile.render) {
          // Simuler la réussite du challenge
          const widgets = document.querySelectorAll('[data-sitekey]');
          widgets.forEach((widget, index) => {
            if ((window as any).turnstile.getResponse) {
              try {
                (window as any).turnstile.getResponse = () => token;
              } catch (e) {}
            }
          });
        }

        // Déclencher l'événement de changement
        responseInputs.forEach(input => {
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        });
      }, token);

      await this.delay(3000);

      // Vérifier si le formulaire se soumet automatiquement
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
          if (submitButton) {
            (submitButton as HTMLElement).click();
          }
        }
      });

      await this.delay(5000);
      return !(await this.detectCaptcha(page));
    } catch (error) {
      this.logger.error(`Erreur injection solution Turnstile: ${error.message}`);
      return false;
    }
  }  /**
   * Gestion hCaptcha
   */
  async handleHCaptcha(page: Page): Promise<boolean> {
    this.logger.log('Gestion hCaptcha');
    
    try {
      const siteKey = await page.evaluate(() => {
        const hcaptchaElement = document.querySelector('[data-sitekey]');
        if (hcaptchaElement) {
          return hcaptchaElement.getAttribute('data-sitekey');
        }
        return null;
      });

      if (!siteKey) {
        this.logger.warn('Impossible de trouver la clé hCaptcha');
        return false;
      }

      const prioritizedServices = this.getPrioritizedServices('hcaptcha');
      
      for (const serviceName of prioritizedServices) {
        const config = this.serviceProviders.get(serviceName);
        if (!config?.active) continue;
        
        this.logger.log(`Tentative avec ${serviceName} pour hCaptcha`);
        
        if (await this.solveHCaptchaWithService(page, siteKey, serviceName, config)) {
          this.updateServiceStats(serviceName, true);
          return true;
        } else {
          this.updateServiceStats(serviceName, false);
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Erreur hCaptcha: ${error.message}`);
      return false;
    }
  }

  /**
   * Résolution hCaptcha avec service externe
   */
  async solveHCaptchaWithService(
    page: Page,
    siteKey: string,
    serviceName: string,
    config: CaptchaServiceProviderConfig
  ): Promise<boolean> {
    try {
      const url = page.url();
      let solution: string | null = null;

      if (serviceName === '2captcha') {
        solution = await this.solve2CaptchaHCaptcha(siteKey, url, config);
      } else if (serviceName === 'anticaptcha') {
        solution = await this.solveAntiCaptchaHCaptcha(siteKey, url, config);
      }

      if (!solution) return false;

      // Injecter la solution
      await page.evaluate((token) => {
        if ((window as any).hcaptcha) {
          (window as any).hcaptcha.getResponse = () => token;
        }

        // Injecter dans les champs cachés
        const responseInputs = document.querySelectorAll('textarea[name="h-captcha-response"]');
        responseInputs.forEach(input => {
          (input as HTMLTextAreaElement).value = token;
        });
      }, solution);

      await this.delay(2000);
      return true;
    } catch (error) {
      this.logger.error(`Erreur résolution hCaptcha: ${error.message}`);
      return false;
    }
  }

  /**
   * Gestion générique des CAPTCHAs
   */
  async handleGenericCaptcha(page: Page, type: string): Promise<boolean> {
    this.logger.log(`Gestion générique pour type: ${type}`);
    
    if (this.manualFallback) {
      return await this.handleManualFallback(page, type);
    }
    
    return false;
  }

  private createScreenshotPath(baseDir: string, timestamp: number): `${string}.png` {
    return path.join(baseDir, `captcha_${timestamp}.png`) as `${string}.png`;
  }

  /**
   * Gestion manuelle avec capture d'écran
   */
  async handleManualFallback(page: Page, type: string): Promise<boolean> {
    try {
      this.logger.log('Activation du fallback manuel');
      
      const filename = `captcha_${Date.now()}.png` as const;
      const screenshotPath = path.join(this.tempDir, filename) as `${string}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      this.logger.log(`Capture d'écran sauvée: ${screenshotPath}`);
      this.logger.log('Attente d\'intervention manuelle...');
      
      // Attendre que le CAPTCHA soit résolu manuellement
      const maxWaitTime = 300000; // 5 minutes
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        await this.delay(5000);
        
        if (!(await this.detectCaptcha(page))) {
          this.logger.log('CAPTCHA résolu manuellement');
          return true;
        }
      }
      
      this.logger.warn('Timeout fallback manuel');
      return false;
    } catch (error) {
      this.logger.error(`Erreur fallback manuel: ${error.message}`);
      return false;
    }
  }

  /**
   * Gestion avancée avec rotation de proxies
   */
  async handleWithProxyRotation(page: Page, targetUrl: string): Promise<boolean> {
    if (this.proxies.length === 0) {
      return await this.handleCaptcha(page);
    }

    const activeProxies = this.proxies.filter(proxy => proxy.active);
    
    for (const proxy of activeProxies) {
      this.logger.log(`Tentative avec proxy: ${proxy.host}:${proxy.port}`);
      
      try {
        // Note: La rotation de proxy nécessiterait une nouvelle instance de navigateur
        // Ici on simule le changement en modifiant les headers
        await page.setExtraHTTPHeaders({
          'X-Forwarded-For': proxy.host,
          'X-Real-IP': proxy.host
        });
        
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        if (await this.handleCaptcha(page)) {
          this.logger.log(`Succès avec proxy: ${proxy.host}:${proxy.port}`);
          return true;
        }
      } catch (error) {
        this.logger.warn(`Échec avec proxy ${proxy.host}:${proxy.port}: ${error.message}`);
        proxy.active = false;
      }
    }
    
    return false;
  }

  /**
   * Optimisation spécifique pour Airbnb
   */
  async optimizeForAirbnb(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      // Masquer les traces d'automation spécifiques à Airbnb
      Object. defineProperty(navigator, 'webdriver', { value: undefined });
      
      // Simuler des propriétés spécifiques
      Object.defineProperty(screen, 'availWidth', { value: 1920 });
      Object.defineProperty(screen, 'availHeight', { value: 1080 });
      
      // Masquer les extensions Chrome
      if ((window as any).chrome) {
        delete (window as any).chrome.runtime;
      }
      
      // Simuler un historique de navigation
      Object.defineProperty(window.history, 'length', { value: Math.floor(Math.random() * 10) + 5 });
    });

    // Configuration des headers spécifiques Airbnb
    await page.setExtraHTTPHeaders({
      'X-Airbnb-API-Key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });
  }

  /**
   * Optimisation spécifique pour Booking.com
   */
  async optimizeForBooking(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      // Masquer les indicateurs d'automation
      Object.defineProperty(navigator, 'webdriver', { value: false });
      Object.defineProperty(navigator, 'plugins', { value: [1, 2, 3, 4, 5] });
      
      // Simuler des événements utilisateur
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'mousedown' || type === 'mouseup' || type === 'click') {
          // Ajouter un délai aléatoire pour simuler un comportement humain
          const originalListener = listener;
          const humanListener = function(event: Event) {
            setTimeout(() => {
              if (typeof originalListener === 'function') {
                originalListener.call(this, event);
              }
            }, Math.random() * 100);
          };
          originalAddEventListener.call(this, type, humanListener, options);
        } else {
          originalAddEventListener.call(this, type, listener, options);
        }
      };
    });

    // Headers spécifiques Booking.com
    await page.setExtraHTTPHeaders({
      'X-Booking-Context-Action': 'index',
      'X-Booking-Context-Aid': '304142',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
  }

  /**
   * Détection comportementale avancée
   */
  async implementAdvancedBehavior(page: Page): Promise<void> {
    await page.evaluate(() => {
      // Simulation de mouvements de souris naturels
      let mouseTrail: Array<{x: number, y: number, timestamp: number}> = [];
      
      const simulateNaturalMouseMovement = () => {
        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * window.innerHeight;
        const endX = Math.random() * window.innerWidth;
        const endY = Math.random() * window.innerHeight;
        
        const steps = Math.floor(Math.random() * 20) + 10;
        const duration = Math.random() * 2000 + 1000;
        
        for (let i = 0; i <= steps; i++) {
          setTimeout(() => {
            const progress = i / steps;
            const x = startX + (endX - startX) * progress;
            const y = startY + (endY - startY) * progress;
            
            // Ajouter de la variabilité naturelle
            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 5;
            
            const finalX = x + jitterX;
            const finalY = y + jitterY;
            
            mouseTrail.push({ x: finalX, y: finalY, timestamp: Date.now() });
            
            // Garder seulement les 100 derniers points
            if (mouseTrail.length > 100) {
              mouseTrail = mouseTrail.slice(-100);
            }
            
            const event = new MouseEvent('mousemove', {
              clientX: finalX,
              clientY: finalY,
              bubbles: true
            });
            
            document.dispatchEvent(event);
          }, (duration / steps) * i + Math.random() * 100);
        }
      };
      
      // Simuler des mouvements périodiques
      setInterval(simulateNaturalMouseMovement, Math.random() * 10000 + 5000);
      
      // Simulation de scroll naturel
      const simulateNaturalScroll = () => {
        const scrollAmount = Math.random() * 300 + 50;
        const direction = Math.random() > 0.7 ? -1 : 1;
        
        window.scrollBy({
          top: scrollAmount * direction,
          behavior: 'smooth'
        });
      };
      
      setInterval(simulateNaturalScroll, Math.random() * 15000 + 10000);
      
      // Simulation de frappes clavier occasionnelles
      const simulateKeyboardActivity = () => {
        const keys = ['Tab', 'Shift', 'Ctrl'];
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        
        const keydownEvent = new KeyboardEvent('keydown', {
          key: randomKey,
          bubbles: true
        });
        
        const keyupEvent = new KeyboardEvent('keyup', {
          key: randomKey,
          bubbles: true
        });
        
        document.dispatchEvent(keydownEvent);
        setTimeout(() => document.dispatchEvent(keyupEvent), Math.random() * 200 + 50);
      };
      
      setInterval(simulateKeyboardActivity, Math.random() * 30000 + 20000);
    });
  }

  /**
   * Obtenir les services priorisés
   */
  private getPrioritizedServices(captchaType: string): string[] {
    const services = Array.from(this.serviceProviders.entries())
      .filter(([_, config]) => config.active)
      .sort((a, b) => {
        // Tri par priorité et taux de succès
        const priorityDiff = a[1].priority - b[1].priority;
        if (priorityDiff !== 0) return priorityDiff;
        return b[1].successRate - a[1].successRate;
      })
      .map(([name, _]) => name);
    
    return services;
  }

  /**
   * Mise à jour des statistiques de service
   */
  private updateServiceStats(serviceName: string, success: boolean): void {
    if (!this.captchaStats.byService[serviceName]) {
      this.captchaStats.byService[serviceName] = { success: 0, failure: 0 };
    }
    
    if (success) {
      this.captchaStats.byService[serviceName].success++;
      this.captchaStats.solved++;
    } else {
      this.captchaStats.byService[serviceName].failure++;
      this.captchaStats.failed++;
    }
    
    // Mettre à jour le taux de succès du service
    const serviceConfig = this.serviceProviders.get(serviceName);
    if (serviceConfig) {
      const stats = this.captchaStats.byService[serviceName];
      const total = stats.success + stats.failure;
      serviceConfig.successRate = stats.success / total;
    }
  }

  /**
   * Logging de détection CAPTCHA
   */
  private logCaptchaDetection(type: string): void {
    this.captchaStats.totalDetected++;
    
    if (!this.captchaStats.byType[type]) {
      this.captchaStats.byType[type] = 0;
    }
    this.captchaStats.byType[type]++;
  }

  /**
   * Gestion Cloudflare avec CAPTCHA
   */
  async handleCloudflareWithCaptcha(page: Page): Promise<boolean> {
    this.logger.log('Gestion Cloudflare avec CAPTCHA');
    
    try {
      // Attendre le chargement du CAPTCHA
      await this.delay(5000);
      
      // Détecter le type de CAPTCHA intégré
      const captchaType = await page.evaluate(() => {
        if (document.querySelector('iframe[src*="hcaptcha"]')) return 'hcaptcha';
        if (document.querySelector('iframe[src*="recaptcha"]')) return 'recaptcha';
        if (document.querySelector('iframe[src*="turnstile"]')) return 'turnstile';
        return 'unknown';
      });
      
      // Résoudre selon le type détecté
      switch (captchaType) {
        case 'hcaptcha':
          return await this.handleHCaptcha(page);
        case 'recaptcha':
          return await this.handleRecaptcha(page, 'recaptcha_v2');
        case 'turnstile':
          return await this.handleCloudflareTurnstile(page);
        default:
          return await this.handleCloudflareAdvanced(page);
      }
    } catch (error) {
      this.logger.error(`Erreur Cloudflare avec CAPTCHA: ${error.message}`);
      return false;
    }
  }

  async solve2CaptchaHCaptcha(siteKey: string, url: string, config: CaptchaServiceProviderConfig): Promise<string | null> {
    try {
      const submitResponse = await axios.post(config.serviceUrl, {
        key: config.apiKey,
        method: 'hcaptcha',
        sitekey: siteKey,
        pageurl: url,        json: 1
      });

      if (submitResponse.data.status !== 1) {
        this.logger.error(`Erreur 2Captcha hCaptcha: ${submitResponse.data.error_text}`);
        return null;
      }

      const taskId = submitResponse.data.request;
      
      // Attendre la résolution
      let solution: string | null = null;
      const startTime = Date.now();
      
      while (Date.now() - startTime < this.captchaTimeout) {
        await this.delay(10000);
        
        const resultResponse = await axios.get(`https://2captcha.com/res.php?key=${config.apiKey}&action=get&id=${taskId}&json=1`);
        
        if (resultResponse.data.status === 1) {
          solution = resultResponse.data.request;
          break;
        }
        
        if (resultResponse.data.error_text && !resultResponse.data.error_text.includes('CAPCHA_NOT_READY')) {
          this.logger.error(`2Captcha error: ${resultResponse.data.error_text}`);
          return null;
        }
      }

      if (!solution) {
        this.logger.error('Timeout 2Captcha hCaptcha');
        return null;
      }

      return solution;
    } catch (error) {
      this.logger.error(`Erreur 2Captcha hCaptcha: ${error.message}`);
      return null;
    }
  }

  /**
   * Résolution Anti-Captcha pour hCaptcha
   */
  async solveAntiCaptchaHCaptcha(siteKey: string, url: string, config: CaptchaServiceProviderConfig): Promise<string | null> {
    try {
      const createTaskResponse = await axios.post(`${config.serviceUrl}/createTask`, {
        clientKey: config.apiKey,
        task: {
          type: 'HCaptchaTaskProxyless',
          websiteURL: url,
          websiteKey: siteKey
        }
      });

      if (createTaskResponse.data.errorId !== 0) {
        this.logger.error(`Erreur Anti-Captcha: ${createTaskResponse.data.errorDescription}`);
        return null;
      }

      const taskId = createTaskResponse.data.taskId;
      const startTime = Date.now();

      while (Date.now() - startTime < this.captchaTimeout) {
        await this.delay(5000);
        
        const resultResponse = await axios.post(`${config.serviceUrl}/getTaskResult`, {
          clientKey: config.apiKey,
          taskId: taskId
        });

        if (resultResponse.data.status === 'ready') {
          return resultResponse.data.solution.gRecaptchaResponse;
        }

        if (resultResponse.data.status === 'failed') {
          this.logger.error(`Anti-Captcha failed: ${resultResponse.data.errorDescription}`);
          return null;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Erreur Anti-Captcha hCaptcha: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtenir les statistiques CAPTCHA
   */
  getStats() {
    return {
      ...this.captchaStats,
      successRate: this.captchaStats.totalDetected > 0 
        ? this.captchaStats.solved / this.captchaStats.totalDetected 
        : 0
    };
  }


  private initializeServiceProviders(): void {
    this.serviceProviders = new Map();
    
    const twoCaptchaKey = this.configService.get<string>('TWOCAPTCHA_API_KEY', '');
    if (twoCaptchaKey) {
      this.serviceProviders.set('2captcha', {
        apiKey: twoCaptchaKey,
        serviceUrl: 'https://2captcha.com/in.php',
        active: true,
        priority: 1,
        successRate: 0.9
      });
    }
    
    const antiCaptchaKey = this.configService.get<string>('ANTICAPTCHA_API_KEY', '');
    if (antiCaptchaKey) {
      this.serviceProviders.set('anticaptcha', {
        apiKey: antiCaptchaKey,
        serviceUrl: 'https://api.anti-captcha.com',
        active: true,
        priority: 2,
        successRate: 0.85
      });
    }

    const capSolverKey = this.configService.get<string>('CAPSOLVER_API_KEY', '');
    if (capSolverKey) {
      this.serviceProviders.set('capsolver', {
        apiKey: capSolverKey,
        serviceUrl: 'https://api.capsolver.com',
        active: true,
        priority: 0,
        successRate: 0.95
      });
    }
  }

  private initializeProxies(): ProxyConfig[] {
    const proxyList = this.configService.get<string>('PROXY_LIST', '');
    if (!proxyList) return [];

    return proxyList.split(',').map((proxy, index) => {
      const [host, port, username, password] = proxy.split(':');
      return {
        host,
        port: parseInt(port, 10),
        username,
        password,
        type: 'http' as const,
        location: `proxy-${index}`,
        active: true
      };
    });
  }

  private initializeBrowserProfiles(): BrowserProfile[] {
    return [
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        locale: 'en-US',
        timezone: 'America/New_York',
        acceptLanguage: 'en-US,en;q=0.9'
      },
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        locale: 'en-GB',
        timezone: 'Europe/London',
        acceptLanguage: 'en-GB,en;q=0.9'
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false,
        locale: 'en-US',
        timezone: 'America/Los_Angeles',
        acceptLanguage: 'en-US,en;q=0.9'
      },
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        locale: 'en-US',
        timezone: 'America/New_York',
        acceptLanguage: 'en-US,en;q=0.9'
      }
    ];
  }

  private initializeSiteConfig(): Map<string, any> {
    const config = new Map();
    
    config.set('airbnb.com', {
      maxRequestsPerMinute: 30,
      delayBetweenRequests: [2000, 5000],
      customHeaders: {
        'X-Airbnb-API-Key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
        'X-Requested-With': 'XMLHttpRequest'
      },
      cloudflareStrategy: 'advanced',
      behaviorSimulation: true,
      sessionManagement: true
    });
    
    config.set('booking.com', {
      maxRequestsPerMinute: 20,
      delayBetweenRequests: [3000, 7000],
      customHeaders: {
        'X-Booking-Context-Action': 'index',
        'X-Booking-Context-Aid': '304142'
      },
      cloudflareStrategy: 'enterprise',
      behaviorSimulation: true,
      sessionManagement: true
    });

    return config;
  }

  async detectCaptcha(page: Page): Promise<boolean> {
    try {
      const pageContent = await page.content();
      const lowerCaseContent = pageContent.toLowerCase();
      const currentUrl = page.url();
      
      const cloudflareIndicators = [
        'checking your browser',
        'just a moment',
        'please wait',
        'ddos protection',
        'ray id',
        'cloudflare',
        'cf-browser-verification',
        'challenge-platform',
        'cf-challenge',
        'turnstile'
      ];
      
      for (const indicator of cloudflareIndicators) {
        if (lowerCaseContent.includes(indicator)) {
          this.logger.log(`Protection Cloudflare détectée: '${indicator}'`);
          return true;
        }
      }
      
      const challengeElements = await page.$$([
        'iframe[src*="challenges.cloudflare.com"]',
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        '.cf-browser-verification',
        '#challenge-running',
        '.challenge-container',
        '[data-ray]'
      ].join(', '));
      
      if (challengeElements.length > 0) {
        this.logger.log('Éléments de challenge détectés');
        return true;
      }

      if (currentUrl.includes('__cf_chl_jschl_tk__') || 
          currentUrl.includes('__cf_chl_captcha_tk__') ||
          currentUrl.includes('cf_chl_prog')) {
        this.logger.log('URL de challenge Cloudflare détectée');
        return true;
      }

      const response = await page.evaluate(() => {
        return {
          status: document.readyState,
          title: document.title.toLowerCase(),
          hasMetaRefresh: !!document.querySelector('meta[http-equiv="refresh"]')
        };
      });

      if (response.title.includes('just a moment') || 
          response.title.includes('checking your browser') ||
          response.hasMetaRefresh) {
        this.logger.log('Page de challenge détectée via titre ou meta refresh');
        return true;
      }

      const captchaIndicators = [
        'captcha', 'robot', 'vérification', 'verification', 
        'security check', 'prove you\'re human', 'bot check'
      ];
      
      for (const indicator of captchaIndicators) {
        if (lowerCaseContent.includes(indicator)) {
          this.logger.log(`CAPTCHA détecté: '${indicator}'`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Erreur lors de la détection: ${error.message}`);
      return false;
    }
  }

  async identifyCaptchaType(page: Page): Promise<string> {
    try {
      const pageContent = await page.content();
      const lowerCaseContent = pageContent.toLowerCase();
      const currentUrl = page.url();
      
      if (lowerCaseContent.includes('turnstile') || 
          (await page.$$('iframe[src*="challenges.cloudflare.com"]')).length > 0) {
        return 'cloudflare_turnstile';
      }
      
      if (lowerCaseContent.includes('cloudflare') || 
          lowerCaseContent.includes('just a moment') ||
          lowerCaseContent.includes('checking your browser') ||
          currentUrl.includes('__cf_chl_')) {
        
        if (lowerCaseContent.includes('javascript') || currentUrl.includes('jschl')) {
          return 'cloudflare_js';
        } else if (lowerCaseContent.includes('captcha') || currentUrl.includes('captcha')) {
          return 'cloudflare_captcha';
        } else {
          return 'cloudflare_unknown';
        }
      }
      
      if (lowerCaseContent.includes('hcaptcha') || 
          (await page.$$('iframe[src*="hcaptcha"]')).length > 0) {
        return 'hcaptcha';
      }
      
      if (lowerCaseContent.includes('recaptcha') || 
          (await page.$$('iframe[src*="recaptcha"]')).length > 0) {
        if ((await page.$$('.recaptcha-checkbox-border')).length > 0) {
          return 'recaptcha_v2';
        } else {
          return 'recaptcha_v3';
        }
      }
      
      if ((await page.$$('img[alt*="captcha"], img[src*="captcha"]')).length > 0) {
        return 'image_captcha';
      }
      
      return 'unknown';
    } catch (error) {
      this.logger.error(`Erreur identification: ${error.message}`);
      return 'unknown';
    }
  }

  async handleCaptcha(page: Page): Promise<boolean> {
    try {
      if (!(await this.detectCaptcha(page))) {
        return true;
      }
      
      const captchaType = await this.identifyCaptchaType(page);
      this.logCaptchaDetection(captchaType);
      
      this.logger.log(`Type détecté: ${captchaType}`);
      
      switch (captchaType) {
        case 'cloudflare_js':
        case 'cloudflare_unknown':
          return await this.handleCloudflareAdvanced(page);
          
        case 'cloudflare_turnstile':
          return await this.handleCloudflareTurnstile(page);
          
        case 'cloudflare_captcha':
          return await this.handleCloudflareWithCaptcha(page);
          
        case 'recaptcha_v2':
        case 'recaptcha_v3':
          return await this.handleRecaptcha(page, captchaType);
          
        case 'hcaptcha':
          return await this.handleHCaptcha(page);
          
        default:
          return await this.handleGenericCaptcha(page, captchaType);
      }
    } catch (error) {
      this.logger.error(`Erreur gestion CAPTCHA: ${error.message}`);
      return false;
    }
  }

  async handleRecaptcha(page: Page, type: string): Promise<boolean> {
    this.logger.log(`Gestion reCAPTCHA ${type}`);
    
    try {
      // Enhanced site key detection
      const siteKey = await page.evaluate(() => {
        // Check for explicit sitekey elements
        const recaptchaElement = document.querySelector('[data-sitekey], [data-recaptcha-key]');
        if (recaptchaElement) {
          return recaptchaElement.getAttribute('data-sitekey') || 
                 recaptchaElement.getAttribute('data-recaptcha-key');
        }
        
        // Check scripts for sitekey
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
          const content = script.textContent || '';
          // More comprehensive regex patterns
          const matches = [
            ...content.matchAll(/sitekey['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi),
            ...content.matchAll(/data-sitekey\s*=\s*['"]([^'"]+)['"]/gi),
            ...content.matchAll(/recaptchaKey\s*[:=]\s*['"]([^'"]+)['"]/gi)
          ];
          if (matches.length > 0) return matches[0][1];
        }
        return null;
      });

      let finalKey: string | null = siteKey;

      if (!siteKey) {
        this.logger.warn('Impossible de trouver la clé reCAPTCHA - tentative de détection alternative');
        // Alternative detection for invisible reCAPTCHA
        const invisibleKey = await page.evaluate(() => {
          const iframes = document.querySelectorAll('iframe[src*="recaptcha"]');
          for (const iframe of iframes) {
            const src = iframe.getAttribute('src');
            const keyMatch = src?.match(/[&?]k=([^&]+)/);
            if (keyMatch) return keyMatch[1];
          }
          return null;
        });

        finalKey = invisibleKey;
        
        if (invisibleKey) {
          this.logger.log(`Clé reCAPTCHA invisible trouvée: ${invisibleKey}`);
        } else {
          this.logger.warn('Aucune clé reCAPTCHA trouvée');
          return false;
        }
      } else {
        this.logger.log(`Clé reCAPTCHA détectée: ${siteKey}`);
      }

      // Vérification finale - finalKey ne devrait jamais être null ici
      if (!finalKey) {
        this.logger.warn('Aucune clé reCAPTCHA valide trouvée');
        return false;
      }

      const prioritizedServices = this.getPrioritizedServices('recaptcha');
      
      for (const serviceName of prioritizedServices) {
        const config = this.serviceProviders.get(serviceName);
        if (!config?.active) continue;
        
        this.logger.log(`Tentative avec ${serviceName} pour reCAPTCHA`);
        
        if (await this.solveRecaptchaWithService(page, finalKey, serviceName, config, type)) {
          this.updateServiceStats(serviceName, true);
          return true;
        } else {
          this.updateServiceStats(serviceName, false);
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Erreur reCAPTCHA: ${error.message}`);
      return false;
    }
  }

  private async solveRecaptchaWithService(
    page: Page,
    siteKey: string,
    serviceName: string,
    config: CaptchaServiceProviderConfig,
    type: string
  ): Promise<boolean> {
    try {
      const url = page.url();
      let solution: string | null = null;

      if (serviceName === '2captcha') {
        solution = await this.solve2CaptchaRecaptcha(siteKey, url, config, type);
      } else if (serviceName === 'anticaptcha') {
        solution = await this.solveAntiCaptchaRecaptcha(siteKey, url, config, type);
      } else if (serviceName === 'capsolver') {
        solution = await this.solveCapSolverRecaptcha(siteKey, url, config, type);
      }

      if (!solution) return false;

      // Injection de la solution pour reCAPTCHA v2 et v3
      await page.evaluate((token, type) => {
        // Pour reCAPTCHA v2
        const textareas = document.querySelectorAll('textarea[name="g-recaptcha-response"]');
        textareas.forEach(textarea => {
          (textarea as HTMLTextAreaElement).value = token;
          const event = new Event('change', { bubbles: true });
          textarea.dispatchEvent(event);
        });

        // Pour reCAPTCHA v3
        if (type === 'recaptcha_v3' && (window as any).grecaptcha) {
          const grecaptcha = (window as any).grecaptcha;
          
          // Trouver tous les widgets reCAPTCHA
          const widgets: number[] = []; // Type explicite pour éviter l'erreur TypeScript
          let i = 0;
          while (grecaptcha.getResponse(i) !== null) {
            widgets.push(i);
            i++;
          }
          
          // Injecter le token pour chaque widget
          widgets.forEach(widgetId => {
            // Simuler une réponse réussie
            grecaptcha.getResponse = (id?: number) => {
              if (id === undefined || id === widgetId) {
                return token;
              }
              return '';
            };
            
            // Déclencher les callbacks
            if (grecaptcha._callbacks && grecaptcha._callbacks[widgetId]) {
              grecaptcha._callbacks[widgetId].forEach((callback: Function) => {
                try {
                  callback(token);
                } catch (e) {
                  console.error('Error executing callback:', e);
                }
              });
            }
          });
        }
      }, solution, type);

      await this.delay(2000);
      
      // Pour reCAPTCHA v3, nous devons peut-être soumettre le formulaire
      if (type === 'recaptcha_v3') {
        await page.evaluate(() => {
          const forms = document.querySelectorAll('form');
          forms.forEach(form => {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            if (form.dispatchEvent(submitEvent)) {
              form.submit();
            }
          });
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`Erreur résolution reCAPTCHA: ${error.message}`);
      return false;
    }
  }

  private async solve2CaptchaRecaptcha(
    siteKey: string, 
    url: string, 
    config: CaptchaServiceProviderConfig,
    type: string
  ): Promise<string | null> {
    try {
      const method = type === 'recaptcha_v3' ? 'userrecaptcha' : 'userrecaptcha';
      const payload: any = {
        key: config.apiKey,
        method: method,
        googlekey: siteKey,
        pageurl: url,
        json: 1
      };

      if (type === 'recaptcha_v3') {
        payload.version = 'v3';
        payload.action = 'verify';
        payload.min_score = 0.3;
      }

      const submitResponse = await axios.post(config.serviceUrl, payload);

      if (submitResponse.data.status !== 1) {
        this.logger.error(`Erreur 2Captcha reCAPTCHA: ${submitResponse.data.error_text}`);
        return null;
      }

      const taskId = submitResponse.data.request;
      const startTime = Date.now();
      
      while (Date.now() - startTime < this.captchaTimeout) {
        await this.delay(10000);
        
        const resultResponse = await axios.get(
          `https://2captcha.com/res.php?key=${config.apiKey}&action=get&id=${taskId}&json=1`
        );
        
        if (resultResponse.data.status === 1) {
          return resultResponse.data.request;
        }
        
        if (resultResponse.data.error_text && 
            !resultResponse.data.error_text.includes('CAPCHA_NOT_READY')) {
          this.logger.error(`2Captcha error: ${resultResponse.data.error_text}`);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Erreur 2Captcha reCAPTCHA: ${error.message}`);
      return null;
    }
  }

  private async solveAntiCaptchaRecaptcha(
    siteKey: string,
    url: string,
    config: CaptchaServiceProviderConfig,
    type: string
  ): Promise<string | null> {
    try {
      const taskType = type === 'recaptcha_v3' ? 'RecaptchaV3TaskProxyless' : 'NoCaptchaTaskProxyless';
      
      const createTaskResponse = await axios.post(`${config.serviceUrl}/createTask`, {
        clientKey: config.apiKey,
        task: {
          type: taskType,
          websiteURL: url,
          websiteKey: siteKey,
          ...(type === 'recaptcha_v3' && { 
            pageAction: 'verify',
            minScore: 0.3
          })
        }
      });

      if (createTaskResponse.data.errorId !== 0) {
        this.logger.error(`Erreur Anti-Captcha: ${createTaskResponse.data.errorDescription}`);
        return null;
      }

      const taskId = createTaskResponse.data.taskId;
      const startTime = Date.now();

      while (Date.now() - startTime < this.captchaTimeout) {
        await this.delay(5000);
        
        const resultResponse = await axios.post(`${config.serviceUrl}/getTaskResult`, {
          clientKey: config.apiKey,
          taskId: taskId
        });

        if (resultResponse.data.status === 'ready') {
          return resultResponse.data.solution.gRecaptchaResponse;
        }

        if (resultResponse.data.status === 'failed') {
          this.logger.error(`Anti-Captcha failed: ${resultResponse.data.errorDescription}`);
          return null;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Erreur Anti-Captcha reCAPTCHA: ${error.message}`);
      return null;
    }
  }

  private async solveCapSolverRecaptcha(
    siteKey: string,
    url: string,
    config: CaptchaServiceProviderConfig,
    type: string
  ): Promise<string | null> {
    try {
      const taskType = type === 'recaptcha_v3' ? 'ReCaptchaV3TaskProxyLess' : 'ReCaptchaV2TaskProxyLess';
      
      const createResponse = await axios.post(`${config.serviceUrl}/createTask`, {
        clientKey: config.apiKey,
        task: {
          type: taskType,
          websiteURL: url,
          websiteKey: siteKey,
          ...(type === 'recaptcha_v3' && {
            pageAction: 'verify',
            minScore: 0.3
          })
        }
      });

      if (createResponse.data.errorId !== 0) {
        this.logger.error(`Erreur CapSolver: ${createResponse.data.errorDescription}`);
        return null;
      }

      const taskId = createResponse.data.taskId;
      const startTime = Date.now();

      while (Date.now() - startTime < this.captchaTimeout) {
        await this.delay(5000);
        
        const resultResponse = await axios.post(`${config.serviceUrl}/getTaskResult`, {
          clientKey: config.apiKey,
          taskId: taskId
        });

        if (resultResponse.data.status === 'ready') {
          return resultResponse.data.solution.gRecaptchaResponse;
        }

        if (resultResponse.data.status === 'failed') {
          this.logger.error(`CapSolver failed: ${resultResponse.data.errorDescription}`);
          return null;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Erreur CapSolver reCAPTCHA: ${error.message}`);
      return null;
    }
  }
}