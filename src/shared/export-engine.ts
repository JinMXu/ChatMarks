export interface ExportBookmarkNode {
  id: string;
  title: string;
  url?: string;
  dateAdded: number;
  dateGroupModified?: number;
  children?: ExportBookmarkNode[];
}

export interface ExportProfile {
  version: '1.0';
  format: 'json';
  exportedAt: number;
  exportedAtISO: string;
  bookmarkCount: number;
  folderCount: number;
  tree: ExportBookmarkNode[];
}

function pruneRawNode(node: chrome.bookmarks.BookmarkTreeNode): ExportBookmarkNode {
  const pruned: ExportBookmarkNode = {
    id: node.id,
    title: node.title,
    dateAdded: node.dateAdded || 0,
  };
  if (node.url) pruned.url = node.url;
  if (node.dateGroupModified) pruned.dateGroupModified = node.dateGroupModified;
  if (node.children && node.children.length > 0) {
    pruned.children = node.children.map(pruneRawNode);
  }
  return pruned;
}

function countNodes(nodes: ExportBookmarkNode[]): { bookmarkCount: number; folderCount: number } {
  let bookmarkCount = 0;
  let folderCount = 0;
  function walk(list: ExportBookmarkNode[]) {
    for (const node of list) {
      if (node.children && node.children.length > 0) {
        folderCount++;
        walk(node.children);
      } else if (node.url) {
        bookmarkCount++;
      }
    }
  }
  walk(nodes);
  return { bookmarkCount, folderCount };
}

export interface ExportResult {
  blob: Blob;
  bookmarkCount: number;
  folderCount: number;
}

export async function exportToJsonBlob(): Promise<ExportResult> {
  const rawTree = await chrome.bookmarks.getTree();
  const root = rawTree[0];
  const children = (root.children || []).map(pruneRawNode);
  const { bookmarkCount, folderCount } = countNodes(children);
  const now = Date.now();
  const profile: ExportProfile = {
    version: '1.0',
    format: 'json',
    exportedAt: now,
    exportedAtISO: new Date(now).toISOString(),
    bookmarkCount,
    folderCount,
    tree: children,
  };
  return {
    blob: new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }),
    bookmarkCount,
    folderCount,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateNetscapeNode(node: ExportBookmarkNode, indent: number): string {
  const pad = '    '.repeat(indent);
  let html = '';
  if (node.children && node.children.length > 0) {
    html += `${pad}<DT><H3 ADD_DATE="${node.dateAdded}"`;
    if (node.dateGroupModified) html += ` LAST_MODIFIED="${node.dateGroupModified}"`;
    html += `>${escapeHtml(node.title)}</H3>\n`;
    html += `${pad}<DL><p>\n`;
    for (const child of node.children) {
      html += generateNetscapeNode(child, indent + 1);
    }
    html += `${pad}</DL><p>\n`;
  } else if (node.url) {
    const addDate = Math.floor(node.dateAdded / 1000);
    html += `${pad}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${addDate}">${escapeHtml(node.title)}</A>\n`;
  }
  return html;
}

export function generateNetscapeHtml(nodes: ExportBookmarkNode[]): string {
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n`;
  html += `<!-- This is an automatically generated file.\n     It will be lost the next time it is changed. -->\n`;
  html += `<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n`;
  html += `<TITLE>Bookmarks</TITLE>\n`;
  html += `<H1>Bookmarks</H1>\n`;
  html += `<DL><p>\n`;
  for (const node of nodes) {
    html += generateNetscapeNode(node, 0);
  }
  html += `</DL><p>\n`;
  return html;
}

export async function exportToHtmlBlob(): Promise<ExportResult> {
  const rawTree = await chrome.bookmarks.getTree();
  const root = rawTree[0];
  const children = (root.children || []).map(pruneRawNode);
  const { bookmarkCount, folderCount } = countNodes(children);
  const html = generateNetscapeHtml(children);
  return {
    blob: new Blob([html], { type: 'text/html' }),
    bookmarkCount,
    folderCount,
  };
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
