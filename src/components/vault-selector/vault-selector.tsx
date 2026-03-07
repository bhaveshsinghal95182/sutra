import { open } from '@tauri-apps/plugin-dialog';

import { Button } from '@/components/ui/button';
import { TitleBar } from '@/components/vault-selector/title-bar';
import { useFolderStore } from '@/store/useFolderStore';

export function VaultSelector() {
  const { loadFolder } = useFolderStore();

  async function pickFolderAndListFiles() {
    const selectedFolder = await open({
      multiple: false,
      directory: true,
    });

    if (selectedFolder) {
      await loadFolder(selectedFolder);
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center pt-8 bg-background text-foreground">
      <TitleBar />
      <div className="flex flex-col items-center space-y-6">
        <h2 className="text-3xl font-semibold tracking-tight">Sutra</h2>
        <Button onClick={pickFolderAndListFiles} size="lg">
          Select Folder
        </Button>
      </div>
    </div>
  );
}
