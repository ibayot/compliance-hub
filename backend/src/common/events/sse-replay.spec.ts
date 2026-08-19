import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { SseService } from '../../common/events/sse.service';

describe('SseService replay', () => {
  it('replays events after the supplied event id', async () => {
    const service = new SseService(
      { publish: jest.fn(), subscribe: jest.fn() } as any,
      { get: () => 'test-sse-secret' } as any,
    );

    (service as any).emit({ type: 'FIRST', targetUserId: 7 });
    const firstId = (service as any).replayBuffer[0].id;
    (service as any).emit({ type: 'SECOND', targetUserId: 7 });

    const event = await firstValueFrom(service.getEventStream(7, firstId).pipe(take(1)));
    expect(event.data.type).toBe('SECOND');
  });
});
