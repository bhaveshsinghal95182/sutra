import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect } from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { VaultTitleBar } from '@/components/vault-view/title-bar';
import { useFolderStore } from '@/store/useFolderStore';

const appWindow = getCurrentWindow();

export function VaultView() {
  // We can keep `folder` available if needed, though they are now handled by the sidebar.
  const { folder } = useFolderStore();

  useEffect(() => {
    appWindow.maximize().catch(console.error);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col pt-8 bg-background text-foreground overflow-hidden relative">
      <VaultTitleBar />

      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-2 p-4">
              {folder ? (
                <p className="text-sm text-muted-foreground">
                  Select a file from the sidebar to view.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Please select a folder.
                </p>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
