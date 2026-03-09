import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { useEffect, useRef } from 'react';

interface JsonCodeEditorProps {
  value: string;
  isDark: boolean;
  onChange: (value: string) => void;
  className?: string;
}

const jsonLightTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--card)',
      color: 'var(--foreground)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', monospace",
      fontSize: '12px',
      lineHeight: '1.5',
      padding: '10px 0',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--sidebar)',
      color: 'var(--muted-foreground)',
      borderRight: '1px solid var(--sidebar-border)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in oklab, var(--muted) 60%, transparent)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'color-mix(in oklab, var(--muted) 70%, transparent)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--foreground)',
    },
    '&.cm-focused': {
      outline: 'none',
    },
  },
  { dark: false }
);

const jsonDarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--card)',
      color: 'var(--foreground)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', monospace",
      fontSize: '12px',
      lineHeight: '1.5',
      padding: '10px 0',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--sidebar)',
      color: 'var(--muted-foreground)',
      borderRight: '1px solid var(--sidebar-border)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in oklab, var(--muted) 55%, transparent)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'color-mix(in oklab, var(--muted) 65%, transparent)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--foreground)',
    },
    '&.cm-focused': {
      outline: 'none',
    },
  },
  { dark: true }
);

export default function JsonCodeEditor({
  value,
  isDark,
  onChange,
  className,
}: JsonCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const initialDarkRef = useRef(isDark);
  const themeCompartment = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        json(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        themeCompartment.current.of(
          initialDarkRef.current ? jsonDarkTheme : jsonLightTheme
        ),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: container,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = view.state.doc.toString();
    if (current === value) return;

    view.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: value,
      },
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: themeCompartment.current.reconfigure(
        isDark ? jsonDarkTheme : jsonLightTheme
      ),
    });
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-slot="json-code-editor"
    />
  );
}
