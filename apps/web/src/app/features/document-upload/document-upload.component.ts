import { Component, inject, output, signal } from '@angular/core';
import { DocumentsService } from '../../core/documents.service';
import { DocumentResponse } from '../../core/models';

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

@Component({
  selector: 'app-document-upload',
  templateUrl: './document-upload.component.html',
  styleUrl: './document-upload.component.scss',
})
export class DocumentUploadComponent {
  private readonly documents = inject(DocumentsService);

  readonly ingested = output<DocumentResponse>();

  readonly isDragging = signal(false);
  readonly isUploading = signal(false);
  readonly error = signal<string | null>(null);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.handleFile(file);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void this.handleFile(file);
  }

  async useSample(): Promise<void> {
    this.error.set(null);
    this.isUploading.set(true);
    try {
      const result = await this.documents.useSample();
      this.ingested.emit(result);
    } catch (err) {
      this.error.set(this.extractMessage(err));
    } finally {
      this.isUploading.set(false);
    }
  }

  private async handleFile(file: File): Promise<void> {
    this.error.set(null);

    if (file.type !== 'application/pdf') {
      this.error.set('Only PDF files are accepted.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      this.error.set(`File exceeds the ${MAX_SIZE_BYTES / (1024 * 1024)}MB limit.`);
      return;
    }

    this.isUploading.set(true);
    try {
      const result = await this.documents.uploadPdf(file);
      this.ingested.emit(result);
    } catch (err) {
      this.error.set(this.extractMessage(err));
    } finally {
      this.isUploading.set(false);
    }
  }

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { message?: string | string[] } }).error;
      const message = body?.message;
      if (Array.isArray(message)) return message.join(' ');
      if (typeof message === 'string') return message;
    }
    return 'Something went wrong uploading this document. Please try again.';
  }
}
