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
        <div class="identity">
          <a class="topbar-logo" href="https://build-with-deepak.com" target="_blank" rel="noopener" aria-label="build-with-deepak.com home">
            <img src="/build-with-light.png" alt="build-with-deepak.com" />
          </a>
          <a class="identity-text" href="https://build-with-deepak.com" target="_blank" rel="noopener">
            <span class="name">Deepak Kumar Jha</span>
            <span class="role">Technical Lead · Senior Node.js Engineer</span>
          </a>
        </div>

        <div class="actions">
          <a
            class="cv-button"
            href="https://build-with-deepak.com/Deepak_Kumar_Jha_Technical_Lead.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download CV
          </a>
          <a class="profile-link" href="https://www.linkedin.com/in/build-with-deepak/" target="_blank" rel="noopener me">
            LinkedIn
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
      max-width: 64rem;
      margin: 0 auto;
      padding: 0.75rem 1.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
    }

    /*
     * Logo chip + name/title, identical markup and sizing to the other two
     * demo apps and to build-with-deepak.com's own header. The light backing
     * chip exists because build-with-light.png is drawn for a light
     * background and this app is dark-themed with no light-mode toggle.
     */
    .identity {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .topbar-logo {
      display: inline-flex;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.25rem 0.5rem;

      img {
        height: 1.5rem;
        width: auto;
        display: block;
      }

      &:hover {
        border-color: var(--accent);
      }
    }

    .identity-text {
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
      font-weight: 800;
      color: var(--text);
      transition: color 0.15s ease;
      white-space: nowrap;
    }

    .role {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      flex-wrap: wrap;
    }

    .cv-button {
      padding: 0.45rem 0.9rem;
      border-radius: 0.6rem;
      background: var(--accent);
      color: white;
      font-weight: 700;
      font-size: 0.8125rem;
      text-decoration: none;
      white-space: nowrap;

      &:hover {
        opacity: 0.92;
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
