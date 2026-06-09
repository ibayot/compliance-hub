import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident, IncidentStatus, IncidentSeverity } from '../entities/incident.entity';
import { UsersHttpClient, UserStub } from '../../../common/http-clients/users.http-client';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    private readonly usersHttpClient: UsersHttpClient,
  ) {}

  private async hydrateIncidentUsers(incidents: Incident[]): Promise<Incident[]> {
    const ids = new Set<number>();
    incidents.forEach((incident) => {
      if (Number.isFinite(Number(incident.reported_by_id))) {
        ids.add(Number(incident.reported_by_id));
      }
      if (Number.isFinite(Number(incident.assigned_to_id))) {
        ids.add(Number(incident.assigned_to_id));
      }
    });

    const userMap = new Map<number, UserStub | null>();
    await Promise.all(
      [...ids].map(async (id) => {
        const user = await this.usersHttpClient.getUserById(id);
        userMap.set(id, user);
      }),
    );

    incidents.forEach((incident) => {
      incident.reported_by = userMap.get(Number(incident.reported_by_id)) ?? null;
      incident.assigned_to = userMap.get(Number(incident.assigned_to_id)) ?? null;
    });

    return incidents;
  }

  async create(createDto: Partial<Incident>): Promise<Incident> {
    const incident = this.incidentRepository.create(createDto);
    return await this.incidentRepository.save(incident);
  }

  async findAll(): Promise<Incident[]> {
    const incidents = await this.incidentRepository.find({
      order: { created_at: 'DESC' },
    });
    return this.hydrateIncidentUsers(incidents);
  }

  async findOne(id: number): Promise<Incident | null> {
    const incident = await this.incidentRepository.findOne({
      where: { id },
    });

    if (!incident) {
      return null;
    }

    const [enriched] = await this.hydrateIncidentUsers([incident]);
    return enriched;
  }

  async update(id: number, updateDto: Partial<Incident>): Promise<Incident | null> {
    await this.incidentRepository.update(id, updateDto);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.incidentRepository.delete(id);
  }

  async getStatistics() {
    const incidents = await this.incidentRepository.find();

    const byStatus = {
      open: incidents.filter((i) => i.status === IncidentStatus.OPEN).length,
      in_progress: incidents.filter((i) => i.status === IncidentStatus.IN_PROGRESS).length,
      resolved: incidents.filter((i) => i.status === IncidentStatus.RESOLVED).length,
      closed: incidents.filter((i) => i.status === IncidentStatus.CLOSED).length,
    };

    const bySeverity = {
      low: incidents.filter((i) => i.severity === IncidentSeverity.LOW).length,
      medium: incidents.filter((i) => i.severity === IncidentSeverity.MEDIUM).length,
      high: incidents.filter((i) => i.severity === IncidentSeverity.HIGH).length,
      critical: incidents.filter((i) => i.severity === IncidentSeverity.CRITICAL).length,
    };

    const critical = incidents.filter((i) => 
      i.severity === IncidentSeverity.HIGH || i.severity === IncidentSeverity.CRITICAL
    ).filter((i) => 
      i.status === IncidentStatus.OPEN || i.status === IncidentStatus.IN_PROGRESS
    ).length;

    return {
      total: incidents.length,
      byStatus,
      bySeverity,
      criticalOpen: critical,
    };
  }

  async getTodayStats(startTime: Date, endTime: Date) {
    const start = await this.incidentRepository
      .createQueryBuilder('incident')
      .where('incident.created_at < :startTime', { startTime })
      .andWhere('incident.status != :status', { status: IncidentStatus.CLOSED })
      .getCount();

    const todayIncidents = await this.incidentRepository
      .createQueryBuilder('incident')
      .where('incident.created_at >= :startTime', { startTime })
      .andWhere('incident.created_at <= :endTime', { endTime })
      .getMany();

    const added = todayIncidents.length;

    const current = await this.incidentRepository
      .createQueryBuilder('incident')
      .where('incident.created_at <= :endTime', { endTime })
      .andWhere('incident.status != :status', { status: IncidentStatus.CLOSED })
      .getCount();

    const bySeverity = {
      low: todayIncidents.filter((i) => i.severity === IncidentSeverity.LOW).length,
      medium: todayIncidents.filter((i) => i.severity === IncidentSeverity.MEDIUM).length,
      high: todayIncidents.filter((i) => i.severity === IncidentSeverity.HIGH).length,
      critical: todayIncidents.filter((i) => i.severity === IncidentSeverity.CRITICAL).length,
    };

    return {
      startCount: start,
      addedToday: added,
      currentCount: current,
      severityBreakdown: bySeverity,
    };
  }

  async getPeriodStatistics(now: Date = new Date()) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - mondayOffset);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);

    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    const incidents = await this.incidentRepository
      .createQueryBuilder('incident')
      .where('incident.created_at <= :now', { now })
      .getMany();

    const buildPeriodStats = (start: Date, end: Date) => {
      const inPeriod = incidents.filter((incident) => {
        const createdAt = new Date(incident.created_at);
        return createdAt >= start && createdAt <= end;
      });

      const bySeverity = {
        low: inPeriod.filter((incident) => incident.severity === IncidentSeverity.LOW).length,
        medium: inPeriod.filter((incident) => incident.severity === IncidentSeverity.MEDIUM).length,
        high: inPeriod.filter((incident) => incident.severity === IncidentSeverity.HIGH).length,
        critical: inPeriod.filter((incident) => incident.severity === IncidentSeverity.CRITICAL).length,
      };

      const byStatus = {
        open: inPeriod.filter((incident) => incident.status === IncidentStatus.OPEN).length,
        in_progress: inPeriod.filter((incident) => incident.status === IncidentStatus.IN_PROGRESS).length,
        resolved: inPeriod.filter((incident) => incident.status === IncidentStatus.RESOLVED).length,
        closed: inPeriod.filter((incident) => incident.status === IncidentStatus.CLOSED).length,
      };

      const resolvedWithinPeriod = incidents.filter((incident) => {
        if (!incident.resolved_at) {
          return false;
        }

        if (incident.status !== IncidentStatus.RESOLVED && incident.status !== IncidentStatus.CLOSED) {
          return false;
        }

        const resolvedAt = new Date(incident.resolved_at);
        return resolvedAt >= start && resolvedAt <= end;
      }).length;

      const openCritical = inPeriod.filter((incident) => {
        const isCriticalOrHigh =
          incident.severity === IncidentSeverity.HIGH || incident.severity === IncidentSeverity.CRITICAL;
        const isActive =
          incident.status === IncidentStatus.OPEN || incident.status === IncidentStatus.IN_PROGRESS;

        return isCriticalOrHigh && isActive;
      }).length;

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        totalReported: inPeriod.length,
        bySeverity,
        byStatus,
        criticalOpen: openCritical,
        resolvedWithinPeriod,
      };
    };

    return {
      generatedAt: now.toISOString(),
      daily: buildPeriodStats(dayStart, now),
      weekly: buildPeriodStats(weekStart, now),
      monthly: buildPeriodStats(monthStart, now),
      quarterly: buildPeriodStats(quarterStart, now),
      yearly: buildPeriodStats(yearStart, now),
    };
  }
}
