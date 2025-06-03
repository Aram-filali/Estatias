// src/modules/scraper/temp-email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ConfigService } from '@nestjs/config';

// Configuration de puppeteer avec le plugin stealth
puppeteer.use(StealthPlugin());

@Injectable()
export class TempEmailService {
  private readonly logger = new Logger(TempEmailService.name);
  private readonly tempEmailProvider: 'tenminmail' | 'tempmail' | 'mailinator';
  private readonly useHeadlessBrowser: boolean;

  constructor(private configService: ConfigService) {
    // Configuration du service d'emails temporaires
    this.tempEmailProvider = this.configService.get<'tenminmail' | 'tempmail' | 'mailinator'>('TEMP_EMAIL_PROVIDER', 'tenminmail');
    this.useHeadlessBrowser = this.configService.get<string>('USE_HEADLESS_FOR_EMAIL') !== 'false';
  }

  /**
   * Génère une adresse email temporaire
   */
  async generateTempEmail(): Promise<{ email: string; mailboxId: string }> {
    this.logger.log(`Génération d'une adresse email temporaire via ${this.tempEmailProvider}`);
    
    try {
      switch (this.tempEmailProvider) {
        case 'tenminmail':
          return await this.generateTenMinMailEmail();
        case 'tempmail':
          return await this.generateTempMailEmail();
        case 'mailinator':
          return await this.generateMailinatorEmail();
        default:
          return await this.generateTenMinMailEmail();
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la génération d'email temporaire: ${error.message}`);
      throw error;
    }
  }

  /**
   * Génère une adresse email via 10MinMail
   */
  private async generateTenMinMailEmail(): Promise<{ email: string; mailboxId: string }> {
    // Cette méthode nécessite l'utilisation d'un navigateur pour interagir avec le site
    const browser = await puppeteer.launch({
      headless: this.useHeadlessBrowser,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ]
    });

    try {
      const page = await browser.newPage();
      await page.goto('https://10minutemail.com', { waitUntil: 'networkidle2' });
      
      // Attendre que l'adresse email soit générée
      await page.waitForSelector('.mail-address-address');
      
      // Extraire l'adresse email générée
      const email = await page.evaluate(() => {
        const emailElement = document.querySelector('.mail-address-address');
        return emailElement ? emailElement.textContent?.trim() || '' : '';
      });
      
      // Extraire un identifiant unique pour cette boîte mail (souvent un cookie)
      const mailboxId = await page.evaluate(() => {
        // Cet ID peut être un cookie ou un token spécifique au service
        return document.cookie.split(';').find(c => c.trim().startsWith('mail_id='))?.split('=')[1] || '';
      });
      
      if (!email) {
        throw new Error('Impossible de générer une adresse email via 10MinMail');
      }
      
      return { email, mailboxId };
    } finally {
      await browser.close();
    }
  }

  /**
   * Génère une adresse email via temp-mail.org
   */
  private async generateTempMailEmail(): Promise<{ email: string; mailboxId: string }> {
    const browser = await puppeteer.launch({
      headless: this.useHeadlessBrowser,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.goto('https://temp-mail.org/', { waitUntil: 'networkidle2' });
      
      // Attendre que l'adresse email soit générée
      await page.waitForSelector('.emailbox-input');
      
      // Extraire l'adresse email générée
      const email = await page.evaluate(() => {
        const emailElement = document.querySelector('.emailbox-input') as HTMLInputElement;
        return emailElement ? emailElement.value || '' : '';
      });
      
      // Extraire un identifiant unique pour cette boîte mail
      const mailboxId = await page.evaluate(() => {
        return document.cookie || '';
      });
      
      if (!email) {
        throw new Error('Impossible de générer une adresse email via temp-mail.org');
      }
      
      return { email, mailboxId };
    } finally {
      await browser.close();
    }
  }

  /**
   * Génère une adresse email via Mailinator
   */
  private async generateMailinatorEmail(): Promise<{ email: string; mailboxId: string }> {
    // Génération d'un nom aléatoire pour l'adresse email
    const randomName = 'user_' + Math.random().toString(36).substring(2, 12);
    const email = `${randomName}@mailinator.com`;
    
    // Pour Mailinator, l'ID de la boîte est simplement le nom avant @
    const mailboxId = randomName;
    
    return { email, mailboxId };
  }

  /**
   * Vérifie les emails reçus pour un code de confirmation ou un lien d'activation
   */
  async checkEmailForConfirmation(mailboxId: string, sender: string, waitTimeSeconds: number = 120): Promise<string | null> {
    this.logger.log(`Vérification des emails de ${sender} dans la boîte ${mailboxId}`);
    
    const maxAttempts = Math.ceil(waitTimeSeconds / 10); // Vérifier toutes les 10 secondes
    let currentAttempt = 0;
    
    while (currentAttempt < maxAttempts) {
      currentAttempt++;
      
      try {
        switch (this.tempEmailProvider) {
          case 'tenminmail':
            return await this.checkTenMinMailInbox(mailboxId, sender);
          case 'tempmail':
            return await this.checkTempMailInbox(mailboxId, sender);
          case 'mailinator':
            return await this.checkMailinatorInbox(mailboxId, sender);
          default:
            return await this.checkTenMinMailInbox(mailboxId, sender);
        }
      } catch (error) {
        this.logger.debug(`Tentative ${currentAttempt}/${maxAttempts}: Pas d'email trouvé. ${error.message}`);
      }
      
      // Attendre 10 secondes avant la prochaine vérification
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    this.logger.warn(`Aucun email de confirmation trouvé après ${waitTimeSeconds} secondes`);
    return null;
  }

  /**
   * Vérifie les emails dans 10MinMail
   */
  private async checkTenMinMailInbox(mailboxId: string, sender: string): Promise<string | null> {
    const browser = await puppeteer.launch({
      headless: this.useHeadlessBrowser,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Restaurer la session
      await page.setCookie({ name: 'mail_id', value: mailboxId, domain: '10minutemail.com' });
      await page.goto('https://10minutemail.com', { waitUntil: 'networkidle2' });
      
      // Chercher des emails du sender spécifié
      const emailFound = await page.evaluate((senderFilter) => {
        const emails = Array.from(document.querySelectorAll('.mail-item'));
        const targetEmail = emails.find(email => {
          const senderElement = email.querySelector('.sender-name');
          return senderElement && senderElement.textContent?.includes(senderFilter);
        }) as HTMLElement;
        
        if (targetEmail) {
          // Simuler un clic sur l'email
          targetEmail.click();
          return true;
        }
        return false;
      }, sender);
      
      if (!emailFound) {
        throw new Error('Email non trouvé');
      }
      
      // Attendre que le contenu de l'email soit chargé
      await page.waitForSelector('.inbox-data-content-intro');
      
      // Extraire les liens et/ou codes d'activation
      const confirmationInfo = await page.evaluate(() => {
        // Chercher des liens qui contiennent des mots clés d'activation
        const content = document.querySelector('.inbox-data-content-intro');
        if (!content) return null;
        
        // Chercher d'abord des liens explicites
        const links = Array.from(content.querySelectorAll('a')).filter(link => {
          const href = link.getAttribute('href');
          const text = link.textContent?.toLowerCase();
          return (href && (
            href.includes('confirm') || 
            href.includes('activate') || 
            href.includes('verify')
          )) || (
            text?.includes('confirm') ||
            text?.includes('activate') ||
            text?.includes('verify')
          );
        });
        
        if (links.length > 0) {
          return links[0].getAttribute('href');
        }
        
        // Si pas de lien, chercher un code de confirmation
        const text = content.textContent;
        const codeMatch = text?.match(/code[:\s]+([A-Z0-9]{4,8})/i) || 
                          text?.match(/verification code[:\s]+([A-Z0-9]{4,8})/i);
        
        return codeMatch ? codeMatch[1] : null;
      });
      
      return confirmationInfo;
    } finally {
      await browser.close();
    }
  }

  /**
   * Vérifie les emails dans temp-mail.org
   */
  private async checkTempMailInbox(mailboxId: string, sender: string): Promise<string | null> {
    const browser = await puppeteer.launch({
      headless: this.useHeadlessBrowser,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Restaurer la session avec les cookies
      if (mailboxId) {
        const cookies = mailboxId.split(';').map(cookie => {
          const [name, value] = cookie.trim().split('=');
          return { name, value, domain: 'temp-mail.org' };
        });
        await page.setCookie(...cookies);
      }
      
      await page.goto('https://temp-mail.org/', { waitUntil: 'networkidle2' });
      
      // Attendre et vérifier les emails
      await page.waitForSelector('.mail-list');
      
      const emailFound = await page.evaluate((senderFilter) => {
        const emails = Array.from(document.querySelectorAll('.mail-item'));
        const targetEmail = emails.find(email => {
          const senderElement = email.querySelector('.sender');
          return senderElement && senderElement.textContent?.includes(senderFilter);
        }) as HTMLElement;
        
        if (targetEmail) {
          targetEmail.click();
          return true;
        }
        return false;
      }, sender);
      
      if (!emailFound) {
        throw new Error('Email non trouvé');
      }
      
      // Attendre le contenu de l'email
      await page.waitForSelector('.mail-content');
      
      const confirmationInfo = await page.evaluate(() => {
        const content = document.querySelector('.mail-content');
        if (!content) return null;
        
        // Chercher des liens d'activation
        const links = Array.from(content.querySelectorAll('a')).filter(link => {
          const href = link.getAttribute('href');
          const text = link.textContent?.toLowerCase();
          return (href && (
            href.includes('confirm') || 
            href.includes('activate') || 
            href.includes('verify')
          )) || (
            text?.includes('confirm') ||
            text?.includes('activate') ||
            text?.includes('verify')
          );
        });
        
        if (links.length > 0) {
          return links[0].getAttribute('href');
        }
        
        // Chercher un code de confirmation
        const text = content.textContent;
        const codeMatch = text?.match(/code[:\s]+([A-Z0-9]{4,8})/i) || 
                          text?.match(/verification code[:\s]+([A-Z0-9]{4,8})/i);
        
        return codeMatch ? codeMatch[1] : null;
      });
      
      return confirmationInfo;
    } finally {
      await browser.close();
    }
  }
  
  /**
   * Vérifie les emails dans Mailinator
   */
  private async checkMailinatorInbox(mailboxId: string, sender: string): Promise<string | null> {
    try {
      // Utiliser l'API publique de Mailinator
      const response = await axios.get(`https://www.mailinator.com/api/v2/domains/public/inboxes/${mailboxId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const emails = response.data.msgs || [];
      
      // Chercher un email du sender spécifié
      const targetEmail = emails.find((email: any) => 
        email.from && email.from.toLowerCase().includes(sender.toLowerCase())
      );
      
      if (!targetEmail) {
        throw new Error('Email non trouvé');
      }
      
      // Récupérer le contenu de l'email
      const emailResponse = await axios.get(
        `https://www.mailinator.com/api/v2/domains/public/inboxes/${mailboxId}/messages/${targetEmail.id}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      const emailContent = emailResponse.data;
      const bodyText = emailContent.parts?.[0]?.body || '';
      
      // Chercher des liens d'activation dans le contenu
      const linkMatch = bodyText.match(/(https?:\/\/[^\s]+(?:confirm|activate|verify)[^\s]*)/i);
      if (linkMatch) {
        return linkMatch[1];
      }
      
      // Chercher un code de confirmation
      const codeMatch = bodyText.match(/code[:\s]+([A-Z0-9]{4,8})/i) || 
                        bodyText.match(/verification code[:\s]+([A-Z0-9]{4,8})/i);
      
      return codeMatch ? codeMatch[1] : null;
      
    } catch (error) {
      this.logger.debug(`Erreur lors de la vérification de Mailinator: ${error.message}`);
      throw error;
    }
  }
}