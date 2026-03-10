import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { create } from 'zustand';

import type { FileNode, OpenFile } from '@/lib/types';

/**
 * Recursively read a directory via Tauri and build a FileNode tree.
 * Each node gets a unique id, and files store their full path in `id`
 * so we can read them lazily later.
 */
async function buildTree(dirPath: string): Promise<FileNode[]> {
  const entries = await readDir(dirPath);
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    // Skip dotfiles and dotfolders
    if (entry.name.startsWith('.')) continue;

    const fullPath = await join(dirPath, entry.name);

    if (entry.isDirectory) {
      const children = await buildTree(fullPath);
      nodes.push({
        id: fullPath,
        name: entry.name,
        type: 'folder',
        children,
      });
    } else {
      nodes.push({
        id: fullPath,
        name: entry.name,
        type: 'file',
      });
    }
  }

  // Sort: folders first, then alphabetical
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

/* ── store ── */

interface FolderState {
  folder: string | null;
  fileTree: FileNode[];
  openFiles: OpenFile[];
  activeFileId: string | null;
  loading: boolean;

  loadFolder: (path: string) => Promise<void>;
  openFile: (node: FileNode) => Promise<void>;
  closeFile: (id: string) => void;
  setActiveFileId: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  clearFolder: () => void;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folder: null,
  fileTree: [],
  openFiles: [],
  activeFileId: null,
  loading: false,

  loadFolder: async (path: string) => {
    set({ loading: true });
    try {
      const tree = await buildTree(path);
      set({
        folder: path,
        fileTree: tree,
        openFiles: [],
        activeFileId: null,
        loading: false,
      });

      // Generate graph data and save to .sutra folder
      try {
        const result = await invoke<string>('generate_and_save_graph', {
          folderPath: path,
        });
        console.log('Graph data generated:', result);
      } catch (e) {
        console.error('Failed to generate graph data', e);
      }
    } catch (e) {
      console.error('Failed to load folder', e);
      set({ loading: false });
    }
  },

  openFile: async (node: FileNode) => {
    const { openFiles } = get();

    // Already open? Just switch tab.
    const existing = openFiles.find((f) => f.id === node.id);
    if (existing) {
      set({ activeFileId: node.id });
      return;
    }

    // Read content from disk; file nodes store the absolute path in `id`.
    try {
      const path = node.id;
      const content = await readTextFile(path);
      const file: OpenFile = { id: node.id, name: node.name, content };
      set((state) => ({
        openFiles: [...state.openFiles, file],
        activeFileId: file.id,
      }));
    } catch (e) {
      console.error(`Failed to read file at path: ${node.id}`, e);
    }
  },

  closeFile: (id: string) => {
    set((state) => {
      const next = state.openFiles.filter((f) => f.id !== id);
      let newActive = state.activeFileId;
      if (state.activeFileId === id) {
        newActive = next.length > 0 ? next[next.length - 1].id : null;
      }
      return { openFiles: next, activeFileId: newActive };
    });
  },

  setActiveFileId: (id: string) => set({ activeFileId: id }),

  updateFileContent: (id: string, content: string) => {
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.id === id ? { ...f, content } : f
      ),
    }));
  },

  clearFolder: () =>
    set({ folder: null, fileTree: [], openFiles: [], activeFileId: null }),
}));
