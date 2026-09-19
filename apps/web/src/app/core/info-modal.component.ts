import { Component, HostListener, input, output } from '@angular/core';

/**
 * A generic modal shell — title, close button, projected body content.
 *
 * Styled with its own scoped styles that consume the shared --bwd-* tokens
 * rather than adding classes to bwd-design-system.css: that file is a
 * byte-identical copy from build-with-deepak.com (see its own header
 * comment), and a modal is only needed here and in the Agent app, not on
 * the marketing site or the Router demo — hand-editing the shared file for
 * a need two of four apps have would be exactly the kind of drift it
 * exists to prevent.
 */
@Component({
  selector: 'app-info-modal',
  standalone: true,
  template: `
    @if (open()) {
      <div class="modal-backdrop" (click)="closed.emit()">
        <div
          class="modal-panel"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          (click)="$event.stopPropagation()"
        >
          <header class="modal-head">
            <h2>{{ title() }}</h2>
            <button type="button" class="modal-close" (click)="closed.emit()" aria-label="Close">
              &times;
            </button>
          </header>
          <div class="modal-body">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 4rem 1.25rem;
      background: rgba(15, 23, 42, 0.45);
      overflow-y: auto;
    }

    .modal-panel {
      width: 100%;
      max-width: 42rem;
      max-height: calc(100vh - 8rem);
      display: flex;
      flex-direction: column;
      background: var(--bwd-raised);
      border: 1px solid var(--bwd-border);
      border-radius: var(--bwd-radius-lg);
      box-shadow: var(--bwd-shadow-lift);
    }

    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--bwd-border);
      flex-shrink: 0;
    }

    .modal-head h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: var(--bwd-ink);
    }

    .modal-close {
      flex-shrink: 0;
      width: 2rem;
      height: 2rem;
      border-radius: 0.5rem;
      border: none;
      background: none;
      color: var(--bwd-muted);
      font-size: 1.4rem;
      line-height: 1;
      cursor: pointer;
    }

    .modal-close:hover {
      background: var(--bwd-sunken);
      color: var(--bwd-ink);
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
    }
  `,
})
export class InfoModalComponent {
  readonly title = input.required<string>();
  readonly open = input.required<boolean>();
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}
