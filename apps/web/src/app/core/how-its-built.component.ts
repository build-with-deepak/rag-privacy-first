import { Component } from '@angular/core';

/**
 * Points at the detailed architecture writeup on build-with-deepak.com
 * instead of duplicating it in an in-page accordion — the stack, key
 * decisions and trade-offs live in one place (the systems page this repo
 * feeds) rather than three slightly-drifting copies across the suite.
 */
@Component({
  selector: 'app-how-its-built',
  template: `
    <section class="built-cta">
      <div>
        <p class="built-cta-title">Curious how this is built?</p>
        <p class="built-cta-copy">
          Stack, key decisions and trade-offs are written up in full on the detailed
          architecture page.
        </p>
      </div>
      <a class="bwd-btn bwd-btn--primary" href="https://build-with-deepak.com/rag#architecture" target="_blank" rel="noopener">
        See the full architecture →
      </a>
    </section>
  `,
  styles: `
    .built-cta {
      max-width: 76rem;
      width: 100%;
      margin: 2rem auto 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      flex-wrap: wrap;
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.1rem 1.25rem;
      background: var(--surface);
    }

    .built-cta-title {
      margin: 0 0 0.3rem;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text);
    }

    .built-cta-copy {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.55;
      color: var(--text-muted);
      max-width: 32rem;
    }
  `,
})
export class HowItsBuiltComponent {}
