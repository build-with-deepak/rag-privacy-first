export class ScenarioCatalogDto {
  key!: string;
  name!: string;
  description!: string;
  suggestedQuestions!: string[];
  /** Full document text — lets the preview modal show it before ingestion. */
  text!: string;
}
