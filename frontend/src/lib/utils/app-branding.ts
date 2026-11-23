export function displayCurrentAppBrand(text: string): string {
  return text.replace(/\b(?:(?:(?:DSWD FO2|RICTMS)\s+)?Compliance Hub|RICTMS\s+(?:IT\s+)?Help\s*desk)\b/gi, 'FO2 iCare');
}
