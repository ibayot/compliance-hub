import type { SubmitSatisfactionDto } from '@/app/api/references';

export interface PublicRatingTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  createdAt: string;
  resolvedAt: string | null;
  categoryName: string | null;
  issueName: string | null;
  technicianName: string;
  ratingStatus: 'eligible' | 'rated';
  rating: number | null;
}

export interface PublicRatingSession {
  expiresAt: string;
  recipient: {
    firstName: string;
    middleInitial: string;
    lastName: string;
    suffix: string;
    unitSection: string;
  };
  tickets: PublicRatingTicket[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/tickets/rating-access${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || 'The feedback request could not be completed.');
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return body as T;
}

export const publicRatingApi = {
  getStatus: (token: string) =>
    request<{ valid: boolean; requiresVerification: boolean; expiresAt: string }>(
      `/${encodeURIComponent(token)}/status`,
    ),
  requestCode: (token: string) =>
    request<{ message: string }>(`/${encodeURIComponent(token)}/request-code`, {
      method: 'POST',
      body: '{}',
    }),
  verify: (token: string, code: string) =>
    request<{ verified: boolean }>(`/${encodeURIComponent(token)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  getSession: () => request<PublicRatingSession>('/session/tickets'),
  submit: (ratingItemId: string, data: SubmitSatisfactionDto) =>
    request<{
      success: boolean;
      ratingItemId: string;
      ratingStatus: 'rated';
      invitationCompleted: boolean;
    }>(`/session/tickets/${encodeURIComponent(ratingItemId)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
