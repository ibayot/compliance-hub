import { demoSupportTypes } from './demo.types';

export const demoRequesterCategories = [
  { id: 'internet', name: 'Internet / Network', supportType: demoSupportTypes[0] },
  { id: 'office-email', name: 'Office Email', supportType: demoSupportTypes[0] },
  { id: 'printer', name: 'Printer / Scanner', supportType: demoSupportTypes[1] },
  { id: 'desktop', name: 'Desktop', supportType: demoSupportTypes[1] },
  { id: 'pantawid-system', name: 'Pantawid System', supportType: demoSupportTypes[2] },
  { id: 'specialized', name: 'General Specialized Concern', supportType: demoSupportTypes[3] },
] as const;
