import { saveAs } from 'file-saver';
import { ExportStrategy, ExportOptions, ExportResult, ExportFormat } from '../index';
import { Editor } from '@tiptap/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export class PdfExportStrategy extends ExportStrategy {
  getSupportedFormats(): ExportFormat[] {
    return ['pdf'];
  }

  async export(content: any, options: ExportOptions): Promise<ExportResult> {
    try {
      let htmlContent: string;
      let articleTitle = 'Untitled Article';

      // Handle different content types
      if (typeof content === 'string') {
        htmlContent = content;
      } else if (content?.editor && content.editor instanceof Editor) {
        htmlContent = content.editor.getHTML();
        articleTitle = content.title || articleTitle;
      } else if (content?.html) {
        htmlContent = content.html;
        articleTitle = content.title || articleTitle;
      } else if (content?.json) {
        const tempEditor = new Editor({
          content: content.json,
          editable: false,
        });
        htmlContent = tempEditor.getHTML();
        tempEditor.destroy();
        articleTitle = content.title || articleTitle;
      } else {
        throw new Error('Unsupported content format for PDF export');
      }

      // Generate PDF
      const pdfBlob = await this.createPdfFromHtml(htmlContent, articleTitle, options);

      const filename = this.generateFilename(
        articleTitle, 
        'pdf', 
        options.customFilename
      );

      // Trigger download
      saveAs(pdfBlob, filename);

      return {
        success: true,
        filename,
        blob: pdfBlob,
        metadata: this.createMetadata('pdf', '', content.articleId, articleTitle),
      };
    } catch (error) {
      console.error('PDF export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown PDF export error',
      };
    }
  }

  private async createPdfFromHtml(
    htmlContent: string, 
    title: string, 
    options: ExportOptions
  ): Promise<Blob> {
    // Create a temporary container for rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '800px';
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.padding = '40px';
    tempContainer.style.fontFamily = options.fontFamily || 'Arial, sans-serif';
    tempContainer.style.fontSize = `${options.fontSize || 12}pt`;
    tempContainer.style.lineHeight = '1.6';
    tempContainer.style.color = '#333';

    // Create document structure
    const documentHtml = this.createPdfDocument(htmlContent, title, options);
    tempContainer.innerHTML = documentHtml;
    
    document.body.appendChild(tempContainer);

    try {
      // Configure page dimensions
      const pageSize = options.pageSize || 'A4';
      const margins = options.margins || { top: 20, right: 20, bottom: 20, left: 20 };
      
      // Get page dimensions in mm
      const pageDimensions = this.getPageDimensions(pageSize);
      
      // Create PDF with specified page size
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pageSize.toLowerCase(),
      });

      // Convert margins from pts to mm (1 pt = 0.352778 mm)
      const marginMm = {
        top: margins.top * 0.352778,
        right: margins.right * 0.352778,
        bottom: margins.bottom * 0.352778,
        left: margins.left * 0.352778,
      };

      // Calculate content area
      const contentWidth = pageDimensions.width - marginMm.left - marginMm.right;
      const contentHeight = pageDimensions.height - marginMm.top - marginMm.bottom;

      // Render HTML to canvas
      const canvas = await html2canvas(tempContainer, {
        width: 800,
        height: tempContainer.scrollHeight,
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // Calculate scaling to fit content width
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add content to PDF
      let yPosition = marginMm.top;
      let remainingHeight = imgHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const pageHeight = Math.min(remainingHeight, contentHeight);
        
        // Create a new canvas for this page section
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d')!;
        
        const sourceHeight = (pageHeight * canvas.width) / imgWidth;
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        
        pageCtx.drawImage(
          canvas,
          0, sourceY,
          canvas.width, sourceHeight,
          0, 0,
          canvas.width, sourceHeight
        );

        const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
        
        if (yPosition > marginMm.top) {
          pdf.addPage();
          yPosition = marginMm.top;
        }

        pdf.addImage(pageDataUrl, 'JPEG', marginMm.left, yPosition, imgWidth, pageHeight);
        
        remainingHeight -= pageHeight;
        sourceY += sourceHeight;
        yPosition = marginMm.top; // Reset for next page
      }

      return new Blob([pdf.output('blob')], { type: 'application/pdf' });

    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  }

  private createPdfDocument(content: string, title: string, options: ExportOptions): string {
    const metadataHeader = options.includeMetadata ? this.createPdfMetadataHeader(title) : '';
    
    return `
      <div style="max-width: 100%; margin: 0 auto;">
        <div style="border-bottom: 2px solid #e9ecef; margin-bottom: 30px; padding-bottom: 20px;">
          <h1 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 2em; font-weight: 600;">${this.escapeHtml(title)}</h1>
          ${metadataHeader}
        </div>
        <div style="margin-bottom: 30px;">
          ${this.processPdfContent(content)}
        </div>
        <div style="border-top: 1px solid #e9ecef; padding-top: 15px; text-align: center; font-size: 0.85em; color: #6c757d;">
          <p>Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      </div>`;
  }

  private createPdfMetadataHeader(title: string): string {
    const now = new Date();
    return `
      <div style="font-size: 0.9em; color: #6c757d; margin-top: 10px;">
        <p style="margin: 5px 0;"><strong>Exported:</strong> ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
        <p style="margin: 5px 0;"><strong>Format:</strong> PDF</p>
      </div>`;
  }

  private processPdfContent(content: string): string {
    // Process content to ensure proper PDF rendering
    return content
      // Ensure proper styling for tables
      .replace(/<table/g, '<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"')
      .replace(/<th/g, '<th style="border: 1px solid #ddd; padding: 8px 12px; background: #f8f9fa; font-weight: 600;"')
      .replace(/<td/g, '<td style="border: 1px solid #ddd; padding: 8px 12px;"')
      // Ensure proper styling for code blocks
      .replace(/<pre/g, '<pre style="background: #f4f4f4; padding: 1em; border-radius: 5px; overflow-x: auto; font-family: monospace;"')
      .replace(/<code/g, '<code style="background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em;"')
      // Ensure proper styling for blockquotes
      .replace(/<blockquote/g, '<blockquote style="border-left: 4px solid #007bff; margin: 1.5em 0; padding: 1em 1.5em; background: #f8f9fa; font-style: italic;"')
      // Ensure proper styling for lists
      .replace(/<ul/g, '<ul style="margin: 1em 0; padding-left: 2em;"')
      .replace(/<ol/g, '<ol style="margin: 1em 0; padding-left: 2em;"')
      .replace(/<li/g, '<li style="margin: 0.5em 0;"')
      // Ensure proper styling for headings
      .replace(/<h1/g, '<h1 style="color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; font-size: 2em;"')
      .replace(/<h2/g, '<h2 style="color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; font-size: 1.75em;"')
      .replace(/<h3/g, '<h3 style="color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; font-size: 1.5em;"')
      // Ensure proper styling for paragraphs
      .replace(/<p/g, '<p style="margin: 1em 0; line-height: 1.6;"')
      // Ensure proper styling for images
      .replace(/<img/g, '<img style="max-width: 100%; height: auto; border-radius: 4px; margin: 1em 0;"');
  }

  private getPageDimensions(pageSize: string): { width: number; height: number } {
    const dimensions = {
      'A4': { width: 210, height: 297 },
      'Letter': { width: 216, height: 279 },
      'Legal': { width: 216, height: 356 },
    };
    
    return dimensions[pageSize as keyof typeof dimensions] || dimensions.A4;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
} 