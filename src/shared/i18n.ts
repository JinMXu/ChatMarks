/** Supported languages */
export type Locale = 'en' | 'zh-CN';

/** Detect system language, defaulting based on navigator.language */
export function detectSystemLocale(): Locale {
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('zh')) return 'zh-CN';
  return 'en';
}

/** All locale strings keyed by [locale][key] */
export const messages: Record<Locale, Record<string, string>> = {
  en: {
    // Settings page
    'settings.title': 'ChatMarks Settings',
    'settings.apiConfig': 'API Configuration',
    'settings.apiBaseUrl': 'API Base URL',
    'settings.apiKey': 'API Key',
    'settings.chatModel': 'Chat Model',
    'settings.embeddingModel': 'Embedding Model',
    'settings.searchSettings': 'Search Settings',
    'settings.embeddingMode': 'Embedding Mode',
    'settings.embeddingModeRemote': 'Remote API',
    'settings.embeddingModeLocal': 'Local (Privacy)',
    'settings.vectorSearchTopK': 'Vector Search Top-K',
    'settings.maxBookmarksLLM': 'Max Bookmarks for LLM (fallback)',
    'settings.indexManagement': 'Index Management',
    'settings.reindex': 'Re-Index All Bookmarks',
    'settings.save': 'Save Settings',
    'settings.saved': 'Saved!',
    'settings.loading': 'Loading...',
    'settings.language': 'Language',
    'settings.languageDesc': 'Interface display language',

    // Chat
    'chat.placeholder': 'Search your bookmarks...',
    'chat.clear': 'Clear',
    'chat.emptyTitle': 'ChatMarks',
    'chat.emptyDesc': 'Describe what bookmark you\'re looking for.\ne.g. "Find the Rust article I saved last month"',
    'chat.send': 'Send',

    // Sidebar
    'sidebar.newConv': 'New conversation',
    'sidebar.settings': 'Settings',
    'sidebar.noConversations': 'No conversations yet',

    // Index
    'index.ready': 'Ready',
    'index.bookmarksIndexed': '{count} bookmarks indexed',
    'index.scanning': 'Scanning...',
    'index.indexing': 'Indexing... {pct}%',
    'index.error': 'Index error: {error}',
    'index.errorPrefix': 'Index error',

    // Bookmark card
    'bookmark.added': 'Added {time}',
    'bookmark.untitled': 'Untitled',

    // Settings bar
    'settingsBar.title': 'ChatMarks',
    'settingsBar.sidePanel': 'Side Panel',
    'settingsBar.settings': 'Settings',
    'settingsBar.dashboard': 'Dashboard',

    // Conversation manager
    'conv.newChat': 'New Chat',

    // Bookmark tree
    'tree.title': 'Bookmarks',
    'tree.expandAll': 'Expand all',
    'tree.expand': 'Expand',
    'tree.folder': 'Folder',

    // Result panel
    'result.title': 'Results',
    'result.empty': 'Search results will appear here',
    'result.found': '{n} found',

    // Match
    'match.label': 'Match',

    // Delete
    'delete': 'Delete',

    // Loading
    'loading': 'Loading...',

    // Organize
    'organize.title': 'Smart Organize',
    'organize.start': 'Analyze & Organize',
    'organize.scanning': 'Reading bookmarks...',
    'organize.sending': 'Preparing data for AI...',
    'organize.waiting': 'AI is analyzing, please wait...',
    'organize.analyzing': 'Analyzing {n} bookmarks...',
    'organize.empty': 'No suggestions yet. Click "Analyze & Organize" to let AI analyze your bookmarks.',
    'organize.current': 'Current: {path}',
    'organize.suggested': '→ {folder}',
    'organize.apply': 'Apply ({n})',
    'organize.selectAll': 'Select all',
    'organize.deselectAll': 'Deselect all',
    'organize.applied': 'Organization applied!',

    // Time
    'time.justNow': 'just now',
    'time.minutesAgo': '{n}m ago',
    'time.hoursAgo': '{n}h ago',
    'time.daysAgo': '{n}d ago',
    'time.monthsAgo': '{n}mo ago',
    'time.yearsAgo': '{n}y ago',
  },

  'zh-CN': {
    // Settings page
    'settings.title': 'ChatMarks 设置',
    'settings.apiConfig': 'API 配置',
    'settings.apiBaseUrl': 'API 基础地址',
    'settings.apiKey': 'API 密钥',
    'settings.chatModel': '对话模型',
    'settings.embeddingModel': '嵌入模型',
    'settings.searchSettings': '搜索设置',
    'settings.embeddingMode': '嵌入模式',
    'settings.embeddingModeRemote': '远程 API',
    'settings.embeddingModeLocal': '本地 (隐私模式)',
    'settings.vectorSearchTopK': '向量搜索 Top-K',
    'settings.maxBookmarksLLM': 'LLM 最大书签数 (降级模式)',
    'settings.indexManagement': '索引管理',
    'settings.reindex': '重新索引全部书签',
    'settings.save': '保存设置',
    'settings.saved': '已保存!',
    'settings.loading': '加载中...',
    'settings.language': '语言',
    'settings.languageDesc': '界面显示语言',

    // Chat
    'chat.placeholder': '搜索你的书签...',
    'chat.clear': '清除',
    'chat.emptyTitle': 'ChatMarks',
    'chat.emptyDesc': '描述你想找的书签。\n例如："帮我找上个月保存的 Rust 文章"',
    'chat.send': '发送',

    // Sidebar
    'sidebar.newConv': '新建对话',
    'sidebar.settings': '设置',
    'sidebar.noConversations': '暂无对话',

    // Index
    'index.ready': '就绪',
    'index.bookmarksIndexed': '已索引 {count} 个书签',
    'index.scanning': '扫描中...',
    'index.indexing': '索引中... {pct}%',
    'index.error': '索引错误: {error}',
    'index.errorPrefix': '索引错误',

    // Bookmark card
    'bookmark.added': '{time}前添加',
    'bookmark.untitled': '无标题',

    // Settings bar
    'settingsBar.title': 'ChatMarks',
    'settingsBar.sidePanel': '侧边栏',
    'settingsBar.settings': '设置',
    'settingsBar.dashboard': '工作台',

    // Conversation manager
    'conv.newChat': '新对话',

    // Bookmark tree
    'tree.title': '书签',
    'tree.expandAll': '全部展开',
    'tree.expand': '展开',
    'tree.folder': '文件夹',

    // Result panel
    'result.title': '搜索结果',
    'result.empty': '搜索结果将显示在这里',
    'result.found': '找到 {n} 条',

    // Match
    'match.label': '匹配',

    // Delete
    'delete': '删除',

    // Loading
    'loading': '加载中...',

    // Organize
    'organize.title': '智能整理',
    'organize.start': '分析并整理',
    'organize.scanning': '正在读取书签...',
    'organize.sending': '正在准备数据...',
    'organize.waiting': 'AI 正在分析中，请稍候...',
    'organize.analyzing': '正在分析 {n} 个书签...',
    'organize.empty': '暂无建议。点击"分析并整理"让 AI 分析你的书签。',
    'organize.current': '当前: {path}',
    'organize.suggested': '→ {folder}',
    'organize.apply': '应用 ({n})',
    'organize.selectAll': '全选',
    'organize.deselectAll': '取消全选',
    'organize.applied': '整理已应用!',

    // Time
    'time.justNow': '刚刚',
    'time.minutesAgo': '{n}分钟前',
    'time.hoursAgo': '{n}小时前',
    'time.daysAgo': '{n}天前',
    'time.monthsAgo': '{n}个月前',
    'time.yearsAgo': '{n}年前',
  },
};

/**
 * Translation function. Replaces {key} placeholders with values from params.
 */
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const map = messages[locale];
  let text = map?.[key] ?? messages['en'][key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }

  return text;
}

/**
 * Format relative time based on locale.
 */
export function relativeTimeLocale(locale: Locale, ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return t(locale, 'time.justNow');
  if (minutes < 60) return t(locale, 'time.minutesAgo', { n: minutes });
  if (hours < 24) return t(locale, 'time.hoursAgo', { n: hours });
  if (days < 30) return t(locale, 'time.daysAgo', { n: days });
  if (months < 12) return t(locale, 'time.monthsAgo', { n: months });
  return t(locale, 'time.yearsAgo', { n: years });
}

/**
 * Format a date for display, locale-aware.
 */
export function formatDateLocale(locale: Locale, ts: number): string {
  const lang = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
  return new Date(ts).toLocaleDateString(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get current date string for LLM context, locale-aware.
 */
export function getDateContextLocale(locale: Locale): string {
  const lang = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
  return new Date().toLocaleDateString(lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}
