import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { QueryService } from '../../core/query.service';
import { RetrievedChunk, SAMPLE_DOCUMENT_ID } from '../../core/models';

/**
 * Worded to require synthesis across more than one section of the sample
 * document (see apps/api/assets/sample-document.txt) — a single-fact lookup
 * wouldn't demonstrate retrieval the way a question spanning two sections
 * does, since the model has to draw on several of the four retrieved chunks
 * at once rather than restate the one passage that happens to match.
 */
const EXAMPLE_PROMPTS = [
  'What problem does RAG solve, and how do citations make its answers trustworthy?',
  "Why would a bank or hospital run the model locally instead of calling a cloud API, and what's the trade-off?",
  'How do chunking and retrieval work together, and why does chunk overlap matter?',
];

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnDestroy {
  private readonly queryService = inject(QueryService);
  private subscription: Subscription | undefined;

  readonly documentId = input.required<string>();
  readonly documentName = input<string | undefined>(undefined);

  /** The guided prompts are worded against the sample document's content —
   * only shown when that's what's actually loaded, so they don't mislead a
   * visitor who uploaded their own PDF. */
  readonly isSampleDocument = computed(() => this.documentId() === SAMPLE_DOCUMENT_ID);
  readonly examplePrompts = EXAMPLE_PROMPTS;

  readonly question = signal('');
  readonly isStreaming = signal(false);
  readonly queuePosition = signal<number | null>(null);
  readonly chunks = signal<RetrievedChunk[]>([]);
  readonly retrievalMs = signal<number | null>(null);
  readonly generationMs = signal<number | null>(null);
  readonly totalMs = signal<number | null>(null);
  readonly answer = signal('');
  readonly errorMessage = signal<string | null>(null);

  /**
   * A single, always-current phrase describing what's happening right now.
   * The retrieval and answer panels already show real results as they
   * arrive, but there is a real gap between "you clicked Ask" and "the
   * first passage shows up" — often a second or two against a self-hosted
   * model — where nothing on screen said anything was happening at all.
   * This fills that gap with the truth: which stage is running, not a
   * generic spinner.
   */
  readonly statusMessage = computed(() => {
    if (!this.isStreaming()) return null;
    if (this.queuePosition() !== null) return null; // the queue banner covers this case
    if (this.chunks().length === 0) return 'Searching the document for relevant passages…';
    if (!this.answer()) return 'Found the relevant passages — asking the model to answer…';
    return null; // the streaming answer itself is now the visible progress
  });

  /** Populates the input and runs it in one click — no typing required for a first-time visitor. */
  askExample(prompt: string): void {
    if (this.isStreaming()) return;
    this.question.set(prompt);
    this.ask();
  }

  ask(): void {
    const question = this.question().trim();
    if (!question || this.isStreaming()) return;

    this.subscription?.unsubscribe();
    this.queuePosition.set(null);
    this.chunks.set([]);
    this.retrievalMs.set(null);
    this.generationMs.set(null);
    this.totalMs.set(null);
    this.answer.set('');
    this.errorMessage.set(null);
    this.isStreaming.set(true);

    this.subscription = this.queryService.ask(this.documentId(), question).subscribe({
      next: (event) => {
        switch (event.type) {
          case 'queue':
            this.queuePosition.set(event.data.position);
            break;
          case 'retrieval':
            this.queuePosition.set(null);
            this.chunks.set(event.data.chunks);
            this.retrievalMs.set(event.data.retrievalMs);
            break;
          case 'token':
            this.answer.update((text) => text + event.data.text);
            break;
          case 'done':
            this.generationMs.set(event.data.generationMs);
            this.totalMs.set(event.data.totalMs);
            break;
          case 'error':
            this.errorMessage.set(event.data.message);
            break;
        }
      },
      complete: () => this.isStreaming.set(false),
    });
  }

  formatScore(score: number): string {
    return (score * 100).toFixed(1) + '%';
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
