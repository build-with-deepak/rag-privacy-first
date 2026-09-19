import { Component, input, signal } from '@angular/core';

/**
 * "What to expect" — the panel this demo was missing.
 *
 * Before this, a visitor landed on an upload box with no explanation of
 * what would happen, what account they were using, or how to check that
 * an answer was actually grounded rather than made up. This panel answers
 * all three, and does it in the working area itself rather than on a
 * marketing page — it has to be seen at the moment someone is about to
 * use the demo, not three clicks earlier.
 *
 * The sample document text is reproduced here in full, verbatim from
 * `apps/api/assets/sample-document.txt`. Showing the actual source is
 * what turns "trust the demo" into "check the demo": ask a suggested
 * question, then scroll down here and confirm the answer really is in
 * the text, rather than taking the citation on faith.
 */
@Component({
  selector: 'app-demo-guide',
  standalone: true,
  template: `
    <aside class="guide">
      <section class="guide-block">
        <p class="guide-eyebrow">How to try this demo</p>
        <ol class="guide-steps">
          <li>
            <span class="step-num">1</span>
            <div>
              <strong>Use the sample document</strong>
              <p>Loaded instantly — no upload needed. The text is reproduced below so you can check every answer against it.</p>
            </div>
          </li>
          <li>
            <span class="step-num">2</span>
            <div>
              <strong>Ask a suggested question</strong>
              <p>Or your own — but the suggestions are guaranteed to have a real answer in the text.</p>
            </div>
          </li>
          <li>
            <span class="step-num">3</span>
            <div>
              <strong>Check the retrieved passages</strong>
              <p>Every answer shows the exact source chunks it was built from, with a similarity score — not a description of what happened, the actual evidence.</p>
            </div>
          </li>
        </ol>
      </section>

      @if (showRegisterNote()) {
        <section class="guide-block guide-register">
          <p class="guide-eyebrow">Want to use your own document?</p>
          <p class="guide-copy">
            The demo account you're using is shared and read-only, so it can't upload —
            that's what keeps the demo fast for everyone else trying it right now.
            <strong>Register a free account</strong> (one email, one code, no password) to
            upload your own PDF and ask questions against it instead.
          </p>
        </section>
      }

      <section class="guide-block">
        <button
          class="guide-toggle"
          type="button"
          (click)="docOpen.set(!docOpen())"
          [attr.aria-expanded]="docOpen()"
        >
          <span>{{ docOpen() ? 'Hide' : 'Read' }} the sample document</span>
          <span class="chevron" [class.open]="docOpen()" aria-hidden="true">▾</span>
        </button>

        @if (docOpen()) {
          <div class="sample-doc">
            <h2>An Introduction to Retrieval-Augmented Generation</h2>

            <h3>1. The problem RAG solves</h3>
            <p>
              Large language models are trained once, on a fixed snapshot of text, and then
              frozen. Ask one about something that happened after its training cutoff, or
              about a private document it has never seen, and it will either say it does not
              know or, worse, produce a fluent and completely wrong answer. This failure mode
              is usually called hallucination, and it is the single biggest obstacle to using
              language models for anything where being wrong has a cost.
            </p>
            <p>
              Retrieval-augmented generation, or RAG, is the standard architectural answer to
              that problem. Instead of asking the model to answer purely from what it
              memorized during training, a RAG system first retrieves the most relevant
              passages from an external knowledge source, then hands those passages to the
              model along with the question, and asks it to answer using only that retrieved
              context.
            </p>

            <h3>2. How retrieval works</h3>
            <p>
              The retrieval half of the system typically works through vector embeddings.
              Every passage of source text is converted into a high-dimensional numeric
              vector by an embedding model, chosen so that passages with similar meaning end
              up close together in that vector space, even if they do not share exact
              wording. This is semantic search: it matches on meaning rather than on keyword
              overlap. This demo retrieves the four nearest passages for every question and
              shows the similarity score for each one alongside the answer, so the match is
              never a black box.
            </p>

            <h3>3. Chunking and retrieval trade-offs</h3>
            <p>
              Source documents must be split into chunks small enough that each one embeds a
              single coherent idea, but large enough that a chunk is not so short it loses the
              surrounding context a citation needs to make sense. Chunks are usually given
              some overlap with their neighbors, so a sentence that happens to fall across a
              chunk boundary is not lost from every chunk it appears in.
            </p>

            <h3>4. Self-hosted vs. cloud inference</h3>
            <p>
              Sending retrieved passages and the user's question to a cloud API is the
              simplest option, but it means the source documents leave the organization's own
              infrastructure on every question asked. For regulated industries — banking,
              government, healthcare — that is frequently not permitted at all. Running the
              language model locally removes that constraint entirely, at the cost of typically
              slower, more resource-constrained inference — a hard cap on how many generations
              run at once, with everyone else waiting in a visible queue, rather than assuming
              unlimited compute the way a cloud API would allow.
            </p>

            <h3>5. Why citations matter</h3>
            <p>
              Because the system knows exactly which chunks were retrieved and handed to the
              model, it can map each claim in the generated answer back to the specific
              passage it came from. That traceability turns "the model said so" into "here is
              the exact sentence in the source document that supports this" — and it is the
              only way to tell a genuine retrieval from a hallucinated one.
            </p>
          </div>
        }
      </section>
    </aside>
  `,
  styles: `
    .guide {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .guide-block {
      padding: 1.1rem 1.25rem;
      border-radius: 1rem;
      border: 1px solid var(--border);
      background: var(--surface);
    }

    .guide-eyebrow {
      margin: 0 0 0.85rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
    }

    .guide-steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .guide-steps li {
      display: flex;
      gap: 0.7rem;
      align-items: flex-start;
    }

    .step-num {
      flex-shrink: 0;
      width: 1.4rem;
      height: 1.4rem;
      border-radius: 50%;
      background: var(--accent-bg);
      color: var(--accent);
      font-size: 0.72rem;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 0.1rem;
    }

    .guide-steps strong {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 0.15rem;
    }

    .guide-steps p {
      margin: 0;
      font-size: 0.78rem;
      line-height: 1.55;
      color: var(--text-muted);
    }

    .guide-register {
      border-color: var(--accent);
      background: var(--accent-bg);
    }

    .guide-register .guide-eyebrow { color: var(--text); }

    .guide-copy {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.6;
      color: var(--text);
    }

    .guide-copy strong { color: var(--accent); }

    .guide-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text);
      cursor: pointer;
    }

    .chevron {
      color: var(--text-muted);
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }
    .chevron.open { transform: rotate(180deg); }

    .sample-doc {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      max-height: 28rem;
      overflow-y: auto;
    }

    .sample-doc h2 {
      margin: 0 0 0.9rem;
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1.4;
    }

    .sample-doc h3 {
      margin: 1.1rem 0 0.4rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--accent);
    }

    .sample-doc h3:first-of-type { margin-top: 0; }

    .sample-doc p {
      margin: 0 0 0.6rem;
      font-size: 0.78rem;
      line-height: 1.65;
      color: var(--text-muted);
    }
  `,
})
export class DemoGuideComponent {
  /** Hidden once the visitor already holds an upload-capable account. */
  readonly showRegisterNote = input<boolean>(true);

  readonly docOpen = signal(false);
}
