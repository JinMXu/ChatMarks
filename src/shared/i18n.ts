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
    'settings.embeddingConfig': 'Embedding API Configuration',
    'settings.embeddingApiBaseUrl': 'Embedding API Base URL',
    'settings.embeddingApiKey': 'Embedding API Key',
    'settings.embeddingApiHint': 'Leave empty to use Chat API settings above',
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
    'match.relevance': 'Relevance',

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

    // Duplicates
    'duplicates.title': 'Duplicates',
    'duplicates.scan': 'Scan for Duplicates',
    'duplicates.scanning': 'Scanning...',
    'duplicates.scanResult': 'Found {n} duplicate groups',
    'duplicates.noDupes': 'No duplicates found',
    'duplicates.delete': 'Delete Selected ({n})',
    'duplicates.deleting': 'Deleting...',
    'duplicates.deleted': 'Deleted {n} bookmarks',
    'duplicates.error': 'Error: {error}',
    'duplicates.retry': 'Retry',
    'duplicates.groupUrl': 'URL: {url}',
    'duplicates.selectAllGroup': 'Select all',
    'duplicates.deselectAllGroup': 'Deselect all',
    'duplicates.exact': 'Exact',
    'duplicates.near': 'Similar',
    'duplicates.dupes': '{n} duplicates',
    'duplicates.atLeastOne': 'At least one bookmark must remain per group',
    'duplicates.rescan': 'Scan Again',

    // Import/Export
    'exportImport.title': 'Import/Export',
    'exportImport.exportTab': 'Export',
    'exportImport.importTab': 'Import',
    'exportImport.exportDesc': 'Download your bookmarks as JSON or HTML format for backup or migration.',
    'exportImport.jsonFormat': 'JSON',
    'exportImport.htmlFormat': 'HTML (Chrome compatible)',
    'exportImport.exportBtn': 'Export Bookmarks',
    'exportImport.preparing': 'Preparing export...',
    'exportImport.exportDone': 'Exported {n} bookmarks',
    'exportImport.exportError': 'Export failed: {error}',
    'exportImport.importDesc': 'Import bookmarks from a previously exported file. Supports JSON and Chrome-compatible HTML formats.',
    'exportImport.chooseFile': 'Choose File',
    'exportImport.dropHint': 'or drag a .json / .html file here',
    'exportImport.fileSelected': 'Selected: {name}',
    'exportImport.formatDetected': 'Format: {format}',
    'exportImport.willImport': '{count} bookmarks will be imported into',
    'exportImport.folderName': 'Imported {date}',
    'exportImport.confirmImport': 'Confirm Import',
    'exportImport.importing': 'Importing...',
    'exportImport.importingProgress': 'Importing {current}/{total}...',
    'exportImport.importDone': 'Imported {imported}, skipped {skipped} duplicates',
    'exportImport.importError': 'Import failed: {error}',
    'exportImport.parseError': 'Could not parse file. Please check the format.',
    'exportImport.fileTooLarge': 'File is too large (max 50MB)',
    'exportImport.retry': 'Retry',
    'exportImport.cancel': 'Cancel',
    'exportImport.chooseAnother': 'Choose Another File',
    'exportImport.exportAgain': 'Export Again',
    'exportImport.folders': '{n} folders',
    'exportImport.bookmarks': '{n} bookmarks',

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
    'settings.embeddingConfig': '嵌入模型 API 配置',
    'settings.embeddingApiBaseUrl': '嵌入 API 基础地址',
    'settings.embeddingApiKey': '嵌入 API 密钥',
    'settings.embeddingApiHint': '留空则使用上方对话模型的 API 设置',
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
    'match.relevance': '相关度',

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

    // Duplicates
    'duplicates.title': '重复书签',
    'duplicates.scan': '扫描重复书签',
    'duplicates.scanning': '扫描中...',
    'duplicates.scanResult': '发现 {n} 组重复书签',
    'duplicates.noDupes': '未发现重复书签',
    'duplicates.delete': '删除选中 ({n})',
    'duplicates.deleting': '删除中...',
    'duplicates.deleted': '已删除 {n} 个书签',
    'duplicates.error': '错误: {error}',
    'duplicates.retry': '重试',
    'duplicates.groupUrl': 'URL: {url}',
    'duplicates.selectAllGroup': '全选',
    'duplicates.deselectAllGroup': '取消全选',
    'duplicates.exact': '精确匹配',
    'duplicates.near': '相似匹配',
    'duplicates.dupes': '{n} 个重复',
    'duplicates.atLeastOne': '每组至少需要保留一个书签',
    'duplicates.rescan': '重新扫描',

    // Import/Export
    'exportImport.title': '导入/导出',
    'exportImport.exportTab': '导出',
    'exportImport.importTab': '导入',
    'exportImport.exportDesc': '将书签导出为 JSON 或 HTML 格式，用于备份或迁移。',
    'exportImport.jsonFormat': 'JSON',
    'exportImport.htmlFormat': 'HTML（兼容 Chrome）',
    'exportImport.exportBtn': '导出书签',
    'exportImport.preparing': '正在准备导出...',
    'exportImport.exportDone': '已导出 {n} 个书签',
    'exportImport.exportError': '导出失败: {error}',
    'exportImport.importDesc': '从之前导出的文件导入书签。支持 JSON 和 Chrome 兼容的 HTML 格式。',
    'exportImport.chooseFile': '选择文件',
    'exportImport.dropHint': '或将文件拖放到此处',
    'exportImport.fileSelected': '已选择: {name}',
    'exportImport.formatDetected': '格式: {format}',
    'exportImport.willImport': '将导入 {count} 个书签到',
    'exportImport.folderName': '导入于 {date}',
    'exportImport.confirmImport': '确认导入',
    'exportImport.importing': '正在导入...',
    'exportImport.importingProgress': '正在导入 {current}/{total}...',
    'exportImport.importDone': '已导入 {imported} 个，跳过 {skipped} 个重复',
    'exportImport.importError': '导入失败: {error}',
    'exportImport.parseError': '无法解析文件，请检查格式。',
    'exportImport.fileTooLarge': '文件过大（最大 50MB）',
    'exportImport.retry': '重试',
    'exportImport.cancel': '取消',
    'exportImport.chooseAnother': '选择其他文件',
    'exportImport.exportAgain': '再次导出',
    'exportImport.folders': '{n} 个文件夹',
    'exportImport.bookmarks': '{n} 个书签',

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
