import { ConfigService } from '@nestjs/config';
import { InferenceQueueService } from './inference-queue.service';

function makeService(
  maxConcurrent: number,
  maxQueueLength: number,
): InferenceQueueService {
  const configService = {
    get: () => ({
      concurrency: { maxConcurrentInference: maxConcurrent, maxQueueLength },
    }),
  } as unknown as ConfigService<{ app: unknown }, true>;
  return new InferenceQueueService(configService);
}

describe('InferenceQueueService', () => {
  it('admits immediately when under the concurrency cap, without reporting a queue position', async () => {
    const service = makeService(2, 10);
    const positions: number[] = [];

    const release = await service.acquire((p) => positions.push(p));

    expect(positions).toEqual([]);
    expect(typeof release).toBe('function');
  });

  it('queues the (max+1)th caller and reports its live position', async () => {
    const service = makeService(1, 10);

    const release1 = await service.acquire(() => {});

    const positions: number[] = [];
    const secondAcquire = service.acquire((p) => positions.push(p));

    // Give the microtask queue a tick so the waiter is registered and its
    // initial position broadcast before we assert on it.
    await Promise.resolve();
    expect(positions).toEqual([1]);

    release1();
    const release2 = await secondAcquire;
    expect(typeof release2).toBe('function');
  });

  it('admits a queued waiter once a slot frees up, and shifts remaining positions down', async () => {
    const service = makeService(1, 10);

    const release1 = await service.acquire(() => {});
    const positionsB: number[] = [];
    const positionsC: number[] = [];
    const acquireB = service.acquire((p) => positionsB.push(p));
    const acquireC = service.acquire((p) => positionsC.push(p));

    await Promise.resolve();
    expect(positionsB).toEqual([1]);
    expect(positionsC).toEqual([2]);

    release1();
    const releaseB = await acquireB;

    // C moved from position 2 to position 1 once B was admitted.
    expect(positionsC).toEqual([2, 1]);

    releaseB();
    await acquireC;
  });

  it('rejects outright once the queue is already at its configured limit', async () => {
    const service = makeService(1, 1);

    await service.acquire(() => {}); // takes the only concurrent slot
    const queued = service.acquire(() => {}); // fills the one queue slot
    void queued.catch(() => {}); // avoid an unhandled-rejection warning while it's pending

    await expect(service.acquire(() => {})).rejects.toThrow(/at capacity/i);
  });
});
