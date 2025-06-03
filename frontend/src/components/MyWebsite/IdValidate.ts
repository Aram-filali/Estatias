import countries from "@/utils/countries";

function validateNationalId(countryCode: string, id: string): boolean {
  // Find the country by its code vv
  const country = countries.find((c) => c.code === countryCode);

  // If the country is not found, return false
  if (!country) return false;

  const pattern = country.nationalIdPattern;
  return pattern.test(id);
}

export default validateNationalId;