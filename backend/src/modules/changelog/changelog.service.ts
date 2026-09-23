import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RoleCapability } from '../users/entities/role-capability.entity';
import { AppRelease, AppReleaseDelivery, AppReleaseNote } from './changelog.entity';
const CATS = ['functional', 'enhancement', 'bug_fix'];
const SKIP = new Set(['id', 'roleValue', 'createdAt', 'updatedAt', 'label']);
type Input = {
  version: string;
  title: string;
  displayDays: number;
  notes: Array<{ category: string; title: string; description: string; capabilityKeys: string[] }>;
};
@Injectable()
export class ChangelogService {
  constructor(
    @InjectRepository(AppRelease) private rr: Repository<AppRelease>,
    @InjectRepository(AppReleaseNote) private nr: Repository<AppReleaseNote>,
    @InjectRepository(AppReleaseDelivery) private dr: Repository<AppReleaseDelivery>,
    @InjectRepository(User) private ur: Repository<User>,
    @InjectRepository(RoleCapability) private cr: Repository<RoleCapability>,
  ) {}
  private validate(x: Input) {
    if (
      !x.version?.trim() ||
      !x.title?.trim() ||
      !Number.isInteger(x.displayDays) ||
      x.displayDays < 1 ||
      x.displayDays > 365 ||
      !x.notes?.length
    )
      throw new BadRequestException(
        'Version, title, 1-365 display days, and at least one note are required.',
      );
    const allowed = new Set(
      Object.keys(this.cr.metadata.propertiesMap).filter((k) => !SKIP.has(k)),
    );
    for (const n of x.notes) {
      if (
        !CATS.includes(n.category) ||
        !n.title?.trim() ||
        !n.description?.trim() ||
        !n.capabilityKeys?.length ||
        n.capabilityKeys.some((k) => !allowed.has(k))
      )
        throw new BadRequestException(
          'Every note must be Functional, Enhancement, or Bug Fix and have valid capability targets.',
        );
    }
  }
  async adminList() {
    return this.rr.find({ relations: ['notes'], order: { createdAt: 'DESC' } });
  }
  async saveDraft(x: Input, id?: string) {
    this.validate(x);
    let r = id ? await this.rr.findOne({ where: { id }, relations: ['notes'] }) : null;
    if (id && !r) throw new NotFoundException('Release not found.');
    if (r?.status === 'published')
      throw new BadRequestException('Published releases are immutable.');
    if (r?.notes?.length) await this.nr.remove(r.notes);
    r = await this.rr.save(
      this.rr.create({
        ...r,
        version: x.version.trim(),
        title: x.title.trim(),
        displayDays: x.displayDays,
        status: 'draft',
      }),
    );
    r.notes = await this.nr.save(
      x.notes.map((n, i) =>
        this.nr.create({
          releaseId: r!.id,
          category: n.category,
          title: n.title.trim(),
          description: n.description.trim(),
          capabilityKeys: [...new Set(n.capabilityKeys)],
          sortOrder: i,
        }),
      ),
    );
    return r;
  }
  private notes(r: AppRelease, c?: RoleCapability) {
    return (r.notes || [])
      .filter((n) => n.capabilityKeys.some((k) => !!(c as any)?.[k]))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  private view(r: AppRelease, c?: RoleCapability) {
    return { ...r, notes: this.notes(r, c) };
  }
  async publish(id: string) {
    const r = await this.rr.findOne({ where: { id }, relations: ['notes'] });
    if (!r) throw new NotFoundException('Release not found.');
    if (r.status === 'published') throw new BadRequestException('Already published.');
    const now = new Date();
    r.status = 'published';
    r.publishedAt = now;
    r.automaticEndAt = new Date(now.getTime() + r.displayDays * 86400000);
    await this.rr.save(r);
    const [us, cs] = await Promise.all([this.ur.find({ where: { active: true } }), this.cr.find()]);
    const m = new Map(cs.map((c) => [c.roleValue, c]));
    const vals = us
      .filter((u) => this.notes(r, m.get(u.role)).length)
      .map((u) => ({ releaseId: id, userId: u.id }));
    if (vals.length) await this.dr.createQueryBuilder().insert().values(vals).orIgnore().execute();
    return r;
  }
  async remove(id: string) {
    const r = await this.rr.findOne({ where: { id } });
    if (r?.status === 'published')
      throw new BadRequestException('Published releases cannot be deleted.');
    if (r) await this.rr.remove(r);
  }
  async prompt(uid: number, role: string) {
    const c = await this.cr.findOne({ where: { roleValue: role } }),
      now = new Date();
    const active = await this.rr.find({ where: { status: 'published' }, relations: ['notes'] });
    for (const r of active.filter(
      (r) => r.automaticEndAt && r.automaticEndAt >= now && this.notes(r, c || undefined).length,
    ))
      await this.dr
        .createQueryBuilder()
        .insert()
        .values({ releaseId: r.id, userId: uid })
        .orIgnore()
        .execute();
    const ds = await this.dr.find({
      where: { userId: uid },
      relations: ['release', 'release.notes'],
      order: { eligibleAt: 'DESC' },
    });
    return ds
      .filter((d) => !d.acknowledgedAt && (now <= d.release.automaticEndAt! || !d.firstDisplayedAt))
      .map((d) => this.view(d.release, c || undefined))
      .filter((r) => r.notes.length);
  }
  async history(role: string) {
    const c = await this.cr.findOne({ where: { roleValue: role } });
    return (
      await this.rr.find({
        where: { status: 'published' },
        relations: ['notes'],
        order: { publishedAt: 'DESC' },
      })
    )
      .map((r) => this.view(r, c || undefined))
      .filter((r) => r.notes.length);
  }
  async displayed(uid: number, ids: string[]) {
    if (ids?.length)
      await this.dr
        .createQueryBuilder()
        .update()
        .set({ firstDisplayedAt: () => 'COALESCE(first_displayed_at,NOW())' } as any)
        .where({ userId: uid, releaseId: In(ids) })
        .execute();
  }
  async acknowledge(uid: number, ids: string[]) {
    if (ids?.length)
      await this.dr
        .createQueryBuilder()
        .update()
        .set({
          acknowledgedAt: () => 'NOW()',
          firstDisplayedAt: () => 'COALESCE(first_displayed_at,NOW())',
        } as any)
        .where({ userId: uid, releaseId: In(ids) })
        .execute();
  }
}
