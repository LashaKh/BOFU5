// Export system for articles with multiple format support
export interface ExportOptions {
  format: ExportFormat;
  includeImages?: boolean;
  includeComments?: boolean;
  pageSize?: 'A4' | 'Letter' | 'Legal';
  margins?: { top: number; right: number; bottom: number; left: number };
  fontSize?: number;
  fontFamily?: string;
  includeMetadata?: boolean;
  customFilename?: string;
}

export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'docx' | 'txt';

export interface ExportResult {
  success: boolean;
  filename?: string;
  blob?: Blob;
  error?: string;
  metadata?: ExportMetadata;
}

export interface ExportMetadata {
  format: ExportFormat;
  fileSize: number;
  timestamp: Date;
  articleId?: string;
  articleTitle?: string;
  wordCount?: number;
  characterCount?: number;
}

// Abstract strategy interface
export abstract class ExportStrategy {
  abstract export(content: any, options: ExportOptions): Promise<ExportResult>;
  abstract getSupportedFormats(): ExportFormat[];
  
  protected generateFilename(title: string, format: ExportFormat, customFilename?: string): string {
    if (customFilename) {
      return this.sanitizeFilename(customFilename);
    }
    
    const sanitizedTitle = this.sanitizeFilename(title);
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${sanitizedTitle}_${timestamp}.${format}`;
  }
  
  protected sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^\w\-_\. ]/g, '')
      .replace(/\s+/g, '_')
      .trim()
      .substring(0, 100);
  }
  
  protected createMetadata(
    format: ExportFormat, 
    content: string, 
    articleId?: string, 
    articleTitle?: string
  ): ExportMetadata {
    return {
      format,
      fileSize: new Blob([content]).size,
      timestamp: new Date(),
      articleId,
      articleTitle,
      wordCount: this.countWords(content),
      characterCount: content.length,
    };
  }
  
  protected countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

// Export factory
export class ExportFactory {
  private strategies: Map<ExportFormat, ExportStrategy> = new Map();
  
  registerStrategy(format: ExportFormat, strategy: ExportStrategy): void {
    this.strategies.set(format, strategy);
  }
  
  getStrategy(format: ExportFormat): ExportStrategy | undefined {
    return this.strategies.get(format);
  }
  
  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.strategies.keys());
  }
  
  async export(content: any, options: ExportOptions): Promise<ExportResult> {
    const strategy = this.getStrategy(options.format);
    
    if (!strategy) {
      return {
        success: false,
        error: `Unsupported export format: ${options.format}`,
      };
    }
    
    try {
      return await strategy.export(content, options);
    } catch (error) {
      console.error(`Export failed for format ${options.format}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }
}

// Singleton export factory instance
export const exportFactory = new ExportFactory(); 