import { GitGraph, PanelLeft, Search, Settings, Star } from 'lucide-react';

import { cn } from '@/lib/utils';

import PanelOpenLeft from '../icons/panel-open-left';

interface IconSidebarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onOpenSettings: () => void;
  onOpenGraph: () => void;
}

const IconSidebar = ({
  onToggleSidebar,
  sidebarOpen,
  onOpenSettings,
  onOpenGraph,
}: IconSidebarProps) => {
  const icons = [
    { icon: GitGraph, label: 'Graph view', onClick: onOpenGraph || (() => {}) },
    { icon: Search, label: 'Search', onClick: () => {} },
    { icon: Star, label: 'Starred', onClick: () => {} },
  ];

  return (
    <div className="flex w-12 flex-col items-center border-r border-sidebar-border bg-sidebar py-2 gap-1">
      <button
        onClick={onToggleSidebar}
        title="Toggle Right Sidebar"
        className={cn(
          'flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        {sidebarOpen ? <PanelOpenLeft size={18} /> : <PanelLeft size={18} />}
      </button>
      {icons.map(({ icon: Icon, label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          title={label}
          className={cn(
            'flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <Icon size={18} />
        </button>
      ))}
      <div className="flex-1" />
      <button
        title="Settings"
        onClick={onOpenSettings}
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <Settings size={18} />
      </button>
    </div>
  );
};

export default IconSidebar;
