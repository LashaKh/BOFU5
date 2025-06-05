import { saveAs } from 'file-saver';
import { ExportStrategy, ExportOptions, ExportResult, ExportFormat } from '../index';
import { Editor } from '@tiptap/react';

export class HtmlExportStrategy extends ExportStrategy {
  getSupportedFormats(): ExportFormat[] {
    return ['html'];
  }

  async export(content: any, options: ExportOptions): Promise<ExportResult> {
    try {
      let htmlContent: string;
      let articleTitle = 'Untitled Article';

      // Handle different content types
      if (typeof content === 'string') {
        // If content is already a string, assume it's HTML
        htmlContent = content;
      } else if (content?.editor && content.editor instanceof Editor) {
        // If content has a TipTap editor instance
        htmlContent = content.editor.getHTML();
        articleTitle = content.title || articleTitle;
      } else if (content?.html) {
        // If content has HTML property
        htmlContent = content.html;
        articleTitle = content.title || articleTitle;
      } else if (content?.json) {
        // If content has TipTap JSON
        const tempEditor = new Editor({
          content: content.json,
          editable: false,
        });
        htmlContent = tempEditor.getHTML();
        tempEditor.destroy();
        articleTitle = content.title || articleTitle;
      } else {
        throw new Error('Unsupported content format for HTML export');
      }

      // Create complete HTML document
      const completeHtml = this.createHtmlDocument(
        htmlContent, 
        articleTitle, 
        options
      );

      // Create blob and filename
      const blob = new Blob([completeHtml], { 
        type: 'text/html;charset=utf-8' 
      });
      
      const filename = this.generateFilename(
        articleTitle, 
        'html', 
        options.customFilename
      );

      // Trigger download
      saveAs(blob, filename);

      return {
        success: true,
        filename,
        blob,
        metadata: this.createMetadata('html', completeHtml, content.articleId, articleTitle),
      };
    } catch (error) {
      console.error('HTML export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown HTML export error',
      };
    }
  }

  private createHtmlDocument(content: string, title: string, options: ExportOptions): string {
    const metadata = options.includeMetadata ? this.createHtmlMetadata(title) : '';
    const styles = this.getDocumentStyles(options);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    ${metadata}
    <style>
        ${styles}
    </style>
</head>
<body>
    <div class="document-container">
        <header class="document-header">
            <h1>${this.escapeHtml(title)}</h1>
            ${options.includeMetadata ? this.createMetadataHeader() : ''}
        </header>
        <main class="document-content">
            ${content}
        </main>
        <footer class="document-footer">
            <p>Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </footer>
    </div>
</body>
</html>`;
  }

  private createHtmlMetadata(title: string): string {
    const now = new Date();
    return `
    <meta name="description" content="Exported article: ${this.escapeHtml(title)}">
    <meta name="generator" content="BOFU Article Editor">
    <meta name="export-date" content="${now.toISOString()}">
    <meta name="export-format" content="html">`;
  }

  private createMetadataHeader(): string {
    const now = new Date();
    return `
            <div class="metadata-header">
                <p><strong>Exported:</strong> ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
                <p><strong>Format:</strong> HTML</p>
            </div>`;
  }

  private getDocumentStyles(options: ExportOptions): string {
    const fontSize = options.fontSize || 12;
    const fontFamily = options.fontFamily || 'Arial, sans-serif';
    const margins = options.margins || { top: 20, right: 20, bottom: 20, left: 20 };

    return `
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: ${fontFamily};
            font-size: ${fontSize}pt;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        
        .document-container {
            max-width: 800px;
            margin: 20px auto;
            background: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .document-header {
            background: #f8f9fa;
            padding: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .document-header h1 {
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-size: 2em;
            font-weight: 600;
        }
        
        .metadata-header {
            font-size: 0.9em;
            color: #6c757d;
            margin-top: 10px;
        }
        
        .metadata-header p {
            margin: 5px 0;
        }
        
        .document-content {
            padding: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px;
        }
        
        .document-footer {
            background: #f8f9fa;
            padding: 15px ${margins.right}px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            font-size: 0.85em;
            color: #6c757d;
        }
        
        /* Content Styling */
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }
        
        h1 { font-size: 2em; }
        h2 { font-size: 1.75em; }
        h3 { font-size: 1.5em; }
        h4 { font-size: 1.25em; }
        h5 { font-size: 1.1em; }
        h6 { font-size: 1em; }
        
        p {
            margin: 1em 0;
        }
        
        a {
            color: #007bff;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        ul, ol {
            margin: 1em 0;
            padding-left: 2em;
        }
        
        li {
            margin: 0.5em 0;
        }
        
        blockquote {
            border-left: 4px solid #007bff;
            margin: 1.5em 0;
            padding: 1em 1.5em;
            background: #f8f9fa;
            font-style: italic;
        }
        
        code {
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background: #f4f4f4;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
        }
        
        pre code {
            background: none;
            padding: 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5em 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin: 1em 0;
        }
        
        hr {
            border: none;
            border-top: 2px solid #e9ecef;
            margin: 2em 0;
        }
        
        /* Task List Styling */
        .task-list {
            list-style: none;
            padding-left: 1.5em;
        }
        
        .task-item {
            position: relative;
        }
        
        .task-item input[type="checkbox"] {
            position: absolute;
            left: -1.5em;
            top: 0.2em;
        }
        
        /* Print Styles */
        @media print {
            body {
                background: white;
            }
            
            .document-container {
                box-shadow: none;
                border: none;
                margin: 0;
            }
            
            .document-header,
            .document-footer {
                background: white !important;
            }
        }`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
} 