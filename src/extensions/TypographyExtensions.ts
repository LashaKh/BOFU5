import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    typography: {
      setLineHeight: (lineHeight: string) => ReturnType;
      setLetterSpacing: (letterSpacing: string) => ReturnType;
      setTextIndent: (textIndent: string) => ReturnType;
      setMarginTop: (marginTop: string) => ReturnType;
      setMarginBottom: (marginBottom: string) => ReturnType;
      setColumns: (columns: string) => ReturnType;
      setTextDirection: (direction: 'ltr' | 'rtl') => ReturnType;
    };
  }
}

export const AdvancedTypography = Extension.create({
  name: 'advancedTypography',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
          textIndent: {
            default: null,
            parseHTML: element => element.style.textIndent || null,
            renderHTML: attributes => {
              if (!attributes.textIndent) return {};
              return { style: `text-indent: ${attributes.textIndent}` };
            },
          },
          marginTop: {
            default: null,
            parseHTML: element => element.style.marginTop || null,
            renderHTML: attributes => {
              if (!attributes.marginTop) return {};
              return { style: `margin-top: ${attributes.marginTop}` };
            },
          },
          marginBottom: {
            default: null,
            parseHTML: element => element.style.marginBottom || null,
            renderHTML: attributes => {
              if (!attributes.marginBottom) return {};
              return { style: `margin-bottom: ${attributes.marginBottom}` };
            },
          },
          textDirection: {
            default: null,
            parseHTML: element => element.style.direction || null,
            renderHTML: attributes => {
              if (!attributes.textDirection) return {};
              return { style: `direction: ${attributes.textDirection}` };
            },
          },
          columns: {
            default: null,
            parseHTML: element => element.style.columnCount || null,
            renderHTML: attributes => {
              if (!attributes.columns || attributes.columns === 'none') return {};
              return { style: `column-count: ${attributes.columns}; column-gap: 2rem;` };
            },
          },
        },
      },
      {
        types: ['textStyle'],
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: element => element.style.letterSpacing || null,
            renderHTML: attributes => {
              if (!attributes.letterSpacing) return {};
              return { style: `letter-spacing: ${attributes.letterSpacing}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { lineHeight });
        },
      setLetterSpacing:
        (letterSpacing: string) =>
        ({ commands }) => {
          return commands.setMark('textStyle', { letterSpacing });
        },
      setTextIndent:
        (textIndent: string) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { textIndent });
        },
      setMarginTop:
        (marginTop: string) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { marginTop });
        },
      setMarginBottom:
        (marginBottom: string) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { marginBottom });
        },
      setColumns:
        (columns: string) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { columns });
        },
      setTextDirection:
        (direction: 'ltr' | 'rtl') =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { textDirection: direction });
        },
    };
  },
}); 