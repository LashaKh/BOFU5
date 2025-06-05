import MarkdownIt from 'markdown-it';
import TurndownService from 'turndown';
// @ts-ignore - markdown-it-task-lists doesn't have types
import markdownItTaskLists from 'markdown-it-task-lists';

// Configure markdown-it parser
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
});

// Configure turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
  bulletListMarker: '-',
});

// Custom rules for better conversion
turndownService.addRule('taskListItem', {
  filter: (node: any) => {
    return node.nodeName === 'LI' && 
           node.parentNode?.nodeName === 'UL' && 
           node.querySelector('input[type="checkbox"]');
  },
  replacement: (content: string, node: any) => {
    const checkbox = node.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const checked = checkbox?.checked ? 'x' : ' ';
    return `- [${checked}] ${content}\n`;
  }
});

turndownService.addRule('horizontalRule', {
  filter: 'hr',
  replacement: () => '\n---\n'
});

turndownService.addRule('codeBlock', {
  filter: (node: any) => {
    return node.nodeName === 'PRE' && node.querySelector('code');
  },
  replacement: (content: string) => {
    return `\n\`\`\`\n${content}\n\`\`\`\n`;
  }
});

// Custom rule for better link handling
turndownService.addRule('links', {
  filter: 'a',
  replacement: (content: string, node: any) => {
    const href = (node as HTMLElement).getAttribute('href');
    const title = (node as HTMLElement).getAttribute('title');
    
    if (!href) return content;
    
    if (title) {
      return `[${content}](${href} "${title}")`;
    }
    return `[${content}](${href})`;
  }
});

// Custom rule for images
turndownService.addRule('images', {
  filter: 'img',
  replacement: (content: string, node: any) => {
    const src = (node as HTMLElement).getAttribute('src');
    const alt = (node as HTMLElement).getAttribute('alt') || '';
    const title = (node as HTMLElement).getAttribute('title');
    
    if (!src) return '';
    
    if (title) {
      return `![${alt}](${src} "${title}")`;
    }
    return `![${alt}](${src})`;
  }
});

export interface MarkdownConversionOptions {
  preserveWhitespace?: boolean;
  includeHTML?: boolean;
  convertTaskLists?: boolean;
}

/**
 * Convert HTML content to Markdown
 */
export function htmlToMarkdown(html: string, options: MarkdownConversionOptions = {}): string {
  const {
    preserveWhitespace = false,
    convertTaskLists = true
  } = options;

  try {
    let markdown = turndownService.turndown(html);
    
    // Clean up extra whitespace if not preserving
    if (!preserveWhitespace) {
      markdown = markdown
        .replace(/\n\n\n+/g, '\n\n') // Remove excessive line breaks
        .replace(/^\s+|\s+$/g, '') // Trim start and end
        .replace(/\s+$/gm, ''); // Remove trailing spaces from lines
    }
    
    return markdown;
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
    return html; // Return original HTML if conversion fails
  }
}

/**
 * Convert Markdown content to HTML
 */
export function markdownToHtml(markdown: string, options: MarkdownConversionOptions = {}): string {
  const {
    includeHTML = true
  } = options;

  try {
    // Configure parser based on options
    const parser = new MarkdownIt({
      html: includeHTML,
      breaks: true,
      linkify: true,
      typographer: true,
    });

    // Add task list support
    parser.use(markdownItTaskLists, {
      enabled: true,
      label: true,
      labelAfter: true
    });

    return parser.render(markdown);
  } catch (error) {
    console.error('Error converting Markdown to HTML:', error);
    return `<p>${markdown}</p>`; // Return wrapped content if conversion fails
  }
}

/**
 * Detect if content is likely markdown
 */
export function isMarkdownContent(content: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s+/, // Headings
    /^\s*[-*+]\s+/, // Bullet lists
    /^\s*\d+\.\s+/, // Numbered lists
    /^\s*>\s+/, // Blockquotes
    /^\s*```/, // Code blocks
    /\*\*.*\*\*/, // Bold
    /\*.*\*/, // Italic
    /`.*`/, // Inline code
    /\[.*\]\(.*\)/, // Links
    /!\[.*\]\(.*\)/, // Images
  ];

  return markdownPatterns.some(pattern => pattern.test(content));
}

/**
 * Clean markdown for better parsing
 */
export function cleanMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Handle old Mac line endings
    .replace(/\t/g, '    ') // Convert tabs to spaces
    .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
    .trim();
}

/**
 * Extract front matter from markdown (if present)
 */
export function extractFrontMatter(markdown: string): { content: string; frontMatter?: any } {
  const frontMatterRegex = /^---\s*\n(.*?)\n---\s*\n(.*)/s;
  const match = markdown.match(frontMatterRegex);
  
  if (!match) {
    return { content: markdown };
  }
  
  try {
    // Simple YAML parsing for basic front matter
    const frontMatterText = match[1];
    const frontMatter: any = {};
    
    frontMatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        frontMatter[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
      }
    });
    
    return {
      content: match[2],
      frontMatter
    };
  } catch (error) {
    console.error('Error parsing front matter:', error);
    return { content: markdown };
  }
}

/**
 * Get markdown file extension based on content
 */
export function getMarkdownFileName(title?: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = title 
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'article';
  
  return `${safeName}-${timestamp}.md`;
}

/**
 * Convert TipTap JSON to Markdown (for direct editor integration)
 */
export function tiptapJsonToMarkdown(json: any): string {
  // This would need to be implemented based on TipTap's JSON structure
  // For now, we'll convert via HTML as an intermediate step
  try {
    // TipTap's generateHTML would be used here in a real implementation
    // For this demo, we'll assume the content is already HTML
    if (typeof json === 'string') {
      return htmlToMarkdown(json);
    }
    
    // Handle TipTap JSON structure
    if (json && json.content) {
      // This is a simplified approach - real implementation would 
      // need to traverse the TipTap node structure
      const htmlContent = json.content.map((node: any) => {
        // Basic node conversion - would need full implementation
        if (node.type === 'paragraph') {
          return `<p>${node.content || ''}</p>`;
        }
        return '';
      }).join('');
      
      return htmlToMarkdown(htmlContent);
    }
    
    return '';
  } catch (error) {
    console.error('Error converting TipTap JSON to Markdown:', error);
    return '';
  }
} 