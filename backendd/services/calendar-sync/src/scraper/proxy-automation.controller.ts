// src/modules/scraper/trial-automation.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TrialAutomationService } from './proxy-automation.service';

interface CreateTrialAccountDto {
  provider?: string;
  forceNew?: boolean;
}

interface ValidateAccountsDto {
  provider?: string;
}

interface GetAccountDto {
  provider?: string;
  includeExpired?: boolean;
}

@Controller()
export class TrialAutomationController {
  private readonly logger = new Logger(TrialAutomationController.name);

  constructor(
    private readonly trialAutomationService: TrialAutomationService,
  ) {}

  /**
   * Obtenir un compte d'essai valide
   */
  @MessagePattern('trial.get_valid_account')
  async getValidTrialAccount(@Payload() data: GetAccountDto = {}) {
    try {
      this.logger.log('Demande d\'obtention d\'un compte d\'essai valide');
      
      const account = await this.trialAutomationService.getValidTrialAccount();
      
      if (!account) {
        return {
          success: false,
          message: 'Aucun compte d\'essai valide disponible',
          data: null
        };
      }

      // Ne pas exposer les informations sensibles
      const sanitizedAccount = {
        provider: account.provider,
        email: account.email,
        createdAt: account.createdAt,
        expiresAt: account.expiresAt,
        lastUsed: account.lastUsed,
        endpoint: account.endpoint,
        hasApiKey: !!account.apiKey,
        hasProxies: !!account.proxies && account.proxies.length > 0
      };

      return {
        success: true,
        message: 'Compte d\'essai récupéré avec succès',
        data: sanitizedAccount
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'obtention du compte d'essai: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de l\'obtention du compte d\'essai',
        error: error.message
      };
    }
  }

  /**
   * Créer un nouveau compte d'essai
   */
  @MessagePattern('trial.create_account')
  async createTrialAccount(@Payload() data: CreateTrialAccountDto = {}) {
    try {
      this.logger.log(`Création d'un nouveau compte d'essai${data.provider ? ` pour ${data.provider}` : ''}`);
      
      const account = await this.trialAutomationService.createNewTrialAccount();
      
      if (!account) {
        return {
          success: false,
          message: 'Échec de la création du compte d\'essai',
          data: null
        };
      }

      // Ne pas exposer les informations sensibles
      const sanitizedAccount = {
        provider: account.provider,
        email: account.email,
        createdAt: account.createdAt,
        expiresAt: account.expiresAt,
        endpoint: account.endpoint,
        hasApiKey: !!account.apiKey,
        hasProxies: !!account.proxies && account.proxies.length > 0
      };

      return {
        success: true,
        message: 'Compte d\'essai créé avec succès',
        data: sanitizedAccount
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la création du compte d'essai: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de la création du compte d\'essai',
        error: error.message
      };
    }
  }

  /**
   * Exécuter l'automatisation complète
   */
  @MessagePattern('trial.run_full_automation')
  async runFullAutomation(@Payload() data: any = {}) {
    try {
      this.logger.log('Démarrage de l\'automatisation complète des comptes d\'essai');
      
      const accounts = await this.trialAutomationService.runFullAutomation();
      
      // Statistiques des comptes créés
      const stats = accounts.reduce((acc, account) => {
        acc[account.provider] = (acc[account.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sanitizedAccounts = accounts.map(account => ({
        provider: account.provider,
        email: account.email,
        createdAt: account.createdAt,
        expiresAt: account.expiresAt,
        hasApiKey: !!account.apiKey,
        hasProxies: !!account.proxies && account.proxies.length > 0
      }));

      return {
        success: true,
        message: `Automatisation complète terminée. ${accounts.length} comptes créés`,
        data: {
          totalCreated: accounts.length,
          accounts: sanitizedAccounts,
          statistics: stats
        }
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'automatisation complète: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de l\'automatisation complète',
        error: error.message
      };
    }
  }

  /**
   * Valider les comptes existants
   */
  @MessagePattern('trial.validate_accounts')
  async validateExistingAccounts(@Payload() data: ValidateAccountsDto = {}) {
    try {
      this.logger.log('Validation des comptes d\'essai existants');
      
      const result = await this.trialAutomationService.validateExistingAccounts();
      
      const validStats = result.valid.reduce((acc, account) => {
        acc[account.provider] = (acc[account.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const invalidStats = result.invalid.reduce((acc, account) => {
        acc[account.provider] = (acc[account.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        message: `Validation terminée. ${result.valid.length} comptes valides, ${result.invalid.length} comptes invalides`,
        data: {
          validCount: result.valid.length,
          invalidCount: result.invalid.length,
          validStats,
          invalidStats,
          validAccounts: result.valid.map(account => ({
            provider: account.provider,
            email: account.email,
            createdAt: account.createdAt,
            expiresAt: account.expiresAt,
            lastUsed: account.lastUsed
          })),
          invalidAccounts: result.invalid.map(account => ({
            provider: account.provider,
            email: account.email,
            createdAt: account.createdAt,
            expiresAt: account.expiresAt,
            reason: account.expiresAt && new Date(account.expiresAt) <= new Date() ? 'expired' : 'connection_failed'
          }))
        }
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la validation des comptes: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de la validation des comptes',
        error: error.message
      };
    }
  }

  /**
   * Nettoyer les comptes expirés
   */
  @MessagePattern('trial.cleanup_expired')
  async cleanupExpiredAccounts(@Payload() data: any = {}) {
    try {
      this.logger.log('Nettoyage des comptes d\'essai expirés');
      
      await this.trialAutomationService.cleanupExpiredAccounts();
      
      return {
        success: true,
        message: 'Nettoyage des comptes expirés terminé avec succès'
      };
    } catch (error) {
      this.logger.error(`Erreur lors du nettoyage des comptes expirés: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors du nettoyage des comptes expirés',
        error: error.message
      };
    }
  }

  /**
   * Obtenir les statistiques des comptes
   */
  @MessagePattern('trial.get_stats')
  async getAccountsStats(@Payload() data: any = {}) {
    try {
      this.logger.log('Récupération des statistiques des comptes d\'essai');
      
      // Charger les comptes depuis le service (on pourrait ajouter une méthode getter)
      const result = await this.trialAutomationService.validateExistingAccounts();
      const allAccounts = [...result.valid, ...result.invalid];
      
      const now = new Date();
      const stats = {
        total: allAccounts.length,
        valid: result.valid.length,
        expired: result.invalid.filter(acc => 
          acc.expiresAt && new Date(acc.expiresAt) <= now
        ).length,
        invalid: result.invalid.filter(acc => 
          !acc.expiresAt || new Date(acc.expiresAt) > now
        ).length,
        byProvider: {} as Record<string, { total: number; valid: number; expired: number; invalid: number }>,
        expiringIn24h: result.valid.filter(acc => 
          acc.expiresAt && 
          new Date(acc.expiresAt) <= new Date(now.getTime() + 24 * 60 * 60 * 1000)
        ).length,
        expiringIn7days: result.valid.filter(acc => 
          acc.expiresAt && 
          new Date(acc.expiresAt) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        ).length
      };

      // Statistiques par fournisseur
      for (const account of allAccounts) {
        if (!stats.byProvider[account.provider]) {
          stats.byProvider[account.provider] = { total: 0, valid: 0, expired: 0, invalid: 0 };
        }
        
        stats.byProvider[account.provider].total++;
        
        if (result.valid.includes(account)) {
          stats.byProvider[account.provider].valid++;
        } else if (account.expiresAt && new Date(account.expiresAt) <= now) {
          stats.byProvider[account.provider].expired++;
        } else {
          stats.byProvider[account.provider].invalid++;
        }
      }

      return {
        success: true,
        message: 'Statistiques récupérées avec succès',
        data: stats
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des statistiques: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      };
    }
  }

  /**
   * Obtenir les détails d'un compte spécifique (sans informations sensibles)
   */
  @MessagePattern('trial.get_account_details')
  async getAccountDetails(@Payload() data: { email: string }) {
    try {
      if (!data.email) {
        return {
          success: false,
          message: 'Email requis pour récupérer les détails du compte'
        };
      }

      this.logger.log(`Récupération des détails du compte: ${data.email}`);
      
      const result = await this.trialAutomationService.validateExistingAccounts();
      const allAccounts = [...result.valid, ...result.invalid];
      
      const account = allAccounts.find(acc => acc.email === data.email);
      
      if (!account) {
        return {
          success: false,
          message: 'Compte non trouvé'
        };
      }

      const accountDetails = {
        provider: account.provider,
        email: account.email,
        createdAt: account.createdAt,
        expiresAt: account.expiresAt,
        lastUsed: account.lastUsed,
        endpoint: account.endpoint,
        hasApiKey: !!account.apiKey,
        hasProxies: !!account.proxies && account.proxies.length > 0,
        proxyCount: account.proxies ? account.proxies.length : 0,
        isValid: result.valid.includes(account),
        isExpired: account.expiresAt ? new Date(account.expiresAt) <= new Date() : false,
        daysUntilExpiry: account.expiresAt ? 
          Math.ceil((new Date(account.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
      };

      return {
        success: true,
        message: 'Détails du compte récupérés avec succès',
        data: accountDetails
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des détails du compte: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de la récupération des détails du compte',
        error: error.message
      };
    }
  }

  /**
   * Obtenir les proxies d'un compte (avec informations d'authentification)
   */
  @MessagePattern('trial.get_account_proxies')
  async getAccountProxies(@Payload() data: { email: string }) {
    try {
      if (!data.email) {
        return {
          success: false,
          message: 'Email requis pour récupérer les proxies du compte'
        };
      }

      this.logger.log(`Récupération des proxies du compte: ${data.email}`);
      
      const result = await this.trialAutomationService.validateExistingAccounts();
      const validAccount = result.valid.find(acc => acc.email === data.email);
      
      if (!validAccount) {
        return {
          success: false,
          message: 'Compte non trouvé ou invalide'
        };
      }

      if (!validAccount.proxies || validAccount.proxies.length === 0) {
        return {
          success: false,
          message: 'Aucun proxy disponible pour ce compte'
        };
      }

      return {
        success: true,
        message: 'Proxies récupérés avec succès',
        data: {
          provider: validAccount.provider,
          email: validAccount.email,
          endpoint: validAccount.endpoint,
          proxies: validAccount.proxies,
          count: validAccount.proxies.length
        }
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des proxies: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de la récupération des proxies',
        error: error.message
      };
    }
  }

  /**
   * Tester la connectivité d'un compte
   */
  @MessagePattern('trial.test_account')
  async testAccount(@Payload() data: { email: string }) {
    try {
      if (!data.email) {
        return {
          success: false,
          message: 'Email requis pour tester le compte'
        };
      }

      this.logger.log(`Test de connectivité du compte: ${data.email}`);
      
      const result = await this.trialAutomationService.validateExistingAccounts();
      const account = [...result.valid, ...result.invalid].find(acc => acc.email === data.email);
      
      if (!account) {
        return {
          success: false,
          message: 'Compte non trouvé'
        };
      }

      const isValid = result.valid.includes(account);
      
      return {
        success: true,
        message: `Test terminé pour le compte ${data.email}`,
        data: {
          email: account.email,
          provider: account.provider,
          isValid,
          isExpired: account.expiresAt ? new Date(account.expiresAt) <= new Date() : false,
          lastTested: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Erreur lors du test du compte: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors du test du compte',
        error: error.message
      };
    }
  }

  /**
   * Obtenir la liste des fournisseurs supportés
   */
  @MessagePattern('trial.get_providers')
  async getSupportedProviders(@Payload() data: any = {}) {
    try {
      const providers = [
        {
          name: 'smartproxy',
          displayName: 'SmartProxy',
          trialDays: 3,
          features: ['residential_proxies', 'api_access']
        },
        {
          name: 'soax',
          displayName: 'SOAX',
          trialDays: 3,
          features: ['residential_proxies', 'mobile_proxies', 'api_access']
        },
        {
          name: 'oxylabs',
          displayName: 'Oxylabs',
          trialDays: 7,
          features: ['residential_proxies', 'datacenter_proxies', 'api_access']
        },
        {
          name: 'bright-data',
          displayName: 'Bright Data',
          trialDays: 7,
          features: ['residential_proxies', 'datacenter_proxies', 'mobile_proxies', 'api_access']
        },
        {
          name: 'geosurf',
          displayName: 'GeoSurf',
          trialDays: 7,
          features: ['residential_proxies', 'premium_locations']
        },
        {
          name: 'luminati',
          displayName: 'Luminati',
          trialDays: 7,
          features: ['residential_proxies', 'datacenter_proxies', 'mobile_proxies', 'api_access']
        }
      ];

      return {
        success: true,
        message: 'Liste des fournisseurs récupérée avec succès',
        data: {
          providers,
          totalProviders: providers.length,
          supportedFeatures: [
            'residential_proxies',
            'datacenter_proxies', 
            'mobile_proxies',
            'api_access',
            'premium_locations'
          ]
        }
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des fournisseurs: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de la récupération des fournisseurs',
        error: error.message
      };
    }
  }
}