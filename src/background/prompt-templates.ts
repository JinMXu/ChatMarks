import { getDateContextLocale, type Locale } from '@/shared/i18n';
import { parseRelativeDateExpression } from '@/shared/utils';
import type { BookmarkNode } from '@/shared/types';

function getLocale(): Locale {
  // Default to 'en' for SW context; will be overridden by caller
  return 'en';
}

/**
 * System prompt for the search assistant.
 */
export function buildSystemPrompt(language?: Locale): string {
  const locale = language || getLocale();
  const today = getDateContextLocale(locale);
  return `You are ChatMarks, a bookmark search assistant. Your job is to help the user find bookmarks from their collection.

Today's date: ${today}

## Instructions
1. The user will describe what they're looking for in natural language (e.g., "the Rust article I saved last month").
2. You will receive a list of candidate bookmarks from the user's collection.
3. Select the 3-5 most relevant bookmarks and explain WHY each one matches.
4. If nothing matches well, say so honestly.
5. Be concise. Format your response as:
   - A brief 1-2 sentence summary
   - Numbered list of results, each with: title, URL (in parentheses), and a one-line match explanation

## Important
- Only recommend bookmarks from the provided candidates. Do not invent bookmarks.
- If the query includes time references like "last month", "上周", "yesterday", pay extra attention to bookmark dates.
- Respond in the same language as the user's query.`;
}

/**
 * Build the user message containing the query and candidate bookmarks.
 */
export function buildSearchMessage(
  query: string,
  candidates: BookmarkNode[],
  language?: Locale,
): string {
  const locale = language || getLocale();
  const dateRange = parseRelativeDateExpression(query);
  const dateLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';

  const formatted = candidates.map((b, i) => {
    const dateStr = new Date(b.dateAdded).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return `[${i + 1}] Title: ${b.title}
   URL: ${b.url || 'N/A'}
   Folder: ${b.path}
   Added: ${dateStr}`;
  }).join('\n\n');

  const timeContext = dateRange
    ? `\n(Note: the user's query contains a time reference. The relevant date range is approximately ${new Date(dateRange.start!).toLocaleDateString(dateLocale)} to ${dateRange.end ? new Date(dateRange.end).toLocaleDateString(dateLocale) : (locale === 'zh-CN' ? '今天' : 'today')}.)`
    : '';

  return `Search query: "${query}"${timeContext}

Here are ${candidates.length} candidate bookmarks from the user's collection:

${formatted}

Please select the 3-5 most relevant bookmarks and explain your reasoning.`;
}

/**
 * Build degraded search prompt (when no index is available).
 */
export function buildDegradedSearchMessage(
  query: string,
  allBookmarks: BookmarkNode[],
  language?: Locale,
): string {
  const locale = language || getLocale();
  const dateRange = parseRelativeDateExpression(query);

  let filtered = allBookmarks;
  if (dateRange) {
    filtered = allBookmarks.filter((b) => {
      if (dateRange.start && b.dateAdded < dateRange.start) return false;
      if (dateRange.end && b.dateAdded > dateRange.end) return false;
      return true;
    });
  }

  filtered.sort((a, b) => b.dateAdded - a.dateAdded);

  const dateLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
  const formatted = filtered.map((b, i) => {
    const dateStr = new Date(b.dateAdded).toLocaleDateString(dateLocale);
    return `[${i + 1}] ${b.title} — ${b.url} (${b.path}, ${dateStr})`;
  }).join('\n');

  return `Search query: "${query}"

Here are the user's bookmarks (most recent first):

${formatted}

Please find the 3-5 most relevant bookmarks.`;
}

/**
 * Build prompt for intelligent bookmark organization.
 * Sends all bookmarks to LLM and asks it to suggest a folder structure.
 */
export function buildOrganizePrompt(
  bookmarks: Array<{ id: string; title: string; url: string; path: string }>,
  locale: Locale,
): Array<{ role: string; content: string }> {
  const lang = locale === 'zh-CN' ? 'Chinese' : 'English';

  const bookmarkList = bookmarks
    .map((b, i) => {
      const domain = extractDomainForPrompt(b.url);
      return `#${i + 1} | ${b.title} | ${domain} | Current folder: ${b.path}`;
    })
    .join('\n');

  return [
    {
      role: 'system',
      content: `You are a bookmark organization assistant. Analyze the user's ACTUAL bookmarks and create a customized folder structure based on what you find.

## CRITICAL: Output ONLY the JSON object. Do NOT think out loud. Just output the JSON directly.

## Process
1. Scan ALL bookmark titles and domains to identify the MAIN TOPICS that actually appear in the data.
2. Create folder names that reflect THESE SPECIFIC topics — do NOT use generic categories unless they truly match.
3. For example: if most bookmarks are about cooking and travel, create "Cooking" and "Travel" folders. If they're about Kubernetes and Rust, create those folders. Let the DATA drive the categories.
4. Folder names should be specific and descriptive (2-4 words in ${lang}).

## Rules
- Group by what's actually in the bookmarks, NOT pre-conceived categories.
- Folders at 1-2 levels deep.
- Number of folders should reflect the data: 5 for diverse collections, up to 15 for large varied ones.
- Put truly unclassifiable bookmarks in "Other".
- Output ONLY valid JSON.

## Output format
\`\`\`json
{
  "folders": [
    {
      "folder": "Data-Driven Folder Name",
      "bookmarkIds": [1, 5, 12],
      "reason": "Brief explanation in ${lang}"
    }
  ]
}
\`\`\`

Respond in ${lang}.`,
    },
    {
      role: 'user',
      content: `Here are all ${bookmarks.length} of my bookmarks. Analyze the titles and domains carefully, identify the actual topics that appear, and group them accordingly.

${bookmarkList}

First identify the 5-15 main topics present in the data, then create folders for them. Return ONLY the JSON.`,
    },
  ];
}

function extractDomainForPrompt(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 40);
  }
}
