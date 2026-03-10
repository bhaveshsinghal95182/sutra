import { join } from '@tauri-apps/api/path';
import {
  type BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  rename,
  type UnwatchFn,
  watch,
  type WatchEvent,
  type WatchEventKind,
  watchImmediate,
  writeTextFile,
} from '@tauri-apps/plugin-fs';

import type { FileNode } from '@/lib/types';

type FsPath = string | URL;

interface BasePathOptions {
  baseDir?: BaseDirectory;
}

interface FolderReadOptions extends BasePathOptions {
  recursive?: boolean;
  includeHidden?: boolean;
}

interface FileCreateOptions extends BasePathOptions {
  overwrite?: boolean;
}

interface FolderDeleteOptions extends BasePathOptions {
  recursive?: boolean;
}

const isHidden = (name: string) => name.startsWith('.');

async function toFileTree(
  directory: FsPath,
  options: FolderReadOptions
): Promise<FileNode[]> {
  const entries = await readDir(directory, { baseDir: options.baseDir });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (!options.includeHidden && isHidden(entry.name)) {
      continue;
    }

    const entryPath =
      typeof directory === 'string'
        ? await join(directory, entry.name)
        : new URL(entry.name, directory);

    if (entry.isDirectory) {
      const children = options.recursive
        ? await toFileTree(entryPath, options)
        : undefined;

      nodes.push({
        id: String(entryPath),
        name: entry.name,
        type: 'folder',
        children,
      });
      continue;
    }

    nodes.push({
      id: String(entryPath),
      name: entry.name,
      type: 'file',
    });
  }

  // Keep folders first and maintain predictable ordering.
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export const fsCrud = {
  file: {
    async create(
      path: FsPath,
      content = '',
      options: FileCreateOptions = {}
    ): Promise<void> {
      await writeTextFile(path, content, {
        baseDir: options.baseDir,
        create: true,
        createNew: !options.overwrite,
      });
    },

    async read(path: FsPath, options: BasePathOptions = {}): Promise<string> {
      return readTextFile(path, { baseDir: options.baseDir });
    },

    async update(path: FsPath, content: string, options: BasePathOptions = {}) {
      const found = await exists(path, { baseDir: options.baseDir });
      if (!found) {
        throw new Error(`Cannot update missing file: ${String(path)}`);
      }

      await writeTextFile(path, content, {
        baseDir: options.baseDir,
        create: false,
      });
    },

    async remove(path: FsPath, options: BasePathOptions = {}): Promise<void> {
      await remove(path, { baseDir: options.baseDir });
    },
  },

  folder: {
    async create(
      path: FsPath,
      options: BasePathOptions & { recursive?: boolean } = {}
    ): Promise<void> {
      await mkdir(path, {
        baseDir: options.baseDir,
        recursive: options.recursive ?? true,
      });
    },

    async read(
      path: FsPath,
      options: FolderReadOptions = {}
    ): Promise<FileNode[]> {
      return toFileTree(path, {
        baseDir: options.baseDir,
        recursive: options.recursive ?? true,
        includeHidden: options.includeHidden ?? false,
      });
    },

    async update(
      oldPath: FsPath,
      newPath: FsPath,
      options: { oldBaseDir?: BaseDirectory; newBaseDir?: BaseDirectory } = {}
    ): Promise<void> {
      await rename(oldPath, newPath, {
        oldPathBaseDir: options.oldBaseDir,
        newPathBaseDir: options.newBaseDir,
      });
    },

    async remove(
      path: FsPath,
      options: FolderDeleteOptions = {}
    ): Promise<void> {
      await remove(path, {
        baseDir: options.baseDir,
        recursive: options.recursive ?? true,
      });
    },
  },
};

/* ── Filesystem Watcher ── */

type WatchEventType =
  | 'create'
  | 'modify'
  | 'remove'
  | 'rename'
  | 'access'
  | 'any'
  | 'other';

interface ParsedWatchEvent {
  type: WatchEventType;
  paths: string[];
  raw: WatchEvent;
}

interface WatcherCallbacks {
  onCreate?: (paths: string[]) => void;
  onModify?: (paths: string[]) => void;
  onRemove?: (paths: string[]) => void;
  onRename?: (paths: string[]) => void;
  onAny?: (event: ParsedWatchEvent) => void;
}

interface WatcherOptions {
  recursive?: boolean;
  baseDir?: BaseDirectory;
  debounceMs?: number;
}

function parseEventKind(kind: WatchEventKind): WatchEventType {
  if (kind === 'any') return 'any';
  if (kind === 'other') return 'other';

  if ('create' in kind) return 'create';
  if ('modify' in kind) {
    // Distinguish rename from other modifications
    if (kind.modify.kind === 'rename') return 'rename';
    return 'modify';
  }
  if ('remove' in kind) return 'remove';
  if ('access' in kind) return 'access';

  return 'other';
}

/**
 * Filesystem watcher using OS-level events (inotify/FSEvents/ReadDirectoryChangesW).
 *
 * @example
 * ```ts
 * const watcher = new FsWatcher('C:/vault', {
 *   onCreate: (paths) => console.log('Created:', paths),
 *   onModify: (paths) => console.log('Modified:', paths),
 *   onRemove: (paths) => console.log('Removed:', paths),
 * }, { recursive: true, debounceMs: 100 });
 *
 * await watcher.start();
 * // ... later
 * await watcher.stop();
 * ```
 */
export class FsWatcher {
  private unwatchFn: UnwatchFn | null = null;
  private isActive = false;

  constructor(
    private readonly paths: string | string[],
    private readonly callbacks: WatcherCallbacks,
    private readonly options: WatcherOptions = {}
  ) {}

  async start(): Promise<void> {
    if (this.isActive) {
      console.warn('Watcher already active');
      return;
    }

    const handleEvent = (event: WatchEvent) => {
      const parsed: ParsedWatchEvent = {
        type: parseEventKind(event.type),
        paths: event.paths,
        raw: event,
      };

      // Call specific handlers
      switch (parsed.type) {
        case 'create':
          this.callbacks.onCreate?.(parsed.paths);
          break;
        case 'modify':
          this.callbacks.onModify?.(parsed.paths);
          break;
        case 'remove':
          this.callbacks.onRemove?.(parsed.paths);
          break;
        case 'rename':
          this.callbacks.onRename?.(parsed.paths);
          break;
      }

      // Always call the general handler
      this.callbacks.onAny?.(parsed);
    };

    // Use debounced watch by default
    if (this.options.debounceMs !== undefined && this.options.debounceMs > 0) {
      this.unwatchFn = await watch(this.paths, handleEvent, {
        recursive: this.options.recursive ?? true,
        baseDir: this.options.baseDir,
        delayMs: this.options.debounceMs,
      });
    } else {
      this.unwatchFn = await watchImmediate(this.paths, handleEvent, {
        recursive: this.options.recursive ?? true,
        baseDir: this.options.baseDir,
      });
    }

    this.isActive = true;
  }

  async stop(): Promise<void> {
    if (!this.isActive || !this.unwatchFn) {
      return;
    }

    this.unwatchFn();
    this.unwatchFn = null;
    this.isActive = false;
  }

  get active(): boolean {
    return this.isActive;
  }
}

/**
 * Simple one-shot watcher with automatic cleanup.
 *
 * @example
 * ```ts
 * const unwatch = await watchPath('C:/vault', {
 *   onCreate: (paths) => console.log('Created:', paths),
 *   onModify: (paths) => console.log('Modified:', paths),
 * }, { recursive: true, debounceMs: 150 });
 *
 * // Stop watching
 * unwatch();
 * ```
 */
export async function watchPath(
  paths: string | string[],
  callbacks: WatcherCallbacks,
  options: WatcherOptions = {}
): Promise<UnwatchFn> {
  const watcher = new FsWatcher(paths, callbacks, options);
  await watcher.start();
  return () => watcher.stop();
}

export type {
  BasePathOptions,
  FileCreateOptions,
  FolderDeleteOptions,
  FolderReadOptions,
  FsPath,
  ParsedWatchEvent,
  WatcherCallbacks,
  WatcherOptions,
  WatchEventType,
};
export { type WatchEvent, type WatchEventKind };
