export class DocumentResponseDto {
  documentId!: string;
  chunkCount!: number;
  /** ISO 8601 — when this document's vectors will be purged. */
  expiresAt!: string;
}
