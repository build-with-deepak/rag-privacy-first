import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it('should create the app', async () => {
    await setup();
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the login card, not the upload flow, when signed out', async () => {
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-login')).toBeTruthy();
    expect(compiled.querySelector('app-document-upload')).toBeFalsy();
  });

  it('shows upload → chat once a session exists and a document is ingested', async () => {
    localStorage.setItem('rag_demo_token', 'header.payload.signature');
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-login')).toBeFalsy();
    expect(compiled.querySelector('app-document-upload')).toBeTruthy();
    expect(compiled.querySelector('app-chat')).toBeFalsy();
    expect(compiled.querySelector('h1')?.textContent).toContain('Nothing leaves this server');

    fixture.componentInstance.onIngested({
      documentId: 'doc-1',
      chunkCount: 3,
      expiresAt: new Date().toISOString(),
    });
    fixture.detectChanges();

    expect(compiled.querySelector('app-document-upload')).toBeFalsy();
    expect(compiled.querySelector('app-chat')).toBeTruthy();
  });

  it('signing out returns to the login card and clears the loaded document', async () => {
    localStorage.setItem('rag_demo_token', 'header.payload.signature');
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    fixture.componentInstance.onIngested({
      documentId: 'doc-1',
      chunkCount: 3,
      expiresAt: new Date().toISOString(),
    });
    fixture.componentInstance.logout();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-login')).toBeTruthy();
    expect(fixture.componentInstance.document()).toBeNull();
    expect(localStorage.getItem('rag_demo_token')).toBeNull();
  });

  it('carries the build-with-deepak.com brand footer with socials', async () => {
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const footer = compiled.querySelector('app-brand-footer');
    expect(footer).toBeTruthy();
    expect(footer?.querySelector('img[alt="build-with-deepak.com"]')).toBeTruthy();

    const hrefs = Array.from(footer?.querySelectorAll('a') ?? []).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain('https://www.linkedin.com/in/build-with-deepak');
    expect(hrefs).toContain('https://github.com/build-with-deepak');
    expect(hrefs).toContain('https://build-with-deepak.com');
    expect(hrefs).toContain('mailto:entr.deepakjha@gmail.com');
  });
});
