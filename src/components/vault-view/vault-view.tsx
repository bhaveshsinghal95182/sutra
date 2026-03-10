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

  const handleContentChange = useCallback(
    (content: string) => {
      if (activeFileId) {
        updateFileContent(activeFileId, content);
      }
    },
    [activeFileId, updateFileContent]
  );

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
