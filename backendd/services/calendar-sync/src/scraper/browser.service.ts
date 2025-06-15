import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { ProxyService, Proxy } from './proxy.service';
import UserAgent from 'user-agents';

interface BlockingStatus {
  isBlocked: boolean;
  isCaptcha: boolean;
  isCloudflare: boolean;
}

interface Point {
  x: number;
  y: number;
}

@Injectable()
export class BrowserService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser | null = null;
  private readonly logger = new Logger(BrowserService.name);
  private readonly userAgents: string[] = [];
  private readonly randomizeUserAgent: boolean;
  private readonly humanBehaviorIntensity: 'low' | 'medium' | 'high';
  private readonly useProxy: boolean;
  private currentProxy: Proxy | null = null;

  constructor(
    private configService: ConfigService,
    private proxyService: ProxyService,
  ) {
    // Configurer le plugin stealth pour contrer la détection
    puppeteer.use(StealthPlugin());
    
    // Charger les configurations
    this.randomizeUserAgent = this.configService.get<string>('RANDOMIZE_USER_AGENT') !== 'false';
    this.humanBehaviorIntensity = this.configService.get<'low' | 'medium' | 'high'>('HUMAN_BEHAVIOR_INTENSITY', 'medium');
    this.useProxy = this.configService.get<string>('USE_PROXY') !== 'false';
    
    // Générer une liste de user-agents réalistes
    this.generateUserAgents();
  }

  async onModuleInit() {
    await this.initBrowser();
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  private generateUserAgents(): void {
    // Générer une liste de 10 user-agents réalistes
    for (let i = 0; i < 10; i++) {
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      this.userAgents.push(userAgent.toString());
    }
    
    // Ajouter quelques user-agents connus pour être stables
    this.userAgents.push(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36 Edg/96.0.1054.29'
    );
  }

  async initBrowser(proxy?: Proxy): Promise<void> {
    try {
      this.currentProxy = proxy || null;
      const headless = this.configService.get<string>('BROWSER_HEADLESS') !== 'false';
      
      // Detect if running on Render or production environment
      const isProduction = process.env.NODE_ENV === 'production';
      const isRender = process.env.RENDER === 'true';
      
      const launchOptions: any = {
        headless: headless === false ? false : 'new', // Use new headless mode
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-notifications',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--window-size=1920,1080',
          '--single-process', // Important for Render
          '--no-zygote', // Important for Render
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
        defaultViewport: { width: 1920, height: 1080 },
      };

      // Production-specific settings
      if (isProduction || isRender) {
        launchOptions.args.push(
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images', // Reduce bandwidth usage
          '--disable-javascript', // Only if your scraping doesn't need JS
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio'
        );
        
        // Try to find Chrome executable
        const possiblePaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          process.env.CHROME_PATH,
          process.env.GOOGLE_CHROME_BIN
        ].filter(Boolean);

        // Try each path until we find one that works
        for (const path of possiblePaths) {
          try {
            const fs = require('fs');
            if (fs.existsSync(path)) {
              launchOptions.executablePath = path;
              this.logger.log(`Using Chrome at: ${path}`);
              break;
            }
          } catch (e) {
            // Continue to next path
          }
        }
      }
      
      // Add proxy configuration
      if (this.useProxy && proxy) {
        const proxyUrl = this.proxyService.formatProxyUrl(proxy);
        if (proxyUrl) {
          launchOptions.args.push(`--proxy-server=${proxyUrl}`);
          this.logger.log(`Navigateur initialisé avec le proxy: ${proxy.host}:${proxy.port}`);
        }
      }
      
      this.browser = await puppeteer.launch(launchOptions);
      this.logger.log('Navigateur initialisé avec succès');
      
    } catch (error) {
      this.logger.error(`Erreur lors de l'initialisation du navigateur: ${error.message}`);
      
      // Fallback: try with minimal configuration
      if (!this.browser) {
        this.logger.warn('Tentative avec configuration minimale...');
        try {
          const fallbackOptions = {
            headless: 'new',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--single-process',
              '--no-zygote'
            ]
          };
          
          //this.browser = await puppeteer.launch(fallbackOptions);
          //this.logger.log('Navigateur initialisé avec configuration de secours');
        } catch (fallbackError) {
          this.logger.error(`Erreur de configuration de secours: ${fallbackError.message}`);
          throw fallbackError;
        }
      }
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.logger.log('Navigateur fermé');
      } catch (error) {
        this.logger.warn(`Erreur lors de la fermeture du navigateur: ${error.message}`);
        this.browser = null;
      }
    }
  }

  async getNewPage(useNewProxy: boolean = false): Promise<Page> {
    // Si useNewProxy est vrai ou si le navigateur n'est pas initialisé, on crée une nouvelle instance
    if (useNewProxy || !this.browser) {
      // Si un proxy est demandé et que le service est activé
      if (useNewProxy && this.useProxy) {
        // Fermer l'ancienne instance du navigateur si elle existe
        await this.closeBrowser();
        
        // Obtenir un nouveau proxy
        const proxy = this.proxyService.getNextProxy();
        this.currentProxy = proxy;
        
        // Initialiser le navigateur avec ce proxy
        await this.initBrowser(proxy!);
      } else if (!this.browser) {
        // Initialiser le navigateur sans proxy
        await this.initBrowser();
      }
    }
    
    if (!this.browser) {
      throw new Error('Navigateur non initialisé');
    }

    // Créer une nouvelle page
    const page = await this.browser.newPage();
    
    // Configurer les en-têtes HTTP pour simuler un utilisateur réel
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'DNT': '1',
    });

    // Configurer un user-agent réaliste
    const userAgent = this.randomizeUserAgent
      ? this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
      : this.userAgents[0];
      
    await page.setUserAgent(userAgent);

    // Augmenter les délais d'attente
    await page.setDefaultNavigationTimeout(90000); // Increased for slower environments
    await page.setDefaultTimeout(60000); // Increased for slower environments

    // Désactiver WebDriver detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      // @ts-ignore
      window.navigator.chrome = { runtime: {} };
      
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    return page;
  }

  // Rest of your methods remain the same...
  async simulateHumanBehavior(page: Page): Promise<void> {
    const intensityFactor = this.humanBehaviorIntensity === 'high' ? 3 : 
                           this.humanBehaviorIntensity === 'medium' ? 2 : 1;
    
    const actionsCount = Math.floor(Math.random() * (5 * intensityFactor)) + (3 * intensityFactor);
    
    for (let i = 0; i < actionsCount; i++) {
      const actionType = Math.floor(Math.random() * 4);
      
      switch(actionType) {
        case 0:
          await this.performRandomScroll(page);
          break;
        case 1:
          await this.performRandomMouseMovement(page);
          break;
        case 2:
          await this.performRandomPause();
          break;
        case 3:
          await this.performRandomInteraction(page);
          break;
      }
    }
  }
  
  private async performRandomScroll(page: Page): Promise<void> {
    try {
      const scrollHeight = Math.floor(Math.random() * (900 - 100 + 1)) + 100;
      const scrollDirection = Math.random() > 0.2 ? 1 : -1;
      
      await page.evaluate((height, direction) => {
        window.scrollBy(0, height * direction);
      }, scrollHeight, scrollDirection);
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * (1000 - 200) + 200));
    } catch (error) {
      this.logger.debug('Erreur mineure lors du scroll aléatoire');
    }
  }
  
  private async performRandomMouseMovement(page: Page): Promise<void> {
    try {
      const dimensions = await page.evaluate(() => {
        return {
          width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
          height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
        };
      });
      
      const startX = Math.floor(Math.random() * dimensions.width);
      const startY = Math.floor(Math.random() * dimensions.height);
      const endX = Math.floor(Math.random() * dimensions.width);
      const endY = Math.floor(Math.random() * dimensions.height);
      
      await page.mouse.move(startX, startY);
      
      const steps = Math.floor(Math.random() * 5) + 5;
      
      for (let i = 1; i <= steps; i++) {
        const deviation = {
          x: Math.random() * 40 - 20,
          y: Math.random() * 40 - 20
        };
        
        const nextX = startX + (endX - startX) * (i / steps) + deviation.x;
        const nextY = startY + (endY - startY) * (i / steps) + deviation.y;
        
        const boundedX = Math.max(0, Math.min(dimensions.width, nextX));
        const boundedY = Math.max(0, Math.min(dimensions.height, nextY));
        
        await page.mouse.move(boundedX, boundedY);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }
      
      await page.mouse.move(endX, endY);
    } catch (error) {
      this.logger.debug('Erreur mineure lors du mouvement de souris');
    }
  }
  
  private async performRandomPause(): Promise<void> {
    const intensity = this.humanBehaviorIntensity === 'high' ? 3 : 
                     this.humanBehaviorIntensity === 'medium' ? 2 : 1;
    const waitTime = Math.random() * (3 * intensity - 0.5) + 0.5;
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
  }
  
  private async performRandomInteraction(page: Page): Promise<void> {
    try {
      const commonSelectors = [
        'a[href="#"]',
        'button[type="button"]',
        '.carousel-control',
        '.dropdown-toggle',
        '.accordion-header',
        '.tab',
        'img[alt]:not([alt=""])'
      ];
      
      const randomSelector = commonSelectors[Math.floor(Math.random() * commonSelectors.length)];
      const elements = await page.$$(randomSelector);
      
      if (elements.length > 0) {
        const randomIndex = Math.floor(Math.random() * elements.length);
        const element = elements[randomIndex];
        
        const isVisible = await page.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 &&
                 rect.top >= 0 && rect.left >= 0 &&
                 rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        }, element);
        
        if (isVisible) {
          await page.evaluate((el) => {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            });
          }, element);
          
          await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
          
          if (Math.random() > 0.5) {
            await element.hover();
            await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 200));
          }
          
          const isSafeToClick = await page.evaluate((el) => {
            const href = el.getAttribute('href');
            const type = el.getAttribute('type');
            
            return (!href || href === '#' || href.startsWith('#') || href.startsWith('javascript:')) && 
                   (type !== 'submit');
          }, element);
          
          if (isSafeToClick && Math.random() > 0.7) {
            await element.click({
              delay: Math.random() * 100 + 50
            });
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
          }
        }
      }
    } catch (error) {
      this.logger.debug('Erreur mineure lors de l\'interaction aléatoire');
    }
  }
  
  async manageCookies(page: Page): Promise<void> {
    try {
      const cookieSelectors = [
        'button[id*="cookie"][id*="accept"], button[class*="cookie"][class*="accept"]',
        'button:contains("Accept"), button:contains("Accepter")',
        '.cookie-banner button, .cookie-consent button',
        '[id*="cookie-banner"] button, [class*="cookie-banner"] button',
        '[id*="cookie-consent"] button, [class*="cookie-consent"] button'
      ];
      
      for (const selector of cookieSelectors) {
        const cookieButtons = await page.$$(selector);
        if (cookieButtons.length > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
          
          await cookieButtons[0].click();
          this.logger.debug('Boîte de dialogue de cookies détectée et acceptée');
          
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
          break;
        }
      }
    } catch (error) {
      this.logger.debug('Erreur lors de la gestion des cookies');
    }
  }

  async detectBlocking(page: Page): Promise<BlockingStatus> {
    return await page.evaluate(() => {
      const getTextContent = () => {
        const bodyText = document.body.innerText;
        const title = document.title;
        return `${bodyText} ${title}`.toLowerCase();
      };

      const text = getTextContent();
      
      return {
        isBlocked: /blocked|captcha|robot|access denied|403|unusual activity|cloudflare/i.test(text),
        isCaptcha: /captcha|verify you are human/i.test(text),
        isCloudflare: /cloudflare/i.test(text)
      };
    });
  }

  async rotateProxyAndRetry(page: Page): Promise<Page> {
    this.logger.warn('Rotation du proxy détectée - tentative avec un nouveau proxy');
    
    await this.closeBrowser();
    
    const newProxy = this.proxyService.getNextProxy();
    
    if (!newProxy) {
      throw new Error('Aucun proxy disponible pour la rotation');
    }
    
    this.logger.log(`Rotation vers le proxy: ${newProxy.host}:${newProxy.port}`);
    
    await this.initBrowser(newProxy);
    
    return this.getNewPage();
  }

  async getPageWithProxyRotation(maxRetries: number = 3): Promise<Page> {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        const page = await this.getNewPage(attempts > 0);
        
        await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle0', timeout: 30000 });
        
        this.logger.log('Page obtenue avec succès');
        return page;
        
      } catch (error) {
        attempts++;
        this.logger.warn(`Tentative ${attempts} échouée: ${error.message}`);
        
        if (attempts >= maxRetries) {
          throw new Error(`Impossible d'obtenir une page après ${maxRetries} tentatives`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }
    
    throw new Error('Toutes les tentatives ont échoué');
  }

  async navigateWithBlockingDetection(url: string, maxRetries: number = 3): Promise<Page> {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        const page = await this.getNewPage(attempts > 0);
        
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        
        const blockingStatus = await this.detectBlocking(page);
        
        if (blockingStatus.isBlocked) {
          this.logger.warn(`Page bloquée détectée pour ${url}, tentative ${attempts + 1}`);
          
          if (attempts < maxRetries - 1) {
            await page.close();
            attempts++;
            continue;
          } else {
            throw new Error(`Page bloquée après ${maxRetries} tentatives`);
          }
        }
        
        await this.manageCookies(page);
        await this.simulateHumanBehavior(page);
        
        this.logger.log(`Navigation réussie vers ${url}`);
        return page;
        
      } catch (error) {
        attempts++;
        this.logger.error(`Erreur lors de la navigation (tentative ${attempts}): ${error.message}`);
        
        if (attempts >= maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000 * attempts));
      }
    }
    
    throw new Error(`Navigation échouée après ${maxRetries} tentatives`);
  }

  private async simulateAdvancedHumanBehavior(page: Page): Promise<void> {
    await this.bezierMouseMovement(page);
    await this.normalDistributionDelay();
    await this.realisticScroll(page);
  }

  private async bezierMouseMovement(page: Page): Promise<void> {
    const points = this.generateBezierPoints();
    for (const point of points) {
      await page.mouse.move(point.x, point.y);
      await this.delay(Math.random() * 100 + 50);
    }
  }

  private generateBezierPoints(): Point[] {
    const points: Point[] = [];
    const steps = 20;
    
    const cp1 = { x: Math.random() * 500, y: Math.random() * 500 };
    const cp2 = { x: Math.random() * 500, y: Math.random() * 500 };
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.pow(1-t, 3)*0 + 3*Math.pow(1-t, 2)*t*cp1.x + 3*(1-t)*Math.pow(t, 2)*cp2.x + Math.pow(t, 3)*800;
      const y = Math.pow(1-t, 3)*0 + 3*Math.pow(1-t, 2)*t*cp1.y + 3*(1-t)*Math.pow(t, 2)*cp2.y + Math.pow(t, 3)*600;
      points.push({ x, y });
    }
    
    return points;
  }

  private async normalDistributionDelay(): Promise<void> {
    let delay;
    do {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      delay = 1000 + z0 * 500;
    } while (delay < 200 || delay > 3000);
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async realisticScroll(page: Page): Promise<void> {
    const scrollHeight = Math.floor(Math.random() * 2000);
    const steps = 20;
    
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const distance = scrollHeight * (1 - Math.pow(1 - t, 3));
      await page.evaluate(y => window.scrollTo(0, y), distance);
      await this.delay(50 + Math.random() * 50);
    }
  }

  async optimizeForAirbnb(page: Page): Promise<void> {
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://www.airbnb.com/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
  
    await page.setCookie({
      name: '_airbed_session_id',
      value: 'random_session_id_' + Math.random().toString(36).substring(2),
      domain: '.airbnb.com'
    });
  
    await page.evaluateOnNewDocument(() => {
      delete (navigator as any).__proto__.webdriver;
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      const windowAny = window as any;
      if (windowAny.chrome) {
        windowAny.chrome.runtime = {
          sendMessage: () => Promise.resolve({}),
          connect: () => ({
            postMessage: () => {},
            onMessage: {
              addListener: () => {}
            }
          })
        };
      } else {
        windowAny.chrome = {
          runtime: {
            sendMessage: () => Promise.resolve({}),
            connect: () => ({
              postMessage: () => {},
              onMessage: {
                addListener: () => {}
              }
            })
          }
        };
      }
  
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
  
      const originalToString = Function.prototype.toString;
      Function.prototype.toString = function() {
        if (this === navigator.webdriver) {
          return 'function webdriver() { [native code] }';
        }
        return originalToString.call(this);
      };
  
      Object.defineProperty(Object.getPrototypeOf(navigator), 'webdriver', {
        set: undefined,
        enumerable: false,
        configurable: false
      });
    });
  
    await page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });
  
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  async rotateSession(page: Page) {
    await this.closeBrowser();
    await this.initBrowser();
    return this.getNewPage();
  }
}