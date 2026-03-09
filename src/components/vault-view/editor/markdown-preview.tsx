import 'katex/dist/katex.min.css';

import katex from 'katex';
import { marked } from 'marked';
import { useEffect, useMemo, useRef } from 'react';

interface MarkdownPreviewProps {
  content: string;
}

// Custom marked renderer with Tailwind classes
const renderer = new marked.Renderer();

renderer.heading = function ({ tokens, depth }) {
  const text = (tokens as { raw: string }[]).map((t) => t.raw).join('');
  const sizes: Record<number, string> = {
    1: 'text-3xl',
    2: 'text-2xl',
    3: 'text-xl',
    4: 'text-lg',
    5: 'text-base',
    6: 'text-sm',
  };
  const size = sizes[depth] || 'text-base';
  return `<h${depth} class="font-bold ${size} mt-6 mb-3 text-foreground scroll-mt-20">${text}</h${depth}>`;
};

renderer.paragraph = function ({ tokens }) {
  const text = (tokens as { raw: string }[]).map((t) => t.raw).join('');
  return `<p class="my-4 text-foreground leading-7">${text}</p>`;
};

renderer.strong = function ({ tokens }) {
  const text = (tokens as { raw: string }[]).map((t) => t.raw).join('');
  return `<strong class="font-bold">${text}</strong>`;
};

renderer.em = function ({ tokens }) {
  const text = (tokens as { raw: string }[]).map((t) => t.raw).join('');
  return `<em class="italic">${text}</em>`;
};

renderer.codespan = function ({ text }) {
  return `<code class="bg-muted px-1.5 py-0.5 rounded font-mono text-sm text-foreground">${text}</code>`;
};

renderer.code = function ({ text, lang }) {
  const language = lang || 'text';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div class="my-4 rounded-lg border border-border/40 bg-muted/50 overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2 bg-muted border-b border-border/20">
      <span class="text-xs font-mono text-muted-foreground">${language}</span>
      <button class="preview-copy-btn text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/80" data-code="${encodeURIComponent(text)}">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span>Copy</span>
      </button>
    </div>
    <pre class="p-4 overflow-x-auto"><code class="font-mono text-sm text-foreground">${escaped}</code></pre>
  </div>`;
};

renderer.blockquote = function ({ tokens }) {
  const text = (tokens as { raw: string }[]).map((t) => t.raw).join('');
  return `<blockquote class="my-4 border-l-4 border-primary/40 pl-4 italic text-muted-foreground bg-primary/5 py-2 rounded-r">${text}</blockquote>`;
};

renderer.list = function ({ items, ordered }) {
  const tag = ordered ? 'ol' : 'ul';
  const itemsHtml = (items as { tokens: { raw: string }[] }[])
    .map((item) => {
      const text = item.tokens.map((t) => t.raw).join('');
      return `<li class="${ordered ? 'list-decimal' : 'list-disc'} ml-6 my-2">${text}</li>`;
    })
    .join('');
  return `<${tag} class="my-4">${itemsHtml}</${tag}>`;
};

renderer.hr = function () {
  return `<hr class="my-6 border-t border-border/40" />`;
};

renderer.link = function ({ tokens, href }) {
  const text = (tokens as { raw: string }[]).map((t) => t.raw).join('');
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 transition-colors">${text}</a>`;
};

renderer.image = function ({ text, href }) {
  return `<figure class="my-6">
    <img src="${href}" alt="${text}" class="max-w-full rounded-lg border border-border/40 shadow-sm" loading="lazy" />
    ${text ? `<figcaption class="text-sm text-muted-foreground text-center mt-2">${text}</figcaption>` : ''}
  </figure>`;
};

// Note: Table rendering uses default marked behavior
marked.setOptions({ renderer, gfm: true, breaks: true });

function renderMath(html: string): string {
  // Display math $$...$$
  html = html.replace(/\$\$([^$]+?)\$\$/g, (_, math) => {
    try {
      return `<div class="my-4 flex justify-center">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="my-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-700 font-mono text-sm">${math}</div>`;
    }
  });
  // Inline math $...$
  html = html.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<code class="bg-red-500/10 text-red-700 px-1 rounded">${math}</code>`;
    }
  });
  return html;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => {
    const raw = marked.parse(content) as string;
    return renderMath(raw);
  }, [content]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest(
        '.preview-copy-btn'
      ) as HTMLElement | null;
      if (!btn) return;
      const code = decodeURIComponent(btn.dataset.code || '');
      navigator.clipboard.writeText(code).then(() => {
        const span = btn.querySelector('span');
        if (span) {
          const original = span.textContent;
          span.textContent = 'Copied!';
          setTimeout(() => {
            span.textContent = original;
          }, 2000);
        }
      });
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="markdown-preview h-full w-full overflow-auto px-8 py-6 text-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
