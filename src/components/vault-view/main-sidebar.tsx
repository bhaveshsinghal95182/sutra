import {
  FilePlus,
  FileText,
  Folder,
  FolderPlus,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FileTree from '@/components/vault-view/file-tree';
import type { FileNode } from '@/lib/types';

interface MainSidebarProps {
  open: boolean;
  fileTree: FileNode[];
  activeFileId: string | null;
  onFileSelect: (file: FileNode) => void;
  onCreateFile: (path?: string) => void;
  onCreateFolder: (path?: string) => void;
  onDeleteFile?: (node: FileNode) => void;
  onDuplicateFile?: (node: FileNode) => void;
  onRenameFile?: (node: FileNode, newName: string) => void;
  onRefreshTree: () => void;
  onCollapseAll: () => void;
  collapseSignal: number;
}

const MainSidebar = ({
  open,
  fileTree,
  activeFileId,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDuplicateFile,
  onRenameFile,
  onRefreshTree,
  onCollapseAll,
  collapseSignal,
}: MainSidebarProps) => {
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(
    null
  );
  const [renamingNode, setRenamingNode] = useState<FileNode | null>(null);
  const [creatingParentPath, setCreatingParentPath] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingType || renamingNode) {
      // Wait a tick for the input to mount, then focus
      requestAnimationFrame(() => inlineInputRef.current?.focus());
    }
  }, [creatingType, renamingNode]);

  const handleInlineSubmit = () => {
    const name = newItemName.trim();
    if (!name) {
      setCreatingType(null);
      setRenamingNode(null);
      setNewItemName('');
      return;
    }

    if (renamingNode) {
      if (onRenameFile) {
        onRenameFile(renamingNode, name);
      }
      setRenamingNode(null);
      setNewItemName('');
      return;
    }

    const path = creatingParentPath ? `${creatingParentPath}/${name}` : name;
    if (creatingType === 'folder') {
      onCreateFolder(path);
    } else {
      onCreateFile(path);
    }
    setCreatingType(null);
    setCreatingParentPath('');
    setNewItemName('');
  };

  const handleInlineCancel = () => {
    setCreatingType(null);
    setRenamingNode(null);
    setCreatingParentPath('');
    setNewItemName('');
  };

  const handleDelete = (node: FileNode) => {
    if (!onDeleteFile) return;
    if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
      onDeleteFile(node);
    }
  };

  const handleDuplicate = (node: FileNode) => {
    if (!onDuplicateFile) return;
    onDuplicateFile(node);
  };

  const handleRename = (node: FileNode) => {
    setCreatingType(null);
    setRenamingNode(node);
    setCreatingParentPath('');
    setNewItemName(node.name);
  };

  const handleCreateFileInFolder = (node: FileNode) => {
    setCreatingType('file');
    setCreatingParentPath(node.id);
    setNewItemName('');
  };

  const handleCreateFolderInFolder = (node: FileNode) => {
    setCreatingType('folder');
    setCreatingParentPath(node.id);
    setNewItemName('');
  };

  if (!open) return null;

  return (
    <div className="flex w-60 flex-col border-r border-sidebar-border bg-sidebar h-full">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setRenamingNode(null);
              setCreatingType('file');
              setNewItemName('');
            }}
            aria-label="Create file"
            title="Create file"
          >
            <FilePlus />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setRenamingNode(null);
              setCreatingType('folder');
              setNewItemName('');
            }}
            aria-label="Create folder"
            title="Create folder"
          >
            <FolderPlus />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={onRefreshTree}
            aria-label="Refresh explorer"
            title="Refresh explorer"
          >
            <RefreshCw />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={onCollapseAll}
            aria-label="Collapse all folders"
            title="Collapse all folders"
          >
            <Minus />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        {(creatingType || renamingNode) && (
          <div className="flex items-center gap-1.5 rounded-sm px-1.5 py-1">
            {creatingType === 'folder' || renamingNode?.type === 'folder' ? (
              <Folder size={14} className="shrink-0 text-muted-foreground" />
            ) : (
              <FileText size={14} className="shrink-0 text-muted-foreground" />
            )}
            <Input
              ref={inlineInputRef}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={
                creatingType === 'folder'
                  ? 'Folder name...'
                  : renamingNode
                    ? 'New name...'
                    : 'File name...'
              }
              className="h-6 text-xs border-sidebar-primary bg-sidebar"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleInlineSubmit();
                } else if (e.key === 'Escape') {
                  handleInlineCancel();
                }
              }}
              onBlur={handleInlineSubmit}
            />
          </div>
        )}
        <FileTree
          nodes={fileTree}
          activeFileId={activeFileId}
          onFileSelect={onFileSelect}
          onDelete={onDeleteFile ? handleDelete : undefined}
          onDuplicate={onDuplicateFile ? handleDuplicate : undefined}
          onRename={onRenameFile ? handleRename : undefined}
          onCreateFileInFolder={handleCreateFileInFolder}
          onCreateFolderInFolder={handleCreateFolderInFolder}
          collapseSignal={collapseSignal}
        />
      </div>
    </div>
  );
};

export default MainSidebar;
