// src/common/constants.ts

// User-Agents pour la simulation de navigateurs réels
export const USER_AGENTS = [
  // Chrome sur Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
  
  // Firefox sur Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0',
  
  // Safari sur macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
  
  // Chrome sur macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
  
  // Edge sur Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 Edg/95.0.1020.53',
  
  // Chrome sur Android
  'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36',
  
  // Safari sur iOS
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
];

// Plateformes supportées
export enum Platform {
  AIRBNB = 'airbnb',
  BOOKING = 'booking',
  VRBO = 'vrbo',
}

// Statuts de synchronisation
/*export enum SyncStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  SUCCESS = 'SUCCESS',
  IN_PROGRESS = 'IN_PROGRESS',
  ERROR = 'ERROR',
  CRITICAL_ERROR = 'CRITICAL_ERROR',
  CANCELLED = 'CANCELLED',
}*/

// Priorités de synchronisation
/*export enum SyncPriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}*/

// Intervalle minimal entre les synchronisations (en heures)
export const MIN_SYNC_INTERVAL = 6;

// Délais d'attente pour les opérations de scraping (en ms)
export const SCRAPER_TIMEOUTS = {
  NAVIGATION: 60000,      // 60 secondes pour la navigation
  ELEMENT: 30000,         // 30 secondes pour attendre un élément
  DEFAULT: 15000,         // 15 secondes par défaut
  CAPTCHA: 120000,        // 2 minutes pour résoudre un captcha
};

// Nombre maximum de jours pour la synchronisation du calendrier
export const MAX_CALENDAR_DAYS = 365;

// Format de date utilisé dans l'application
export const DATE_FORMAT = 'YYYY-MM-DD';

// Préfixe pour les clés de cache Redis
export const CACHE_PREFIX = 'calendar-sync:';

// Durée de validité du cache (en secondes)
export const CACHE_TTL = 3600; // 1 heure

// common/constants.ts or wherever your constants are defined

export enum SyncStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  IN_PROGRESS = 'IN_PROGRESS',
  CRITICAL_ERROR = 'CRITICAL_ERROR',
  CANCELLED = 'CANCELLED'
}

export enum SyncPriority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW'
}

// Additional constants for the unified sync service
export const SYNC_DEFAULTS = {
  MAX_PARALLEL_SYNCS: 3,
  SYNC_DELAY_MS: 2000,
  SYNC_TIMEOUT_MINUTES: 15,
  CONFLICT_RESOLUTION: 'scraping_priority'
} as const;

export type ConflictResolutionStrategy = 
  | 'scraping_priority' 
  | 'ical_priority' 
  | 'available_priority' 
  | 'unavailable_priority' 
  | 'manual';