export class DocumentResponseDto {
  documentId!: string;
  chunkCount!: number;
  /** Display name shown in the UI — the uploaded filename, or the sample's label. */
  originalName?: string;
  /** ISO 8601 — when this document's vectors will be purged. */
  expiresAt!: string;
}
