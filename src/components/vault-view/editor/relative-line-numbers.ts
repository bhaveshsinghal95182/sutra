import { lineNumbers } from '@codemirror/view';

export function relativeLineNumbers() {
  return lineNumbers({
    formatNumber(lineNo: number, state) {
      const cursorLine = state.doc.lineAt(state.selection.main.head).number;
      if (lineNo === cursorLine) return String(lineNo);
      return String(Math.abs(lineNo - cursorLine));
    },
  });
}
