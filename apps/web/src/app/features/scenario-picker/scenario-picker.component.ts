import { Component, OnInit, inject, output, signal } from '@angular/core';
import { InfoModalComponent } from '../../core/info-modal.component';
import { DocumentResponse, ScenarioCatalogItem, ScenarioKey } from '../../core/models';
import { ScenariosService } from '../../core/scenarios.service';

export interface ScenarioSelection {
  document: DocumentResponse;
  suggestedQuestions: string[];
}

/** Emoji glyph per scenario — a fast visual anchor across 3 cards, same
 * fallback-to-generic pattern as the Agent demo's per-tool icons. */
const SCENARIO_ICONS: Record<ScenarioKey, string> = {
  logistics: '🚚',
  'real-estate': '🏢',
  finance: '💳',
};

@Component({
  selector: 'app-scenario-picker',
  imports: [InfoModalComponent],
  templateUrl: './scenario-picker.component.html',
  styleUrl: './scenario-picker.component.scss',
})
export class ScenarioPickerComponent implements OnInit {
  private readonly scenariosService = inject(ScenariosService);

  readonly icons = SCENARIO_ICONS;
  readonly scenarios = signal<ScenarioCatalogItem[]>([]);
  readonly loadingCatalog = signal(true);
  readonly ingestingKey = signal<ScenarioKey | null>(null);
  readonly previewKey = signal<ScenarioKey | null>(null);
  readonly error = signal<string | null>(null);

  readonly selected = output<ScenarioSelection>();

  async ngOnInit(): Promise<void> {
    try {
      this.scenarios.set(await this.scenariosService.getScenarios());
    } catch {
      this.error.set('Could not load the scenarios. Refresh to try again.');
    } finally {
      this.loadingCatalog.set(false);
    }
  }

  preview(key: ScenarioKey): void {
    this.previewKey.set(key);
  }

  closePreview(): void {
    this.previewKey.set(null);
  }

  previewScenario(): ScenarioCatalogItem | undefined {
    return this.scenarios().find((scenario) => scenario.key === this.previewKey());
  }

  async use(key: ScenarioKey): Promise<void> {
    if (this.ingestingKey()) return;
    this.error.set(null);
    this.ingestingKey.set(key);
    try {
      const document = await this.scenariosService.ingestScenario(key);
      const suggestedQuestions =
        this.scenarios().find((scenario) => scenario.key === key)?.suggestedQuestions ?? [];
      this.selected.emit({ document, suggestedQuestions });
    } catch {
      this.error.set('Could not load this scenario. Please try again.');
    } finally {
      this.ingestingKey.set(null);
    }
  }
}
