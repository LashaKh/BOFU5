import { Editor } from '@tiptap/react';

export interface MarkdownShortcut {
  pattern: RegExp;
  replacement: (match: RegExpMatchArray, editor: Editor) => boolean;
  description: string;
}

/**
 * Handle markdown shortcuts when user types
 */
export function handleMarkdownShortcuts(editor: Editor, text: string): boolean {
  const shortcuts: MarkdownShortcut[] = [
    // Headings
    {
      pattern: /^(#{1,6})\s$/,
      replacement: (match) => {
        const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        editor.chain().focus().toggleHeading({ level }).run();
        return true;
      },
      description: '# for headings (H1-H6)'
    },
    
    // Bullet list
    {
      pattern: /^[-*+]\s$/,
      replacement: () => {
        editor.chain().focus().toggleBulletList().run();
        return true;
      },
      description: '- or * for bullet lists'
    },
    
    // Numbered list
    {
      pattern: /^(\d+)\.\s$/,
      replacement: () => {
        editor.chain().focus().toggleOrderedList().run();
        return true;
      },
      description: '1. for numbered lists'
    },
    
    // Task list
    {
      pattern: /^-\s\[\s?\]\s$/,
      replacement: () => {
        editor.chain().focus().toggleTaskList().run();
        return true;
      },
      description: '- [ ] for task lists'
    },
    
    // Blockquote
    {
      pattern: /^>\s$/,
      replacement: () => {
        editor.chain().focus().toggleBlockquote().run();
        return true;
      },
      description: '> for blockquotes'
    },
    
    // Code block
    {
      pattern: /^```\s$/,
      replacement: () => {
        editor.chain().focus().toggleCodeBlock().run();
        return true;
      },
      description: '``` for code blocks'
    },
    
    // Horizontal rule
    {
      pattern: /^---\s$/,
      replacement: () => {
        editor.chain().focus().setHorizontalRule().run();
        return true;
      },
      description: '--- for horizontal rules'
    },
  ];

  // Check each shortcut pattern
  for (const shortcut of shortcuts) {
    const match = text.match(shortcut.pattern);
    if (match) {
      return shortcut.replacement(match, editor);
    }
  }

  return false;
}

/**
 * Handle inline markdown formatting as user types
 */
export function handleInlineMarkdown(editor: Editor): void {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // Get the current line content
  const lineStart = $from.start($from.depth);
  const lineEnd = $from.end($from.depth);
  const lineText = state.doc.textBetween(lineStart, lineEnd);
  
  // Bold formatting (**text** or __text__)
  const boldPattern = /(\*\*|__)(.*?)\1/g;
  let match;
  while ((match = boldPattern.exec(lineText)) !== null) {
    const from = lineStart + match.index;
    const to = from + match[0].length;
    const content = match[2];
    
    if (content && $from.pos > to) {
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .toggleBold()
        .insertContent(content)
        .run();
    }
  }
  
  // Italic formatting (*text* or _text_)
  const italicPattern = /(\*|_)(.*?)\1/g;
  while ((match = italicPattern.exec(lineText)) !== null) {
    const from = lineStart + match.index;
    const to = from + match[0].length;
    const content = match[2];
    
    if (content && $from.pos > to && !lineText.includes('**') && !lineText.includes('__')) {
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .toggleItalic()
        .insertContent(content)
        .run();
    }
  }
  
  // Inline code (`text`)
  const codePattern = /`([^`]+)`/g;
  while ((match = codePattern.exec(lineText)) !== null) {
    const from = lineStart + match.index;
    const to = from + match[0].length;
    const content = match[1];
    
    if (content && $from.pos > to) {
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .toggleCode()
        .insertContent(content)
        .run();
    }
  }
  
  // Strikethrough (~~text~~)
  const strikePattern = /~~(.*?)~~/g;
  while ((match = strikePattern.exec(lineText)) !== null) {
    const from = lineStart + match.index;
    const to = from + match[0].length;
    const content = match[1];
    
    if (content && $from.pos > to) {
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .toggleStrike()
        .insertContent(content)
        .run();
    }
  }
}

/**
 * Transform editor content to match markdown syntax
 */
export function transformMarkdownSyntax(text: string): string {
  return text
    // Headers
    .replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
      const level = hashes.length;
      return `<h${level}>${content}</h${level}>`;
    })
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/g, '<s>$1</s>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    // Horizontal rules
    .replace(/^---+$/gm, '<hr>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

/**
 * Get markdown syntax help
 */
export function getMarkdownSyntaxHelp(): Array<{ syntax: string; description: string; example: string }> {
  return [
    {
      syntax: '# ## ### ####',
      description: 'Headings',
      example: '# Main Title\n## Subtitle'
    },
    {
      syntax: '**text** or __text__',
      description: 'Bold text',
      example: '**important** or __important__'
    },
    {
      syntax: '*text* or _text_',
      description: 'Italic text',
      example: '*emphasis* or _emphasis_'
    },
    {
      syntax: '~~text~~',
      description: 'Strikethrough',
      example: '~~deleted text~~'
    },
    {
      syntax: '`code`',
      description: 'Inline code',
      example: '`console.log("hello")`'
    },
    {
      syntax: '```\ncode\n```',
      description: 'Code block',
      example: '```javascript\nconst x = 1;\n```'
    },
    {
      syntax: '- item or * item',
      description: 'Bullet list',
      example: '- First item\n- Second item'
    },
    {
      syntax: '1. item',
      description: 'Numbered list',
      example: '1. First item\n2. Second item'
    },
    {
      syntax: '- [ ] task',
      description: 'Task list',
      example: '- [x] Completed\n- [ ] Todo'
    },
    {
      syntax: '> quote',
      description: 'Blockquote',
      example: '> This is a quote'
    },
    {
      syntax: '[text](url)',
      description: 'Link',
      example: '[Google](https://google.com)'
    },
    {
      syntax: '![alt](url)',
      description: 'Image',
      example: '![Logo](logo.png)'
    },
    {
      syntax: '---',
      description: 'Horizontal rule',
      example: '---'
    }
  ];
} 