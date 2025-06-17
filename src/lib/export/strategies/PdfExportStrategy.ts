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
    tempContainer.style.width = '1200px'; // Increased width for better content capture
    tempContainer.style.maxWidth = 'none';
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.padding = '40px';
    tempContainer.style.fontFamily = options.fontFamily || 'Arial, sans-serif';
    tempContainer.style.fontSize = `${options.fontSize || 12}pt`;
    tempContainer.style.lineHeight = '1.6';
    tempContainer.style.color = '#333';
    tempContainer.style.overflow = 'visible';
    tempContainer.style.height = 'auto';
    tempContainer.style.minHeight = 'auto';

    // Create document structure
    const documentHtml = this.createPdfDocument(htmlContent, title, options);
    tempContainer.innerHTML = documentHtml;
    
    document.body.appendChild(tempContainer);

    try {
      // Wait for images and content to load
      await this.waitForContentToLoad(tempContainer);
      
      // Force layout recalculation
      tempContainer.offsetHeight;
      
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

      // Get actual content dimensions
      const actualHeight = Math.max(tempContainer.scrollHeight, tempContainer.offsetHeight);
      const actualWidth = Math.max(tempContainer.scrollWidth, tempContainer.offsetWidth);

      console.log('📄 PDF Export Debug:', {
        containerDimensions: {
          scrollHeight: tempContainer.scrollHeight,
          offsetHeight: tempContainer.offsetHeight,
          scrollWidth: tempContainer.scrollWidth,
          offsetWidth: tempContainer.offsetWidth,
          actualHeight,
          actualWidth
        },
        pageDimensions,
        contentDimensions: { contentWidth, contentHeight }
      });

      // Render HTML to canvas with improved settings
      const canvas = await html2canvas(tempContainer, {
        width: actualWidth,
        height: actualHeight,
        scale: 2, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (element) => {
          // Ignore elements that might cause issues
          return element.classList?.contains('comment-highlight') || 
                 element.classList?.contains('ProseMirror-selectednode');
        },
        onclone: (clonedDoc) => {
          // Ensure proper styling in cloned document
          const clonedContainer = clonedDoc.querySelector('div');
          if (clonedContainer) {
            clonedContainer.style.width = `${actualWidth}px`;
            clonedContainer.style.height = `${actualHeight}px`;
            clonedContainer.style.overflow = 'visible';
          }
        }
      });

      // Calculate scaling to fit content width
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      console.log('📄 Canvas dimensions:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        imgWidth,
        imgHeight,
        totalPages: Math.ceil(imgHeight / contentHeight)
      });

      // Add content to PDF with proper pagination
      let yPosition = marginMm.top;
      let remainingHeight = imgHeight;
      let sourceY = 0;
      let pageCount = 0;

      while (remainingHeight > 0) {
        const pageHeight = Math.min(remainingHeight, contentHeight);
        
        // Create a new canvas for this page section
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d')!;
        
        const sourceHeight = (pageHeight * canvas.width) / imgWidth;
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        
        // Ensure clean background
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        
        pageCtx.drawImage(
          canvas,
          0, sourceY,
          canvas.width, sourceHeight,
          0, 0,
          canvas.width, sourceHeight
        );

        const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
        
        if (pageCount > 0) {
          pdf.addPage();
          yPosition = marginMm.top;
        }

        pdf.addImage(pageDataUrl, 'JPEG', marginMm.left, yPosition, imgWidth, pageHeight);
        
        remainingHeight -= pageHeight;
        sourceY += sourceHeight;
        pageCount++;
      }

      console.log('📄 PDF Export completed:', {
        totalPages: pageCount,
        finalFileSize: 'Generated successfully'
      });

      return new Blob([pdf.output('blob')], { type: 'application/pdf' });

    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  }

  private async waitForContentToLoad(container: HTMLElement): Promise<void> {
    // Wait for images to load
    const images = container.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      
      return new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve(); // Resolve even if image fails to load
        }, 3000); // 3 second timeout
        
        img.onload = () => {
          clearTimeout(timeoutId);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeoutId);
          resolve();
        };
      });
    });

    await Promise.all(imagePromises);
    
    // Additional wait for layout stabilization
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  private createPdfDocument(content: string, title: string, options: ExportOptions): string {
    const metadataHeader = options.includeMetadata ? this.createPdfMetadataHeader(title) : '';
    
    return `
      <div style="max-width: 100%; margin: 0 auto; color: #000000; font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6;">
        <style>
          a { text-decoration: none !important; color: #0066cc !important; }
          u { text-decoration: none !important; }
        </style>
        <div style="border-bottom: 2px solid #333; margin-bottom: 30px; padding-bottom: 20px;">
          <h1 style="margin: 0 0 10px 0; color: #000000; font-size: 24pt; font-weight: 700; font-family: Arial, sans-serif; text-decoration: none;">${this.escapeHtml(title)}</h1>
          ${metadataHeader}
        </div>
        <div style="margin-bottom: 30px; color: #000000;">
          ${this.processPdfContent(content)}
        </div>
        <div style="border-top: 1px solid #333; padding-top: 15px; text-align: center; font-size: 10pt; color: #666; font-family: Arial, sans-serif;">
          <p style="margin: 0; color: #666;">Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      </div>`;
  }

  private createPdfMetadataHeader(title: string): string {
    const now = new Date();
    return `
      <div style="font-size: 10pt; color: #666; margin-top: 10px; font-family: Arial, sans-serif;">
        <p style="margin: 5px 0; color: #666;"><strong>Exported:</strong> ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Format:</strong> PDF</p>
      </div>`;
  }

  private processPdfContent(content: string): string {
    // Remove comment-related elements and ensure proper dark text formatting
    let processedContent = content
      // Remove comment highlights and markers
      .replace(/<span[^>]*class="[^"]*comment[^"]*"[^>]*>.*?<\/span>/gi, '')
      .replace(/<div[^>]*class="[^"]*comment[^"]*"[^>]*>.*?<\/div>/gi, '')
      .replace(/<mark[^>]*class="[^"]*comment[^"]*"[^>]*>/gi, '')
      .replace(/<\/mark>/gi, '')
      // Remove any data attributes related to comments
      .replace(/data-comment[^=]*="[^"]*"/gi, '')
      .replace(/data-thread[^=]*="[^"]*"/gi, '')
      // Clean up any empty spans or divs
      .replace(/<span[^>]*>\s*<\/span>/gi, '')
      .replace(/<div[^>]*>\s*<\/div>/gi, '');

    // Process content to ensure proper PDF rendering with dark, readable text
    return processedContent
      // Ensure proper styling for tables with dark text
      .replace(/<table/g, '<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0; page-break-inside: avoid; color: #000000; text-decoration: none;"')
      .replace(/<th/g, '<th style="border: 1px solid #333; padding: 8px 12px; background: #f0f0f0; font-weight: 600; word-wrap: break-word; color: #000000; text-decoration: none;"')
      .replace(/<td/g, '<td style="border: 1px solid #333; padding: 8px 12px; word-wrap: break-word; vertical-align: top; color: #000000; text-decoration: none;"')
      // Ensure proper styling for code blocks with dark text
      .replace(/<pre/g, '<pre style="background: #f5f5f5; padding: 1em; border: 1px solid #ddd; border-radius: 5px; font-family: \'Courier New\', monospace; white-space: pre-wrap; word-wrap: break-word; page-break-inside: avoid; color: #000000; font-size: 11pt; text-decoration: none;"')
      .replace(/<code/g, '<code style="background: #f5f5f5; padding: 2px 4px; border: 1px solid #ddd; border-radius: 3px; font-family: \'Courier New\', monospace; font-size: 10pt; word-wrap: break-word; color: #000000; text-decoration: none;"')
      // Ensure proper styling for blockquotes with dark text
      .replace(/<blockquote/g, '<blockquote style="border-left: 4px solid #007bff; margin: 1.5em 0; padding: 1em 1.5em; background: #f8f9fa; font-style: italic; page-break-inside: avoid; color: #000000; text-decoration: none;"')
      // Ensure proper styling for lists with dark text
      .replace(/<ul/g, '<ul style="margin: 1em 0; padding-left: 2em; page-break-inside: avoid; color: #000000; text-decoration: none;"')
      .replace(/<ol/g, '<ol style="margin: 1em 0; padding-left: 2em; page-break-inside: avoid; color: #000000; text-decoration: none;"')
      .replace(/<li/g, '<li style="margin: 0.5em 0; line-height: 1.6; color: #000000; text-decoration: none;"')
      // Ensure proper styling for headings with dark text and proper hierarchy
      .replace(/<h1/g, '<h1 style="color: #000000; margin-top: 2em; margin-bottom: 0.75em; font-weight: 700; font-size: 24pt; page-break-after: avoid; line-height: 1.2; font-family: Arial, sans-serif; text-decoration: none;"')
      .replace(/<h2/g, '<h2 style="color: #000000; margin-top: 1.75em; margin-bottom: 0.75em; font-weight: 600; font-size: 20pt; page-break-after: avoid; line-height: 1.3; font-family: Arial, sans-serif; text-decoration: none;"')
      .replace(/<h3/g, '<h3 style="color: #000000; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; font-size: 16pt; page-break-after: avoid; line-height: 1.4; font-family: Arial, sans-serif; text-decoration: none;"')
      .replace(/<h4/g, '<h4 style="color: #000000; margin-top: 1.25em; margin-bottom: 0.5em; font-weight: 600; font-size: 14pt; page-break-after: avoid; line-height: 1.5; font-family: Arial, sans-serif; text-decoration: none;"')
      .replace(/<h5/g, '<h5 style="color: #000000; margin-top: 1.25em; margin-bottom: 0.5em; font-weight: 600; font-size: 12pt; page-break-after: avoid; line-height: 1.5; font-family: Arial, sans-serif; text-decoration: none;"')
      .replace(/<h6/g, '<h6 style="color: #000000; margin-top: 1.25em; margin-bottom: 0.5em; font-weight: 600; font-size: 11pt; page-break-after: avoid; line-height: 1.5; font-family: Arial, sans-serif; text-decoration: none;"')
      // Ensure proper styling for paragraphs with dark text
      .replace(/<p/g, '<p style="margin: 1em 0; line-height: 1.6; word-wrap: break-word; orphans: 2; widows: 2; color: #000000; font-size: 12pt; font-family: Arial, sans-serif; text-decoration: none;"')
      // Ensure proper styling for images
      .replace(/<img/g, '<img style="max-width: 100%; height: auto; border-radius: 4px; margin: 1em 0; page-break-inside: avoid; display: block;"')
      // Ensure proper styling for links with dark text - NO UNDERLINES
      .replace(/<a/g, '<a style="color: #0066cc; text-decoration: none; word-wrap: break-word; font-weight: normal;"')
      // Ensure proper styling for strong/bold text
      .replace(/<strong/g, '<strong style="font-weight: 700; color: #000000; text-decoration: none;"')
      .replace(/<b/g, '<b style="font-weight: 700; color: #000000; text-decoration: none;"')
      // Ensure proper styling for emphasis/italic text
      .replace(/<em/g, '<em style="font-style: italic; color: #000000; text-decoration: none;"')
      .replace(/<i/g, '<i style="font-style: italic; color: #000000; text-decoration: none;"')
      // Ensure proper styling for strikethrough text
      .replace(/<s/g, '<s style="text-decoration: line-through; color: #000000;"')
      .replace(/<del/g, '<del style="text-decoration: line-through; color: #000000;"')
      // Remove underlined text styling completely
      .replace(/<u([^>]*)>/g, '<span$1 style="color: #000000; text-decoration: none;"')
      .replace(/<\/u>/g, '</span>')
      // Remove highlight styling that might cause faded text
      .replace(/<mark([^>]*)>/g, '<span$1 style="background-color: transparent; color: #000000; text-decoration: none;"')
      .replace(/<\/mark>/g, '</span>')
      // Handle horizontal rules with dark lines
      .replace(/<hr/g, '<hr style="border: none; border-top: 2px solid #333; margin: 2em 0; page-break-after: avoid;"')
      // Ensure divs have dark text (only if no existing style)
      .replace(/<div(?![^>]*style)/g, '<div style="word-wrap: break-word; color: #000000; text-decoration: none;"')
      // Ensure spans have dark text (only if no existing style)
      .replace(/<span(?![^>]*style)/g, '<span style="color: #000000; text-decoration: none;"')
      // Handle existing inline styles to ensure dark text and remove underlines
      .replace(/style="([^"]*)"/g, (match, styles) => {
        let updatedStyles = styles;
        
        // Ensure dark text color
        if (!updatedStyles.includes('color:') && !updatedStyles.includes('color ')) {
          updatedStyles += '; color: #000000';
        }
        
        // Ensure word-wrap
        if (!updatedStyles.includes('word-wrap')) {
          updatedStyles += '; word-wrap: break-word';
        }
        
        // Remove underline decorations specifically
        updatedStyles = updatedStyles.replace(/text-decoration:\s*underline[^;]*/gi, 'text-decoration: none');
        updatedStyles = updatedStyles.replace(/text-decoration-line:\s*underline[^;]*/gi, 'text-decoration-line: none');
        
        // Add text-decoration: none if not present and not line-through
        if (!updatedStyles.includes('text-decoration:') && !updatedStyles.includes('line-through')) {
          updatedStyles += '; text-decoration: none';
        }
        
        // Clean up any light colors
        updatedStyles = updatedStyles.replace(/color:\s*#[789abcdefABCDEF][0-9a-fA-F]{5}/g, 'color: #000000');
        updatedStyles = updatedStyles.replace(/color:\s*rgb\([^)]*[789][^)]*\)/g, 'color: #000000');
        updatedStyles = updatedStyles.replace(/color:\s*(gray|grey|lightgray|lightgrey|silver)/gi, 'color: #000000');
        
        return `style="${updatedStyles}"`;
      });
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