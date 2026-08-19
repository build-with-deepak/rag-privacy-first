import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { QueryService, QueryStreamEvent } from './query.service';

/**
 * A minimal fake of the browser's EventSource — enough to drive the
 * service's event wiring and close() call without a real network
 * connection. Tests hold a reference to the last-constructed instance via
 * `FakeEventSource.instances` so they can fire events into it.
 */
class FakeEventSource {
  static instances: FakeEventSource[] = [];

  readonly url: string;
  closed = false;
  onerror: (() => void) | null = null;
  private readonly listeners = new Map<string, Set<(event: MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data: unknown): void {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

describe('QueryService', () => {
  let originalEventSource: typeof EventSource;

  function makeService(): QueryService {
    TestBed.configureTestingModule({
      providers: [
        QueryService,
        { provide: AuthService, useValue: { token: 'tok-abc' } },
      ],
    });
    return TestBed.inject(QueryService);
  }

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    FakeEventSource.instances = [];
    globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
  });

  it('opens an EventSource with documentId, question AND the session token encoded', () => {
    const service = makeService();
    const sub = service.ask('doc-1', 'what is RAG?').subscribe();

    expect(FakeEventSource.instances).toHaveLength(1);
    const url = FakeEventSource.instances[0].url;
    expect(url).toContain('/api/query/stream?');
    expect(url).toContain('documentId=doc-1');
    expect(url).toContain('question=what+is+RAG%3F');
    // EventSource can't set headers, so the token must ride in the URL.
    expect(url).toContain('token=tok-abc');

    sub.unsubscribe();
  });

  it('forwards named SSE events as typed union values', () => {
    const service = makeService();
    const received: QueryStreamEvent[] = [];
    const sub = service.ask('doc-1', 'q').subscribe((event) => received.push(event));
    const source = FakeEventSource.instances[0];

    source.emit('queue', { position: 3 });
    source.emit('retrieval', { chunks: [], retrievalMs: 42 });
    source.emit('token', { text: 'Hello' });

    expect(received).toEqual([
      { type: 'queue', data: { position: 3 } },
      { type: 'retrieval', data: { chunks: [], retrievalMs: 42 } },
      { type: 'token', data: { text: 'Hello' } },
    ]);

    sub.unsubscribe();
  });

  it('completes the observable and closes the connection after a done event', () => {
    const service = makeService();
    let completed = false;
    service.ask('doc-1', 'q').subscribe({ complete: () => (completed = true) });
    const source = FakeEventSource.instances[0];

    source.emit('done', { generationMs: 100, totalMs: 150 });

    expect(completed).toBe(true);
    expect(source.closed).toBe(true);
  });

  it('translates a connection-level failure into a synthetic error event and completes', () => {
    const service = makeService();
    const received: QueryStreamEvent[] = [];
    let completed = false;
    service.ask('doc-1', 'q').subscribe({
      next: (event) => received.push(event),
      complete: () => (completed = true),
    });
    const source = FakeEventSource.instances[0];

    source.onerror?.();

    expect(received).toEqual([
      { type: 'error', data: { message: 'Lost connection to the server. Please try again.' } },
    ]);
    expect(completed).toBe(true);
  });

  it('removes all listeners and closes the connection on unsubscribe', () => {
    const service = makeService();
    const sub = service.ask('doc-1', 'q').subscribe();
    const source = FakeEventSource.instances[0];

    sub.unsubscribe();

    expect(source.closed).toBe(true);
  });
});
