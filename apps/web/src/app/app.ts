import { Component, inject, signal } from '@angular/core';
import { AuthService } from './core/auth.service';
import { AuthPanelComponent } from './core/auth-panel.component';
import { DemoFooterComponent } from './core/demo-footer.component';
import { DemoHeaderComponent } from './core/demo-header.component';
import { HowItsBuiltComponent } from './core/how-its-built.component';
import { ChatComponent } from './features/chat/chat.component';
import { DocumentUploadComponent } from './features/document-upload/document-upload.component';
import { DemoGuideComponent } from './core/demo-guide.component';
import { DocumentResponse } from './core/models';

@Component({
  selector: 'app-root',
  imports: [
    DocumentUploadComponent,
    ChatComponent,
    AuthPanelComponent,
    DemoFooterComponent,
    DemoHeaderComponent,
    HowItsBuiltComponent,
    DemoGuideComponent,
  ],
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
