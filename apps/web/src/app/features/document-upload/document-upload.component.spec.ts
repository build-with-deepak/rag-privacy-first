import { TestBed } from '@angular/core/testing';
import { DocumentUploadComponent } from './document-upload.component';
import { AuthService } from '../../core/auth.service';
import { DocumentsService } from '../../core/documents.service';
import { DocumentResponse } from '../../core/models';

function pdfFile(sizeBytes: number, type = 'application/pdf'): File {
  return new File([new Uint8Array(sizeBytes)], 'doc.pdf', { type });
}

describe('DocumentUploadComponent', () => {
  let uploadPdf: ReturnType<typeof vi.fn>;
  let logout: ReturnType<typeof vi.fn>;
  let canUpload: boolean;

  beforeEach(async () => {
    uploadPdf = vi.fn();
    logout = vi.fn();
    canUpload = true;

    await TestBed.configureTestingModule({
      imports: [DocumentUploadComponent],
      providers: [
        { provide: DocumentsService, useValue: { uploadPdf } },
        { provide: AuthService, useValue: { canUpload: () => canUpload, logout } },
      ],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(DocumentUploadComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('rejects a non-PDF file client-side without calling the API', async () => {
    const fixture = create();
    const component = fixture.componentInstance;

    await (component as unknown as { handleFile(file: File): Promise<void> }).handleFile(
      new File(['x'], 'doc.txt', { type: 'text/plain' }),
    );

    expect(uploadPdf).not.toHaveBeenCalled();
    expect(component.error()).toContain('Only PDF files');
  });

  it('rejects a file over the size limit client-side without calling the API', async () => {
    const fixture = create();
    const component = fixture.componentInstance;

    await (component as unknown as { handleFile(file: File): Promise<void> }).handleFile(
      pdfFile(16 * 1024 * 1024),
    );

    expect(uploadPdf).not.toHaveBeenCalled();
    expect(component.error()).toContain('15MB limit');
  });

  it('uploads a valid PDF and emits the ingested document', async () => {
    const response: DocumentResponse = {
      documentId: 'doc-1',
      chunkCount: 5,
      expiresAt: new Date().toISOString(),
    };
    uploadPdf.mockResolvedValue(response);

    const fixture = create();
    const component = fixture.componentInstance;
    const emitted: DocumentResponse[] = [];
    component.ingested.subscribe((doc) => emitted.push(doc));

    await (component as unknown as { handleFile(file: File): Promise<void> }).handleFile(
      pdfFile(1024),
    );

    expect(uploadPdf).toHaveBeenCalledTimes(1);
    expect(emitted).toEqual([response]);
    expect(component.isUploading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('surfaces the API error message when upload fails', async () => {
    uploadPdf.mockRejectedValue({ error: { message: 'No extractable text found in this PDF.' } });

    const fixture = create();
    const component = fixture.componentInstance;

    await (component as unknown as { handleFile(file: File): Promise<void> }).handleFile(
      pdfFile(1024),
    );

    expect(component.error()).toBe('No extractable text found in this PDF.');
  });

  /**
   * The demo account's restriction, from the interface's side.
   *
   * The API enforces this independently — these assertions are about not
   * showing someone a control that will 403 when they use it, and about
   * turning that moment into the registration prompt instead.
   */
  describe('when the session cannot upload', () => {
    beforeEach(() => {
      canUpload = false;
    });

    it('replaces the dropzone with an explanation and a way to register', () => {
      const host = create().nativeElement as HTMLElement;

      expect(host.querySelector('.dropzone')).toBeNull();
      expect(host.querySelector('input[type="file"]')).toBeNull();
      expect(host.querySelector('.locked')).not.toBeNull();
      expect(host.querySelector('.locked-cta')?.textContent).toContain('Create a free account');
    });

    it('ends the shared demo session when registration is chosen', () => {
      const fixture = create();
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('.locked-cta')!
        .click();

      expect(logout).toHaveBeenCalled();
    });
  });

  it('shows the dropzone when the session may upload', () => {
    const host = create().nativeElement as HTMLElement;

    expect(host.querySelector('.dropzone')).not.toBeNull();
    expect(host.querySelector('.locked')).toBeNull();
  });
});
