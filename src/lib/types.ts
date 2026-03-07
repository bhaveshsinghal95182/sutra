export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export interface OpenFile {
  id: string;
  name: string;
  content: string;
}

export function extractHeadings(
  content: string
): { level: number; text: string; lineIndex: number }[] {
  const lines = content.split('\n');
  const headings: { level: number; text: string; lineIndex: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      headings.push({ level: match[1].length, text: match[2], lineIndex: i });
    }
  }
  return headings;
}
