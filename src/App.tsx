import './App.css';

import { open } from '@tauri-apps/plugin-dialog';
import { readDir } from '@tauri-apps/plugin-fs';

import { Button } from '@/components/ui/button';

import { useFolderStore } from './store/useFolderStore';

function App() {
  const { folder, files, setFolder, setFiles } = useFolderStore();

  async function pickFolderAndListFiles() {
    const selectedFolder = await open({
      multiple: false,
      directory: true,
    });
    setFolder(selectedFolder);
    if (selectedFolder) {
      const allFiles = await readDir(selectedFolder);
      setFiles(allFiles);
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <Button onClick={pickFolderAndListFiles}>Select Folder</Button>
      <p>Selected folder: {folder}</p>
      <h1>Files inside folder</h1>
      <div>
        {files.map((file) => (
          <p key={file.name}>{file.name}</p>
        ))}
      </div>
    </div>
  );
}

export default App;
