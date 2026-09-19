import { Component, input } from '@angular/core';

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
 * The sample-document text used to be reproduced here in full. That's now
 * the scenario picker's "View document" modal instead — one document per
 * scenario means three, and three full documents permanently expanded in
 * this sidebar would push everything else below the fold.
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
              <strong>Pick a business scenario</strong>
              <p>Each one loads instantly — no upload needed. Open "View document" first if you want to read the source before asking anything.</p>
            </div>
          </li>
          <li>
            <span class="step-num">2</span>
            <div>
              <strong>Ask a suggested question</strong>
              <p>Or your own — but the suggestions are guaranteed to have a real answer in that scenario's document.</p>
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
  `,
})
export class DemoGuideComponent {
  /** Hidden once the visitor already holds an upload-capable account. */
  readonly showRegisterNote = input<boolean>(true);
}
