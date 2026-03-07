import type { DirEntry } from '@tauri-apps/plugin-fs';
import { create } from 'zustand';

interface FolderState {
  folder: string | null;
  files: DirEntry[];
  setFolder: (folder: string | null) => void;
  setFiles: (files: DirEntry[]) => void;
  clearFolder: () => void;
}

export const useFolderStore = create<FolderState>((set) => ({
  folder: null,
  files: [],
  setFolder: (folder) => set({ folder }),
  setFiles: (files) => set({ files }),
  clearFolder: () => set({ folder: null, files: [] }),
}));
