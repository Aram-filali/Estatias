/**
 * Utilitaires pour le traitement des dates
 */

/**
 * Retourne une date formatée en YYYY-MM-DD
 * @param date - Date à formater
 * @returns String formaté
 */
export function formatDateForDatabase(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Génère un tableau de dates entre deux dates
   * @param startDate - Date de début
   * @param endDate - Date de fin
   * @returns Tableau de dates au format YYYY-MM-DD
   */
  export function generateDateRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(formatDateForDatabase(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }
  
  /**
   * Ajoute un nombre de jours à une date
   * @param date - Date de départ
   * @param days - Nombre de jours à ajouter
   * @returns Nouvelle date
   */
  export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
 * Ajoute un nombre d'heures à une date
 * @param date - Date de départ
 * @param hours - Nombre d'heures à ajouter
 * @returns Nouvelle date
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}
  
  /**
   * Vérifie si la date est aujourd'hui
   * @param date - Date à vérifier
   * @returns True si la date est aujourd'hui
   */
  export function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }