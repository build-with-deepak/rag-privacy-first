export class DocumentResponseDto {
  documentId!: string;
  chunkCount!: number;
  /** Display name shown in the UI — the uploaded filename, or the scenario's name. */
  originalName?: string;
  /** ISO 8601 — when this document's vectors will be purged. */
  expiresAt!: string;
  /** Set only for seeded scenario documents, absent for uploads. */
  scenarioKey?: string;
  /** The scenario's one-line description, for display alongside the document. */
  description?: string;
}
