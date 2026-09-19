import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DocumentResponse, ScenarioCatalogItem, ScenarioKey } from './models';

@Injectable({ providedIn: 'root' })
export class ScenariosService {
  private readonly http = inject(HttpClient);

  /** Full text + suggested questions for all 3 scenarios — no ingestion, cheap to call on load. */
  async getScenarios(): Promise<ScenarioCatalogItem[]> {
    return firstValueFrom(this.http.get<ScenarioCatalogItem[]>('/api/documents/scenarios'));
  }

  async ingestScenario(key: ScenarioKey): Promise<DocumentResponse> {
    return firstValueFrom(
      this.http.post<DocumentResponse>(`/api/documents/scenario/${key}`, {}),
    );
  }
}
