/**
 * The SSE event vocabulary for /api/query/stream.
 *
 * Named events (not a single generic `message`) so the Angular client can
 * subscribe to each with `addEventListener` and render retrieval, tokens and
 * completion as distinct, independently-styled UI states instead of parsing
 * a `type` discriminator out of a single stream.
 */
export type QueryEventType = 'queue' | 'retrieval' | 'token' | 'done' | 'error';

export interface QueueEventData {
  position: number;
}

export interface RetrievedChunk {
  chunkIndex: number;
  text: string;
  /** Cosine similarity, 0–1 — shown on screen per requirement, not hidden in a log. */
  score: number;
}

export interface RetrievalEventData {
  chunks: RetrievedChunk[];
  retrievalMs: number;
}

export interface TokenEventData {
  text: string;
}

export interface DoneEventData {
  generationMs: number;
  totalMs: number;
}

export interface ErrorEventData {
  message: string;
}

export interface QueryEvent {
  type: QueryEventType;
  data:
    | QueueEventData
    | RetrievalEventData
    | TokenEventData
    | DoneEventData
    | ErrorEventData;
}
