import { useCallback, useEffect, useRef, useState } from 'react';

import EditorTabs from '@/components/vault-view/editor-tabs';
import IconSidebar from '@/components/vault-view/icon-sidebar';
import MainSidebar from '@/components/vault-view/main-sidebar';
import MarkdownEditor, {
  HIGHLIGHT_DURATION,
} from '@/components/vault-view/markdown-editor';
import RightSidebar from '@/components/vault-view/right-sidebar';
import SettingsDialog from '@/components/vault-view/settings-dialog';
import TitleBar from '@/components/vault-view/title-bar';
import {
  extractHeadings,
  type FileNode,
  getAllFiles,
  mockFileTree,
} from '@/lib/mock-data';

const allFiles = getAllFiles(mockFileTree);
const defaultFile = allFiles[0];

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vimMode, setVimMode] = useState(false);
  const [openFiles, setOpenFiles] = useState<FileNode[]>([defaultFile]);
  const [activeFileId, setActiveFileId] = useState<string>(defaultFile.id);
  const [fileContents, setFileContents] = useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {};
      allFiles.forEach((f) => {
        if (f.content) map[f.id] = f.content;
      });
      return map;
    }
  );
  const [highlightedSection, setHighlightedSection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number>(0);
  const visibleHeadingsRef = useRef<Set<number>>(new Set());
  const editorScrollRef = useRef<HTMLDivElement>(null);

  const activeContent = fileContents[activeFileId] || '';

  // Track which heading is currently visible via IntersectionObserver
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

        // Pick the last (furthest down) visible heading
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

  const handleFileSelect = useCallback((file: FileNode) => {
    setActiveFileId(file.id);
    setOpenFiles((prev) => {
      if (prev.find((f) => f.id === file.id)) return prev;
      return [...prev, file];
    });
  }, []);

  const handleWikilinkClick = useCallback(
    (target: string) => {
      // Support [[File#Heading]] syntax
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
        const targetName = filePart.endsWith('.md')
          ? filePart
          : filePart + '.md';
        const file = allFiles.find(
          (f) =>
            f.name.toLowerCase() === targetName.toLowerCase() ||
            f.name.replace(/\.md$/, '').toLowerCase() === filePart.toLowerCase()
        );
        if (file) {
          handleFileSelect(file);
          // After navigating, highlight the target heading or the first heading
          const targetContent = file.content || '';
          const targetHeading = headingPart || null;
          setTimeout(() => {
            if (targetHeading) {
              scrollToHeading(targetContent, targetHeading);
            } else {
              // Highlight the first heading (H1) for visual feedback
              const lines = targetContent.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].match(/^#{1,6}\s/)) {
                  handleHeadingClick(i);
                  const el = document.getElementById(`heading-${i}`);
                  if (el)
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  break;
                }
              }
            }
          }, 50);
        }
      } else if (headingPart) {
        // Same-file heading link
        scrollToHeading(activeContent, headingPart);
      }
    },
    [activeContent, handleHeadingClick, handleFileSelect]
  );

  const handleCloseTab = useCallback(
    (id: string) => {
      setOpenFiles((prev) => {
        const next = prev.filter((f) => f.id !== id);
        if (id === activeFileId && next.length > 0) {
          setActiveFileId(next[next.length - 1].id);
        }
        return next;
      });
    },
    [activeFileId]
  );

  const handleContentChange = useCallback(
    (content: string) => {
      setFileContents((prev) => ({ ...prev, [activeFileId]: content }));
    },
    [activeFileId]
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
        />
        <MainSidebar
          open={sidebarOpen}
          fileTree={mockFileTree}
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
              onTogglePreviewMode={() => setPreviewMode(!previewMode)}
            />
            {openFiles.length > 0 ? (
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
