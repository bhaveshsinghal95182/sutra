export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}

export const mockFileTree: FileNode[] = [
  {
    id: '1',
    name: 'Daily Notes',
    type: 'folder',
    children: [
      {
        id: '1a',
        name: '2026-03-07.md',
        type: 'file',
        content: `# Daily Note — March 7, 2026

## Morning Thoughts

Today I want to focus on **building** something meaningful. The weather is clear and my mind feels sharp.

![morning view](https://picsum.photos/600/300?random=1)

## Tasks

- Review the architecture docs
- Finish the **markdown editor** prototype
- Read chapter 4 of *Designing Data-Intensive Applications*

## Ideas

### Project Vault
A local-first knowledge base that syncs across devices. Should support **wikilinks**, backlinks, and graph views. See [[Vault Editor]] for details.

![vault concept](https://picsum.photos/600/400?random=2)

### Writing Workflow
1. Capture fleeting notes quickly
2. Process into **permanent notes**
3. Connect and refine over time

Check the [[Reading List]] for inspiration and jump to [[#Evening Reflection]] for today's summary.

## Evening Reflection

Good progress today. The editor is coming together nicely.

## Watch Later

https://youtu.be/1dwX3LT9Kz8?si=eqGu6VhuxxqBYhA7`,
      },
      {
        id: '1b',
        name: '2026-03-06.md',
        type: 'file',
        content: `# Daily Note — March 6, 2026

## Summary

Spent most of the day reading about **graph databases** and how they relate to knowledge management.

## Key Takeaways

- Bi-directional links are powerful for discovery
- **Tags** alone are not enough for organization
- Folder structures should be *flexible*, not rigid`,
      },
    ],
  },
  {
    id: '2',
    name: 'Projects',
    type: 'folder',
    children: [
      {
        id: '2a',
        name: 'Vault Editor.md',
        type: 'file',
        content: `# Vault Editor

## Overview

A markdown-based editor with a **file tree**, tabs, and live formatting.

## Architecture

### Frontend
- React + TypeScript
- Custom markdown rendering
- **Theme-aware** design tokens

### Features
- Line numbers in the gutter
- Tab management for open files
- Document outline panel

## Status

Currently in **prototype** phase. Core editing works, need to add:
- Search functionality
- *Backlink* panel
- Graph view`,
      },
      {
        id: '2b',
        name: 'Reading List.md',
        type: 'file',
        content: `# Reading List

## Currently Reading

- *Designing Data-Intensive Applications* by Martin Kleppmann
- **The Art of Doing Science and Engineering** by Richard Hamming

## Queue

- Structure and Interpretation of Computer Programs
- A Philosophy of Software Design
- *Thinking, Fast and Slow*

## Finished

- The Pragmatic Programmer ✓
- **Clean Code** ✓
- Atomic Habits ✓`,
      },
    ],
  },
  {
    id: '3',
    name: 'Templates',
    type: 'folder',
    children: [
      {
        id: '3a',
        name: 'Meeting Notes.md',
        type: 'file',
        content: `# Meeting Notes Template

## Date
{{date}}

## Attendees
- 

## Agenda

### Topic 1
Notes here...

### Topic 2
Notes here...

## Action Items

- [ ] **Action item 1** — assigned to @person
- [ ] Action item 2 — assigned to @person

## Follow-up
Next meeting: {{next_date}}`,
      },
    ],
  },
  {
    id: '4',
    name: 'README.md',
    type: 'file',
    content: `# My Vault

Welcome to my **personal knowledge base**. This vault contains notes, projects, and ideas organized using a *flexible* folder structure.

## Structure

- **Daily Notes** — journal entries and daily logs
- **Projects** — active project documentation
- **Templates** — reusable note templates

## Philosophy

> The best note-taking system is the one you *actually use*.

Keep it simple. Write often. **Connect ideas** across notes.`,
  },
];

export function getAllFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') files.push(node);
    if (node.children) files.push(...getAllFiles(node.children));
  }
  return files;
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
