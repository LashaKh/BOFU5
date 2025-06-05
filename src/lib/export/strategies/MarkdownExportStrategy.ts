import { saveAs } from 'file-saver';
import { ExportStrategy, ExportOptions, ExportResult, ExportFormat } from '../index';
import { htmlToMarkdown } from '../../../utils/markdownConverter';
import { Editor } from '@tiptap/react';

export class MarkdownExportStrategy extends ExportStrategy {
  getSupportedFormats(): ExportFormat[] {
    return ['markdown'];
  }

  async export(content: any, options: ExportOptions): Promise<ExportResult> {
    try {
      let markdownContent: string;
      let articleTitle = 'Untitled Article';

      // Handle different content types
      if (typeof content === 'string') {
        // If content is already a string, assume it's HTML and convert
        markdownContent = htmlToMarkdown(content);
      } else if (content?.editor && content.editor instanceof Editor) {
        // If content has a TipTap editor instance
        const htmlContent = content.editor.getHTML();
        markdownContent = htmlToMarkdown(htmlContent);
        articleTitle = content.title || articleTitle;
      } else if (content?.html) {
        // If content has HTML property
        markdownContent = htmlToMarkdown(content.html);
        articleTitle = content.title || articleTitle;
      } else if (content?.json) {
        // If content has TipTap JSON
        // Convert JSON to HTML first, then to markdown
        const tempEditor = new Editor({
          content: content.json,
          editable: false,
        });
        const htmlContent = tempEditor.getHTML();
        markdownContent = htmlToMarkdown(htmlContent);
        tempEditor.destroy();
        articleTitle = content.title || articleTitle;
      } else {
        throw new Error('Unsupported content format for markdown export');
      }

      // Add metadata header if requested
      if (options.includeMetadata) {
        const metadata = this.createMetadata('markdown', markdownContent, content.articleId, articleTitle);
        const metadataHeader = this.createMarkdownMetadataHeader(metadata, articleTitle);
        markdownContent = metadataHeader + markdownContent;
      }

      // Clean up the markdown
      markdownContent = this.cleanMarkdownContent(markdownContent);

      // Create blob and filename
      const blob = new Blob([markdownContent], { 
        type: 'text/markdown;charset=utf-8' 
      });
      
      const filename = this.generateFilename(
        articleTitle, 
        'markdown', 
        options.customFilename
      );

      // Trigger download
      saveAs(blob, filename);

      return {
        success: true,
        filename,
        blob,
        metadata: this.createMetadata('markdown', markdownContent, content.articleId, articleTitle),
      };
    } catch (error) {
      console.error('Markdown export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown markdown export error',
      };
    }
  }

  private createMarkdownMetadataHeader(metadata: any, title: string): string {
    const now = new Date();
    return `---
title: "${title}"
exported: ${now.toISOString()}
format: markdown
word_count: ${metadata.wordCount}
character_count: ${metadata.characterCount}
---

# ${title}

`;
  }

  private cleanMarkdownContent(content: string): string {
    return content
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive blank lines (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Clean up list formatting
      .replace(/^[\s]*\-[\s]+/gm, '- ')
      .replace(/^[\s]*\*[\s]+/gm, '- ')
      .replace(/^[\s]*\d+\.[\s]+/gm, (match) => {
        const num = match.match(/\d+/)?.[0] || '1';
        return `${num}. `;
      })
      // Clean up heading spacing
      .replace(/^(#{1,6})\s*/gm, '$1 ')
      // Ensure proper spacing around code blocks
      .replace(/(^|\n)(```)/g, '\n\n$2')
      .replace(/(```\n)(\w)/g, '$1\n$2')
      // Clean up emphasis markers
      .replace(/\*{3,}/g, '**')
      .replace(/_{3,}/g, '__')
      // Trim whitespace
      .trim();
  }
} 