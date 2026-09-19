/** Mirrors the API's DTOs — kept as plain interfaces rather than a shared
 * package, since a two-app demo isn't worth a monorepo shared-types library. */

/* The old DemoSession type lived here. Sessions now come from the
 * identity service and are described in session.models.ts. */

export interface DocumentResponse {
  documentId: string;
  chunkCount: number;
  /** Display name of the ingested document — the uploaded filename, or the sample's label. */
  originalName?: string;
  /** ISO 8601 */
  expiresAt: string;
}

/** Mirrors the API's fixed sample document ID — used to decide whether to show the
 * guided example prompts, which are worded against that specific document's content. */
export const SAMPLE_DOCUMENT_ID = 'sample-document';

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
