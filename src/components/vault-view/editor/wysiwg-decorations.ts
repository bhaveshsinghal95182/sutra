import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import katex from 'katex';

// Widget to render math equations
class MathWidget extends WidgetType {
  constructor(
    private math: string,
    private displayMode: boolean
  ) {
    super();
  }

  eq(other: MathWidget) {
    return other.math === this.math && other.displayMode === this.displayMode;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = this.displayMode ? 'cm-math-display' : 'cm-math-inline';
    try {
      katex.render(this.math, span, {
        displayMode: this.displayMode,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      span.textContent = this.math;
    }
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

function getActiveLines(view: EditorView): Set<number> {
  const lines = new Set<number>();
  for (const range of view.state.selection.ranges) {
    const startLine = view.state.doc.lineAt(range.from).number;
    const endLine = view.state.doc.lineAt(range.to).number;
    for (let i = startLine; i <= endLine; i++) {
      lines.add(i);
    }
  }
  return lines;
}

function buildDecorations(
  view: EditorView,
  forcePreview = false
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const activeLines = forcePreview ? new Set<number>() : getActiveLines(view);
  const doc = view.state.doc;

  // Detect math expressions via regex
  const docText = doc.toString();

  // Display math $$...$$
  const displayMathRegex = /\$\$([^$]+?)\$\$/g;
  let match;
  while ((match = displayMathRegex.exec(docText)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    const lineNum = doc.lineAt(from).number;
    const endLineNum = doc.lineAt(to).number;
    let isActive = false;
    for (let i = lineNum; i <= endLineNum; i++) {
      if (activeLines.has(i)) {
        isActive = true;
        break;
      }
    }
    if (!isActive) {
      decorations.push(
        Decoration.replace({
          widget: new MathWidget(match[1].trim(), true),
        }).range(from, to)
      );
    } else {
      decorations.push(
        Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(from, from + 2)
      );
      decorations.push(
        Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(to - 2, to)
      );
    }
  }

  // Inline math $...$  (not $$)
  const inlineMathRegex = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;
  while ((match = inlineMathRegex.exec(docText)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    const lineNum = doc.lineAt(from).number;
    const isActiveLine = activeLines.has(lineNum);
    if (!isActiveLine) {
      decorations.push(
        Decoration.replace({
          widget: new MathWidget(match[1].trim(), false),
        }).range(from, to)
      );
    } else {
      decorations.push(
        Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(from, from + 1)
      );
      decorations.push(
        Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(to - 1, to)
      );
    }
  }

  syntaxTree(view.state).iterate({
    enter(node) {
      const lineNum = doc.lineAt(node.from).number;
      const isActiveLine = activeLines.has(lineNum);

      switch (node.name) {
        // Bold: StrongEmphasis
        case 'StrongEmphasis': {
          decorations.push(
            Decoration.mark({ class: 'cm-wysiwyg-bold' }).range(
              node.from,
              node.to
            )
          );
          const content = doc.sliceString(node.from, node.to);
          const markerLen = content.startsWith('__') ? 2 : 2;
          if (!isActiveLine) {
            decorations.push(
              Decoration.replace({}).range(node.from, node.from + markerLen)
            );
            decorations.push(
              Decoration.replace({}).range(node.to - markerLen, node.to)
            );
          } else {
            decorations.push(
              Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(
                node.from,
                node.from + markerLen
              )
            );
            decorations.push(
              Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(
                node.to - markerLen,
                node.to
              )
            );
          }
          break;
        }

        // Italic: Emphasis
        case 'Emphasis': {
          decorations.push(
            Decoration.mark({ class: 'cm-wysiwyg-italic' }).range(
              node.from,
              node.to
            )
          );
          if (!isActiveLine) {
            decorations.push(
              Decoration.replace({}).range(node.from, node.from + 1)
            );
            decorations.push(
              Decoration.replace({}).range(node.to - 1, node.to)
            );
          } else {
            decorations.push(
              Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(
                node.from,
                node.from + 1
              )
            );
            decorations.push(
              Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(
                node.to - 1,
                node.to
              )
            );
          }
          break;
        }

        // Strikethrough
        case 'Strikethrough': {
          decorations.push(
            Decoration.mark({ class: 'cm-wysiwyg-strikethrough' }).range(
              node.from,
              node.to
            )
          );
          if (!isActiveLine) {
            decorations.push(
              Decoration.replace({}).range(node.from, node.from + 2)
            );
            decorations.push(
              Decoration.replace({}).range(node.to - 2, node.to)
            );
          } else {
            decorations.push(
              Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(
                node.from,
                node.from + 2
              )
            );
            decorations.push(
              Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(
                node.to - 2,
                node.to
              )
            );
          }
          break;
        }

        // Inline code
        case 'InlineCode': {
          decorations.push(
            Decoration.mark({ class: 'cm-wysiwyg-code' }).range(
              node.from,
              node.to
            )
          );
          if (!isActiveLine) {
            decorations.push(
              Decoration.replace({}).range(node.from, node.from + 1)
            );
            decorations.push(
              Decoration.replace({}).range(node.to - 1, node.to)
            );
          } else {
            decorations.push(
              Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(
                node.from,
                node.from + 1
              )
            );
            decorations.push(
              Decoration.mark({ class: 'cm-wysiwyg-marker' }).range(
                node.to - 1,
                node.to
              )
            );
          }
          break;
        }

        // Headings
        case 'ATXHeading1':
        case 'ATXHeading2':
        case 'ATXHeading3':
        case 'ATXHeading4':
        case 'ATXHeading5':
        case 'ATXHeading6': {
          const level = parseInt(node.name.replace('ATXHeading', ''));
          // Always apply heading style
          decorations.push(
            Decoration.line({
              class: `cm-wysiwyg-heading cm-wysiwyg-h${level}${isActiveLine ? ' cm-wysiwyg-heading-active' : ''}`,
            }).range(doc.lineAt(node.from).from)
          );
          if (!isActiveLine) {
            // Hide the # marks
            const line = doc.lineAt(node.from);
            const text = line.text;
            const hashEnd = text.indexOf(' ') + 1;
            if (hashEnd > 0) {
              decorations.push(
                Decoration.replace({}).range(line.from, line.from + hashEnd)
              );
            }
          } else {
            // Dim the # marks on active line
            const line = doc.lineAt(node.from);
            const text = line.text;
            const hashEnd = text.indexOf(' ');
            if (hashEnd > 0) {
              decorations.push(
                Decoration.mark({
                  class: 'cm-wysiwyg-marker cm-wysiwyg-marker-hash',
                }).range(line.from, line.from + hashEnd)
              );
            }
          }
          break;
        }

        // Blockquote
        case 'Blockquote': {
          const startLine = doc.lineAt(node.from).number;
          const endLine = doc.lineAt(node.to).number;
          for (let i = startLine; i <= endLine; i++) {
            const line = doc.line(i);
            decorations.push(
              Decoration.line({ class: 'cm-wysiwyg-blockquote' }).range(
                line.from
              )
            );
          }
          break;
        }

        // Links
        case 'Link': {
          decorations.push(
            Decoration.mark({ class: 'cm-wysiwyg-link' }).range(
              node.from,
              node.to
            )
          );
          break;
        }

        // Code blocks
        case 'FencedCode': {
          const startLine = doc.lineAt(node.from).number;
          const endLine = doc.lineAt(node.to).number;
          for (let i = startLine; i <= endLine; i++) {
            const line = doc.line(i);
            decorations.push(
              Decoration.line({ class: 'cm-wysiwyg-codeblock' }).range(
                line.from
              )
            );
          }
          break;
        }

        // Horizontal rule
        case 'HorizontalRule': {
          decorations.push(
            Decoration.line({ class: 'cm-wysiwyg-hr' }).range(
              doc.lineAt(node.from).from
            )
          );
          break;
        }

        // List items
        case 'ListItem': {
          decorations.push(
            Decoration.line({ class: 'cm-wysiwyg-list-item' }).range(
              doc.lineAt(node.from).from
            )
          );
          break;
        }
      }
    },
  });

  // Sort decorations by from position, then by startSide
  decorations.sort(
    (a, b) => a.from - b.from || a.value.startSide - b.value.startSide
  );

  return Decoration.set(decorations);
}

export const wysiwygPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export const wysiwygPreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view, true);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view, true);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
