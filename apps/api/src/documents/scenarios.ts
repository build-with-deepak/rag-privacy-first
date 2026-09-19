export type ScenarioKey = 'logistics' | 'real-estate' | 'finance';

/**
 * The three seeded business documents, in place of the single hardcoded
 * sample. Static data only — no runtime logic beyond lookup, so this file
 * has nothing that can drift out of sync with itself.
 */
export interface ScenarioDefinition {
  key: ScenarioKey;
  /** Fixed ID so repeat visitors hit the same, already-embedded document. */
  documentId: string;
  /** Filename under apps/api/assets/. */
  assetFile: string;
  /** Display name for the document panel and the chat header. */
  name: string;
  /** One-liner for the scenario picker card. */
  description: string;
  suggestedQuestions: string[];
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    key: 'logistics',
    documentId: 'scenario-logistics',
    assetFile: 'scenario-logistics.txt',
    name: 'Dubai Logistics Co. — Operations Handbook',
    description:
      'Shipping SOPs, warehouse capacity rules, delivery SLAs, and customer escalation policy for a UAE freight and last-mile delivery company.',
    suggestedQuestions: [
      'What is the SLA for a delayed international shipment?',
      'What should the operations team do when a shipment misses its delivery window?',
      'What is required to file a damage claim, and who processes it?',
    ],
  },
  {
    key: 'real-estate',
    documentId: 'scenario-real-estate',
    assetFile: 'scenario-real-estate.txt',
    name: 'Metro Properties — Property Operations Handbook',
    description:
      'Maintenance escalation process, approved vendor list, and building policies for a Dubai residential and mixed-use property manager.',
    suggestedQuestions: [
      'What is the process for a maintenance escalation?',
      'Which vendor handles an HVAC emergency, and how fast will they respond?',
      'What happens if a maintenance vendor misses its response-time commitment?',
    ],
  },
  {
    key: 'finance',
    documentId: 'scenario-finance',
    assetFile: 'scenario-finance.txt',
    name: 'Gulf Business Services — Financial Operations Handbook',
    description:
      'Expense reimbursement rules, approval thresholds, and vendor procurement controls for a UAE outsourced finance and back-office provider.',
    suggestedQuestions: [
      'Can a client entertainment expense be reimbursed without extra approval?',
      'What is the approval chain for a purchase above AED 10,000?',
      'What has to happen before a new vendor can be paid?',
    ],
  },
];

export function getScenario(key: string): ScenarioDefinition | undefined {
  return SCENARIOS.find((scenario) => scenario.key === key);
}
