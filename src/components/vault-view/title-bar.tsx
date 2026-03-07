import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';

import { useFolderStore } from '@/store/useFolderStore';

const appWindow = getCurrentWindow();

export function VaultTitleBar() {
  const { folder } = useFolderStore();
  const folderName = folder ? folder.split(/[/\\]/).pop() : '';

  return (
    <div
      data-tauri-drag-region
      className="h-8 select-none flex justify-between items-center bg-background border-b border-border absolute top-0 left-0 right-0 z-50 text-foreground"
    >
      <div className="pl-3 flex items-center justify-center pointer-events-none text-md font-medium tracking-wider text-foreground">
        {folderName}
      </div>
      <div className="flex h-full">
        <div
          className="inline-flex justify-center items-center w-10 h-full hover:bg-muted cursor-default transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => appWindow.minimize()}
        >
          <Minus size={16} />
        </div>
        <div
          className="inline-flex justify-center items-center w-10 h-full hover:bg-muted cursor-default transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => appWindow.toggleMaximize()}
        >
          <Square size={13} />
        </div>
        <div
          className="inline-flex justify-center items-center w-10 h-full hover:bg-destructive cursor-default transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => appWindow.close()}
        >
          <X size={16} />
        </div>
      </div>
    </div>
  );
}
