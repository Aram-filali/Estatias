import countries from '@/utils/countries';

/**
 * Validates a national ID based on the country-specific pattern
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @param id The national ID to validate
 * @returns boolean indicating if the ID is valid
 */
export default function validateNationalId(countryCode: string, id: string): boolean {
  // Validation de base : ID ne doit pas être vide
  if (!id || id.trim() === '') {
    return false;
  }
  
  // Trouver le pays correspondant au code
  const country = countries.find(c => c.code === countryCode);
  if (!country) {
    return false;
  }
  
  // Validation avec le pattern RegExp du pays
  const isMatchingPattern = country.nationalIdPattern.test(id);
  if (!isMatchingPattern) {
    return false;
  }
  
  // Validation supplémentaire par pays pour s'assurer que le format est correct
  switch (countryCode) {
    // PAYS EUROPÉENS
    case 'FR': // France (INSEE)
      return id.length === 13 || id.length === 15;
    case 'TN': // Tunisie (CIN)
      return id.length === 8;
    case 'DE': // Allemagne (Steuer-ID)
      return id.length === 10;
    case 'IT': // Italie (Codice Fiscale)
      return id.length === 16;
    case 'ES': // Espagne (DNI)
      return id.length === 9;
    case 'AT': // Autriche
      return id.replace(/\s/g, '').length === 12;
    case 'CH': // Suisse
      return id.replace(/\./g, '').length === 9;
    case 'GB': // Royaume-Uni (NINO)
      return id.length === 9;
    case 'FI': // Finlande
      return id.length === 11;
      
    // AMÉRIQUES
    case 'US': // États-Unis (SSN)
      return id.replace(/\D/g, '').length === 9;
    case 'CA': // Canada (SIN)
      return id.replace(/\D/g, '').length === 9;
    case 'BR': // Brésil (CPF)
      return id.replace(/\D/g, '').length === 11;
    case 'MX': // Mexique (CURP)
      return id.length === 18;
    case 'AR': // Argentine (DNI)
      return id.length === 8;
    case 'CL': // Chili (RUN)
      return id.replace(/\D/g, '').length === 9;
      
    // ASIE
    case 'IN': // Inde (PAN)
      return id.length === 10;
    case 'CN': // Chine
      return id.length === 18;
    case 'JP': // Japon (My Number)
      return id.length === 12;
    case 'SG': // Singapour (NRIC)
      return id.length === 9;
    case 'KR': // Corée du Sud
      return id.length === 13;
      
    // AUTRES RÉGIONS
    case 'AU': // Australie (TFN)
      return id.length === 9;
    case 'NZ': // Nouvelle-Zélande (IRD)
      return id.length === 9;
    case 'ZA': // Afrique du Sud
      return id.length === 13;
  }
  
  // Pour les autres pays, nous utilisons une approche plus générique
  // basée sur le type de pattern RegExp
  const patternString = country.nationalIdPattern.toString();
  
  // Si le pattern est pour un nombre exact de chiffres (ex: /^\d{10}$/)
  if (patternString.includes('^\\d{') && patternString.endsWith('}$')) {
    const match = patternString.match(/\\d\{(\d+)\}/);
    if (match) {
      const expectedLength = parseInt(match[1], 10);
      // Vérifier que l'ID a exactement ce nombre de chiffres
      const actualLength = id.replace(/\D/g, '').length;
      return actualLength === expectedLength;
    }
  }
  
  // Pour les patterns avec une plage (ex: /^\d{8,10}$/)
  const rangeMatch = patternString.match(/\\d\{(\d+),(\d+)\}/);
  if (rangeMatch) {
    const minLength = parseInt(rangeMatch[1], 10);
    const maxLength = parseInt(rangeMatch[2], 10);
    const actualLength = id.replace(/\D/g, '').length;
    return actualLength >= minLength && actualLength <= maxLength;
  }
  
  // Si aucune validation supplémentaire n'est définie et que le pattern est déjà validé,
  // nous considérons l'ID comme valide
  return true;
}