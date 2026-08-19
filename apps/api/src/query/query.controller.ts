import { Controller, MessageEvent, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { QueryService } from './query.service';
import { QueryDto } from './dto/query.dto';

@Controller('api/query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  /**
   * GET, not POST — `EventSource`, the browser API for consuming SSE, can
   * only issue GET requests. The question and documentId travel as query
   * params instead of a body as a direct consequence of that constraint.
   */
  @Sse('stream')
  stream(@Query() dto: QueryDto): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let closed = false;

      this.queryService
        .run(dto, (event) => {
          if (closed) return;
          subscriber.next({ type: event.type, data: event.data });
        })
        .then(() => {
          if (!closed) subscriber.complete();
        })
        .catch((err: Error) => {
          // query.service.run() is documented to catch every failure path
          // itself and resolve after emitting an `error` event — this
          // .catch() is a defensive backstop only, in case a future change
          // to that contract lets something throw instead.
          if (!closed) subscriber.error(err);
        });

      return () => {
        closed = true;
      };
    });
  }
}
