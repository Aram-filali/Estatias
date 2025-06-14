import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Page } from 'puppeteer';
import { BrowserService } from './browser.service';
import { CaptchaService } from './captcha.service';
import { ProxyService } from './proxy.service';
import { ConfigService } from '@nestjs/config';
import { Property, PropertyDocument } from '../schema/property.schema';
import { SyncLog, SyncLogDocument } from '../schema/sync-log.schema';
import { Availability, AvailabilityDocument } from '../schema/availability.schema';
import * as fs from 'fs';

/*interface AvailabilityItem {
  date: string;
  isAvailable: boolean;
}*/

interface AvailabilityItem {
  date: string;
  isAvailable: boolean;
  price?: number;
  currency?: string;
  minStay?: number;
  notes?: string;
  metadata?: Record<string, any>;
}


@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly scraperApiKey: string;
  private readonly frontendLimit: number; // Nouvelle propriété pour limiter les résultats frontend

  constructor(
    private browserService: BrowserService,
    private proxyservice: ProxyService,
    private captchaService: CaptchaService,
    private configService: ConfigService,
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocument>,
    @InjectModel(SyncLog.name)
    private syncLogModel: Model<SyncLogDocument>,
    @InjectModel(Availability.name)
    private availabilityModel: Model<AvailabilityDocument>,
  ) {
    this.maxRetries = parseInt(this.configService.get<string>('SCRAPER_MAX_RETRIES', '3'), 10);
    this.retryDelay = parseInt(this.configService.get<string>('SCRAPER_RETRY_DELAY', '5000'), 10);
    this.scraperApiKey = this.configService.get<string>('SCRAPER_API_KEY', '');
    this.frontendLimit = parseInt(this.configService.get<string>('FRONTEND_AVAILABILITY_LIMIT', '50'), 10);
  }

 private async saveAvailabilities(
  propertyId: string, 
  availabilityData: AvailabilityItem[], 
  source: string,
  property?: PropertyDocument
): Promise<void> {
  this.logger.log(`Sauvegarde de ${availabilityData.length} disponibilités pour la propriété ${propertyId}`);
  
  try {
    const now = new Date();
    
    let propertyDoc: PropertyDocument | null = property || null;
    if (!propertyDoc) {
      propertyDoc = await this.propertyModel.findById(propertyId);
      if (!propertyDoc) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }
    }
    
    // Trouver ou créer le document d'availability pour cette propriété et source
    let availabilityDoc = await this.availabilityModel.findOne({
      propertyId: propertyId,
      source: source
    });
    
    if (!availabilityDoc) {
      // Créer un nouveau document
      availabilityDoc = new this.availabilityModel({
        propertyId: propertyId,
        siteId: propertyDoc.siteId,
        source: source,
        availabilities: [],
        lastUpdated: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    // Créer une Map des disponibilités existantes pour un accès rapide
    const existingAvailabilitiesMap = new Map<string, any>();
    availabilityDoc.availabilities.forEach((item, index) => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      existingAvailabilitiesMap.set(dateKey, { item, index });
    });
    
    // Traiter chaque nouvelle disponibilité
    for (const newItem of availabilityData) {
      const dateKey = newItem.date;
      const existingEntry = existingAvailabilitiesMap.get(dateKey);
      
      const availabilityItem = {
        date: new Date(newItem.date),
        isAvailable: newItem.isAvailable,
        price: newItem.price,
        currency: newItem.currency,
        minStay: newItem.minStay,
        notes: newItem.notes,
        metadata: newItem.metadata,
        lastUpdated: now
      };
      
      if (existingEntry) {
        // Mettre à jour la disponibilité existante
        availabilityDoc.availabilities[existingEntry.index] = availabilityItem;
      } else {
        // Ajouter une nouvelle disponibilité
        availabilityDoc.availabilities.push(availabilityItem);
      }
    }
    
    // Trier les disponibilités par date
    availabilityDoc.availabilities.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Mettre à jour les métadonnées du document
    availabilityDoc.lastUpdated = now;
    availabilityDoc.updatedAt = now;
    
    // Sauvegarder le document
    await availabilityDoc.save();
    
    this.logger.log(`Disponibilités sauvegardées avec succès pour la propriété ${propertyId}`);
    this.logger.log(`Total des disponibilités en base: ${availabilityDoc.availabilities.length}`);
    
  } catch (error: any) {
    this.logger.error(`Erreur lors de la sauvegarde des disponibilités: ${error.message}`);
    throw error;
  }
}

// Méthode pour obtenir le nombre total de disponibilités en base
async getAvailabilityCount(propertyId: string, source: string = 'hometogo'): Promise<number> {
  try {
    const availabilityDoc = await this.availabilityModel.findOne({
      propertyId,
      source
    });
    
    return availabilityDoc?.availabilities?.length || 0;
    
  } catch (error: any) {
    this.logger.error(`❌ Erreur lors du comptage des disponibilités: ${error.message}`);
    return 0;
  }
}


// Méthode pour supprimer toutes les disponibilités d'une propriété
async deleteAllAvailabilities(propertyId: string, source?: string): Promise<void> {
  try {
    const filter: any = { propertyId };
    if (source) {
      filter.source = source;
    }
    
    const result = await this.availabilityModel.deleteMany(filter);
    this.logger.log(`🗑️ Suppression: ${result.deletedCount} documents de disponibilités supprimés`);
    
  } catch (error: any) {
    this.logger.error(`❌ Erreur lors de la suppression des disponibilités: ${error.message}`);
    throw error;
  }
}

 // Méthode modifiée pour scraper tout mais retourner seulement les X premières DATES DISPONIBLES
async scrapeCalendar(property: PropertyDocument): Promise<{ success: boolean; availabilities?: AvailabilityItem[]; totalScraped?: number }> {
  let page: Page | null = null;
  let attempts = 0;
  let success = false;
  let allAvailabilities: AvailabilityItem[] = [];

  this.logger.log(`🚀 Démarrage du scraping pour la propriété ${property.siteId || 'unknown'}`);

  try {
    while (attempts < this.maxRetries && !success) {
      attempts++;
      this.logger.log(`Tentative ${attempts}/${this.maxRetries} pour la propriété ${property.siteId || 'unknown'}`);
      try {
        
        const pageResult = await this.browserService.getNewPage();
        if (!pageResult) {
          throw new Error('Impossible de créer une page');
        }
        page = pageResult;
        
        // Scraper TOUTES les disponibilités
        allAvailabilities = await this.scrapeHomeToGoCalendar(page, property);
        success = true;
        
        this.logger.log(`✅ Scraping réussi: ${allAvailabilities.length} disponibilités récupérées au total`);
        
        // 🔥 Sauvegarder TOUTES les disponibilités dans MongoDB
        if (allAvailabilities.length > 0) {
          try {
            await this.saveAvailabilities(
              property._id.toString(), 
              allAvailabilities, // Sauvegarder TOUTES les données
              'hometogo',
              property
            );
            this.logger.log(`💾 Sauvegarde réussie: ${allAvailabilities.length} disponibilités enregistrées en base`);
          } catch (saveError: any) {
            this.logger.error(`❌ Erreur lors de la sauvegarde: ${saveError.message}`);
            // Optionnel: vous pouvez décider si une erreur de sauvegarde doit faire échouer tout le process
            // throw saveError;
          }
        }
        
        // 🎯 Retourner seulement les X premières DATES DISPONIBLES pour le frontend
        const availableDates = allAvailabilities.filter(item => item.isAvailable);
        const frontendAvailabilities = availableDates.slice(0, this.frontendLimit);
        
        const totalAvailable = availableDates.length;
        const totalUnavailable = allAvailabilities.length - totalAvailable;
        
        this.logger.log(`📤 Retour au frontend: ${frontendAvailabilities.length} dates disponibles (limité à ${this.frontendLimit})`);
        this.logger.log(`📊 Total scrapé: ${allAvailabilities.length}, Disponibles: ${totalAvailable}, Indisponibles: ${totalUnavailable}, Retourné: ${frontendAvailabilities.length}`);
        
        return { 
          success: true, 
          availabilities: frontendAvailabilities,
          totalScraped: allAvailabilities.length
        };
      } catch (error: any) {
        this.logger.error(`Erreur lors du scraping pour la propriété ${property.siteId || 'unknown'}: ${error.message}`);
        
        if (attempts < this.maxRetries) {
          this.logger.log(`Nouvelle tentative dans ${this.retryDelay / 1000} secondes...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      } finally {
        if (page) {
          try {
            await page.close();
          } catch (e: any) {
            this.logger.error(`Erreur lors de la fermeture de la page: ${e.message}`);
          }
        }
      }
    }

    return { success: false };
  } catch (error: any) {
    this.logger.error(`Erreur critique dans scrapeCalendar: ${error.message}`);
    return { success: false };
  }
}

// Méthode pour récupérer plus de dates DISPONIBLES depuis la base
async getMoreAvailabilities(
  propertyId: string, 
  source: string = 'hometogo', 
  limit: number = 100, 
  offset: number = 0
): Promise<AvailabilityItem[]> {
  try {
    const availabilityDoc = await this.availabilityModel.findOne({
      propertyId,
      source
    });
    
    if (!availabilityDoc || !availabilityDoc.availabilities) {
      return [];
    }
    
    // Filtrer pour ne garder que les dates disponibles, puis trier par date et appliquer pagination
    const availableDates = availabilityDoc.availabilities
      .filter(item => item.isAvailable) // 🔥 Filtrer seulement les dates disponibles
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(offset, offset + limit);
    
    return availableDates.map(item => ({
      date: item.date.toISOString().split('T')[0],
      isAvailable: item.isAvailable,
      price: item.price,
      currency: item.currency,
      minStay: item.minStay,
      notes: item.notes,
      metadata: item.metadata
    }));
    
  } catch (error: any) {
    this.logger.error(`❌ Erreur lors de la récupération des disponibilités: ${error.message}`);
    return [];
  }
}

// Nouvelle méthode pour obtenir le nombre total de dates DISPONIBLES en base
async getAvailableCount(propertyId: string, source: string = 'hometogo'): Promise<number> {
  try {
    const availabilityDoc = await this.availabilityModel.findOne({
      propertyId,
      source
    });
    
    if (!availabilityDoc?.availabilities) {
      return 0;
    }
    
    // Compter seulement les dates disponibles
    return availabilityDoc.availabilities.filter(item => item.isAvailable).length;
    
  } catch (error: any) {
    this.logger.error(`❌ Erreur lors du comptage des dates disponibles: ${error.message}`);
    return 0;
  }
}

// Méthode pour obtenir les dates DISPONIBLES dans une plage de dates
async getAvailabilitiesInDateRange(
  propertyId: string,
  source: string,
  startDate: Date,
  endDate: Date
): Promise<AvailabilityItem[]> {
  try {
    const availabilityDoc = await this.availabilityModel.findOne({
      propertyId,
      source
    });
    
    if (!availabilityDoc || !availabilityDoc.availabilities) {
      return [];
    }
    
    // Filtrer par plage de dates ET par disponibilité
    const filteredAvailabilities = availabilityDoc.availabilities.filter(
      item => item.date >= startDate && 
              item.date <= endDate && 
              item.isAvailable // 🔥 Seulement les dates disponibles
    );
    
    return filteredAvailabilities.map(item => ({
      date: item.date.toISOString().split('T')[0],
      isAvailable: item.isAvailable,
      price: item.price,
      currency: item.currency,
      minStay: item.minStay,
      notes: item.notes,
      metadata: item.metadata
    }));
    
  } catch (error: any) {
    this.logger.error(`❌ Erreur lors de la récupération des disponibilités par plage de dates: ${error.message}`);
    return [];
  }
}

  // Méthode mise à jour pour inclure les informations de limitation
  async scrapeAndSaveCalendar(property: PropertyDocument): Promise<{ success: boolean; savedCount?: number; returnedCount?: number; totalScraped?: number }> {
    const result = await this.scrapeCalendar(property);
    
    if (result.success) {
      this.logger.log(`🎉 Scraping et sauvegarde terminés avec succès pour ${property.siteId}`);
      this.logger.log(`📈 Statistiques: Total scrapé: ${result.totalScraped}, Retourné au frontend: ${result.availabilities?.length || 0}`);
      
      return { 
        success: true, 
        savedCount: result.totalScraped,
        returnedCount: result.availabilities?.length || 0,
        totalScraped: result.totalScraped
      };
    }
    
    return { success: result.success };
  }



  // Optionnel: Méthode pour nettoyer les anciennes données avant sauvegarde
  private async cleanOldAvailabilities(propertyId: string, source: string): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 1); // Supprimer les données de plus d'un jour
      
      const result = await this.availabilityModel.deleteMany({
        propertyId: propertyId, // Utiliser directement le string
        source,
        date: { $lt: cutoffDate }
      });
      
      if (result.deletedCount > 0) {
        this.logger.log(`🧹 Nettoyage: ${result.deletedCount} anciennes disponibilités supprimées`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors du nettoyage: ${error.message}`);
    }
  }

  private async scrapeHomeToGoCalendar(page: Page, property: PropertyDocument): Promise<AvailabilityItem[]> {
    this.logger.log(`🚀 Début scraping HomeToGo calendrier complet pour ${property.siteId}`);
    
    const allAvailabilities: AvailabilityItem[] = [];
    
    try {
      await this.setupHomeToGoAntiDetection(page);
      await this.navigateToPropertyWithRetry(page, property.publicUrl);
      
      // Attendre que la page soit complètement chargée
      await page.waitForFunction(() => document.readyState === 'complete');
      await this.delay(2000);
      
      // Cliquer sur le bouton Availability pour scroller vers le calendrier
      await this.clickAvailabilityButton(page);
      
      // Scraper tous les mois disponibles
      const calendarData = await this.scrapeAllMonths(page);
      allAvailabilities.push(...calendarData);
      
      const cleanedAvailabilities = this.cleanAndValidateAvailabilities(allAvailabilities);
      
      // Affichage des résultats
      if (cleanedAvailabilities.length > 0) {
        this.logger.log(`✅ Scraping réussi: ${cleanedAvailabilities.length} disponibilités récupérées`);
        
        const availableCount = cleanedAvailabilities.filter(a => a.isAvailable).length;
        const unavailableCount = cleanedAvailabilities.length - availableCount;
        
        this.logger.log(`📊 Résumé: ${availableCount} disponibles, ${unavailableCount} indisponibles`);
        
        // Afficher le résumé par mois
        this.logMonthlyStats(cleanedAvailabilities);
        
        // Afficher quelques exemples (seulement les premiers)
        const examples = cleanedAvailabilities.slice(0, 10);
        examples.forEach(item => {
          this.logger.log(`📅 ${item.date}: ${item.isAvailable ? '✅ Disponible' : '❌ Indisponible'}`);
        });
      } else {
        this.logger.warn('⚠️ Aucune disponibilité trouvée');
      }
      
      return cleanedAvailabilities;
      
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors du scraping HomeToGo: ${error.message}`);
      throw error;
    }
  }

  private async scrapeAllMonths(page: Page): Promise<AvailabilityItem[]> {
    this.logger.log('🗓️ Début du scraping de tous les mois disponibles...');
    
    const allAvailabilities: AvailabilityItem[] = [];
    const scrapedMonths = new Set<string>();
    let monthsWithoutData = 0;
    const maxMonthsWithoutData = 3; // Arrêter après 3 mois consécutifs sans données
    let totalMonthsScraped = 0;
    const maxMonthsToScrape = 24; // Limite de sécurité (2 ans)
    
    try {
      // Parser le mois actuel
      let currentMonthData = await this.parseCurrentMonthFromHTML(page);
      if (currentMonthData.length > 0) {
        allAvailabilities.push(...currentMonthData);
        const monthKey = this.getMonthKey(currentMonthData[0].date);
        scrapedMonths.add(monthKey);
        this.logger.log(`📅 Mois initial scrapé: ${monthKey} (${currentMonthData.length} jours)`);
        monthsWithoutData = 0;
      }
      totalMonthsScraped++;
      
      // Naviguer vers les mois suivants
      while (monthsWithoutData < maxMonthsWithoutData && totalMonthsScraped < maxMonthsToScrape) {
        try {
          // Cliquer sur le bouton "Next Month"
          const nextClicked = await this.clickNextMonth(page);
          if (!nextClicked) {
            this.logger.log('🔚 Plus de bouton "Next Month" disponible');
            break;
          }
          
          // Attendre le chargement du nouveau mois
          await this.delay(2000);
          
          // Parser le nouveau mois
          const monthData = await this.parseCurrentMonthFromHTML(page);
          
          if (monthData.length > 0) {
            const monthKey = this.getMonthKey(monthData[0].date);
            
            // Éviter les doublons
            if (!scrapedMonths.has(monthKey)) {
              allAvailabilities.push(...monthData);
              scrapedMonths.add(monthKey);
              this.logger.log(`📅 Nouveau mois scrapé: ${monthKey} (${monthData.length} jours)`);
              monthsWithoutData = 0;
            } else {
              this.logger.log(`⏭️ Mois déjà scrapé: ${monthKey}`);
              monthsWithoutData++;
            }
          } else {
            monthsWithoutData++;
            this.logger.log(`⚠️ Aucune donnée pour ce mois (${monthsWithoutData}/${maxMonthsWithoutData})`);
          }
          
          totalMonthsScraped++;
          
        } catch (error: any) {
          this.logger.error(`❌ Erreur lors du passage au mois suivant: ${error.message}`);
          monthsWithoutData++;
        }
      }
      
      this.logger.log(`🎯 Scraping terminé: ${scrapedMonths.size} mois uniques, ${allAvailabilities.length} jours au total`);
      
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors du scraping de tous les mois: ${error.message}`);
    }
    
    return allAvailabilities;
  }

  private async clickNextMonth(page: Page): Promise<boolean> {
    try {
      const nextButtonSelectors = [
        '.DayPicker-NavButton--next',
        '.DayPicker-NavButton.DayPicker-NavButton--next',
        '[aria-label="Next Month"]',
        'span[role="button"][aria-label="Next Month"]'
      ];
      
      for (const selector of nextButtonSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          
          // Vérifier si le bouton est cliquable
          const isEnabled = await page.evaluate((sel) => {
            const button = document.querySelector(sel);
            return button && !button.classList.contains('disabled') && !button.hasAttribute('disabled');
          }, selector);
          
          if (isEnabled) {
            await page.click(selector);
            return true;
          }
        } catch (error) {
          continue;
        }
      }
      
      return false;
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors du clic sur "Next Month": ${error.message}`);
      return false;
    }
  }

  private async parseCurrentMonthFromHTML(page: Page): Promise<AvailabilityItem[]> {
    try {
      await page.waitForSelector('.DayPicker-Month', { timeout: 5000 });
      
      const monthData = await page.evaluate(() => {
        const availabilities: { date: string; isAvailable: boolean }[] = [];
        
        // Sélectionner tous les jours du calendrier visible
        const dayElements = document.querySelectorAll('.DayPicker-Day:not(.DayPicker-Day--outside)');
        
        dayElements.forEach(dayEl => {
          const ariaLabel = dayEl.getAttribute('aria-label');
          
          if (ariaLabel) {
            // Extraire la date depuis aria-label (format: "Sunday, 06/01/2025")
            const dateMatch = ariaLabel.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (dateMatch) {
              const [, month, day, year] = dateMatch;
              const dateStr = `${year}-${month}-${day}`;
              
              // Déterminer la disponibilité
              let dayIsAvailable = false;
              
              const isDisabled = dayEl.classList.contains('DayPicker-Day--disabled');
              const isPast = dayEl.classList.contains('DayPicker-Day--past');
              const isAvailableForCheckIn = dayEl.classList.contains('DayPicker-Day--checkIn');
              const isAvailable = dayEl.classList.contains('DayPicker-Day--available');
              
              if (!isDisabled && !isPast) {
                if (isAvailableForCheckIn || isAvailable) {
                  dayIsAvailable = true;
                }
              }
              
              // Vérifier aussi le tooltip/data-hint
              const tooltipEl = dayEl.querySelector('.datepicker-tooltip');
              if (tooltipEl) {
                const tooltipText = tooltipEl.getAttribute('data-hint');
                if (tooltipText) {
                  if (tooltipText.includes('Available')) {
                    dayIsAvailable = true;
                  } else if (tooltipText.includes('Fully booked') || tooltipText.includes('Not available')) {
                    dayIsAvailable = false;
                  }
                }
              }
              
              // Vérifier les attributs data-* pour plus de précision
              const dataAvailable = dayEl.getAttribute('data-available');
              if (dataAvailable === 'true') {
                dayIsAvailable = true;
              } else if (dataAvailable === 'false') {
                dayIsAvailable = false;
              }
              
              availabilities.push({
                date: dateStr,
                isAvailable: dayIsAvailable
              });
            }
          }
        });
        
        return availabilities;
      });
      
      return monthData;
      
    } catch (error: any) {
      this.logger.error(`❌ Erreur parsing mois courant: ${error.message}`);
      return [];
    }
  }

  private getMonthKey(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private logMonthlyStats(availabilities: AvailabilityItem[]): void {
    const monthlyStats = new Map<string, { total: number; available: number }>();
    
    availabilities.forEach(item => {
      const monthKey = this.getMonthKey(item.date);
      const stats = monthlyStats.get(monthKey) || { total: 0, available: 0 };
      stats.total++;
      if (item.isAvailable) {
        stats.available++;
      }
      monthlyStats.set(monthKey, stats);
    });
    
    this.logger.log('📊 Statistiques par mois:');
    Array.from(monthlyStats.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, stats]) => {
        this.logger.log(`   ${month}: ${stats.available}/${stats.total} disponibles (${Math.round(stats.available/stats.total*100)}%)`);
      });
  }

  private async clickAvailabilityButton(page: Page): Promise<void> {
    try {
      this.logger.log('🔘 Recherche du bouton Availability...');
      
      const availabilitySelectors = [
        'a:has-text("Availability")',
        '[class*="txt-strong"]:has-text("Availability")',
        'a[href*="#availability"]',
        '.c-gray-dark:has-text("Availability")',
        'div:has-text("Availability")',
        'span:has-text("Availability")',
        '*:has-text("Availability")'
      ];
      
      let clicked = false;
      
      for (const selector of availabilitySelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          this.logger.log(`✅ Bouton Availability cliqué avec: ${selector}`);
          clicked = true;
          break;
        } catch (error) {
          continue;
        }
      }
      
      if (!clicked) {
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          const availabilityElement = elements.find(el => 
            el.textContent?.trim() === 'Availability' && 
            (el.tagName === 'A' || el.getAttribute('href'))
          );
          if (availabilityElement) {
            (availabilityElement as HTMLElement).click();
            return true;
          }
          return false;
        });
        this.logger.log('✅ Bouton Availability cliqué via JavaScript');
      }
      
      await this.delay(3000);
      await page.waitForSelector('.DayPicker-Month', { timeout: 10000 });
      
    } catch (error: any) {
      this.logger.error(`❌ Erreur clic bouton Availability: ${error.message}`);
      try {
        await page.waitForSelector('.DayPicker-Month', { timeout: 5000 });
        this.logger.log('📅 Calendrier déjà visible, continuons...');
      } catch (calendarError) {
        throw new Error('Impossible de trouver le bouton Availability et le calendrier');
      }
    }
  }

  // Méthodes utilitaires
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const jitter = Math.random() * 1000;
      setTimeout(resolve, ms + jitter);
    });
  }

  private async setupHomeToGoAntiDetection(page: Page): Promise<void> {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
  }

  private async navigateToPropertyWithRetry(page: Page, url: string): Promise<void> {
    await this.executeWithRetry(async () => {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    }, 3, 2000);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        this.logger.warn(`⚠️ Tentative ${attempt} échouée, retry dans ${delayMs}ms: ${error.message}`);
        await this.delay(delayMs * attempt);
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  private cleanAndValidateAvailabilities(availabilities: AvailabilityItem[]): AvailabilityItem[] {
    const uniqueAvailabilities = new Map<string, AvailabilityItem>();
    
    for (const item of availabilities) {
      if (item.date && this.isValidDate(item.date)) {
        const existing = uniqueAvailabilities.get(item.date);
        if (!existing || (existing.isAvailable !== item.isAvailable && item.isAvailable)) {
          uniqueAvailabilities.set(item.date, item);
        }
      }
    }
    
    return Array.from(uniqueAvailabilities.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    const regexMatch = dateString.match(/^\d{4}-\d{2}-\d{2}$/);
    return !isNaN(date.getTime()) && Boolean(regexMatch);
  }
}