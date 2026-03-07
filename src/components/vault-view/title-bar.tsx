import { getCurrentWindow } from '@tauri-apps/api/window';
import { Github, Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
  const appWindow = getCurrentWindow();

  return (
    <div
      className="flex h-10 items-center justify-between border-b border-sidebar-border bg-sidebar px-3 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <div className="flex size-5 items-center justify-center rounded bg-sidebar-primary">
          <span className="text-[10px] font-bold text-sidebar-primary-foreground">
            V
          </span>
        </div>
        <span className="text-xs font-semibold text-sidebar-foreground">
          Vault
        </span>
      </div>

      <div className="flex items-center gap-1">
        <a
          href="https://github.com/bhaveshsinghal95182/sutra"
          target="_blank"
          rel="noreferrer"
          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Github size={14} />
        </a>
      </div>

      <div
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => appWindow.minimize()}
          className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
