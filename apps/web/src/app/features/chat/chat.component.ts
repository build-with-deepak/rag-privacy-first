import { Component, OnDestroy, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { QueryService } from '../../core/query.service';
import { RetrievedChunk } from '../../core/models';

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

  readonly question = signal('');
  readonly isStreaming = signal(false);
  readonly queuePosition = signal<number | null>(null);
  readonly chunks = signal<RetrievedChunk[]>([]);
  readonly retrievalMs = signal<number | null>(null);
  readonly generationMs = signal<number | null>(null);
  readonly totalMs = signal<number | null>(null);
  readonly answer = signal('');
  readonly errorMessage = signal<string | null>(null);

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
