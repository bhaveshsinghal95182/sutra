import { join } from '@tauri-apps/api/path';
import { useCallback, useEffect, useRef, useState } from 'react';

import MarkdownEditor from '@/components/vault-view/editor/markdown-editor';
import MarkdownPreview from '@/components/vault-view/editor/markdown-preview';
import EditorTabs from '@/components/vault-view/editor-tabs';
import GraphView from '@/components/vault-view/graph-view';
import IconSidebar from '@/components/vault-view/icon-sidebar';
import MainSidebar from '@/components/vault-view/main-sidebar';
import RightSidebar from '@/components/vault-view/right-sidebar';
import SettingsDialog from '@/components/vault-view/settings-dialog';
import TitleBar from '@/components/vault-view/title-bar';
import { fsCrud } from '@/lib/fs-crud';
import type { ThemeSettings } from '@/lib/theme-settings';
import type { FileNode } from '@/lib/types';
import { extractHeadings } from '@/lib/types';
import { useFolderStore } from '@/store/useFolderStore';

interface VaultViewProps {
  themeSettings: ThemeSettings;
  onThemeSettingsChange: (settings: ThemeSettings) => void;
  themeTemplates: Record<string, string>;
}

const Index = ({
  themeSettings,
  onThemeSettingsChange,
  themeTemplates,
}: VaultViewProps) => {
  const {
    folder,
    fileTree,
    openFiles,
    activeFileId,
    openFile,
    closeFile,
    refreshTree,
    setActiveFileId,
    updateFileContent,
  } = useFolderStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [graphTabOpen, setGraphTabOpen] = useState(false);
  const [vimMode, setVimMode] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const isDark =
    themeSettings.mode === 'dark'
      ? true
      : themeSettings.mode === 'light'
        ? false
        : systemDark;
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number>(0);
  const visibleHeadingsRef = useRef<Set<number>>(new Set());
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  /* ── Derived state ── */
  const activeFile = openFiles.find((f) => f.id === activeFileId);
  const activeContent = activeFile?.content ?? '';

  // Listen for OS dark-mode changes so `mode: "system"` stays reactive.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  /* ── Track which heading is currently visible via IntersectionObserver ── */
  useEffect(() => {
    if (!previewMode) return;

    const headings = extractHeadings(activeContent);
    if (headings.length === 0) return;
    const scrollRoot = previewContainerRef.current;
    if (!scrollRoot) return;

    const headingEls = Array.from(
      scrollRoot.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ) as HTMLElement[];
    if (headingEls.length === 0) return;

    visibleHeadingsRef.current.clear();
    const headingIndexMap = new Map<Element, number>();
    headingEls.forEach((el, idx) => headingIndexMap.set(el, idx));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const hIdx = headingIndexMap.get(entry.target);
          if (hIdx === undefined || hIdx < 0) continue;

          if (entry.isIntersecting) {
            visibleHeadingsRef.current.add(hIdx);
          } else {
            visibleHeadingsRef.current.delete(hIdx);
          }
        }

        if (visibleHeadingsRef.current.size > 0) {
          setActiveHeadingIndex(Math.max(...visibleHeadingsRef.current));
        }
      },
      { root: scrollRoot, threshold: 0 }
    );

    headingEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [activeContent, previewMode]);

  const handleHeadingClick = useCallback(
    (lineIndex: number) => {
      if (!previewMode) return;

      const headings = extractHeadings(activeContent);
      const headingIdx = headings.findIndex((h) => h.lineIndex === lineIndex);
      if (headingIdx < 0) return;

      const scrollRoot = previewContainerRef.current;
      if (!scrollRoot) return;

      const headingEls = scrollRoot.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const target = headingEls[headingIdx] as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveHeadingIndex(headingIdx);
      }
    },
    [activeContent, previewMode]
  );

  const isGraphActive = activeFileId === '__graph__';

  const handleOpenGraph = useCallback(() => {
    setGraphTabOpen(true);
    setActiveFileId('__graph__');
  }, [setActiveFileId]);

  const handleCloseGraph = useCallback(() => {
    setGraphTabOpen(false);
    // Switch to the last open file tab, or null
    const lastFile =
      openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
    setActiveFileId(lastFile ? lastFile.id : (null as unknown as string));
  }, [openFiles, setActiveFileId]);

  const handleFileSelect = useCallback(
    (file: FileNode) => {
      openFile(file);
    },
    [openFile]
  );

  const handleCloseTab = useCallback(
    (id: string) => {
      closeFile(id);
    },
    [closeFile]
  );

  const handleCreateFile = useCallback(
    async (customPath?: string) => {
      if (!folder || typeof customPath !== 'string' || !customPath.trim())
        return;

      const normalized = customPath
        .trim()
        .replace(/\\+/g, '/')
        .replace(/^\/+|\/+$/g, '');
      if (!normalized) return;

      const segments = normalized.split('/').filter(Boolean);
      if (segments.some((s) => s === '.' || s === '..')) {
        window.alert('Relative segments like . and .. are not allowed.');
        return;
      }

      try {
        let filePath = folder;
        for (const seg of segments) {
          filePath = await join(filePath, seg);
        }

        if (segments.length > 1) {
          let parentPath = folder;
          for (const seg of segments.slice(0, -1)) {
            parentPath = await join(parentPath, seg);
          }
          await fsCrud.folder.create(parentPath, { recursive: true });
        }

        await fsCrud.file.create(filePath, '');
        await refreshTree();
        openFile({
          id: filePath,
          name: segments[segments.length - 1],
          type: 'file',
        });
      } catch (error) {
        console.error('[Explorer] Failed to create file:', error);
        window.alert('Failed to create file. It may already exist.');
      }
    },
    [folder, refreshTree, openFile]
  );

  const handleCreateFolder = useCallback(
    async (customPath?: string) => {
      if (!folder || typeof customPath !== 'string' || !customPath.trim())
        return;

      const normalized = customPath
        .trim()
        .replace(/\\+/g, '/')
        .replace(/^\/+|\/+$/g, '');
      if (!normalized) return;

      const segments = normalized.split('/').filter(Boolean);
      if (segments.some((s) => s === '.' || s === '..')) {
        window.alert('Relative segments like . and .. are not allowed.');
        return;
      }

      try {
        let folderPath = folder;
        for (const seg of segments) {
          folderPath = await join(folderPath, seg);
        }
        await fsCrud.folder.create(folderPath, { recursive: true });
        await refreshTree();
      } catch (error) {
        console.error('[Explorer] Failed to create folder:', error);
        window.alert('Failed to create folder.');
      }
    },
    [folder, refreshTree]
  );

  const handleDeleteFile = useCallback(
    async (node: FileNode) => {
      if (!folder) return;
      try {
        if (node.type === 'folder') {
          await fsCrud.folder.remove(node.id, { recursive: true });
        } else {
          await fsCrud.file.remove(node.id);
        }
        await refreshTree();
      } catch (error) {
        console.error('[Explorer] Failed to delete file:', error);
        window.alert('Failed to delete file.');
      }
    },
    [folder, refreshTree]
  );

  const handleRenameFile = useCallback(
    async (node: FileNode, newName: string) => {
      if (!folder || !newName.trim() || newName === node.name) return;
      try {
        const normalizedNodeId = node.id.replace(/\\/g, '/');
        const dirPath = normalizedNodeId.substring(
          0,
          normalizedNodeId.lastIndexOf('/')
        );
        const newPath =
          dirPath === normalizedNodeId || dirPath === ''
            ? newName
            : `${dirPath}/${newName}`;

        await fsCrud.file.rename(node.id, newPath);
        await refreshTree();

        if (node.type === 'file' && activeFileId === node.id) {
          closeFile(node.id);
          openFile({ id: newPath, name: newName, type: 'file' });
        }
      } catch (error) {
        console.error('[Explorer] Failed to rename file:', error);
        window.alert('Failed to rename file.');
      }
    },
    [folder, refreshTree, activeFileId, openFile, closeFile]
  );

  const handleDuplicateFile = useCallback(
    async (node: FileNode) => {
      if (!folder) return;
      try {
        if (node.type === 'file') {
          const content = await fsCrud.file.read(node.id);
          const nameParts = node.name.split('.');
          const extension = nameParts.length > 1 ? '.' + nameParts.pop() : '';
          const baseName = nameParts.join('.');

          let duplicateName = `${baseName} copy${extension}`;
          let counter = 1;

          // Find all files in the same directory to check for duplicates
          const normalizedNodeId = node.id.replace(/\\/g, '/');
          const dirPath = normalizedNodeId.substring(
            0,
            normalizedNodeId.lastIndexOf('/')
          );
          let siblings: FileNode[] = [];
          if (dirPath === normalizedNodeId || dirPath === '') {
            // Root level
            siblings = fileTree;
          } else {
            // Find the parent folder in the tree
            const findInTree = (
              nodes: FileNode[],
              targetDir: string
            ): FileNode[] => {
              for (const n of nodes) {
                if (n.type === 'folder' && n.id === targetDir) {
                  return n.children || [];
                }
                if (n.type === 'folder' && n.children) {
                  const result = findInTree(n.children, targetDir);
                  if (result.length > 0) return result;
                }
              }
              return [];
            };
            siblings = findInTree(fileTree, dirPath);
          }

          while (siblings.some((s) => s.name === duplicateName)) {
            duplicateName = `${baseName} copy ${counter}${extension}`;
            counter++;
          }

          const newPath =
            dirPath === normalizedNodeId || dirPath === ''
              ? duplicateName
              : `${dirPath}/${duplicateName}`;
          await fsCrud.file.create(newPath, content);
          await refreshTree();
          openFile({ id: newPath, name: duplicateName, type: 'file' });
        }
      } catch (error) {
        console.error('[Explorer] Failed to duplicate file:', error);
        window.alert('Failed to duplicate file.');
      }
    },
    [folder, refreshTree, openFile, fileTree]
  );

  const handleRefreshTree = useCallback(async () => {
    await refreshTree();
  }, [refreshTree]);

  const handleCollapseAll = useCallback(() => {
    setCollapseSignal((s) => s + 1);
  }, []);

  const handleContentChange = useCallback(
    (content: string) => {
      if (activeFileId) {
        updateFileContent(activeFileId, content);
        // Debounced autosave: wait a short delay after typing stops, then persist
        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(async () => {
          try {
            await fsCrud.file.update(activeFileId, content);
          } catch (e) {
            console.error('[Autosave] Failed to save file:', e);
          }
        }, 800);
      }
    },
    [activeFileId, updateFileContent]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const folderName =
    fileTree.length > 0 ? folder?.split(/[\\/]/).pop() || 'Vault' : 'Vault';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-sidebar">
      <TitleBar
        folderName={folderName}
        onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        rightSidebarOpen={rightSidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <IconSidebar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenGraph={handleOpenGraph}
        />
        <MainSidebar
          open={sidebarOpen}
          fileTree={fileTree}
          activeFileId={activeFileId}
          onFileSelect={handleFileSelect}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onDeleteFile={handleDeleteFile}
          onDuplicateFile={handleDuplicateFile}
          onRenameFile={handleRenameFile}
          onRefreshTree={handleRefreshTree}
          onCollapseAll={handleCollapseAll}
          collapseSignal={collapseSignal}
        />

        {/* Editor area — elevated card */}
        <div className="flex flex-1 flex-col overflow-hidden p-2 pl-2">
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-card shadow-sm border border-border/40">
            <EditorTabs
              openFiles={openFiles}
              activeFileId={activeFileId}
              onSelectTab={setActiveFileId}
              onCloseTab={handleCloseTab}
              previewMode={previewMode}
              onTogglePreviewMode={
                isGraphActive ? undefined : () => setPreviewMode(!previewMode)
              }
              graphTabOpen={graphTabOpen}
              onSelectGraph={handleOpenGraph}
              onCloseGraph={handleCloseGraph}
            />
            {isGraphActive && graphTabOpen ? (
              <GraphView
                activeFileId={activeFileId ?? ''}
                folderPath={folder ?? undefined}
                onFileSelect={(fileId) => {
                  const findFileById = (nodes: FileNode[]): FileNode | null => {
                    for (const node of nodes) {
                      if (node.type === 'file' && node.id === fileId)
                        return node;
                      if (node.children) {
                        const found = findFileById(node.children);
                        if (found) return found;
                      }
                    }
                    return null;
                  };

                  const file = findFileById(fileTree);
                  if (file) {
                    handleFileSelect(file);
                  }
                }}
              />
            ) : openFiles.length > 0 && activeFile ? (
              previewMode ? (
                <div
                  ref={previewContainerRef}
                  className="h-full overflow-hidden"
                >
                  <MarkdownPreview content={activeContent} />
                </div>
              ) : (
                <div className="flex flex-1 overflow-hidden px-12 bg-background">
                  <MarkdownEditor
                    content={activeContent}
                    isDark={isDark}
                    showLineNumbers={showLineNumbers}
                    showRelativeNumbers={false}
                    vimMode={vimMode}
                    onContentChange={handleContentChange}
                  />
                </div>
              )
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Open a file to start editing
              </div>
            )}
          </div>
        </div>

        {rightSidebarOpen && (
          <RightSidebar
            content={activeContent}
            onClose={() => setRightSidebarOpen(false)}
            onHeadingClick={handleHeadingClick}
            activeHeadingIndex={activeHeadingIndex}
          />
        )}
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        vimMode={vimMode}
        onVimModeChange={setVimMode}
        showLineNumbers={showLineNumbers}
        onShowLineNumbersChange={setShowLineNumbers}
        themeSettings={themeSettings}
        onThemeSettingsChange={onThemeSettingsChange}
        themeTemplates={themeTemplates}
      />
    </div>
  );
};

export default Index;
