import { ChevronRight, FileText, Folder } from 'lucide-react';
import { useState } from 'react';

import type { FileNode } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  nodes: FileNode[];
  activeFileId: string | null;
  onFileSelect: (file: FileNode) => void;
  depth?: number;
}

const FileTreeItem = ({
  node,
  activeFileId,
  onFileSelect,
  depth = 0,
}: {
  node: FileNode;
  activeFileId: string | null;
  onFileSelect: (file: FileNode) => void;
  depth: number;
}) => {
  const [expanded, setExpanded] = useState(true);

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
        >
          <ChevronRight
            size={12}
            className={cn(
              'shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-90'
            )}
          />
          <Folder size={14} className="shrink-0 text-sidebar-primary" />
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeItem
                key={child.id}
                node={child}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileSelect(node)}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs transition-colors hover:bg-sidebar-accent',
        activeFileId === node.id
          ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
          : 'text-muted-foreground'
      )}
      style={{ paddingLeft: `${depth * 12 + 22}px` }}
    >
      <FileText size={14} className="shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
};

const FileTree = ({
  nodes,
  activeFileId,
  onFileSelect,
  depth = 0,
}: FileTreeProps) => {
  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <FileTreeItem
          key={node.id}
          node={node}
          activeFileId={activeFileId}
          onFileSelect={onFileSelect}
          depth={depth}
        />
      ))}
    </div>
  );
};

export default FileTree;
