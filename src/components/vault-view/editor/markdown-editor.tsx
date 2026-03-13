import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import {
  bracketMatching,
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { Compartment, EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { Strikethrough } from '@lezer/markdown';
import { vim } from '@replit/codemirror-vim';
import { useCallback, useEffect, useRef } from 'react';

import { darkTheme, lightTheme } from './editor-theme';
import { relativeLineNumbers } from './relative-line-numbers';
import { wysiwygPlugin } from './wysiwg-decorations';

interface MarkdownEditorProps {
  content: string;
  isDark: boolean;
  showLineNumbers: boolean;
  showRelativeNumbers: boolean;
  vimMode: boolean;
  onContentChange?: (content: string) => void;
}

export const SAMPLE_CONTENT = `# Welcome to the Markdown Editor

This editor supports **inline WYSIWYG** rendering. Try typing some markdown!

## Features

- **Bold text** renders inline
- *Italic text* also works
- ~~Strikethrough~~ is supported
- \`inline code\` gets highlighted

### Code Blocks

\`\`\`javascript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

> Blockquotes are styled with a left border
> and italic text for a clean look.

### Math Equations

Inline math: $E = mc^2$ and $\\int_0^\\infty e^{-x} dx = 1$

Display math:

$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$

### Links

Check out [CodeMirror](https://codemirror.net) for more info.

---

#### Tips

1. Click on a formatted line to see the raw markdown
2. Move away to see the rendered preview
3. Toggle line numbers and relative numbers in the toolbar
4. Switch between light and dark themes

Happy writing! ✍️
`;

export default function MarkdownEditor({
  content,
  isDark,
  showLineNumbers,
  showRelativeNumbers,
  vimMode,
  onContentChange,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialContentRef = useRef(content);
  const onContentChangeRef = useRef(onContentChange);
  const themeCompartment = useRef(new Compartment());
  const lineNumberCompartment = useRef(new Compartment());
  const vimCompartment = useRef(new Compartment());

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  const getLineNumberExtension = useCallback(() => {
    if (!showLineNumbers) return [];
    if (showRelativeNumbers)
      return [relativeLineNumbers(), highlightActiveLineGutter()];
    return [lineNumbers(), highlightActiveLineGutter()];
  }, [showLineNumbers, showRelativeNumbers]);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: initialContentRef.current,
      extensions: [
        vimCompartment.current.of([]),
        themeCompartment.current.of(lightTheme),
        lineNumberCompartment.current.of([]),
        wysiwygPlugin,
        highlightActiveLine(),
        drawSelection(),
        history(),
        bracketMatching(),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
          extensions: [Strikethrough],
        }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onContentChangeRef.current) {
            onContentChangeRef.current(update.state.doc.toString());
            console.log('live content', update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;
    const view = viewRef.current;
    const current = view.state.doc.toString();
    if (current === content) return;
    view.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: content,
      },
    });
  }, [content]);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(
        isDark ? darkTheme : lightTheme
      ),
    });
  }, [isDark]);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: lineNumberCompartment.current.reconfigure(
        getLineNumberExtension()
      ),
    });
  }, [showLineNumbers, showRelativeNumbers, getLineNumberExtension]);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: vimCompartment.current.reconfigure(vimMode ? vim() : []),
    });
  }, [vimMode]);

  return (
    <div
      ref={editorRef}
      className="h-full w-full overflow-hidden [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto"
    />
  );
}
