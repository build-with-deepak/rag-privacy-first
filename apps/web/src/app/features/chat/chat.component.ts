import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { QueryService } from '../../core/query.service';
import { RetrievedChunk } from '../../core/models';

interface ProgressStep {
  label: string;
  meta: string | null;
  state: 'pending' | 'active' | 'done';
}

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

  /** Worded by the active scenario's own content — empty for a visitor's
   * own PDF upload, since a scenario's suggested question wouldn't
   * necessarily have an answer in someone else's document. */
  readonly examplePrompts = input<string[]>([]);

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
   * The real stages of a request, in order, each shown as its own line that
   * stays visible (with a checkmark and, once known, real timing) rather
   * than being replaced by the next stage's text. There is a real gap
   * between "you clicked Ask" and "the first passage shows up" — often a
   * second or two against a self-hosted model — where nothing on screen
   * said anything was happening at all; this fills that gap with the
   * truth about which stage is running, built from the same `retrieval`
   * event data the retrieval panel below already renders.
   */
  readonly progressSteps = computed<ProgressStep[]>(() => {
    if (!this.isStreaming() || this.queuePosition() !== null) return [];
    const chunkCount = this.chunks().length;
    const hasChunks = chunkCount > 0;
    const hasAnswer = this.answer().length > 0;
    return [
      {
        label: 'Searching the document',
        meta: hasChunks
          ? `found ${chunkCount} passage${chunkCount === 1 ? '' : 's'} in ${this.retrievalMs()}ms`
          : null,
        state: hasChunks ? 'done' : 'active',
      },
      {
        label: 'Generating the answer',
        meta: null,
        state: hasAnswer ? 'done' : hasChunks ? 'active' : 'pending',
      },
    ];
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
