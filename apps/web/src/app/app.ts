import { Component, inject, signal } from '@angular/core';
import { AuthService } from './core/auth.service';
import { ChatComponent } from './features/chat/chat.component';
import { DocumentUploadComponent } from './features/document-upload/document-upload.component';
import { LoginComponent } from './features/login/login.component';
import { DocumentResponse } from './core/models';

@Component({
  selector: 'app-root',
  imports: [DocumentUploadComponent, ChatComponent, LoginComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly auth = inject(AuthService);
  readonly document = signal<DocumentResponse | null>(null);

  onIngested(doc: DocumentResponse): void {
    this.document.set(doc);
  }

  reset(): void {
    this.document.set(null);
  }

  logout(): void {
    this.auth.logout();
    this.document.set(null);
  }
}
