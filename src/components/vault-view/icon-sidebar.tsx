import { PanelLeft, PanelRight, Search, Settings, Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface IconSidebarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onToggleRightSidebar: () => void;
  rightSidebarOpen: boolean;
  onOpenSettings: () => void;
}

const IconSidebar = ({
  onToggleSidebar,
  sidebarOpen,
  onToggleRightSidebar,
  rightSidebarOpen,
  onOpenSettings,
}: IconSidebarProps) => {
  const icons = [
    {
      icon: PanelLeft,
      label: 'Toggle sidebar',
      onClick: onToggleSidebar,
      active: sidebarOpen,
    },
    {
      icon: PanelRight,
      label: 'Toggle outline',
      onClick: onToggleRightSidebar,
      active: rightSidebarOpen,
    },
    { icon: Search, label: 'Search', onClick: () => {} },
    { icon: Star, label: 'Starred', onClick: () => {} },
  ];

  return (
    <div className="flex w-12 flex-col items-center border-r border-sidebar-border bg-sidebar py-2 gap-1">
      {icons.map(({ icon: Icon, label, onClick, active }) => (
        <button
          key={label}
          onClick={onClick}
          title={label}
          className={cn(
            'flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
            active && 'bg-sidebar-accent text-sidebar-foreground'
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
