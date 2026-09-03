export interface UnitClassification {
  hasReportorialRequirements?: boolean;
  has_reportorial_requirements?: boolean;
}

export function isReportorialUnit(unit: UnitClassification): boolean {
  return unit.hasReportorialRequirements === true || unit.has_reportorial_requirements === true;
}

export function unitsForUserRole<T extends UnitClassification>(units: T[], role?: string): T[] {
  const needsReportorialUnit = role !== 'user';
  return units.filter((unit) => isReportorialUnit(unit) === needsReportorialUnit);
}