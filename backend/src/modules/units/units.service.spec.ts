import { ConflictException } from '@nestjs/common';
import { UnitsService } from './units.service';

function repository() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
  } as any;
}

describe('UnitsService', () => {
  it('accepts short names and normalizes optional values', async () => {
    const repo = repository();
    repo.findOne.mockResolvedValue(null);
    const service = new UnitsService(repo);

    await service.create({ name: ' test ', description: '   ' });

    expect(repo.create).toHaveBeenCalledWith({
      name: 'test',
      description: null,
    });
  });

  it('reactivates an inactive unit instead of reporting a false duplicate', async () => {
    const repo = repository();
    const inactive = { id: 3, name: 'old', description: null, active: false };
    repo.findOne.mockResolvedValue(inactive);
    const service = new UnitsService(repo);

    await service.create({ name: ' test ', description: ' Restored ' });

    expect(repo.save).toHaveBeenCalledWith({
      id: 3,
      name: 'test',
      description: 'Restored',
      active: true,
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate names when updating another unit', async () => {
    const repo = repository();
    repo.findOne
      .mockResolvedValueOnce({ id: 1, name: 'One', active: true })
      .mockResolvedValueOnce({ id: 2, name: 'test', active: true });
    const service = new UnitsService(repo);

    await expect(service.update(1, { name: ' test ' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
