import { Page } from 'puppeteer';
import { USER_AGENTS } from '../constants';

/**
 * Génère un délai aléatoire entre deux valeurs
 * @param min - Valeur minimale en ms
 * @param max - Valeur maximale en ms
 * @returns Délai en ms
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Fait une pause pour simuler un comportement humain
 * @param page - Instance de page Puppeteer
 * @param minMs - Délai minimum en ms
 * @param maxMs - Délai maximum en ms
 */
export async function humanPause(page: Page, minMs = 1000, maxMs = 3000): Promise<void> {
  // Use page.evaluate with setTimeout instead of waitForTimeout
  await page.evaluate((delay) => {
    return new Promise(resolve => setTimeout(resolve, delay));
  }, randomDelay(minMs, maxMs));
}

/**
 * Simule une saisie humaine (avec délais variables entre les caractères)
 * @param page - Instance de page Puppeteer
 * @param selector - Sélecteur de l'élément pour la saisie
 * @param text - Texte à saisir
 */
export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.focus(selector);
  
  for (const char of text) {
    await page.type(selector, char, { delay: randomDelay(50, 150) });
  }
  
  await humanPause(page, 500, 1500);
}

/**
 * Simule un scroll humain
 * @param page - Instance de page Puppeteer
 * @param distance - Distance à scroller
 */
export async function humanScroll(page: Page, minDistance = 100, maxDistance = 500): Promise<void> {
  const distance = randomDelay(minDistance, maxDistance);
  
  await page.evaluate((dist) => {
    window.scrollBy({
      top: dist,
      behavior: 'smooth'
    });
  }, distance);
  
  await humanPause(page, 500, 1500);
}

/**
 * Obtient un User-Agent aléatoire
 * @returns User-Agent string
 */
export function getRandomUserAgent(): string {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index];
}