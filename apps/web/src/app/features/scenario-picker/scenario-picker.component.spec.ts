import { TestBed } from '@angular/core/testing';
import { ScenarioPickerComponent } from './scenario-picker.component';
import { ScenariosService } from '../../core/scenarios.service';
import { DocumentResponse, ScenarioCatalogItem } from '../../core/models';

const CATALOG: ScenarioCatalogItem[] = [
  {
    key: 'logistics',
    name: 'Dubai Logistics Co. — Operations Handbook',
    description: 'Shipping SOPs and delivery SLAs.',
    suggestedQuestions: ['What is the SLA for a delayed shipment?'],
    text: 'SECTION 1: ...',
  },
  {
    key: 'real-estate',
    name: 'Metro Properties — Property Operations Handbook',
    description: 'Maintenance escalation and vendor list.',
    suggestedQuestions: ['What is the process for a maintenance escalation?'],
    text: 'SECTION 1: ...',
  },
  {
    key: 'finance',
    name: 'Gulf Business Services — Financial Operations Handbook',
    description: 'Expense and procurement policy.',
    suggestedQuestions: ['What is the approval chain above AED 10,000?'],
    text: 'SECTION 1: ...',
  },
];

describe('ScenarioPickerComponent', () => {
  let getScenarios: ReturnType<typeof vi.fn>;
  let ingestScenario: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getScenarios = vi.fn().mockResolvedValue(CATALOG);
    ingestScenario = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ScenarioPickerComponent],
      providers: [{ provide: ScenariosService, useValue: { getScenarios, ingestScenario } }],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(ScenarioPickerComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads and renders all 3 scenario cards', async () => {
    const fixture = create();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const titles = Array.from(host.querySelectorAll('.bwd-card-title')).map(
      (el) => el.textContent,
    );

    expect(titles).toEqual(CATALOG.map((scenario) => scenario.name));
  });

  it('ingests the chosen scenario and emits the document plus its suggested questions', async () => {
    const response: DocumentResponse = {
      documentId: 'scenario-logistics',
      chunkCount: 12,
      expiresAt: new Date().toISOString(),
    };
    ingestScenario.mockResolvedValue(response);

    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const emitted: { document: DocumentResponse; suggestedQuestions: string[] }[] = [];
    component.selected.subscribe((selection) => emitted.push(selection));

    await component.use('logistics');

    expect(ingestScenario).toHaveBeenCalledWith('logistics');
    expect(emitted).toEqual([
      { document: response, suggestedQuestions: CATALOG[0].suggestedQuestions },
    ]);
  });

  it('opens the preview modal with the scenario text and suggested questions', async () => {
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    component.preview('finance');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.textContent).toContain('What is the approval chain above AED 10,000?');
  });

  it('surfaces an error if the catalog fails to load', async () => {
    getScenarios.mockRejectedValue(new Error('network error'));

    const fixture = create();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toContain('Could not load');
  });
});
