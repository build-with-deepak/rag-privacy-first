import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import {
  DoneEventData,
  ErrorEventData,
  QueueEventData,
  RetrievalEventData,
} from './models';

export type QueryStreamEvent =
  | { type: 'queue'; data: QueueEventData }
  | { type: 'retrieval'; data: RetrievalEventData }
  | { type: 'token'; data: { text: string } }
  | { type: 'done'; data: DoneEventData }
  | { type: 'error'; data: ErrorEventData };

const EVENT_TYPES: QueryStreamEvent['type'][] = ['queue', 'retrieval', 'token', 'done', 'error'];

/**
 * Wraps the browser's `EventSource` — the only fetch-like API that speaks
 * SSE — in an Observable so the chat component can `subscribe()` once and
 * switch on `.type` like any other typed stream, instead of juggling five
 * separate `addEventListener` callbacks itself.
 */
@Injectable({ providedIn: 'root' })
export class QueryService {
  private readonly auth = inject(AuthService);

  ask(documentId: string, question: string): Observable<QueryStreamEvent> {
    return new Observable<QueryStreamEvent>((subscriber) => {
      // The session token rides as a query param because EventSource cannot
      // set an Authorization header — the API's guard accepts ?token= for
      // exactly this consumer.
      const params = new URLSearchParams({
        documentId,
        question,
        token: this.auth.token ?? '',
      });
      const source = new EventSource(`/api/query/stream?${params.toString()}`);

      const listeners = EVENT_TYPES.map((type) => {
        const listener = (event: MessageEvent<string>) => {
          const data: unknown = JSON.parse(event.data);
          subscriber.next({ type, data } as QueryStreamEvent);
          if (type === 'done' || type === 'error') {
            subscriber.complete();
          }
        };
        source.addEventListener(type, listener);
        return { type, listener };
      });

      // A native connection-level failure (server unreachable, connection
      // dropped mid-stream) — distinct from a well-formed `error` SSE event,
      // which is handled above and means the server told us something went
      // wrong, not that the connection itself broke.
      source.onerror = () => {
        subscriber.next({
          type: 'error',
          data: { message: 'Lost connection to the server. Please try again.' },
        });
        subscriber.complete();
      };

      return () => {
        listeners.forEach(({ type, listener }) => source.removeEventListener(type, listener));
        source.close();
      };
    });
  }
}
