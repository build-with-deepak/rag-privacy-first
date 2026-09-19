import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import type { Session } from './core/session.models';

const STORAGE_KEY = 'bwd_rag_session';

/**
 * A stored session, as AuthService restores it.
 *
 * `scope` is the part that matters: it is what the UI reads to decide
 * whether to offer uploading, and what the API independently enforces. A
 * fixture that omitted it would let a regression in the demo-account
 * restriction pass unnoticed here.
 */
const session = (scope: string[]): Session => ({
  accessToken: 'header.payload.signature',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 'u1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    kind: scope.includes('demo:write') ? 'user' : 'demo',
    scope,
  },
});

const signIn = (scope: string[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session(scope)));

describe('App', () => {

  // DemoHeaderComponent now injects ThemeService, whose constructor calls
  // window.matchMedia — which jsdom (this suite's test environment) does
  // not implement. A real browser always has it; this stub exists only to
  // let component trees mount in tests, not because the app needs one.
  beforeEach(() => {
    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }),
      });
    }
    document.cookie = 'bwd-theme=; Path=/; Max-Age=0; SameSite=Lax';
  });
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

  it('shows the sign-in panel, not the upload flow, when signed out', async () => {
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-auth-panel')).toBeTruthy();
    expect(compiled.querySelector('app-document-upload')).toBeFalsy();
  });

  it('shows upload → chat once a session exists and a document is ingested', async () => {
    signIn(['demo:read', 'demo:write']);
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-auth-panel')).toBeFalsy();
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

  // The shared demo account signs in like anyone else — it simply cannot
  // upload. That distinction lives in the token's scope, and the whole
  // anti-abuse design rests on it.
  it('signs the demo account in without granting upload', async () => {
    signIn(['demo:read']);
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-auth-panel')).toBeFalsy();
    expect(fixture.componentInstance.auth.isDemo()).toBe(true);
    expect(fixture.componentInstance.auth.canUpload()).toBe(false);
    expect(compiled.querySelector('app-demo-header')?.textContent).not.toContain(
      'Demo account · read-only',
    );
    expect(compiled.querySelector('.explainer-panel')?.textContent).toContain('Demo account:');
    expect(compiled.querySelector('.explainer-panel')?.textContent).toContain('read-only');
  });

  it('grants upload to a verified account', async () => {
    signIn(['demo:read', 'demo:write']);
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.componentInstance.auth.isDemo()).toBe(false);
    expect(fixture.componentInstance.auth.canUpload()).toBe(true);
  });

  it('signing out returns to the sign-in panel and clears the loaded document', async () => {
    signIn(['demo:read', 'demo:write']);
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
    expect(compiled.querySelector('app-auth-panel')).toBeTruthy();
    expect(fixture.componentInstance.document()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // A session written by an older build of this app must not be able to
  // break the current one on load.
  it('ignores an unrecognisable stored session', async () => {
    localStorage.setItem(STORAGE_KEY, '{"accessToken":"old-style-token"}');
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-auth-panel')).toBeTruthy();
  });

  it('carries the shared suite chrome on every screen', async () => {
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // Signed out, so the header and footer must still be present — this is
    // the route back to the portfolio, and it has to survive the sign-in
    // screen as well as the app itself.
    expect(compiled.querySelector('app-demo-header')).toBeTruthy();

    const footer = compiled.querySelector('app-demo-footer');
    expect(footer).toBeTruthy();

    const hrefs = Array.from(footer?.querySelectorAll('a') ?? []).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain('https://build-with-deepak.com');
    expect(hrefs).toContain('https://www.linkedin.com/in/build-with-deepak');
    expect(hrefs).toContain('mailto:entr.deepakjha@gmail.com');
    // The footer is now byte-identical to build-with-deepak.com's own —
    // that is the whole point of this pass — and that footer links to the
    // GitHub org, not any one repo.
    expect(hrefs).toContain('https://github.com/build-with-deepak');
  });
});
