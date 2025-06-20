import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { ProxyService, Proxy } from './proxy.service';
import UserAgent from 'user-agents'; // Fixed import - use default import

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

  // Ajoutez cette méthode dans votre BrowserService
private getChromePath(): string | undefined {
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Chemins possibles pour Chrome sur Windows
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.CHROME_PATH, // Variable d'environnement personnalisée
    ];
    
    const fs = require('fs');
    for (const path of possiblePaths) {
      if (path && fs.existsSync(path)) {
        return path;
      }
    }
  }
  
  // Pour Linux/Docker (Render)
  return undefined; // Utiliser le chemin par défaut
}

// Modifiez votre méthode initBrowser
async initBrowser(proxy?: Proxy): Promise<void> {
  try {
    this.currentProxy = proxy || null;
    const headless = this.configService.get<string>('BROWSER_HEADLESS') !== 'false';
    
    const launchOptions: any = {
      headless,
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
    };
    
    // Ajouter le chemin Chrome pour Windows
    const chromePath = this.getChromePath();
    if (chromePath) {
      launchOptions.executablePath = chromePath;
      this.logger.log(`Utilisation de Chrome: ${chromePath}`);
    }
    
    // Ajouter le proxy si spécifié
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
    throw error;
  }
}
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Navigateur fermé');
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
      'DNT': '1', // Do Not Track
    });

    // Configurer un user-agent réaliste (aléatoire si activé)
    const userAgent = this.randomizeUserAgent
      ? this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
      : this.userAgents[0];
      
    await page.setUserAgent(userAgent);

    // Augmenter les délais d'attente pour les requêtes réseau et la navigation
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(30000);

    // Désactiver WebDriver
    await page.evaluateOnNewDocument(() => {
      // Supprimer les variables qui peuvent révéler que c'est Puppeteer
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      // @ts-ignore
      window.navigator.chrome = { runtime: {} };
      
      // Supprimer les fonctions d'automatisation
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

  async simulateHumanBehavior(page: Page): Promise<void> {
    const intensityFactor = this.humanBehaviorIntensity === 'high' ? 3 : 
                           this.humanBehaviorIntensity === 'medium' ? 2 : 1;
    
    // Nombre d'actions aléatoires à effectuer
    const actionsCount = Math.floor(Math.random() * (5 * intensityFactor)) + (3 * intensityFactor);
    
    for (let i = 0; i < actionsCount; i++) {
      // Choisir une action aléatoire
      const actionType = Math.floor(Math.random() * 4);
      
      switch(actionType) {
        case 0: // Scroll aléatoire
          await this.performRandomScroll(page);
          break;
        case 1: // Mouvement de souris aléatoire
          await this.performRandomMouseMovement(page);
          break;
        case 2: // Pause aléatoire
          await this.performRandomPause();
          break;
        case 3: // Interagir avec un élément non-critique
          await this.performRandomInteraction(page);
          break;
      }
    }
  }
  
  private async performRandomScroll(page: Page): Promise<void> {
    try {
      // Générer une hauteur de défilement aléatoire
      const scrollHeight = Math.floor(Math.random() * (900 - 100 + 1)) + 100;
      const scrollDirection = Math.random() > 0.2 ? 1 : -1; // 80% scrolling vers le bas
      
      await page.evaluate((height, direction) => {
        window.scrollBy(0, height * direction);
      }, scrollHeight, scrollDirection);
      
      // Attente courte après le défilement
      await new Promise(resolve => setTimeout(resolve, Math.random() * (1000 - 200) + 200));
    } catch (error) {
      this.logger.debug('Erreur mineure lors du scroll aléatoire');
    }
  }
  
  private async performRandomMouseMovement(page: Page): Promise<void> {
    try {
      // Obtenir les dimensions de la page
      const dimensions = await page.evaluate(() => {
        return {
          width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
          height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
        };
      });
      
      // Points aléatoires pour le mouvement de souris
      const startX = Math.floor(Math.random() * dimensions.width);
      const startY = Math.floor(Math.random() * dimensions.height);
      const endX = Math.floor(Math.random() * dimensions.width);
      const endY = Math.floor(Math.random() * dimensions.height);
      
      // Déplacer la souris de manière fluide
      await page.mouse.move(startX, startY);
      
      // Nombre de points intermédiaires
      const steps = Math.floor(Math.random() * 5) + 5;
      
      // Calculer un chemin avec des courbes légères plutôt qu'une ligne droite
      for (let i = 1; i <= steps; i++) {
        // Ajouter une légère déviation
        const deviation = {
          x: Math.random() * 40 - 20,
          y: Math.random() * 40 - 20
        };
        
        const nextX = startX + (endX - startX) * (i / steps) + deviation.x;
        const nextY = startY + (endY - startY) * (i / steps) + deviation.y;
        
        // S'assurer que les coordonnées restent dans les limites
        const boundedX = Math.max(0, Math.min(dimensions.width, nextX));
        const boundedY = Math.max(0, Math.min(dimensions.height, nextY));
        
        await page.mouse.move(boundedX, boundedY);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }
      
      // Mouvement final
      await page.mouse.move(endX, endY);
    } catch (error) {
      this.logger.debug('Erreur mineure lors du mouvement de souris');
    }
  }
  
  private async performRandomPause(): Promise<void> {
    // Pause aléatoire entre 0.5 et 3 secondes (plus longue avec une intensité élevée)
    const intensity = this.humanBehaviorIntensity === 'high' ? 3 : 
                     this.humanBehaviorIntensity === 'medium' ? 2 : 1;
    const waitTime = Math.random() * (3 * intensity - 0.5) + 0.5;
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
  }
  
  private async performRandomInteraction(page: Page): Promise<void> {
    try {
      // Liste des sélecteurs communs et non critiques
      const commonSelectors = [
        'a[href="#"]', // Liens avec ancre
        'button[type="button"]', // Boutons non-submit
        '.carousel-control', // Contrôles de carousel
        '.dropdown-toggle', // Menus déroulants
        '.accordion-header', // En-têtes d'accordéon
        '.tab', // Onglets
        'img[alt]:not([alt=""])' // Images avec attribut alt non vide
      ];
      
      // Sélecteur aléatoire à essayer
      const randomSelector = commonSelectors[Math.floor(Math.random() * commonSelectors.length)];
      
      // Trouver tous les éléments correspondant au sélecteur
      const elements = await page.$$(randomSelector);
      
      if (elements.length > 0) {
        // Prendre un élément aléatoire
        const randomIndex = Math.floor(Math.random() * elements.length);
        const element = elements[randomIndex];
        
        // Vérifier si l'élément est visible
        const isVisible = await page.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 &&
                 rect.top >= 0 && rect.left >= 0 &&
                 rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        }, element);
        
        if (isVisible) {
          // Scroller jusqu'à l'élément
          await page.evaluate((el) => {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            });
          }, element);
          
          // Attendre un court instant
          await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
          
          // 50% de chance de survoler l'élément
          if (Math.random() > 0.5) {
            await element.hover();
            await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 200));
          }
          
          // 30% de chance de cliquer sur l'élément, uniquement s'il semble inoffensif
          const isSafeToClick = await page.evaluate((el) => {
            // Ignorer les éléments qui semblent être des liens externes ou des boutons de soumission
            const href = el.getAttribute('href');
            const type = el.getAttribute('type');
            
            return (!href || href === '#' || href.startsWith('#') || href.startsWith('javascript:')) && 
                   (type !== 'submit');
          }, element);
          
          if (isSafeToClick && Math.random() > 0.7) {
            // Cliquer et attendre
            await element.click({
              delay: Math.random() * 100 + 50 // Délai entre appui et relâchement pour simuler un clic humain
            });
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
          }
        }
      }
    } catch (error) {
      this.logger.debug('Erreur mineure lors de l\'interaction aléatoire');
    }
  }
  
  // Méthode pour gérer les cookies de manière plus humaine
  async manageCookies(page: Page): Promise<void> {
    try {
      // 70% de chance d'accepter les cookies si une boîte de dialogue est présente
      const cookieSelectors = [
        'button[id*="cookie"][id*="accept"], button[class*="cookie"][class*="accept"]',
        'button:contains("Accept"), button:contains("Accepter")',
        '.cookie-banner button, .cookie-consent button',
        '[id*="cookie-banner"] button, [class*="cookie-banner"] button',
        '[id*="cookie-consent"] button, [class*="cookie-consent"] button'
      ];
      
      // Essayer de trouver et interagir avec une boîte de dialogue de cookies
      for (const selector of cookieSelectors) {
        const cookieButtons = await page.$$(selector);
        if (cookieButtons.length > 0) {
          // Attendre un moment avant d'interagir (comme un humain)
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
          
          // Cliquer sur le premier bouton
          await cookieButtons[0].click();
          this.logger.debug('Boîte de dialogue de cookies détectée et acceptée');
          
          // Attendre que la boîte de dialogue disparaisse
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

  // Méthode corrigée pour la rotation des proxies
  async rotateProxyAndRetry(page: Page): Promise<Page> {
    this.logger.warn('Rotation du proxy détectée - tentative avec un nouveau proxy');
    
    // Fermer le navigateur actuel
    await this.closeBrowser();
    
    // Obtenir un nouveau proxy via getNextProxy (méthode existante)
    const newProxy = this.proxyService.getNextProxy();
    
    if (!newProxy) {
      throw new Error('Aucun proxy disponible pour la rotation');
    }
    
    this.logger.log(`Rotation vers le proxy: ${newProxy.host}:${newProxy.port}`);
    
    // Initialiser le navigateur avec le nouveau proxy
    await this.initBrowser(newProxy);
    
    // Retourner une nouvelle page
    return this.getNewPage();
  }

  // Méthode utilitaire pour tester un proxy et récupérer une page
  async getPageWithProxyRotation(maxRetries: number = 3): Promise<Page> {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        const page = await this.getNewPage(attempts > 0); // Utiliser un nouveau proxy après le premier échec
        
        // Tester la page avec une requête simple
        await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle0', timeout: 30000 });
        
        this.logger.log('Page obtenue avec succès');
        return page;
        
      } catch (error) {
        attempts++;
        this.logger.warn(`Tentative ${attempts} échouée: ${error.message}`);
        
        if (attempts >= maxRetries) {
          throw new Error(`Impossible d'obtenir une page après ${maxRetries} tentatives`);
        }
        
        // Attendre avant la prochaine tentative
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }
    
    throw new Error('Toutes les tentatives ont échoué');
  }

  // Exemple d'usage avec détection de blocage
  async navigateWithBlockingDetection(url: string, maxRetries: number = 3): Promise<Page> {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        const page = await this.getNewPage(attempts > 0);
        
        // Aller à l'URL
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        
        // Vérifier si la page est bloquée
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
        
        // Gestion des cookies et comportement humain
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
        
        // Attendre avant la prochaine tentative
        await new Promise(resolve => setTimeout(resolve, 3000 * attempts));
      }
    }
    
    throw new Error(`Navigation échouée après ${maxRetries} tentatives`);
  }

  // Ajouter dans BrowserService
  private async simulateAdvancedHumanBehavior(page: Page): Promise<void> {
    // Mouvements de souris plus réalistes avec courbes de Bézier
    await this.bezierMouseMovement(page);
    
    // Délais variables basés sur une distribution normale
    await this.normalDistributionDelay();
    
    // Scroll réaliste avec accélération/décélération
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
    const points: Point[] = []; // Typage explicite du tableau
    const steps = 20;
    
    // Points de contrôle aléatoires
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
    // Générer un délai avec distribution normale (moyenne 1s, écart-type 0.5s)
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
      // Fonction d'accélération/décélération
      const distance = scrollHeight * (1 - Math.pow(1 - t, 3));
      await page.evaluate(y => window.scrollTo(0, y), distance);
      await this.delay(50 + Math.random() * 50);
    }
  }

  async optimizeForAirbnb(page: Page): Promise<void> {
    // Set realistic Airbnb headers
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
  
    // Set cookies that Airbnb expects
    await page.setCookie({
      name: '_airbed_session_id',
      value: 'random_session_id_' + Math.random().toString(36).substring(2),
      domain: '.airbnb.com'
    });
  
    // Remove automation traces
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      delete (navigator as any).__proto__.webdriver;
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // Mock Chrome runtime with proper typing
      const windowAny = window as any;
      if (windowAny.chrome) {
        windowAny.chrome.runtime = {
          // Mock methods Airbnb might check
          sendMessage: () => Promise.resolve({}),
          connect: () => ({
            postMessage: () => {},
            onMessage: {
              addListener: () => {}
            }
          })
        };
      } else {
        // Create chrome object if it doesn't exist
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
  
      // Additional anti-detection measures
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5] // Mock some plugins
      });
  
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
  
      // Override toString to hide function modifications
      const originalToString = Function.prototype.toString;
      Function.prototype.toString = function() {
        if (this === navigator.webdriver) {
          return 'function webdriver() { [native code] }';
        }
        return originalToString.call(this);
      };
  
      // Hide chrome property modifications
      Object.defineProperty(Object.getPrototypeOf(navigator), 'webdriver', {
        set: undefined,
        enumerable: false,
        configurable: false
      });
    });
  
    // Additional viewport and device settings
    await page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });
  
    // Set user agent to a realistic one
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }
// Add to BrowserService
/*async throttleRequests(page: Page, minDelay = 2000, maxDelay = 5000) {
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;
  await page.delay(delay);
}*/

// Add to BrowserService
async rotateSession(page: Page) {
  await this.closeBrowser();
  await this.initBrowser();
  return this.getNewPage();
}

}