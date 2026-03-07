import FileTree from '@/components/vault-view/file-tree';
import type { FileNode } from '@/lib/mock-data';

interface MainSidebarProps {
  open: boolean;
  fileTree: FileNode[];
  activeFileId: string | null;
  onFileSelect: (file: FileNode) => void;
}

const MainSidebar = ({
  open,
  fileTree,
  activeFileId,
  onFileSelect,
}: MainSidebarProps) => {
  if (!open) return null;

  return (
    <div className="flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        <FileTree
          nodes={fileTree}
          activeFileId={activeFileId}
          onFileSelect={onFileSelect}
        />
      </div>
    </div>
  );
};

export default MainSidebar;
