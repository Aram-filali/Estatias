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
  private memoryOptimized: boolean = true; // New flag for memory optimization

  constructor(
    private configService: ConfigService,
    private proxyService: ProxyService,
  ) {
    puppeteer.use(StealthPlugin());
    
    this.randomizeUserAgent = this.configService.get<string>('RANDOMIZE_USER_AGENT') !== 'false';
    this.humanBehaviorIntensity = this.configService.get<'low' | 'medium' | 'high'>('HUMAN_BEHAVIOR_INTENSITY', 'low'); // Default to low for memory
    this.useProxy = this.configService.get<string>('USE_PROXY') !== 'false';
    this.memoryOptimized = this.configService.get<string>('MEMORY_OPTIMIZED') !== 'false';
    
    this.generateUserAgents();
  }

  async onModuleInit() {
    // Don't initialize browser on startup to save memory
    this.logger.log('BrowserService initialized - browser will be created on demand');
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  private generateUserAgents(): void {
    // Reduce user agents to save memory
    const count = this.memoryOptimized ? 3 : 10;
    for (let i = 0; i < count; i++) {
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      this.userAgents.push(userAgent.toString());
    }
    
    // Add only essential stable user agents
    this.userAgents.push(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  private getChromePath(): string | undefined {
    const platform = process.platform;
    
    if (platform === 'win32') {
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.CHROME_PATH,
      ];
      
      const fs = require('fs');
      for (const path of possiblePaths) {
        if (path && fs.existsSync(path)) {
          return path;
        }
      }
    }
    
    return undefined;
  }

  async initBrowser(proxy?: Proxy): Promise<void> {
    try {
      this.currentProxy = proxy || null;
      const headless = this.configService.get<string>('BROWSER_HEADLESS') !== 'false';
      
      const launchOptions: any = {
        headless,
        args: [
          // Memory optimization flags
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--memory-pressure-off',
          '--max_old_space_size=300', // Reserve memory for Node.js
          '--single-process', // Use single process to save memory
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          
          // Anti-detection (essential only)
          '--disable-blink-features=AutomationControlled',
          '--disable-notifications',
          
          // Performance optimizations
          '--disable-extensions',
          '--disable-plugins',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          
          // Conditionally disable images and CSS for memory saving
          ...(this.memoryOptimized ? [
            '--disable-images',
            '--disable-javascript', // Only if scraping doesn't need JS
            '--disable-css'
          ] : []),
          
          // Smaller viewport for memory
          '--window-size=1280,720',
        ],
        defaultViewport: { 
          width: this.memoryOptimized ? 1280 : 1920, 
          height: this.memoryOptimized ? 720 : 1080 
        },
      };
      
      const chromePath = this.getChromePath();
      if (chromePath) {
        launchOptions.executablePath = chromePath;
      }
      
      if (this.useProxy && proxy) {
        const proxyUrl = this.proxyService.formatProxyUrl(proxy);
        if (proxyUrl) {
          launchOptions.args.push(`--proxy-server=${proxyUrl}`);
          this.logger.log(`Browser initialized with proxy: ${proxy.host}:${proxy.port}`);
        }
      }
      
      this.browser = await puppeteer.launch(launchOptions);
      this.logger.log('Browser initialized successfully');
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
    } catch (error) {
      this.logger.error(`Browser initialization error: ${error.message}`);
      throw error;
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.logger.log('Browser closed');
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
      } catch (error) {
        this.logger.error(`Error closing browser: ${error.message}`);
      }
    }
  }

  async getNewPage(useNewProxy: boolean = false): Promise<Page> {
    // Initialize browser only when needed
    if (useNewProxy || !this.browser) {
      if (useNewProxy && this.useProxy) {
        await this.closeBrowser();
        const proxy = this.proxyService.getNextProxy();
        this.currentProxy = proxy;
        await this.initBrowser(proxy!);
      } else if (!this.browser) {
        await this.initBrowser();
      }
    }
    
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    // Memory optimization: reduce cache
    await page.setCacheEnabled(false);
    
    // Essential headers only
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Connection': 'keep-alive',
      'DNT': '1',
    });

    const userAgent = this.randomizeUserAgent
      ? this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
      : this.userAgents[0];
      
    await page.setUserAgent(userAgent);

    // Reduced timeouts for memory efficiency
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(15000);

    // Essential anti-detection only
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      // @ts-ignore
      window.navigator.chrome = { runtime: {} };
    });

    return page;
  }

  // Simplified human behavior for memory efficiency
  async simulateHumanBehavior(page: Page): Promise<void> {
    if (!this.memoryOptimized) {
      // Full behavior simulation only in non-optimized mode
      return this.simulateFullHumanBehavior(page);
    }
    
    // Minimal behavior simulation for memory-constrained environments
    const actionsCount = Math.floor(Math.random() * 2) + 1; // 1-2 actions only
    
    for (let i = 0; i < actionsCount; i++) {
      const actionType = Math.floor(Math.random() * 2); // Only scroll and pause
      
      switch(actionType) {
        case 0:
          await this.performSimpleScroll(page);
          break;
        case 1:
          await this.performShortPause();
          break;
      }
    }
  }

  private async simulateFullHumanBehavior(page: Page): Promise<void> {
    // Your original full implementation
    const intensityFactor = this.humanBehaviorIntensity === 'high' ? 3 : 
                           this.humanBehaviorIntensity === 'medium' ? 2 : 1;
    
    const actionsCount = Math.floor(Math.random() * (3 * intensityFactor)) + (2 * intensityFactor);
    
    for (let i = 0; i < actionsCount; i++) {
      const actionType = Math.floor(Math.random() * 3);
      
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
      }
    }
  }

  private async performSimpleScroll(page: Page): Promise<void> {
    try {
      const scrollHeight = Math.floor(Math.random() * 500) + 100;
      const scrollDirection = Math.random() > 0.3 ? 1 : -1;
      
      await page.evaluate((height, direction) => {
        window.scrollBy(0, height * direction);
      }, scrollHeight, scrollDirection);
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
    } catch (error) {
      this.logger.debug('Minor error during simple scroll');
    }
  }

  private async performShortPause(): Promise<void> {
    const waitTime = Math.random() * 1 + 0.3; // 0.3-1.3 seconds
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
  }

  // Keep your original methods but add memory cleanup
  private async performRandomScroll(page: Page): Promise<void> {
    try {
      const scrollHeight = Math.floor(Math.random() * (600 - 100 + 1)) + 100; // Reduced range
      const scrollDirection = Math.random() > 0.2 ? 1 : -1;
      
      await page.evaluate((height, direction) => {
        window.scrollBy(0, height * direction);
      }, scrollHeight, scrollDirection);
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * (500 - 100) + 100)); // Reduced wait time
    } catch (error) {
      this.logger.debug('Minor error during random scroll');
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
      
      // Reduced steps for memory
      const steps = Math.floor(Math.random() * 3) + 3; // 3-5 steps instead of 5-10
      
      for (let i = 1; i <= steps; i++) {
        const deviation = {
          x: Math.random() * 20 - 10, // Reduced deviation
          y: Math.random() * 20 - 10
        };
        
        const nextX = startX + (endX - startX) * (i / steps) + deviation.x;
        const nextY = startY + (endY - startY) * (i / steps) + deviation.y;
        
        const boundedX = Math.max(0, Math.min(dimensions.width, nextX));
        const boundedY = Math.max(0, Math.min(dimensions.height, nextY));
        
        await page.mouse.move(boundedX, boundedY);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50)); // Faster movement
      }
      
      await page.mouse.move(endX, endY);
    } catch (error) {
      this.logger.debug('Minor error during mouse movement');
    }
  }

  private async performRandomPause(): Promise<void> {
    const intensity = this.humanBehaviorIntensity === 'high' ? 2 : 
                     this.humanBehaviorIntensity === 'medium' ? 1.5 : 1;
    const waitTime = Math.random() * (2 * intensity - 0.3) + 0.3; // Reduced max wait time
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
  }

  // Simplified cookie management
  async manageCookies(page: Page): Promise<void> {
    try {
      const cookieSelectors = [
        'button[id*="cookie"][id*="accept"]',
        'button[class*="cookie"][class*="accept"]',
        '.cookie-banner button'
      ];
      
      for (const selector of cookieSelectors) {
        const cookieButtons = await page.$$(selector);
        if (cookieButtons.length > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
          await cookieButtons[0].click();
          this.logger.debug('Cookie dialog detected and accepted');
          await new Promise(resolve => setTimeout(resolve, 300));
          break;
        }
      }
    } catch (error) {
      this.logger.debug('Error during cookie management');
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
    this.logger.warn('Proxy rotation detected - attempting with new proxy');
    
    await this.closeBrowser();
    
    const newProxy = this.proxyService.getNextProxy();
    
    if (!newProxy) {
      throw new Error('No proxy available for rotation');
    }
    
    this.logger.log(`Rotating to proxy: ${newProxy.host}:${newProxy.port}`);
    
    await this.initBrowser(newProxy);
    
    return this.getNewPage();
  }

  // Memory-optimized navigation
  async navigateWithBlockingDetection(url: string, maxRetries: number = 2): Promise<Page> { // Reduced retries
    let attempts = 0;
    
    while (attempts < maxRetries) {
      let page: Page | null = null;
      try {
        page = await this.getNewPage(attempts > 0);
        
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', // Faster than networkidle0
          timeout: 30000 
        });
        
        const blockingStatus = await this.detectBlocking(page);
        
        if (blockingStatus.isBlocked) {
          this.logger.warn(`Page blocked detected for ${url}, attempt ${attempts + 1}`);
          
          if (attempts < maxRetries - 1) {
            await page.close();
            attempts++;
            continue;
          } else {
            throw new Error(`Page blocked after ${maxRetries} attempts`);
          }
        }
        
        await this.manageCookies(page);
        await this.simulateHumanBehavior(page);
        
        this.logger.log(`Successful navigation to ${url}`);
        return page;
        
      } catch (error) {
        if (page) {
          await page.close().catch(() => {}); // Ensure cleanup
        }
        
        attempts++;
        this.logger.error(`Navigation error (attempt ${attempts}): ${error.message}`);
        
        if (attempts >= maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Shorter wait
      }
    }
    
    throw new Error(`Navigation failed after ${maxRetries} attempts`);
  }

  // Memory cleanup utility
  async cleanup(): Promise<void> {
    await this.closeBrowser();
    if (global.gc) {
      global.gc();
    }
  }

  // Optimized for Airbnb with memory constraints
  async optimizeForAirbnb(page: Page): Promise<void> {
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://www.airbnb.com/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin'
    });

    await page.setCookie({
      name: '_airbed_session_id',
      value: 'session_' + Math.random().toString(36).substring(2, 15),
      domain: '.airbnb.com'
    });

    await page.evaluateOnNewDocument(() => {
      delete (navigator as any).__proto__.webdriver;
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      const windowAny = window as any;
      windowAny.chrome = windowAny.chrome || { runtime: {} };
    });

    await page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1
    });
  }

  async rotateSession(page: Page): Promise<Page> {
    await this.closeBrowser();
    await this.initBrowser();
    return this.getNewPage();
  }

  // New method: Check memory usage
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  // New method: Force cleanup when memory is high
  async forceCleanupIfNeeded(): Promise<void> {
    const memUsage = this.getMemoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    
    if (memUsageMB > 400) { // If using more than 400MB
      this.logger.warn(`High memory usage detected: ${memUsageMB.toFixed(2)}MB - forcing cleanup`);
      await this.cleanup();
    }
  }
}