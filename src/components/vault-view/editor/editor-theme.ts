import { EditorView } from '@codemirror/view';

export const lightTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--background)',
      color: 'var(--foreground)',
      height: '100%',
    },
    '.cm-content': {
      caretColor: 'var(--foreground)',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', monospace",
      fontSize: '14px',
      lineHeight: '1.7',
      padding: '16px 0',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--foreground)',
      borderLeftWidth: '2px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--card)',
      color: 'var(--muted-foreground)',
      border: 'none',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      minWidth: '3.5em',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'color-mix(in oklab, var(--muted) 70%, transparent)',
      color: 'var(--foreground)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in oklab, var(--muted) 50%, transparent)',
    },
    '.cm-selectionBackground': {
      backgroundColor:
        'color-mix(in oklab, var(--ring) 15%, transparent) !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor:
        'color-mix(in oklab, var(--ring) 20%, transparent) !important',
    },
    '.cm-line': {
      padding: '0 32px',
    },
    // WYSIWYG styles
    '.cm-wysiwyg-bold': {
      fontWeight: '700',
    },
    '.cm-wysiwyg-italic': {
      fontStyle: 'italic',
    },
    '.cm-wysiwyg-strikethrough': {
      textDecoration: 'line-through',
      opacity: '0.6',
    },
    '.cm-wysiwyg-code': {
      backgroundColor: 'var(--muted)',
      borderRadius: '3px',
      padding: '1px 4px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.9em',
      color: 'var(--primary)',
    },
    '.cm-wysiwyg-marker': {
      fontSize: '0.75em',
      color: 'var(--muted-foreground)',
      opacity: '0.35',
      fontWeight: 'normal',
    },
    '.cm-wysiwyg-marker-hash': {
      fontSize: '0.6em',
      letterSpacing: '-1px',
    },
    '.cm-wysiwyg-heading': {
      fontWeight: '700',
      lineHeight: '1.3',
    },
    '.cm-wysiwyg-heading-active': {
      // Slightly smaller on active line to reduce content shift
    },
    '.cm-wysiwyg-h1': { fontSize: '2em' },
    '.cm-wysiwyg-h2': { fontSize: '1.65em' },
    '.cm-wysiwyg-h3': { fontSize: '1.35em' },
    '.cm-wysiwyg-h4': { fontSize: '1.15em' },
    '.cm-wysiwyg-h5': { fontSize: '1.05em' },
    '.cm-wysiwyg-h6': { fontSize: '1em', opacity: '0.7' },
    '.cm-wysiwyg-blockquote': {
      borderLeft: '3px solid var(--border)',
      paddingLeft: '12px !important',
      color: 'var(--muted-foreground)',
      fontStyle: 'italic',
    },
    '.cm-wysiwyg-link': {
      color: 'var(--primary)',
      textDecoration: 'underline',
      textDecorationColor: 'var(--primary)',
    },
    '.cm-wysiwyg-codeblock': {
      backgroundColor: 'var(--muted)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.9em',
    },
    '.cm-wysiwyg-hr': {
      borderBottom: '2px solid var(--border)',
      opacity: '0.5',
    },
    '.cm-wysiwyg-list-item': {
      paddingLeft: '4px !important',
    },
    '.cm-math-inline': {
      padding: '0 2px',
    },
    '.cm-math-display': {
      display: 'block',
      textAlign: 'center',
      padding: '8px 0',
    },
  },
  { dark: false }
);

export const darkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--background)',
      color: 'var(--foreground)',
      height: '100%',
    },
    '.cm-content': {
      caretColor: 'var(--foreground)',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', monospace",
      fontSize: '14px',
      lineHeight: '1.7',
      padding: '16px 0',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--foreground)',
      borderLeftWidth: '2px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--card)',
      color: 'var(--muted-foreground)',
      border: 'none',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      minWidth: '3.5em',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'color-mix(in oklab, var(--muted) 65%, transparent)',
      color: 'var(--foreground)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in oklab, var(--muted) 45%, transparent)',
    },
    '.cm-selectionBackground': {
      backgroundColor:
        'color-mix(in oklab, var(--ring) 12%, transparent) !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor:
        'color-mix(in oklab, var(--ring) 18%, transparent) !important',
    },
    '.cm-line': {
      padding: '0 32px',
    },
    // WYSIWYG styles
    '.cm-wysiwyg-bold': {
      fontWeight: '700',
    },
    '.cm-wysiwyg-italic': {
      fontStyle: 'italic',
    },
    '.cm-wysiwyg-strikethrough': {
      textDecoration: 'line-through',
      opacity: '0.6',
    },
    '.cm-wysiwyg-code': {
      backgroundColor: 'var(--muted)',
      borderRadius: '3px',
      padding: '1px 4px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.9em',
      color: 'var(--primary)',
    },
    '.cm-wysiwyg-marker': {
      fontSize: '0.75em',
      color: 'var(--muted-foreground)',
      opacity: '0.3',
      fontWeight: 'normal',
    },
    '.cm-wysiwyg-marker-hash': {
      fontSize: '0.6em',
      letterSpacing: '-1px',
    },
    '.cm-wysiwyg-heading': {
      fontWeight: '700',
      lineHeight: '1.3',
    },
    '.cm-wysiwyg-heading-active': {},
    '.cm-wysiwyg-h1': { fontSize: '2em' },
    '.cm-wysiwyg-h2': { fontSize: '1.65em' },
    '.cm-wysiwyg-h3': { fontSize: '1.35em' },
    '.cm-wysiwyg-h4': { fontSize: '1.15em' },
    '.cm-wysiwyg-h5': { fontSize: '1.05em' },
    '.cm-wysiwyg-h6': { fontSize: '1em', opacity: '0.7' },
    '.cm-wysiwyg-blockquote': {
      borderLeft: '3px solid var(--border)',
      paddingLeft: '12px !important',
      color: 'var(--muted-foreground)',
      fontStyle: 'italic',
    },
    '.cm-wysiwyg-link': {
      color: 'var(--primary)',
      textDecoration: 'underline',
      textDecorationColor: 'var(--primary)',
    },
    '.cm-wysiwyg-codeblock': {
      backgroundColor: 'var(--muted)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.9em',
    },
    '.cm-wysiwyg-hr': {
      borderBottom: '2px solid var(--border)',
      opacity: '0.5',
    },
    '.cm-wysiwyg-list-item': {
      paddingLeft: '4px !important',
    },
    '.cm-math-inline': {
      padding: '0 2px',
    },
    '.cm-math-display': {
      display: 'block',
      textAlign: 'center',
      padding: '8px 0',
    },
  },
  { dark: true }
);
