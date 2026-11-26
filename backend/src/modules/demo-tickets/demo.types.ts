export type DemoSession = {
  id: string;
  role: 'user' | 'technician';
  requesterId: number;
  technicianId: number;
};

export type DemoActor = DemoSession & { userId: number };

export const demoSupportTypes = [
  'IT Support', 'Desktop Support', 'Pantawid ICT Support', 'Specialized Concerns',
] as const;
