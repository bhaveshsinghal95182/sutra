import { useCallback, useEffect, useRef, useState } from 'react';

import EditorTabs from '@/components/vault-view/editor-tabs';
import GraphView from '@/components/vault-view/graph-view';
import IconSidebar from '@/components/vault-view/icon-sidebar';
import MainSidebar from '@/components/vault-view/main-sidebar';
import MarkdownEditor, {
  HIGHLIGHT_DURATION,
} from '@/components/vault-view/markdown-editor';
import RightSidebar from '@/components/vault-view/right-sidebar';
import SettingsDialog from '@/components/vault-view/settings-dialog';
import TitleBar from '@/components/vault-view/title-bar';
import type { FileNode } from '@/lib/types';
import { extractHeadings } from '@/lib/types';
import { useFolderStore } from '@/store/useFolderStore';

const Index = () => {
  const {
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
  const [graphOpen, setGraphOpen] = useState(false);
  const [vimMode, setVimMode] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number>(0);
  const visibleHeadingsRef = useRef<Set<number>>(new Set());
  const editorScrollRef = useRef<HTMLDivElement>(null);

  /* ── Derived state ── */
  const activeFile = openFiles.find((f) => f.id === activeFileId);
  const activeContent = activeFile?.content ?? '';

  /* ── Track which heading is currently visible via IntersectionObserver ── */
  useEffect(() => {
    const headings = extractHeadings(activeContent);
    if (headings.length === 0) return;
    const scrollRoot = editorScrollRef.current;
    if (!scrollRoot) return;

    visibleHeadingsRef.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          const match = id.match(/^heading-(\d+)$/);
          if (!match) continue;

          const lineIdx = parseInt(match[1], 10);
          const hIdx = headings.findIndex((h) => h.lineIndex === lineIdx);
          if (hIdx < 0) continue;

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

    const els = headings
      .map((h) => document.getElementById(`heading-${h.lineIndex}`))
      .filter(Boolean) as HTMLElement[];
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [activeContent, previewMode]);

  const handleHeadingClick = useCallback(
    (lineIndex: number) => {
      const contentLines = activeContent.split('\n');
      const headingMatch = contentLines[lineIndex]?.match(/^(#{1,6})\s/);
      if (!headingMatch) return;
      const headLevel = headingMatch[1].length;
      let end = contentLines.length - 1;
      for (let i = lineIndex + 1; i < contentLines.length; i++) {
        const m = contentLines[i].match(/^(#{1,6})\s/);
        if (m && m[1].length <= headLevel) {
          end = i - 1;
          break;
        }
      }
      setHighlightedSection({ start: lineIndex, end });
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(
        () => setHighlightedSection(null),
        HIGHLIGHT_DURATION
      );
    },
    [activeContent]
  );

  const handleFileSelect = useCallback(
    (file: FileNode) => {
      openFile(file);
    },
    [openFile]
  );

  const handleWikilinkClick = useCallback(
    (target: string) => {
      const hashIdx = target.indexOf('#');
      const filePart =
        hashIdx > 0 ? target.slice(0, hashIdx) : hashIdx === 0 ? null : target;
      const headingPart = hashIdx >= 0 ? target.slice(hashIdx + 1) : null;

      const scrollToHeading = (content: string, headingText: string) => {
        const contentLines = content.split('\n');
        for (let i = 0; i < contentLines.length; i++) {
          const m = contentLines[i].match(/^#{1,6}\s+(.+)$/);
          if (
            m &&
            m[1].trim().toLowerCase() === headingText.trim().toLowerCase()
          ) {
            handleHeadingClick(i);
            const el = document.getElementById(`heading-${i}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
      };

      if (filePart) {
        // Search the file tree for a matching file by name
        const findFile = (nodes: FileNode[]): FileNode | undefined => {
          for (const node of nodes) {
            if (node.type === 'file') {
              const targetName = filePart.endsWith('.md')
                ? filePart
                : filePart + '.md';
              if (
                node.name.toLowerCase() === targetName.toLowerCase() ||
                node.name.replace(/\.md$/, '').toLowerCase() ===
                  filePart.toLowerCase()
              ) {
                return node;
              }
            }
            if (node.children) {
              const found = findFile(node.children);
              if (found) return found;
            }
          }
          return undefined;
        };

        const file = findFile(fileTree);
        if (file) {
          handleFileSelect(file);
          // After opening, scroll to heading if requested
          if (headingPart) {
            setTimeout(() => {
              const opened = useFolderStore
                .getState()
                .openFiles.find((f) => f.id === file.id);
              if (opened) scrollToHeading(opened.content, headingPart);
            }, 100);
          }
        }
      } else if (headingPart) {
        scrollToHeading(activeContent, headingPart);
      }
    },
    [activeContent, handleHeadingClick, handleFileSelect, fileTree]
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-sidebar">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <IconSidebar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
          rightSidebarOpen={rightSidebarOpen}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenGraph={() => setGraphOpen(true)}
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
                graphOpen ? undefined : () => setPreviewMode(!previewMode)
              }
              graphOpen={graphOpen}
              onCloseGraph={() => setGraphOpen(false)}
            />
            {graphOpen ? (
              <GraphView
                activeFileId={activeFileId ?? ''}
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
                    setGraphOpen(false);
                  }
                }}
              />
            ) : openFiles.length > 0 && activeFile ? (
              <MarkdownEditor
                ref={editorScrollRef}
                content={activeContent}
                onChange={handleContentChange}
                previewMode={previewMode}
                highlightedSection={highlightedSection}
                onWikilinkClick={handleWikilinkClick}
              />
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
      />
    </div>
  );
};

export default Index;
