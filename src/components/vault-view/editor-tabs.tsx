import { Eye, GitGraph, Pencil, X } from 'lucide-react';

import type { OpenFile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EditorTabsProps {
  openFiles: OpenFile[];
  activeFileId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  previewMode?: boolean;
  onTogglePreviewMode?: () => void;
  graphOpen?: boolean;
  onCloseGraph?: () => void;
}

const EditorTabs = ({
  openFiles,
  activeFileId,
  onSelectTab,
  onCloseTab,
  previewMode,
  onTogglePreviewMode,
  graphOpen,
  onCloseGraph,
}: EditorTabsProps) => {
  if (openFiles.length === 0 && !graphOpen) return null;

  return (
    <div className="relative flex h-9 items-end border-b border-border/50 bg-sidebar/50">
      {/* Scrollable tabs area */}
      <div className="flex flex-1 items-end gap-0 overflow-x-auto scrollbar-none px-1 pr-10">
        {graphOpen && (
          <button
            className={cn(
              'group relative flex h-8 shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-xs transition-colors',
              !activeFileId
                ? 'border-border/50 bg-card text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <GitGraph size={12} />
            <span>Graph View</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onCloseGraph?.();
              }}
              className="flex size-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
            >
              <X size={10} />
            </span>
          </button>
        )}
        {openFiles.map((file) => (
          <button
            key={file.id}
            onClick={() => onSelectTab(file.id)}
            className={cn(
              'group relative flex h-8 shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-xs transition-colors',
              activeFileId === file.id
                ? 'border-border/50 bg-card text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="max-w-[120px] truncate">{file.name}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(file.id);
              }}
              className="flex size-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
            >
              <X size={10} />
            </span>
          </button>
        ))}
      </div>

      {/* Fade + fixed toggle */}
      {onTogglePreviewMode && (
        <div className="absolute right-0 top-0 flex h-full items-end pb-px">
          <div className="pointer-events-none h-full w-8 bg-gradient-to-r from-transparent to-sidebar/50" />
          <div className="flex items-center bg-sidebar/50 pr-1 pb-0.5">
            <button
              onClick={onTogglePreviewMode}
              title={previewMode ? 'Switch to editor' : 'Switch to preview'}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {previewMode ? <Pencil size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorTabs;
