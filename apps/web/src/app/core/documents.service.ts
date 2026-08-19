import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DocumentResponse } from './models';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly http = inject(HttpClient);

  async uploadPdf(file: File): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post<DocumentResponse>('/api/documents', formData));
  }

  async useSample(): Promise<DocumentResponse> {
    return firstValueFrom(this.http.post<DocumentResponse>('/api/documents/sample', {}));
  }
}
