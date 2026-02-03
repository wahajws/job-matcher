import pdfParse from 'pdf-parse';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';

export class PdfParserService {
  async extractText(filePath: string): Promise<string> {
    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        throw new Error(`PDF file not found at path: ${filePath}`);
      }

      // Check file size
      const stats = await stat(filePath);
      if (stats.size === 0) {
        throw new Error(`PDF file is empty (0 bytes) at path: ${filePath}`);
      }

      const dataBuffer = await readFile(filePath);
      
      // Verify buffer has data
      if (!dataBuffer || dataBuffer.length === 0) {
        throw new Error(`Failed to read PDF file data from: ${filePath}`);
      }

      const data = await pdfParse(dataBuffer);
      return data.text || '';
    } catch (error: any) {
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error: any) {
      throw new Error(`Failed to parse PDF buffer: ${error.message}`);
    }
  }
}

export const pdfParserService = new PdfParserService();
