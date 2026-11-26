import type { CsatFormData, CreateTicketDto, PaginatedTickets, Ticket, TicketCategory, TicketComment,
  TicketDashboardStats, TicketEvent, TicketIssueType, TicketQueueFilters, TicketQueueScope, TicketReadOptions, TicketType } from '@/app/api/references';
import { demoApi, demoSupportTypes, type DemoTicket } from '@/lib/api/demo';
import { UserRole, type User } from '@/lib/types/auth';
import { demoArticles } from './demoKnowledge';

const ticketTypes = ['it_support', 'desktop_support', 'pantawid_ict_support', 'specialized_concerns'] as const;
const timestamp = (value: string) => value.replace(' ', 'T').replace(/Z?$/, 'Z');
export const demoUnits = [{ id: 0, name: 'Demo Office' }];
const demoProfileKey = (id: number) => `demo-requester-profile:${id}`;

export function saveDemoRequesterProfile(id: number, profile: Pick<User, 'phoneNumber' | 'sex' | 'position' | 'positionFull' | 'designation'>) {
  sessionStorage.setItem(demoProfileKey(id), JSON.stringify(profile));
}

export function demoRequesterProfile(user: User | null) {
  if (!user) return null;
  let profile: Pick<User, 'phoneNumber' | 'sex' | 'position' | 'positionFull' | 'designation'> = {};
  try { profile = JSON.parse(sessionStorage.getItem(demoProfileKey(user.id)) ?? '{}') ?? {}; } catch { /* sample defaults */ }
  return { ...user, firstName: 'Demo', lastName: 'User', middleName: undefined, suffix: undefined, role: UserRole.USER,
    phoneNumber: profile.phoneNumber ?? '9000000000', sex: profile.sex ?? 'Female',
    position: profile.position ?? 'Staff', positionFull: profile.positionFull ?? 'Demo Staff', designation: profile.designation,
    staffId: undefined, units: demoUnits };
}

function category(id: string, name: string, supportType: DemoTicket['supportType']): TicketCategory {
  return { id, key: id, name, isIt: supportType === 'IT Support', isDesktop: supportType === 'Desktop Support',
    isPantawid: supportType === 'Pantawid ICT Support', isSpecialized: supportType === 'Specialized Concerns',
    isActive: true, isDeleted: false, createdAt: '', updatedAt: '' };
}

type DemoTicketRow = Omit<DemoTicket, 'comments' | 'attachments' | 'events' | 'rating'>;
function person(ticket: DemoTicketRow, id: number) {
  const lastName = id === ticket.requesterId ? 'User' : id === ticket.technicianId ? 'Technician' : 'Administrator';
  return { id, email: '', firstName: 'Demo', lastName, role: lastName === 'User' ? 'user' : undefined };
}

function ticketRow(row: DemoTicketRow, ratedAt?: string | null): Ticket {
  const type = ticketTypes[demoSupportTypes.indexOf(row.supportType)];
  const createdAt = timestamp(row.createdAt);
  return { id: row.id, ticketNumber: row.ticketNumber, subject: row.subject, description: row.description,
    ticketType: type, status: row.status, priority: null, createdAt, updatedAt: createdAt,
    requesterId: row.requesterId, assignedToId: row.technicianId, createdById: row.filedBy,
    requester: person(row, row.requesterId), assignedTo: person(row, row.technicianId), createdBy: person(row, row.filedBy),
    categoryId: row.categoryKey, category: row.categoryKey && row.categoryName ? category(row.categoryKey, row.categoryName, row.supportType) : null,
    resolutionNotes: row.resolutionNotes, satisfactionSubmittedAt: ratedAt ? timestamp(ratedAt) : null };
}

function ticketDetail(row: DemoTicket): Ticket {
  const replacedIds = new Set(row.attachments.map(image => image.replacesId));
  const images = row.attachments.filter(image => image.mimeType.startsWith('image/') && !replacedIds.has(image.id));
  const initialImages = images.filter(image => image.commentId == null);
  const base = ticketRow(row, row.rating?.createdAt);
  const comments: TicketComment[] = row.comments.map(comment => ({
    id: String(comment.id), ticketId: row.id, comment: comment.body, userId: comment.authorId,
    isInternal: false, createdAt: timestamp(comment.createdAt), user: person(row, comment.authorId),
    attachmentPaths: images.filter(image => image.commentId === comment.id).map(image => image.id),
  }));
  if (initialImages.length) comments.unshift({ id: 'initial', ticketId: row.id, comment: '[Initial Ticket Attachment]',
    userId: row.filedBy, isInternal: false, createdAt: base.createdAt, attachmentPaths: initialImages.map(image => image.id) });
  const resolvedAt = row.events.find(event => event.action === 'resolved')?.createdAt;
  return { ...base, requesterUnitSnapshot: { unitId: demoUnits[0].id, unitName: demoUnits[0].name,
    source: 'filing', capturedAt: base.createdAt }, resolvedAt: resolvedAt ? timestamp(resolvedAt) : null,
    satisfactionRating: row.rating?.rating ?? null, comments };
}

async function getQueue(scope: TicketQueueScope, filters: TicketQueueFilters = {}, options?: TicketReadOptions): Promise<PaginatedTickets> {
  if (scope !== 'requested') throw new Error('Only My Tickets is available for a demo requester.');
  const params = new URLSearchParams();
  const { ticketType, ...rest } = filters;
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  if (ticketType) params.set('supportType', demoSupportTypes[ticketTypes.indexOf(ticketType)]);
  const result = await demoApi.requesterQueue(params, options?.signal);
  return { data: result.items?.map(row => ticketRow(row, row.satisfactionSubmittedAt)) ?? [],
    total: result.total ?? 0, page: result.page ?? 1, limit: result.limit ?? 25, totalPages: result.totalPages ?? 1,
    statusCounts: result.statusCounts, neighbors: result.neighbors };
}

export const demoRequesterTickets = {
  getQueue,
  getMyRequested: (filters?: TicketQueueFilters, options?: TicketReadOptions) => getQueue('requested', filters, options),
  getDashboardStats: async (): Promise<TicketDashboardStats> => {
    const stats = await demoApi.dashboard();
    return { ...stats, total: stats.open + stats.inProgress + stats.resolved + stats.closed,
      pendingSatisfactionTickets: [], pendingSatisfactionCount: stats.pendingCount };
  },
  getCategories: async (type?: string, _activeOnly?: boolean) => (await demoApi.categories())
    .filter(item => !type || ticketTypes[demoSupportTypes.indexOf(item.supportType)] === type)
    .map(item => category(item.id, item.name, item.supportType)),
  getIssueTypes: async (_categoryId?: string): Promise<TicketIssueType[]> => [],
  getProfileUnits: async () => demoUnits,
  searchKnowledge: async (search: string) => demoArticles.filter(article => {
    const words = search.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    const topic = `${article.title} ${article.tags}`.toLowerCase();
    return words.some(word => word.length > 3 && topic.includes(word));
  }),
  rateArticle: async (_id: number, _isHelpful: boolean) => {},
  create: async (payload: CreateTicketDto | FormData) => {
    const form = new FormData();
    const field = (key: keyof CreateTicketDto) => payload instanceof FormData ? payload.get(key) : payload[key];
    for (const key of ['subject', 'description'] as const) form.append(key, String(field(key) ?? ''));
    form.append('supportType', demoSupportTypes[ticketTypes.indexOf(field('ticketType') as TicketType)]);
    const categoryId = field('categoryId');
    if (categoryId) form.append('categoryKey', String(categoryId));
    if (payload instanceof FormData) payload.getAll('attachments').forEach(file => form.append('attachments', file));
    return ticketDetail(await demoApi.createRequest(form));
  },
  getDetail: async (id: string) => {
    const row = await demoApi.detail(id);
    const event = (eventId: string, actorId: number, eventType: string, at: string, meta?: TicketEvent['meta']): TicketEvent => ({
      id: eventId, ticketId: row.id, actorId, actorName: `Demo ${person(row, actorId).lastName}`,
      eventType, createdAt: timestamp(at), meta,
    });
    const events = [event('created', row.filedBy, 'created', row.createdAt),
      ...row.events.map((item, index) => event(String(item.id), item.actorId,
        item.action === 'assigned' ? 'auto_assigned' : 'status_changed', item.createdAt,
        { from: row.events[index - 1]?.action ?? 'open', to: item.action })),
      ...row.attachments.flatMap(image => image.replacesId && image.uploadedBy && image.createdAt
        ? [event(image.id, image.uploadedBy, 'attachment_replaced', image.createdAt,
          { oldPath: image.replacesId, newPath: image.id })] : []),
      ...(row.rating ? [event('rated', row.requesterId, 'satisfaction_submitted', row.rating.createdAt)] : [])];
    return { ticket: ticketDetail(row), events };
  },
  addComment: async (id: string, body: string, _isInternal: boolean, images: File[], _mentions: number[]) => {
    const data = new FormData();
    data.append('body', body);
    images.forEach(image => data.append('attachments', image));
    const result = await demoApi.commentWithImages(id, data);
    const comment = ticketDetail(result).comments?.find(item => item.id === String(result.addedCommentId));
    if (!comment) throw new Error('The comment could not be loaded.');
    return comment;
  },
  replaceCommentImage: (id: string, _commentId: string, image: string, file: File) => demoApi.replaceImage(id, image, file),
  close: async (id: string) => ticketDetail(await demoApi.close(id)),
  submitSatisfaction: async (id: string, form: CsatFormData) => { await demoApi.rate(id, form.likert); },
  imageUrl: (id: string, attachmentId: string) => `/demo-tickets/${id}/attachments/${encodeURIComponent(attachmentId)}`,
};
