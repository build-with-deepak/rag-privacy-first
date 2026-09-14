import { Component } from '@angular/core';

/**
 * The utility bar every page in this app renders above everything else,
 * including the login screen.
 *
 * This demo's entire purpose is to convert an anonymous visitor into
 * someone who knows Deepak Kumar Jha exists and can reach him — so the path
 * back to his CV and profile has to survive no matter which screen the
 * visitor lands on (pre-login hero, mid-upload, or deep in a chat answer).
 * A slim top bar, rather than folding this into the page hero, is what lets
 * it stay present on every one of those screens without competing with the
 * login card's own centered brand statement.
 */
@Component({
  selector: 'app-site-header',
  template: `
    <header class="site-header">
      <div class="site-header-inner">
        <a class="identity" href="https://build-with-deepak.com" target="_blank" rel="noopener">
          <span class="name">Deepak Kumar Jha</span>
          <span class="role">Technical Lead · Senior Node.js Engineer</span>
        </a>

        <div class="actions">
          <a
            class="cv-button"
            href="https://build-with-deepak.com/Deepak_Kumar_Jha_Technical_Lead.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download CV
          </a>
          <a class="profile-link" href="https://build-with-deepak.com" target="_blank" rel="noopener">
            Full Profile <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </header>
  `,
  styles: `
    .site-header {
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .site-header-inner {
      max-width: 56rem;
      margin: 0 auto;
      padding: 0.85rem 1.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
    }

    .identity {
      display: flex;
      flex-direction: column;
      text-decoration: none;
      line-height: 1.3;

      &:hover .name {
        color: var(--accent);
      }
    }

    .name {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--text);
      transition: color 0.15s ease;
    }

    .role {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 1.1rem;
      flex-wrap: wrap;
    }

    .cv-button {
      padding: 0.5rem 1rem;
      border-radius: 999px;
      background: var(--accent);
      color: white;
      font-weight: 600;
      font-size: 0.8125rem;
      text-decoration: none;
      white-space: nowrap;

      &:hover {
        opacity: 0.9;
      }
    }

    .profile-link {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
      white-space: nowrap;

      &:hover {
        color: var(--text);
      }
    }
  `,
})
export class SiteHeaderComponent {}
