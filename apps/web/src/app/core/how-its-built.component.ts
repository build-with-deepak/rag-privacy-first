import { Component, signal } from '@angular/core';

/**
 * Collapsed-by-default depth for engineering managers, kept out of the
 * recruiter's critical path (upload → ask → see citations). Content mirrors
 * what's actually in this repo's package.json and source — not an
 * idealized stack description — so it holds up if someone checks.
 */
@Component({
  selector: 'app-how-its-built',
  template: `
    <section class="built-panel">
      <button
        class="built-toggle"
        type="button"
        (click)="expanded.set(!expanded())"
        [attr.aria-expanded]="expanded()"
      >
        <span>How this is built</span>
        <span class="chevron" [class.open]="expanded()" aria-hidden="true">▾</span>
      </button>

      @if (expanded()) {
        <div class="built-body">
          <div class="built-block">
            <h3>Stack</h3>
            <p>
              Angular 21 (standalone components, signals, no NgRx) talking to a NestJS 11 API
              over SSE for streamed answers. Qdrant is the vector store; Ollama serves both the
              embedding model (<code>nomic-embed-text</code>) and the generation model
              (<code>llama3:8b</code>) — no OpenAI, no Anthropic, no cloud model API anywhere in
              the request path. Demo sessions are short-lived JWTs; documents are chunked by word
              count and embedded with sequential (not parallel) calls against the single local
              Ollama instance.
            </p>
          </div>

          <div class="built-block">
            <h3>The key decision</h3>
            <p>
              Self-hosted inference instead of a cloud API. The entire point of this demo is
              proving a RAG pipeline can run somewhere a bank, hospital or government agency's
              documents are actually allowed to go — their own infrastructure, not a third
              party's. That constraint shapes everything downstream: a hard concurrency cap on
              generations (one Ollama process, not elastic cloud capacity), sequential embedding
              calls instead of fan-out, and a bounded, visible request queue instead of unlimited
              concurrent traffic.
            </p>
          </div>

          <div class="built-block">
            <h3>The honest trade-off</h3>
            <p>
              A locally-hosted 8B model is slower and less capable than GPT-4-class cloud models,
              and chunking by word count (not a real tokenizer) is an approximation of the
              embedding model's actual token boundaries. Both are deliberate: shipping a
              tokenizer's vocabulary file just to cut text into pieces would make this service
              dependency-heavy for marginal accuracy gain, and a smaller local model is the
              correct price to pay for the guarantee that matters here — nothing leaves the
              server. At real scale, that trade-off would be revisited with a dedicated
              inference-serving layer (vLLM, TGI) rather than a single Ollama process.
            </p>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .built-panel {
      max-width: 40rem;
      width: 100%;
      margin: 2rem auto 0;
      border: 1px solid var(--border);
      border-radius: 1rem;
      background: var(--surface);
      overflow: hidden;
    }

    .built-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: none;
      border: none;
      color: var(--text);
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;

      &:hover {
        color: var(--accent);
      }
    }

    .chevron {
      transition: transform 0.15s ease;
      color: var(--text-muted);

      &.open {
        transform: rotate(180deg);
      }
    }

    .built-body {
      padding: 0 1.25rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      border-top: 1px solid var(--border);
    }

    .built-block {
      padding-top: 1.1rem;

      h3 {
        margin: 0 0 0.5rem;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--accent);
      }

      p {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.6;
        color: var(--text-muted);
      }

      code {
        font-family: ui-monospace, monospace;
        font-size: 0.8em;
        color: var(--text);
        background: var(--surface-raised);
        padding: 0.1rem 0.35rem;
        border-radius: 0.35rem;
      }
    }
  `,
})
export class HowItsBuiltComponent {
  readonly expanded = signal(false);
}
