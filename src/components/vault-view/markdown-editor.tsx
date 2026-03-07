import { ChevronRight, ChevronsUpDown } from 'lucide-react';
import {
  forwardRef,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  previewMode?: boolean;
  highlightedSection?: { start: number; end: number } | null;
  onWikilinkClick?: (target: string) => void;
}

const LINE_MIN_H = 'min-h-[1.875rem]';
const LONG_LINE_THRESHOLD = 200;

/* ── Heading-level utilities ── */

function getHeadingLevel(line: string): number | null {
  const m = line.match(/^(#{1,6})\s/);
  return m ? m[1].length : null;
}

/** Given lines array, compute which line indices are hidden by heading folds */
function computeVisibility(
  lines: string[],
  collapsedHeadings: Set<number>
): boolean[] {
  const visible = new Array(lines.length).fill(true);

  for (const headIdx of collapsedHeadings) {
    const headLevel = getHeadingLevel(lines[headIdx]);
    if (headLevel === null) continue;
    // hide everything after headIdx until a heading of same or higher level
    for (let i = headIdx + 1; i < lines.length; i++) {
      const lvl = getHeadingLevel(lines[i]);
      if (lvl !== null && lvl <= headLevel) break;
      visible[i] = false;
    }
  }

  return visible;
}

export const HIGHLIGHT_DURATION = 2000;

const MarkdownEditor = forwardRef<HTMLDivElement, MarkdownEditorProps>(
  (
    { content, onChange, previewMode, highlightedSection, onWikilinkClick },
    ref
  ) => {
    const lines = content.split('\n');
    const [editingLine, setEditingLine] = useState<number | null>(null);
    const [collapsedHeadings, setCollapsedHeadings] = useState<Set<number>>(
      new Set()
    );
    const [expandedLongLines, setExpandedLongLines] = useState<Set<number>>(
      new Set()
    );
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const visibility = useMemo(
      () => computeVisibility(lines, collapsedHeadings),
      [lines, collapsedHeadings]
    );

    // Auto-resize textarea on edit
    useEffect(() => {
      if (editingLine !== null && inputRef.current) {
        const el = inputRef.current;
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
      }
    }, [editingLine]);

    const toggleHeadingCollapse = useCallback((lineIndex: number) => {
      setCollapsedHeadings((prev) => {
        const next = new Set(prev);
        if (next.has(lineIndex)) next.delete(lineIndex);
        else next.add(lineIndex);
        return next;
      });
    }, []);

    const toggleLongLine = useCallback((lineIndex: number) => {
      setExpandedLongLines((prev) => {
        const next = new Set(prev);
        if (next.has(lineIndex)) next.delete(lineIndex);
        else next.add(lineIndex);
        return next;
      });
    }, []);

    const updateLine = useCallback(
      (index: number, value: string) => {
        const next = [...lines];
        next[index] = value;
        onChange(next.join('\n'));
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height =
              inputRef.current.scrollHeight + 'px';
          }
        });
      },
      [lines, onChange]
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
        const el = inputRef.current;
        if (!el) return;

        // Auto-complete brackets
        const bracketPairs: { [key: string]: string } = {
          '[': ']',
          '{': '}',
          '(': ')',
          '`': '`',
          '*': '*',
        };

        if (bracketPairs[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const pos = el.selectionStart;
          const val = lines[index];
          const before = val.slice(0, pos);
          const after = val.slice(pos);
          const closing = bracketPairs[e.key];

          // For self-closing pairs (` and *), skip if next char is already the same
          if (e.key === closing && after[0] === closing) return;

          e.preventDefault();
          const newVal = before + e.key + closing + after;
          const next = [...lines];
          next[index] = newVal;
          onChange(next.join('\n'));

          // Position cursor inside brackets
          requestAnimationFrame(() => {
            el.selectionStart = pos + 1;
            el.selectionEnd = pos + 1;
          });
          return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (el) {
            const pos = el.selectionStart;
            const val = lines[index];
            const before = val.slice(0, pos);
            const after = val.slice(pos);

            // Auto-indent: capture leading whitespace from the current line
            const wsMatch = before.match(/^(\s+)/);
            const leadingWs = wsMatch ? wsMatch[1] : '';

            const next = [...lines];
            next[index] = before;
            next.splice(index + 1, 0, leadingWs + after);
            onChange(next.join('\n'));
            setEditingLine(index + 1);
          }
        } else if (e.key === 'ArrowUp' && index > 0) {
          if (
            el &&
            el.selectionStart <=
              (lines[index].lastIndexOf('\n', el.selectionStart - 1) + 1 || 0)
          ) {
            e.preventDefault();
            setEditingLine(index - 1);
          }
        } else if (e.key === 'ArrowDown' && index < lines.length - 1) {
          if (el && el.selectionStart >= lines[index].length) {
            e.preventDefault();
            setEditingLine(index + 1);
          }
        } else if (
          e.key === 'Backspace' &&
          el.selectionStart === 0 &&
          el.selectionEnd === 0 &&
          index > 0
        ) {
          e.preventDefault();
          const next = [...lines];
          const merged = next[index - 1] + next[index];
          next[index - 1] = merged;
          next.splice(index, 1);
          onChange(next.join('\n'));
          setEditingLine(index - 1);
        }
      },
      [lines, onChange]
    );

    /* ── Count hidden lines for a collapsed heading ── */
    const getHiddenCount = useCallback(
      (headIdx: number): number => {
        const headLevel = getHeadingLevel(lines[headIdx]);
        if (headLevel === null) return 0;
        let count = 0;
        for (let i = headIdx + 1; i < lines.length; i++) {
          const lvl = getHeadingLevel(lines[i]);
          if (lvl !== null && lvl <= headLevel) break;
          count++;
        }
        return count;
      },
      [lines]
    );

    if (previewMode) {
      return (
        <div ref={ref} className="flex flex-1 overflow-y-auto justify-center">
          <div className="flex w-full max-w-3xl">
            <div className="flex flex-1 flex-col py-6 px-8">
              {lines.map((line, i) => {
                const isHighlightedPreview =
                  highlightedSection &&
                  i >= highlightedSection.start &&
                  i <= highlightedSection.end;
                return visibility[i] ? (
                  <div
                    key={i}
                    id={
                      getHeadingLevel(line) !== null
                        ? `heading-${i}`
                        : undefined
                    }
                    className={cn(
                      'flex items-start gap-1 scroll-mt-4 rounded-sm transition-colors duration-500',
                      isHighlightedPreview && 'bg-yellow-400/25'
                    )}
                  >
                    {getHeadingLevel(line) !== null && (
                      <button
                        onClick={() => toggleHeadingCollapse(i)}
                        className="mt-1 flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      >
                        <ChevronRight
                          size={12}
                          className={cn(
                            'transition-transform',
                            !collapsedHeadings.has(i) && 'rotate-90'
                          )}
                        />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <PreviewLine
                        line={line}
                        onWikilinkClick={onWikilinkClick}
                      />
                      {collapsedHeadings.has(i) && (
                        <button
                          onClick={() => toggleHeadingCollapse(i)}
                          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground ml-1"
                        >
                          {getHiddenCount(i)} lines hidden
                        </button>
                      )}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="flex flex-1 overflow-y-auto justify-center">
        <div
          className="grid w-full max-w-3xl py-4"
          style={{ gridTemplateColumns: 'auto auto 1fr' }}
        >
          {lines.map((line, i) => {
            if (!visibility[i]) return null;

            const headingLevel = getHeadingLevel(line);
            const isLong =
              line.length > LONG_LINE_THRESHOLD && editingLine !== i;
            const isLongExpanded = expandedLongLines.has(i);
            const isHighlighted =
              highlightedSection &&
              i >= highlightedSection.start &&
              i <= highlightedSection.end;

            return (
              <div key={i} className="contents">
                {/* Fold gutter */}
                <div
                  id={headingLevel !== null ? `heading-${i}` : undefined}
                  className="flex items-start justify-center w-5 pt-[0.35rem] pl-1 scroll-mt-4"
                >
                  {headingLevel !== null ? (
                    <button
                      onClick={() => toggleHeadingCollapse(i)}
                      className="flex size-4 items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <ChevronRight
                        size={11}
                        className={cn(
                          'transition-transform',
                          !collapsedHeadings.has(i) && 'rotate-90'
                        )}
                      />
                    </button>
                  ) : null}
                </div>

                {/* Line number */}
                <div
                  className={cn(
                    'select-none font-mono text-xs text-muted-foreground/40 pr-3 pt-[0.4rem] text-right transition-colors duration-500',
                    isHighlighted && 'bg-yellow-400/25'
                  )}
                >
                  {i + 1}
                </div>

                {/* Line content */}
                <div
                  className={cn(
                    'pr-8 pl-2 min-w-0 transition-colors duration-500',
                    isHighlighted && 'bg-yellow-400/25'
                  )}
                >
                  {editingLine === i ? (
                    <textarea
                      ref={inputRef}
                      value={line}
                      onChange={(e) => updateLine(i, e.target.value)}
                      onBlur={() => setEditingLine(null)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      rows={1}
                      className={cn(
                        LINE_MIN_H,
                        'w-full resize-none overflow-hidden bg-transparent font-mono text-sm leading-[1.875rem] text-foreground outline-none caret-foreground'
                      )}
                      spellCheck={false}
                    />
                  ) : isLong && !isLongExpanded ? (
                    <div className="flex flex-col">
                      <RenderedLine
                        line={line.slice(0, LONG_LINE_THRESHOLD) + '…'}
                        onClick={() => setEditingLine(i)}
                        onWikilinkClick={onWikilinkClick}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLongLine(i);
                        }}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground py-0.5 self-start"
                      >
                        <ChevronsUpDown size={10} />
                        Show more ({line.length} chars)
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <RenderedLine
                        line={line}
                        onClick={() => setEditingLine(i)}
                        onWikilinkClick={onWikilinkClick}
                      />
                      {isLong && isLongExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLongLine(i);
                          }}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground py-0.5 self-start"
                        >
                          <ChevronsUpDown size={10} />
                          Show less
                        </button>
                      )}
                      {collapsedHeadings.has(i) && headingLevel !== null && (
                        <button
                          onClick={() => toggleHeadingCollapse(i)}
                          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground py-0.5 self-start"
                        >
                          ··· {getHiddenCount(i)} lines hidden
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';

/* ── YouTube embed helper ── */

function getYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
}

const YouTubeEmbed = ({ videoId }: { videoId: string }) => (
  <div className="py-2">
    <div
      className="relative w-full overflow-hidden rounded-md border border-border/40"
      style={{ paddingBottom: '56.25%' }}
    >
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  </div>
);

/* ── Preview-only line ── */

const PreviewLine = ({
  line,
  onWikilinkClick,
}: {
  line: string;
  onWikilinkClick?: (target: string) => void;
}) => {
  const h1 = line.match(/^# (.+)$/);
  const h2 = line.match(/^## (.+)$/);
  const h3 = line.match(/^### (.+)$/);
  const ul = line.match(/^(\s*)[-*] (.+)$/);
  const ol = line.match(/^(\s*)(\d+)\. (.+)$/);
  const bq = line.match(/^> (.+)$/);
  const img = line.match(/^!\[(.*)?\]\((.+?)\)$/);

  const ytId = getYouTubeId(line);
  const getIndent = (s: string) => s.replace(/\t/g, '  ').length * 12;

  if (line.trim() === '') return <div className="h-4" />;
  if (ytId) return <YouTubeEmbed videoId={ytId} />;

  const base = 'py-0.5 break-words';
  const r = (t: string) => renderInlinePreview(t, onWikilinkClick);

  if (img) {
    return (
      <div className={cn(base, 'py-2')}>
        <img
          src={img[2]}
          alt={img[1] || ''}
          className="max-w-full rounded-md"
        />
      </div>
    );
  }
  if (h3)
    return (
      <div className={cn(base, 'font-semibold text-sm text-foreground/85')}>
        {r(h3[1])}
      </div>
    );
  if (h2)
    return (
      <div className={cn(base, 'font-semibold text-base text-foreground')}>
        {r(h2[1])}
      </div>
    );
  if (h1)
    return (
      <div className={cn(base, 'font-bold text-lg text-foreground')}>
        {r(h1[1])}
      </div>
    );
  if (bq)
    return (
      <div
        className={cn(
          base,
          'border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground'
        )}
      >
        {r(bq[1])}
      </div>
    );
  if (ul)
    return (
      <div
        className={cn(base, 'flex gap-2 text-sm text-foreground')}
        style={{ paddingLeft: `${getIndent(ul[1])}px` }}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-foreground/50 mt-2.5" />
        <span className="break-words">{r(ul[2])}</span>
      </div>
    );
  if (ol)
    return (
      <div
        className={cn(base, 'flex gap-1.5 text-sm text-foreground')}
        style={{ paddingLeft: `${getIndent(ol[1])}px` }}
      >
        <span className="text-muted-foreground shrink-0">{ol[2]}.</span>
        <span className="break-words">{r(ol[3])}</span>
      </div>
    );

  return <div className={cn(base, 'text-sm text-foreground')}>{r(line)}</div>;
};

/* ── Rendered (editor) line ── */

const RenderedLine = ({
  line,
  onClick,
  onWikilinkClick,
}: {
  line: string;
  onClick: () => void;
  onWikilinkClick?: (target: string) => void;
}) => {
  const h1 = line.match(/^# (.+)$/);
  const h2 = line.match(/^## (.+)$/);
  const h3 = line.match(/^### (.+)$/);
  const ul = line.match(/^(\s*)[-*] (.+)$/);
  const ol = line.match(/^(\s*)(\d+)\. (.+)$/);
  const bq = line.match(/^> (.+)$/);

  const ytId = getYouTubeId(line);
  const getIndent = (s: string) => s.replace(/\t/g, '  ').length * 12;

  if (line.trim() === '') {
    return (
      <div onClick={onClick} className={cn(LINE_MIN_H, 'w-full cursor-text')} />
    );
  }
  if (ytId)
    return (
      <div onClick={onClick} className="cursor-text">
        <YouTubeEmbed videoId={ytId} />
      </div>
    );

  const base = cn(LINE_MIN_H, 'cursor-text py-0.5 break-words');
  const r = (t: string) => renderInline(t, onWikilinkClick);

  if (h3)
    return (
      <div
        onClick={onClick}
        className={cn(base, 'font-semibold text-sm text-foreground/85')}
      >
        {r(h3[1])}
      </div>
    );
  if (h2)
    return (
      <div
        onClick={onClick}
        className={cn(base, 'font-semibold text-base text-foreground')}
      >
        {r(h2[1])}
      </div>
    );
  if (h1)
    return (
      <div
        onClick={onClick}
        className={cn(base, 'font-bold text-lg text-foreground')}
      >
        {r(h1[1])}
      </div>
    );
  if (bq)
    return (
      <div
        onClick={onClick}
        className={cn(
          base,
          'border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground'
        )}
      >
        {r(bq[1])}
      </div>
    );
  if (ul)
    return (
      <div
        onClick={onClick}
        className={cn(base, 'flex gap-2 text-sm text-foreground')}
        style={{ paddingLeft: `${getIndent(ul[1])}px` }}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-foreground/50 mt-2.5" />
        <span className="break-words">{r(ul[2])}</span>
      </div>
    );
  if (ol)
    return (
      <div
        onClick={onClick}
        className={cn(base, 'flex gap-1.5 text-sm text-foreground')}
        style={{ paddingLeft: `${getIndent(ol[1])}px` }}
      >
        <span className="text-muted-foreground shrink-0">{ol[2]}.</span>
        <span className="break-words">{r(ol[3])}</span>
      </div>
    );

  return (
    <div onClick={onClick} className={cn(base, 'text-sm text-foreground')}>
      {r(line)}
    </div>
  );
};

/* ── Inline formatting (editor mode) ── */

function renderInline(
  text: string,
  onWikilinkClick?: (target: string) => void
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex =
    /(\[\[(.+?)\]\]|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) {
      // Wikilink [[target]]
      const target = match[2];
      parts.push(
        <button
          key={match.index}
          onClick={(e) => {
            e.stopPropagation();
            onWikilinkClick?.(target);
          }}
          className="text-sidebar-primary underline decoration-sidebar-primary/40 hover:decoration-sidebar-primary cursor-pointer font-medium"
        >
          {target.startsWith('#') ? target.slice(1) : target}
        </button>
      );
    } else if (match[3]) {
      parts.push(
        <strong key={match.index} className="font-bold">
          {match[3]}
        </strong>
      );
    } else if (match[4]) {
      parts.push(
        <em key={match.index} className="italic">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-accent-foreground"
        >
          {match[5]}
        </code>
      );
    } else if (match[6]) {
      parts.push(
        <span key={match.index} className="text-sidebar-primary underline">
          {match[6]}
        </span>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? <>{parts}</> : text;
}

/* ── Inline formatting (preview mode) ── */

function renderInlinePreview(
  text: string,
  onWikilinkClick?: (target: string) => void
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex =
    /(\[\[(.+?)\]\]|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|!\[(.*)?\]\((.+?)\)|\[(.+?)\]\((.+?)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) {
      // Wikilink [[target]]
      const target = match[2];
      parts.push(
        <button
          key={match.index}
          onClick={(e) => {
            e.stopPropagation();
            onWikilinkClick?.(target);
          }}
          className="text-sidebar-primary underline decoration-sidebar-primary/40 hover:decoration-sidebar-primary cursor-pointer font-medium"
        >
          {target.startsWith('#') ? target.slice(1) : target}
        </button>
      );
    } else if (match[3]) {
      parts.push(
        <strong key={match.index} className="font-bold">
          {match[3]}
        </strong>
      );
    } else if (match[4]) {
      parts.push(
        <em key={match.index} className="italic">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-accent-foreground"
        >
          {match[5]}
        </code>
      );
    } else if (match[6] !== undefined && match[7]) {
      parts.push(
        <img
          key={match.index}
          src={match[7]}
          alt={match[6] || ''}
          className="inline max-h-64 rounded"
        />
      );
    } else if (match[8]) {
      parts.push(
        <a
          key={match.index}
          href={match[9]}
          className="text-sidebar-primary underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[8]}
        </a>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? <>{parts}</> : text;
}

export default MarkdownEditor;
