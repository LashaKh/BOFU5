import { saveAs } from 'file-saver';
import { ExportStrategy, ExportOptions, ExportResult, ExportFormat } from '../index';
import { Editor } from '@tiptap/react';

export class TextExportStrategy extends ExportStrategy {
  getSupportedFormats(): ExportFormat[] {
    return ['txt'];
  }

  async export(content: any, options: ExportOptions): Promise<ExportResult> {
    try {
      let textContent: string;
      let articleTitle = 'Untitled Article';

      // Handle different content types
      if (typeof content === 'string') {
        // If content is already a string, assume it's HTML and convert
        textContent = this.htmlToText(content);
      } else if (content?.editor && content.editor instanceof Editor) {
        // If content has a TipTap editor instance
        textContent = content.editor.getText();
        articleTitle = content.title || articleTitle;
      } else if (content?.html) {
        // If content has HTML property
        textContent = this.htmlToText(content.html);
        articleTitle = content.title || articleTitle;
      } else if (content?.json) {
        // If content has TipTap JSON
        const tempEditor = new Editor({
          content: content.json,
          editable: false,
        });
        textContent = tempEditor.getText();
        tempEditor.destroy();
        articleTitle = content.title || articleTitle;
      } else {
        throw new Error('Unsupported content format for text export');
      }

      // Add metadata header if requested
      if (options.includeMetadata) {
        const metadata = this.createMetadata('txt', textContent, content.articleId, articleTitle);
        const metadataHeader = this.createTextMetadataHeader(metadata, articleTitle);
        textContent = metadataHeader + textContent;
      }

      // Clean up the text content
      textContent = this.cleanTextContent(textContent);

      // Create blob and filename
      const blob = new Blob([textContent], { 
        type: 'text/plain;charset=utf-8' 
      });
      
      const filename = this.generateFilename(
        articleTitle, 
        'txt', 
        options.customFilename
      );

      // Trigger download
      saveAs(blob, filename);

      return {
        success: true,
        filename,
        blob,
        metadata: this.createMetadata('txt', textContent, content.articleId, articleTitle),
      };
    } catch (error) {
      console.error('Text export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown text export error',
      };
    }
  }

  private htmlToText(html: string): string {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove script and style elements
    const scripts = tempDiv.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());
    
    // Get text content and clean it up
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  private createTextMetadataHeader(metadata: any, title: string): string {
    const now = new Date();
    return `========================================
DOCUMENT: ${title}
EXPORTED: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}
FORMAT: Plain Text
WORD COUNT: ${metadata.wordCount}
CHARACTER COUNT: ${metadata.characterCount}
========================================

`;
  }

  private cleanTextContent(content: string): string {
    return content
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive blank lines (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Clean up whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      // Remove leading/trailing whitespace from lines
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Final trim
      .trim();
  }
} 