import { useState, useEffect, useCallback } from 'preact/hooks';
import { useI18n } from '@/ui/hooks/useI18n';

interface TreeNode {
  id: string;
  title: string;
  url?: string;
  children?: TreeNode[];
  dateAdded?: number;
}

export default function BookmarkTree() {
  const { t } = useI18n();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    chrome.bookmarks.getTree().then((rawTree) => {
      const roots = rawTree[0]?.children || [];
      setTree(roots.map(cleanNode));
      setLoading(false);
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClick = (node: TreeNode) => {
    if (node.url) {
      chrome.tabs.create({ url: node.url, active: true });
    } else if (node.children) {
      toggleExpand(node.id);
    }
  };

  if (loading) {
    return (
      <div class="bookmark-tree">
        <div class="tree-header">
          <h3>{t('tree.title')}</h3>
        </div>
        <div class="tree-loading">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div class="bookmark-tree">
      <div class="tree-header">
        <h3>{t('tree.title')}</h3>
        <button
          class="btn-text"
          onClick={() => setExpanded(new Set(tree.map((n) => n.id)))}
          title={t('tree.expandAll')}
        >
          {t('tree.expand')}
        </button>
      </div>
      <div class="tree-content">
        {tree.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            expanded={expanded}
            onToggle={toggleExpand}
            onClick={handleClick}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

interface TreeNodeItemProps {
  node: TreeNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onClick: (node: TreeNode) => void;
  depth: number;
}

function TreeNodeItem({ node, expanded, onToggle, onClick, depth }: TreeNodeItemProps) {
  const { t } = useI18n();
  const isFolder = !!node.children;
  const isOpen = expanded.has(node.id);
  const hasChildren = isFolder && node.children && node.children.length > 0;

  return (
    <div class="tree-node" style={{ paddingLeft: `${depth * 16 + 4}px` }}>
      <div
        class={`tree-item ${!isFolder ? 'tree-leaf' : ''}`}
        onClick={() => onClick(node)}
      >
        {isFolder && (
          <span class={`tree-arrow ${isOpen ? 'open' : ''}`}>
            ▶
          </span>
        )}
        <span class={`tree-icon ${isFolder ? 'folder' : 'bookmark'}`}>
          {isFolder ? '📁' : '🔖'}
        </span>
        <span class="tree-title" title={node.title}>
          {node.title || (isFolder ? t('tree.folder') : t('bookmark.untitled'))}
        </span>
        {node.url && (
          <span class="tree-url" title={node.url}>
            {truncateUrl(node.url)}
          </span>
        )}
      </div>
      {isFolder && isOpen && hasChildren && (
        <div class="tree-children">
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onClick={onClick}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function cleanNode(node: chrome.bookmarks.BookmarkTreeNode): TreeNode {
  return {
    id: node.id,
    title: node.title,
    url: node.url,
    dateAdded: node.dateAdded,
    children: node.children?.map(cleanNode),
  };
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname.length > 20 ? u.pathname.slice(0, 20) + '...' : u.pathname);
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url;
  }
}
