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
      <div class="flex flex-col h-full overflow-hidden">
        <div class="flex items-center justify-between p-3 px-4 border-b border-border-light shrink-0">
          <h3 class="text-base font-bold tracking-[-0.01em]">{t('tree.title')}</h3>
        </div>
        <div class="p-6 px-4 text-text-tertiary text-base text-center">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between p-3 px-4 border-b border-border-light shrink-0">
        <h3 class="text-base font-bold tracking-[-0.01em]">{t('tree.title')}</h3>
        <button
          class="btn-text"
          onClick={() => setExpanded(new Set(tree.map((n) => n.id)))}
          title={t('tree.expandAll')}
        >
          {t('tree.expand')}
        </button>
      </div>
      <div class="flex-1 overflow-y-auto overflow-x-hidden py-1">
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
    <div class="select-none" style={{ paddingLeft: `${depth * 16 + 4}px` }}>
      <div
        class={`flex items-center gap-1 py-1 px-2 my-px mx-1 cursor-pointer rounded-sm transition-colors duration-120 whitespace-nowrap overflow-hidden ${
          !isFolder ? 'hover:bg-accent-light' : 'hover:bg-bg-hover'
        }`}
        onClick={() => onClick(node)}
      >
        {isFolder && (
          <span
            class={`text-[8px] w-4 h-4 inline-flex items-center justify-center shrink-0 text-text-tertiary transition-transform duration-120 ${
              isOpen ? 'rotate-90' : ''
            }`}
          >
            ▶
          </span>
        )}
        <span class="shrink-0 text-[14px] leading-none">
          {isFolder ? '📁' : '🔖'}
        </span>
        <span
          class="text-base overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0 hover:text-accent"
          title={node.title}
        >
          {node.title || (isFolder ? t('tree.folder') : t('bookmark.untitled'))}
        </span>
        {node.url && (
          <span class="text-[10px] text-text-tertiary font-mono overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px] shrink" title={node.url}>
            {truncateUrl(node.url)}
          </span>
        )}
      </div>
      {isFolder && isOpen && hasChildren && (
        <div>
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
