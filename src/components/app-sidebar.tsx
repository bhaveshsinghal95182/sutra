import { IconFile, IconFolder, IconInnerShadowTop } from '@tabler/icons-react';
import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useFolderStore } from '@/store/useFolderStore';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { folder, files } = useFolderStore();

  // Extract folder name from the path if folder exists
  const folderName = folder ? folder.split(/[/\\]/).pop() : 'No Vault Selected';

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5!">
              <div className="flex items-center gap-2">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold truncate group-data-[collapsible=icon]:hidden">
                  {folderName}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarMenu>
            {files.map((file) => (
              <SidebarMenuItem key={file.name}>
                <SidebarMenuButton asChild>
                  <a href="#">
                    {file.isDirectory ? <IconFolder /> : <IconFile />}
                    <span>{file.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {files.length === 0 && folder && (
              <div className="px-4 py-2 text-sm text-sidebar-foreground/70">
                Folder is empty
              </div>
            )}
            {!folder && (
              <div className="px-4 py-2 text-sm text-sidebar-foreground/70">
                Please select a folder
              </div>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* Footer can be empty or have settings */}
      </SidebarFooter>
    </Sidebar>
  );
}
