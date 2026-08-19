/** Mirrors the API's DTOs — kept as plain interfaces rather than a shared
 * package, since a two-app demo isn't worth a monorepo shared-types library. */

export interface DemoSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: { id: string; name: string; kind: 'demo' };
}

export interface DocumentResponse {
  documentId: string;
  chunkCount: number;
  /** ISO 8601 */
  expiresAt: string;
}

export interface RetrievedChunk {
  chunkIndex: number;
  text: string;
  /** Cosine similarity, 0–1 */
  score: number;
}

export interface RetrievalEventData {
  chunks: RetrievedChunk[];
  retrievalMs: number;
}

export interface QueueEventData {
  position: number;
}

export interface DoneEventData {
  generationMs: number;
  totalMs: number;
}

export interface ErrorEventData {
  message: string;
}
