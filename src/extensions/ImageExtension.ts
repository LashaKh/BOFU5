import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { NodeSelection } from '@tiptap/pm/state';

export interface ImageOptions {
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
  inline: boolean;
  allowResize: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageWithResize: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

// Helper functions for image manipulation
const handleImageResize = (editor: any, pos: number, event: MouseEvent) => {
  console.log('Resize started', { pos, event });
  // TODO: Implement actual resize logic
};

const editImageCaption = (editor: any, pos: number) => {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;

  const currentCaption = node.attrs.caption || '';
  const newCaption = window.prompt('Enter image caption:', currentCaption);
  
  if (newCaption !== null) {
    editor.chain().focus().updateAttributes('imageWithResize', {
      caption: newCaption,
    }).run();
  }
};

const deleteImage = (editor: any, pos: number) => {
  if (window.confirm('Delete this image?')) {
    editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
  }
};

export const ImageWithResize = Node.create<ImageOptions>({
  name: 'imageWithResize',

  addOptions() {
    return {
      allowBase64: false,
      HTMLAttributes: {},
      inline: false,
      allowResize: true,
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      caption: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: dom => {
          const element = dom as HTMLElement;
          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            width: element.getAttribute('width') ? parseInt(element.getAttribute('width')!) : null,
            height: element.getAttribute('height') ? parseInt(element.getAttribute('height')!) : null,
            caption: element.getAttribute('data-caption'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { caption, ...imageAttrs } = HTMLAttributes;
    
    if (caption) {
      return [
        'figure',
        { class: 'image-figure' },
        ['img', mergeAttributes(this.options.HTMLAttributes, imageAttrs)],
        ['figcaption', { class: 'image-caption' }, caption],
      ];
    }

    return ['img', mergeAttributes(this.options.HTMLAttributes, imageAttrs)];
  },

  addCommands() {
    return {
      setImage:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: match => {
          const [, , alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    if (!this.options.allowResize) {
      return [];
    }

    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('imageResize'),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            const { doc, selection } = state;

            // Check if selection is a NodeSelection and the selected node is an image
            if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
              const pos = selection.from;
              decorations.push(
                Decoration.widget(pos + 1, () => {
                  const resizeHandle = document.createElement('div');
                  resizeHandle.className = 'image-resize-handle';
                  resizeHandle.innerHTML = `
                    <div class="image-controls">
                      <button class="resize-handle resize-nw" data-direction="nw"></button>
                      <button class="resize-handle resize-ne" data-direction="ne"></button>
                      <button class="resize-handle resize-sw" data-direction="sw"></button>
                      <button class="resize-handle resize-se" data-direction="se"></button>
                      <div class="image-toolbar">
                        <button class="image-edit-caption" title="Edit Caption">📝</button>
                        <button class="image-delete" title="Delete Image">🗑️</button>
                      </div>
                    </div>
                  `;

                  // Add resize functionality
                  const handles = resizeHandle.querySelectorAll('.resize-handle');
                  handles.forEach(handle => {
                    handle.addEventListener('mousedown', (e) => {
                      e.preventDefault();
                      handleImageResize(editor, pos, e as MouseEvent);
                    });
                  });

                  // Add caption editing
                  const captionBtn = resizeHandle.querySelector('.image-edit-caption');
                  captionBtn?.addEventListener('click', () => {
                    editImageCaption(editor, pos);
                  });

                  // Add delete functionality
                  const deleteBtn = resizeHandle.querySelector('.image-delete');
                  deleteBtn?.addEventListener('click', () => {
                    deleteImage(editor, pos);
                  });

                  return resizeHandle;
                }, {
                  side: 1,
                  marks: [],
                })
              );
            }

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
}); 