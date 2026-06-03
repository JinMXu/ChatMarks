import type { ExportBookmarkNode } from './export-engine';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface ImportPreview {
  format: 'json' | 'html';
  bookmarkCount: number;
  folderCount: number;
  rootFolderName: string;
  tree: ExportBookmarkNode[];
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function detectFileFormat(content: string): 'json' | 'html' {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('{')) return 'json';
  return 'html';
}

export function parseJsonProfile(json: string): ExportBookmarkNode[] {
  const data = JSON.parse(json);
  if (!data || !data.version || !Array.isArray(data.tree)) {
    throw new Error('Invalid JSON profile: missing version or tree');
  }
  return data.tree;
}

function parseNodeFromElement(el: Element): ExportBookmarkNode {
  const node: ExportBookmarkNode = {
    id: crypto.randomUUID(),
    title: el.getAttribute('title') || el.textContent?.trim() || '',
    dateAdded: 0,
  };

  const addDate = el.getAttribute('ADD_DATE');
  if (addDate) {
    node.dateAdded = parseInt(addDate, 10) * 1000;
  }
  const lastMod = el.getAttribute('LAST_MODIFIED');
  if (lastMod) {
    node.dateGroupModified = parseInt(lastMod, 10) * 1000;
  }

  const href = el.getAttribute('HREF');
  if (href) {
    node.url = href;
  }

  return node;
}

function parseDL(dl: Element): ExportBookmarkNode[] {
  const nodes: ExportBookmarkNode[] = [];
  for (let i = 0; i < dl.children.length; i++) {
    const child = dl.children[i];
    if (child.tagName === 'DT') {
      const aOrH3 = child.querySelector('A, H3');
      if (aOrH3) {
        const node = parseNodeFromElement(aOrH3);
        const nextSibling = dl.children[i + 1];
        if (nextSibling && nextSibling.tagName === 'DD') {
          const innerDL = nextSibling.querySelector('DL');
          if (innerDL) {
            node.children = parseDL(innerDL);
          }
          i++;
        }
        nodes.push(node);
      }
    }
  }
  return nodes;
}

export function parseNetscapeHtml(html: string): ExportBookmarkNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const topDL = doc.querySelector('DL');
  if (!topDL) {
    // If standard <DL> not found, try to find any DL (some exports vary)
    const anyDL = doc.querySelector('DL');
    if (!anyDL) {
      return [];
    }
    return parseDL(anyDL);
  }
  return parseDL(topDL);
}

function countImportedNodes(nodes: ExportBookmarkNode[]): { bookmarks: number; folders: number } {
  let bookmarks = 0;
  let folders = 0;
  function walk(list: ExportBookmarkNode[]) {
    for (const node of list) {
      if (node.children && node.children.length > 0) {
        folders++;
        walk(node.children);
      } else if (node.url) {
        bookmarks++;
      }
    }
  }
  walk(nodes);
  return { bookmarks, folders };
}

export function previewImport(content: string): ImportPreview {
  if (content.length > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }

  const format = detectFileFormat(content);
  let tree: ExportBookmarkNode[];

  if (format === 'json') {
    tree = parseJsonProfile(content);
  } else {
    tree = parseNetscapeHtml(content);
  }

  const { bookmarks, folders } = countImportedNodes(tree);
  const date = new Date().toISOString().slice(0, 10);

  return {
    format,
    bookmarkCount: bookmarks,
    folderCount: folders,
    rootFolderName: `Imported ${date}`,
    tree,
  };
}

export function generateRootFolderName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `Imported ${date}`;
}

export async function runImport(
  tree: ExportBookmarkNode[],
  rootFolderName: string,
  onProgress: (current: number, total: number) => void,
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  function countAll(nodes: ExportBookmarkNode[]): number {
    let count = 0;
    for (const node of nodes) {
      count++;
      if (node.children && node.children.length > 0) {
        count += countAll(node.children);
      }
    }
    return count;
  }

  const total = countAll(tree);
  let processed = 0;

  const rootFolder = await chrome.bookmarks.create({
    parentId: '1',
    title: rootFolderName,
  });

  async function createNode(node: ExportBookmarkNode, parentId: string): Promise<void> {
    if (node.url) {
      try {
        const existing = await chrome.bookmarks.search({ url: node.url });
        if (existing.length > 0) {
          result.skipped++;
        } else {
          await chrome.bookmarks.create({
            parentId,
            title: node.title,
            url: node.url,
          });
          result.imported++;
        }
      } catch (err) {
        result.errors.push(`${node.title}: ${String(err)}`);
      }
    } else if (node.children && node.children.length > 0) {
      try {
        const folder = await chrome.bookmarks.create({
          parentId,
          title: node.title,
        });
        for (const child of node.children) {
          await createNode(child, folder.id);
        }
      } catch (err) {
        result.errors.push(`${node.title}: ${String(err)}`);
      }
    }

    processed++;
    onProgress(processed, total);
  }

  for (const node of tree) {
    await createNode(node, rootFolder.id);
  }

  return result;
}
