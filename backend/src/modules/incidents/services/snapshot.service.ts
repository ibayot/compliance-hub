import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IncidentDailySnapshot } from '../entities/incident-daily-snapshot.entity';
import { Incident, IncidentStatus, IncidentSeverity } from '../entities/incident.entity';

@Injectable()
export class SnapshotService {
  constructor(
    @InjectRepository(IncidentDailySnapshot)
    private snapshotRepository: Repository<IncidentDailySnapshot>,
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
  ) {}

  async createSnapshot(
    date: Date,
    time: string,
    type: 'start' | 'end',
  ): Promise<IncidentDailySnapshot> {
    const incidents = await this.incidentRepository.find({
      where: { status: IncidentStatus.OPEN },
    });

    const counts = {
      low: incidents.filter((i) => i.severity === IncidentSeverity.LOW).length,
      medium: incidents.filter((i) => i.severity === IncidentSeverity.MEDIUM).length,
      high: incidents.filter((i) => i.severity === IncidentSeverity.HIGH).length,
      critical: incidents.filter((i) => i.severity === IncidentSeverity.CRITICAL).length,
      total: incidents.length,
    };

    let addedCounts = null;
    if (type === 'end') {
      // Calculate added incidents since start of day
      const startSnapshot = await this.snapshotRepository.findOne({
        where: {
          snapshot_date: date,
          snapshot_type: 'start',
        },
      });

      if (startSnapshot) {
        addedCounts = {
          low: counts.low - startSnapshot.low_count,
          medium: counts.medium - startSnapshot.medium_count,
          high: counts.high - startSnapshot.high_count,
          critical: counts.critical - startSnapshot.critical_count,
          total: counts.total - startSnapshot.total_count,
        };
      }
    }

    const snapshot = this.snapshotRepository.create({
      snapshot_date: date,
      snapshot_time: time,
      snapshot_type: type,
      low_count: counts.low,
      medium_count: counts.medium,
      high_count: counts.high,
      critical_count: counts.critical,
      total_count: counts.total,
      low_added: addedCounts?.low || 0,
      medium_added: addedCounts?.medium || 0,
      high_added: addedCounts?.high || 0,
      critical_added: addedCounts?.critical || 0,
      total_added: addedCounts?.total || 0,
    });

    return await this.snapshotRepository.save(snapshot);
  }

  async getSnapshots(date: Date): Promise<IncidentDailySnapshot[]> {
    return await this.snapshotRepository.find({
      where: { snapshot_date: date },
      order: { snapshot_time: 'ASC' },
    });
  }

  async getLatestSnapshot(): Promise<IncidentDailySnapshot | null> {
    const snapshots = await this.snapshotRepository.find({
      order: { created_at: 'DESC' },
      take: 1,
    });
    return snapshots[0] || null;
  }

  // Cron job - Run at 8:00 AM Philippines time (UTC+8)
  @Cron('0 0 * * *', { timeZone: 'Asia/Manila' }) // 8:00 AM Manila time
  async createMorningSnapshot() {
    const now = new Date();
    await this.createSnapshot(now, '08:00:00', 'start');
  }

  // Cron job - Run at 5:00 PM Philippines time (UTC+8)
  @Cron('0 9 * * *', { timeZone: 'Asia/Manila' }) // 5:00 PM Manila time
  async createEveningSnapshot() {
    const now = new Date();
    await this.createSnapshot(now, '17:00:00', 'end');
  }
}
