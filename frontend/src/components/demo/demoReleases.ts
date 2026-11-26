import type { AppRelease } from '@/lib/api/changelog';

export const demoReleases: AppRelease[] = [{
  id: 'demo-release', version: '1.0.0-demo', title: 'Sample release notes',
  displayDays: 1, status: 'published', notes: [{
    id: 'demo-workspace-note', category: 'feature', audience: 'end_user', capabilityKeys: [],
    title: 'Track your ICT requests', description: 'Open My Tickets to see progress, read resolution notes and rate the service.',
  }],
}];
