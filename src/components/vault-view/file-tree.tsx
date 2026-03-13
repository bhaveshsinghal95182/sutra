import { ChevronRight, Copy, FileText, Folder, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { FileNode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  nodes: FileNode[];
  activeFileId: string | null;
  onFileSelect: (file: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  onDuplicate?: (node: FileNode) => void;
  onRename?: (node: FileNode) => void;
  onCreateFileInFolder?: (parentNode: FileNode) => void;
  onCreateFolderInFolder?: (parentNode: FileNode) => void;
  collapseSignal?: number;
  depth?: number;
}

interface FileTreeItemProps {
  node: FileNode;
  activeFileId: string | null;
  onFileSelect: (file: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  onDuplicate?: (node: FileNode) => void;
  onRename?: (node: FileNode) => void;
  onCreateFileInFolder?: (parentNode: FileNode) => void;
  onCreateFolderInFolder?: (parentNode: FileNode) => void;
  depth: number;
  collapseSignal?: number;
}

const FileTreeItem = ({
  node,
  activeFileId,
  onFileSelect,
  onDelete,
  onDuplicate,
  onRename,
  onCreateFileInFolder,
  onCreateFolderInFolder,
  depth = 0,
  collapseSignal = 0,
}: FileTreeItemProps) => {
  const [expanded, setExpanded] = useState(true);
  const [prevSignal, setPrevSignal] = useState(collapseSignal);

  if (collapseSignal !== prevSignal) {
    setPrevSignal(collapseSignal);
    if (collapseSignal > 0 && expanded) {
      setExpanded(false);
    }
  }

  if (node.type === 'folder') {
    return (
      <div>
        <ContextMenu>
          <ContextMenuTrigger asChild>
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
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            {onCreateFileInFolder && (
              <ContextMenuItem onClick={() => onCreateFileInFolder(node)}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Create File...</span>
              </ContextMenuItem>
            )}
            {onCreateFolderInFolder && (
              <ContextMenuItem onClick={() => onCreateFolderInFolder(node)}>
                <Folder className="mr-2 h-4 w-4" />
                <span>Create Folder...</span>
              </ContextMenuItem>
            )}
            {(onCreateFileInFolder || onCreateFolderInFolder) && onDelete && (
              <ContextMenuSeparator />
            )}
            {onRename && (
              <ContextMenuItem onClick={() => onRename(node)}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Rename</span>
              </ContextMenuItem>
            )}
            {onDuplicate && (
              <ContextMenuItem onClick={() => onDuplicate(node)}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Duplicate</span>
              </ContextMenuItem>
            )}
            {onDelete && (
              <ContextMenuItem
                onClick={() => onDelete(node)}
                className="text-destructive focus:text-destructive focus:bg-destructive-light"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeItem
                key={child.id}
                node={child}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onRename={onRename}
                onCreateFileInFolder={onCreateFileInFolder}
                onCreateFolderInFolder={onCreateFolderInFolder}
                depth={depth + 1}
                collapseSignal={collapseSignal}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
      </ContextMenuTrigger>
      <ContextMenuContent className="w-fit">
        {onRename && (
          <ContextMenuItem onClick={() => onRename(node)}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </ContextMenuItem>
        )}
        {onDuplicate && (
          <ContextMenuItem onClick={() => onDuplicate(node)}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Duplicate</span>
          </ContextMenuItem>
        )}
        {(onDuplicate || onRename) && onDelete && <ContextMenuSeparator />}
        {onDelete && (
          <ContextMenuItem
            onClick={() => onDelete(node)}
            className="text-destructive focus:text-destructive focus:bg-destructive-light"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

const FileTree = ({
  nodes,
  activeFileId,
  onFileSelect,
  onDelete,
  onDuplicate,
  onRename,
  onCreateFileInFolder,
  onCreateFolderInFolder,
  collapseSignal = 0,
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
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onRename={onRename}
          onCreateFileInFolder={onCreateFileInFolder}
          onCreateFolderInFolder={onCreateFolderInFolder}
          collapseSignal={collapseSignal}
          depth={depth}
        />
      ))}
    </div>
  );
};

export default FileTree;
