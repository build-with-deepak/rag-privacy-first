import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

/**
 * Extracts text from a PDF buffer without ever writing the file to disk.
 *
 * pdf-parse's `PDFParse` class takes the raw bytes and returns plain text —
 * nothing here touches the filesystem. That is deliberate: the fewer places
 * an uploaded document's bytes are held, the smaller the blast radius if
 * this box is ever compromised. Memory is not persistence.
 */
@Injectable()
export class PdfExtractionService {
  async extractText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      if (!result.text.trim()) {
        throw new BadRequestException(
          'No extractable text found in this PDF — it may be a scanned image without an OCR text layer.',
        );
      }
      return result.text;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Could not parse this PDF: ${(err as Error).message}`,
      );
    } finally {
      await parser.destroy();
    }
  }
}
