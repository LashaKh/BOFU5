import { exportFactory, ExportOptions, ExportResult, ExportFormat } from './index';
import { MarkdownExportStrategy } from './strategies/MarkdownExportStrategy';
import { TextExportStrategy } from './strategies/TextExportStrategy';
import { HtmlExportStrategy } from './strategies/HtmlExportStrategy';
import { PdfExportStrategy } from './strategies/PdfExportStrategy';
import { SimpleDocxExportStrategy } from './strategies/SimpleDocxExportStrategy';
import { Editor } from '@tiptap/react';

export interface ArticleExportContent {
  editor?: Editor;
  html?: string;
  json?: any;
  title?: string;
  articleId?: string;
}

export class ExportService {
  private static instance: ExportService;
  private isInitialized = false;

  private constructor() {
    this.initializeStrategies();
  }

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private initializeStrategies(): void {
    if (this.isInitialized) return;

    // Register all export strategies
    exportFactory.registerStrategy('markdown', new MarkdownExportStrategy());
    exportFactory.registerStrategy('txt', new TextExportStrategy());
    exportFactory.registerStrategy('html', new HtmlExportStrategy());
    exportFactory.registerStrategy('pdf', new PdfExportStrategy());
    exportFactory.registerStrategy('docx', new SimpleDocxExportStrategy());
    
    this.isInitialized = true;
  }

  public getSupportedFormats(): ExportFormat[] {
    return exportFactory.getSupportedFormats();
  }

  public async exportArticle(
    content: ArticleExportContent,
    options: ExportOptions
  ): Promise<ExportResult> {
    // Ensure strategies are initialized
    this.initializeStrategies();

    // Validate content
    if (!content || (!content.editor && !content.html && !content.json)) {
      return {
        success: false,
        error: 'Invalid content provided for export',
      };
    }

    // Set default options
    const exportOptions: ExportOptions = {
      includeImages: true,
      includeComments: false,
      includeMetadata: true,
      pageSize: 'A4',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      ...options,
    };

    try {
      return await exportFactory.export(content, exportOptions);
    } catch (error) {
      console.error('Export service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  public async exportFromEditor(
    editor: Editor,
    articleTitle: string,
    articleId: string,
    options: Partial<ExportOptions>
  ): Promise<ExportResult> {
    const content: ArticleExportContent = {
      editor,
      title: articleTitle,
      articleId,
      html: editor.getHTML(),
      json: editor.getJSON(),
    };

    return this.exportArticle(content, options as ExportOptions);
  }

  public async exportFromHtml(
    html: string,
    articleTitle: string,
    articleId: string,
    options: Partial<ExportOptions>
  ): Promise<ExportResult> {
    const content: ArticleExportContent = {
      html,
      title: articleTitle,
      articleId,
    };

    return this.exportArticle(content, options as ExportOptions);
  }

  public getDefaultOptions(format: ExportFormat): Partial<ExportOptions> {
    const baseOptions = {
      includeImages: true,
      includeComments: false,
      includeMetadata: true,
    };

    switch (format) {
      case 'markdown':
        return {
          ...baseOptions,
          includeImages: true,
        };
      case 'txt':
        return {
          ...baseOptions,
          includeImages: false,
          includeComments: false,
        };
      case 'html':
        return {
          ...baseOptions,
          includeImages: true,
          includeComments: true,
        };
      case 'pdf':
        return {
          ...baseOptions,
          pageSize: 'A4' as const,
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          fontSize: 12,
          fontFamily: 'Arial, sans-serif',
        };
      case 'docx':
        return {
          ...baseOptions,
          includeImages: true,
          includeComments: true,
        };
      default:
        return baseOptions;
    }
  }

  public validateExportOptions(options: Partial<ExportOptions>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.format && !this.getSupportedFormats().includes(options.format)) {
      errors.push(`Unsupported export format: ${options.format}`);
    }

    if (options.pageSize && !['A4', 'Letter', 'Legal'].includes(options.pageSize)) {
      errors.push(`Invalid page size: ${options.pageSize}`);
    }

    if (options.fontSize && (options.fontSize < 8 || options.fontSize > 72)) {
      errors.push('Font size must be between 8 and 72');
    }

    if (options.margins) {
      const { top, right, bottom, left } = options.margins;
      if ([top, right, bottom, left].some(margin => margin < 0 || margin > 100)) {
        errors.push('Margins must be between 0 and 100');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const exportService = ExportService.getInstance(); 