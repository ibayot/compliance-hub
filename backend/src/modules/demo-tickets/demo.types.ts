export type DemoRun = {
  id: string;
  requesterId: number;
  technicianId: number;
};

export type DemoSession = DemoRun & { role: 'user' | 'technician' };

export type DemoActor = DemoSession & { userId: number };

export const demoSupportTypes = [
  'IT Support', 'Desktop Support', 'Pantawid ICT Support', 'Specialized Concerns',
] as const;
