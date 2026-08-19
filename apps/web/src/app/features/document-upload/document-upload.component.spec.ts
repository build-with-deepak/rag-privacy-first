import { TestBed } from '@angular/core/testing';
import { DocumentUploadComponent } from './document-upload.component';
import { DocumentsService } from '../../core/documents.service';
import { DocumentResponse } from '../../core/models';

function pdfFile(sizeBytes: number, type = 'application/pdf'): File {
  return new File([new Uint8Array(sizeBytes)], 'doc.pdf', { type });
}

describe('DocumentUploadComponent', () => {
  let uploadPdf: ReturnType<typeof vi.fn>;
  let useSample: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    uploadPdf = vi.fn();
    useSample = vi.fn();

    await TestBed.configureTestingModule({
      imports: [DocumentUploadComponent],
      providers: [{ provide: DocumentsService, useValue: { uploadPdf, useSample } }],
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

  it('useSample() calls the service and emits the ingested document', async () => {
    const response: DocumentResponse = {
      documentId: 'sample-document',
      chunkCount: 5,
      expiresAt: new Date().toISOString(),
    };
    useSample.mockResolvedValue(response);

    const fixture = create();
    const component = fixture.componentInstance;
    const emitted: DocumentResponse[] = [];
    component.ingested.subscribe((doc) => emitted.push(doc));

    await component.useSample();

    expect(emitted).toEqual([response]);
  });
});
