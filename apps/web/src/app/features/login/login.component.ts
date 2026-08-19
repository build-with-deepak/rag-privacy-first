import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  readonly isLoggingIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly showRegisterModal = signal(false);

  async demoLogin(): Promise<void> {
    this.error.set(null);
    this.isLoggingIn.set(true);
    try {
      await this.auth.demoLogin();
      // No navigation needed — the App component reacts to the auth signal.
    } catch {
      this.error.set('Could not start a demo session — please try again.');
    } finally {
      this.isLoggingIn.set(false);
    }
  }
}
