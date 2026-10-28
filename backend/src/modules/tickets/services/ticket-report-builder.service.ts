import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketReportTemplate } from '../entities/ticket-report-template.entity';
import { TicketingConfig } from '../entities/ticketing-config.entity';
import { TicketStatus } from '../entities/ticket.entity';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import { getEffectiveResolvedAt, TicketService } from './ticket.service';
import { assertKeys, monthlyReportPeriod, ReportConfiguration, reportConfiguration } from './ticket-report-builder.contract';
import { usableInterruptionHistory } from './ticket-interruptions';
import { formatPersonName } from '../../../shared/utils/person-name';

interface Actor { id: number; role: string }
export interface InterruptionTotals { tickets: number; occurrences: number; businessMinutes: number; averageFrequency: number | null; averageMinutes: number | null; averageEligibleTickets: number; averageEligibleOccurrences: number }
const round = (n: number) => Math.round(n * 100) / 100;
const blankTotals = (): InterruptionTotals => ({ tickets: 0, occurrences: 0, businessMinutes: 0, averageFrequency: null, averageMinutes: null, averageEligibleTickets: 0, averageEligibleOccurrences: 0 });

@Injectable()
export class TicketReportBuilderService {
  constructor(
    @InjectRepository(TicketReportTemplate) private readonly templates: Repository<TicketReportTemplate>,
    @InjectRepository(TicketingConfig) private readonly configs: Repository<TicketingConfig>,
    private readonly tickets: TicketService,
    private readonly capabilities: RoleCapabilitiesService,
  ) {}

  private authorize(actor: Actor, configuration?: ReportConfiguration) {
    if (!Number.isSafeInteger(actor.id) || actor.id < 1 || !this.capabilities.isTicketReportsAccess(actor.role))
      throw new ForbiddenException('Ticket report access is required.');
    if (configuration && !this.capabilities.isTicketReportsManage(actor.role) &&
      ((configuration.technicianId !== null && configuration.technicianId !== actor.id) || configuration.sections.includes('staff')))
      throw new ForbiddenException('Broader staff reporting requires report-management access.');
  }

  private scopeConfiguration(actor: Actor, configuration: ReportConfiguration): ReportConfiguration {
    if (this.capabilities.isTicketReportsManage(actor.role) && configuration.technicianId === null) return configuration;
    return { ...configuration, sections: configuration.sections.filter(section => section !== 'staff'),
      columns: configuration.columns.filter(column => column !== 'assignee') };
  }

  async listTemplates(actor: Actor) {
    this.authorize(actor);
    return this.templates.find({ where: { ownerId: actor.id }, order: { name: 'ASC', id: 'ASC' }, take: 100 });
  }

  async staffOptions(actor: Actor) {
    this.authorize(actor);
    return this.tickets.getBuilderAssignees(actor.id, actor.role);
  }

  async saveTemplate(actor: Actor, input: unknown, id?: string) {
    this.authorize(actor);
    assertKeys(input, id ? ['name', 'configuration', 'revision'] : ['name', 'configuration']);
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 80)
      throw new BadRequestException('A template name of 1–80 characters is required.');
    const requestedConfiguration = reportConfiguration(input.configuration);
    this.authorize(actor, requestedConfiguration);
    const configuration = this.scopeConfiguration(actor, requestedConfiguration);
    const name = input.name.trim();
    try {
      if (id) {
        if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw new BadRequestException('A template revision is required.');
        const current = await this.templates.findOne({ where: { id, ownerId: actor.id } });
        if (!current) throw new NotFoundException('Template not found.');
        const result = await this.templates.update({ id, ownerId: actor.id, revision: input.revision },
          { name, configuration, revision: input.revision + 1 });
        if (!result.affected) throw new ConflictException('This template changed. Reload it before saving.');
        return this.templates.findOneByOrFail({ id, ownerId: actor.id });
      }
      if (await this.templates.countBy({ ownerId: actor.id }) >= 100) throw new BadRequestException('Keep up to 100 personal templates. Delete an unused template first.');
      return await this.templates.save(this.templates.create({ ownerId: actor.id, name, configuration, revision: 1 }));
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') throw new ConflictException('You already have a template with that name.');
      throw error;
    }
  }

  async deleteTemplate(actor: Actor, id: string, revision: number) {
    this.authorize(actor);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new BadRequestException('A template revision is required.');
    const current = await this.templates.findOneBy({ id, ownerId: actor.id });
    if (!current) throw new NotFoundException('Template not found.');
    const result = await this.templates.delete({ id, ownerId: actor.id, revision });
    if (!result.affected) throw new ConflictException('This template changed. Reload it before deleting.');
  }

  async generate(actor: Actor, input: unknown, now = new Date()) {
    this.authorize(actor);
    assertKeys(input, ['year', 'month', 'configuration']);
    const requestedConfiguration = reportConfiguration(input.configuration);
    this.authorize(actor, requestedConfiguration);
    const configuration = this.scopeConfiguration(actor, requestedConfiguration);
    const scope = await this.tickets.getBuilderScopeName(actor.id, actor.role, configuration.technicianId);
    const period = monthlyReportPeriod(input.year, input.month, now);
    const config = await this.configs.findOneBy({ id: 1 });
    if (!config) throw new ServiceUnavailableException('SLA calendar settings are unavailable. Please retry.');
    const source = await this.tickets.getMonthlyBuilderTickets(period.start, period.cutoff, actor.id, actor.role,
      configuration.technicianId, configuration.ticketType, configuration.includeTicketList && configuration.columns.includes('description'));
    await this.tickets.enrichBuilderTickets(source);
    const cache = new Map<string, boolean>();
    const summary = { received: 0, completed: 0, slaMet: 0, slaMissed: 0, slaUnavailable: 0,
      slaCompliancePercent: null as number | null, pause: blankTotals(), freeze: blankTotals(),
      unknownHistoryTickets: 0, estimatedTimingTickets: 0, missingCompletionTickets: 0 };
    const groups = new Map<string, Map<string, { id: string; label: string; category?: string; tickets: number; slaMet: number; slaMissed: number }>>();
    const averageInputs = { pause: blankTotals(), freeze: blankTotals() };
    const rows: Array<Record<string, any>> = [];
    let rated = 0, ratingSum = 0;
    const inMonth = (d: Date | null) => !!d && d >= period.start && d < period.cutoff;
    for (const ticket of source) {
      const completed = [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status);
      const effective = getEffectiveResolvedAt(ticket);
      const validEffective = effective && Number.isFinite(effective.getTime()) ? effective : null;
      const receivedInMonth = inMonth(new Date(ticket.createdAt));
      const completedInMonth = completed && inMonth(validEffective);
      const lifetimeEnd = completed && validEffective ? validEffective : period.cutoff;
      if (lifetimeEnd < period.start && !receivedInMonth) continue;
      if (receivedInMonth) summary.received++;
      if (completed && !validEffective) summary.missingCompletionTickets++;
      const history = usableInterruptionHistory(ticket.interruptionHistory);
      const known = Boolean(history && (history.complete || new Date(history.capturedFrom) <= period.start));
      if (!known) summary.unknownHistoryTickets++;
      const counts = { pause: 0, freeze: 0 }, minutes = { pause: 0, freeze: 0 };
      for (const interval of history?.intervals ?? []) {
        const start = new Date(Math.max(Date.parse(interval.startAt), period.start.getTime()));
        const end = new Date(Math.min(interval.endAt === null ? period.cutoff.getTime() : Date.parse(interval.endAt),
          period.cutoff.getTime(), lifetimeEnd.getTime()));
        if (end <= start) continue;
        counts[interval.kind]++;
        minutes[interval.kind] += await this.tickets.calculateBusinessSecondsForSla(start, end,
          { ...config, overtimeSlaDate: ticket.overtimeSlaDate || undefined }, cache) / 60;
      }
      for (const kind of ['pause', 'freeze'] as const) {
        if (counts[kind]) summary[kind].tickets++;
        summary[kind].occurrences += counts[kind];
        summary[kind].businessMinutes += minutes[kind];
        if (known && counts[kind]) {
          averageInputs[kind].tickets++;
          averageInputs[kind].occurrences += counts[kind];
          averageInputs[kind].businessMinutes += minutes[kind];
        }
      }
      let sla: 'Met' | 'Missed' | 'Unavailable' | null = null;
      if (completedInMonth) {
        summary.completed++;
        const timing = await this.tickets.getBuilderSlaResult(ticket, validEffective!, config, cache);
        sla = timing.met === null ? 'Unavailable' : timing.met ? 'Met' : 'Missed';
        if (sla === 'Met') summary.slaMet++;
        else if (sla === 'Missed') summary.slaMissed++;
        else summary.slaUnavailable++;
        if (timing.estimated) summary.estimatedTimingTickets++;
        if (ticket.satisfactionRating !== null && Number.isFinite(Number(ticket.satisfactionRating))) {
          rated++; ratingSum += Number(ticket.satisfactionRating);
        }
        for (const section of configuration.sections.filter(s => s !== 'ratings')) {
          const key = section === 'staff' ? String(ticket.assignedToId ?? 'none') : section === 'categories'
            ? ticket.categoryId ?? 'none' : JSON.stringify([ticket.categoryId ?? null, ticket.issueTypeId ?? null]);
          const label = section === 'staff' ? (ticket.assignedTo ? formatPersonName(ticket.assignedTo, `Staff #${ticket.assignedToId}`) : 'Unassigned')
            : section === 'categories' ? ticket.category?.name ?? 'Unspecified' : ticket.issueTypeConfig?.name ?? 'Unspecified';
          if (!groups.has(section)) groups.set(section, new Map());
          const group = groups.get(section)!.get(key) ?? { id: key, label,
            ...(section === 'issues' ? { category: ticket.category?.name ?? 'Unspecified' } : {}),
            tickets: 0, slaMet: 0, slaMissed: 0 };
          group.tickets++; if (sla === 'Met') group.slaMet++; if (sla === 'Missed') group.slaMissed++;
          groups.get(section)!.set(key, group);
        }
      }
      const interrupted = counts.pause + counts.freeze > 0;
      const listed = configuration.listBasis === 'completed' ? completedInMonth : configuration.listBasis === 'received' ? receivedInMonth : interrupted;
      if (configuration.includeTicketList && listed) {
        const optional = { subject: ticket.subject, description: ticket.description, requester: ticket.requester ? formatPersonName(ticket.requester, '') : 'Unavailable',
          assignee: ticket.assignedTo ? formatPersonName(ticket.assignedTo, '') : 'Unassigned', category: ticket.category?.name ?? 'Unspecified',
          issue: ticket.issueTypeConfig?.name ?? 'Unspecified', status: ticket.status, priority: ticket.priority,
          createdAt: new Date(ticket.createdAt).toISOString(), completedAt: validEffective?.toISOString() ?? null };
        rows.push({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, ticketType: ticket.ticketType, pauseCount: known ? counts.pause : null,
          freezeCount: known ? counts.freeze : null, pauseMinutes: known ? round(minutes.pause) : null,
          freezeMinutes: known ? round(minutes.freeze) : null, historyQuality: known ? 'Recorded' : 'Incomplete', sla,
          ...Object.fromEntries(configuration.columns.map(column => [column, optional[column]])),
          _sort: configuration.sortBy === 'ticketNumber' ? ticket.ticketNumber : configuration.sortBy === 'createdAt'
            ? new Date(ticket.createdAt).toISOString() : validEffective?.toISOString() ?? '' });
      }
    }
    const classified = summary.slaMet + summary.slaMissed;
    summary.slaCompliancePercent = classified ? round(summary.slaMet / classified * 100) : null;
    for (const kind of ['pause', 'freeze'] as const) {
      const total = summary[kind];
      // Incomplete records are excluded from averages; publish known lower bounds with a coverage warning.
      const eligible = averageInputs[kind];
      total.averageEligibleTickets = eligible.tickets;
      total.averageEligibleOccurrences = eligible.occurrences;
      total.averageFrequency = eligible.tickets ? round(eligible.occurrences / eligible.tickets) : null;
      total.averageMinutes = eligible.occurrences ? round(eligible.businessMinutes / eligible.occurrences) : null;
      total.businessMinutes = round(total.businessMinutes);
    }
    rows.sort((a, b) => (String(a._sort).localeCompare(String(b._sort)) || a.ticketId.localeCompare(b.ticketId)) * (configuration.sortOrder === 'asc' ? 1 : -1));
    rows.forEach(row => delete row._sort);
    return { configuration, year: input.year, month: input.month, timeZone: 'Asia/Manila', generatedAt: now.toISOString(),
      startAt: period.start.toISOString(), endAtExclusive: period.end.toISOString(), cutoffAt: period.cutoff.toISOString(),
      monthToDate: period.monthToDate, scope,
      scopeMode: this.capabilities.isTicketReportsManage(actor.role) && configuration.technicianId === null ? 'all' as const : 'individual' as const,
      summary, breakdowns: Object.fromEntries([...groups].map(([key, values]) => [key, [...values.values()].sort((a, b) => b.tickets - a.tickets || a.label.localeCompare(b.label))])),
      ratings: configuration.sections.includes('ratings') ? { ratedTickets: rated, average: rated ? round(ratingSum / rated) : null } : null,
      rows, listCount: rows.length };
  }
}
