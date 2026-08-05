import { embed } from './embedding-provider';
import { vectorSearch } from './vector-store';
import { chatCompletionStream, getSettings } from './llm-client';
import { buildSystemPrompt, buildSearchMessage, buildDegradedSearchMessage } from './prompt-templates';
import { ConversationManager } from './conversation-manager';
import { getBookmarksByIds, getAllBookmarks, getEmbeddingCount } from '@/shared/db';
import type { SearchResult, RuntimeMessage, BookmarkNode } from '@/shared/types';

/**
 * Broadcast a runtime message, ignoring rejections when no receiver is
 * listening (common in MV3 when the popup/options page is closed).
 */
const broadcast = (msg: unknown) => {
  chrome.runtime.sendMessage(msg).catch(() => {});
};

/**
 * Main search pipeline.
 */
export async function searchBookmarks(
  query: string,
  conversationId?: string,
): Promise<void> {
  const settings = await getSettings();
  const convManager = new ConversationManager();

  // Add user message to conversation
  const conv = await convManager.addUserMessage(query, conversationId);

  try {
    const embeddingCount = await getEmbeddingCount();

    let candidates: BookmarkNode[];
    let scoreMap: Map<string, number> | undefined;

    if (embeddingCount > 0) {
      // Vector search path
      let topResults: Awaited<ReturnType<typeof vectorSearch>> = [];
      try {
        const queryVector = await embed([query]);
        topResults = await vectorSearch(queryVector[0], settings.vectorSearchTopK);
      } catch (embedErr) {
        // Embedding/vector lookup failed (e.g. API outage) — degrade to
        // local bookmarks instead of failing the whole search.
        console.warn('Embedding failed, falling back to degraded search:', embedErr);
      }

      if (topResults.length === 0) {
        // Fall back to degraded mode
        candidates = await getAllBookmarks();
        candidates = candidates.slice(0, settings.maxBookmarksForLLM);
        scoreMap = undefined;
      } else {
        scoreMap = new Map(topResults.map((r) => [r.bookmarkId, r.score]));
        candidates = await getBookmarksByIds(topResults.map((r) => r.bookmarkId));
      }
    } else {
      // No embeddings yet — degraded mode
      candidates = await getAllBookmarks();
      candidates = candidates.slice(0, settings.maxBookmarksForLLM);
    }

    // Build messages for LLM
    const language = (settings.language || 'en') as import('@/shared/i18n').Locale;
    const systemMsg = buildSystemPrompt(language);
    const userMsg =
      embeddingCount > 0
        ? buildSearchMessage(query, candidates, language, scoreMap)
        : buildDegradedSearchMessage(query, candidates, language);

    // Stream LLM response with incremental [MATCH:N] parsing
    let streamedContent = '';
    let streamBuffer = '';
    const matchResults: SearchResult[] = [];
    const matchSeen = new Set<string>();

    // Build candidate lookup map (1-based index → BookmarkNode)
    const candidateMap = new Map<number, BookmarkNode>();
    candidates.forEach((c, i) => candidateMap.set(i + 1, c));

    const fullResponse = await chatCompletionStream(
      [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg },
      ],
      (chunk) => {
        streamBuffer += chunk;

        // Split on newlines; keep incomplete last line in buffer
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const matchMatch = line.match(/^\[MATCH:(\d+)\]/);
          if (matchMatch) {
            const idx = parseInt(matchMatch[1], 10);
            const candidate = candidateMap.get(idx);
            if (candidate && !matchSeen.has(candidate.id)) {
              matchSeen.add(candidate.id);
              const result: SearchResult = {
                bookmarkId: candidate.id,
                title: candidate.title,
                url: candidate.url || '',
                path: candidate.path,
                dateAdded: candidate.dateAdded,
                matchReason: line.slice(matchMatch[0].length).trim(),
                score: scoreMap?.get(candidate.id),
              };
              matchResults.push(result);

              broadcast({
                type: 'SEARCH_RESULT_APPEND',
                result,
                conversationId,
              } as RuntimeMessage);
            }
          } else {
            // Non-MATCH line: stream as text
            streamedContent += line + '\n';
            broadcast({
              type: 'SEARCH_STREAM',
              chunk: line + '\n',
              conversationId,
            } as RuntimeMessage);
          }
        }
      },
    );

    // Process any remaining buffer content after stream ends
    if (streamBuffer.trim()) {
      const matchMatch = streamBuffer.match(/^\[MATCH:(\d+)\]/);
      if (matchMatch) {
        const idx = parseInt(matchMatch[1], 10);
        const candidate = candidateMap.get(idx);
        if (candidate && !matchSeen.has(candidate.id)) {
          matchSeen.add(candidate.id);
          const result: SearchResult = {
            bookmarkId: candidate.id,
            title: candidate.title,
            url: candidate.url || '',
            path: candidate.path,
            dateAdded: candidate.dateAdded,
            matchReason: streamBuffer.slice(matchMatch[0].length).trim(),
            score: scoreMap?.get(candidate.id),
          };
          matchResults.push(result);

          broadcast({
            type: 'SEARCH_RESULT_APPEND',
            result,
            conversationId,
          } as RuntimeMessage);
        }
      } else {
        streamedContent += streamBuffer;
        broadcast({
          type: 'SEARCH_STREAM',
          chunk: streamBuffer,
          conversationId,
        } as RuntimeMessage);
      }
    }

    // An empty response would otherwise surface as "nothing happens" in the
    // UI — fail loudly so the error banner tells the user what went wrong.
    if (!fullResponse.trim()) {
      throw new Error(
        'LLM returned an empty response. Check your chat model and API settings.',
      );
    }

    // Use incrementally collected results; fall back to URL extraction if empty
    let results = matchResults;
    if (results.length === 0) {
      results = extractResults(fullResponse, candidates);
    }

    // Re-rank: fuse vector scores with LLM ordering
    if (scoreMap && scoreMap.size > 0 && results.length > 0) {
      results = reRankResults(results, scoreMap);
    }

    // Send results
    broadcast({
      type: 'SEARCH_RESULT',
      results,
      conversationId,
    } as RuntimeMessage);

    // Save assistant message to conversation
    await convManager.addAssistantMessage(conv.id, streamedContent, results);

    // Signal done
    broadcast({ type: 'SEARCH_DONE', conversationId } as RuntimeMessage);
  } catch (err) {
    console.error('Search error:', err);
    broadcast({
      type: 'SEARCH_ERROR',
      error: String(err),
      conversationId,
    } as RuntimeMessage);
  }
}

/**
 * Fuse vector similarity scores with LLM positional ordering.
 * finalScore = vectorScore * 0.7 + positionBoost * 0.3
 */
function reRankResults(
  results: SearchResult[],
  scoreMap: Map<string, number>,
): SearchResult[] {
  const n = results.length;

  return results
    .map((r, i) => {
      const vectorScore = scoreMap.get(r.bookmarkId) ?? 0;
      const positionBoost = (n - i) / n; // first = 1.0, last = 1/N
      const finalScore = vectorScore * 0.7 + positionBoost * 0.3;

      return { ...r, score: Math.round(finalScore * 100) / 100 };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * Extract bookmark results from LLM response by matching URLs.
 */
function extractResults(
  llmResponse: string,
  candidates: BookmarkNode[],
): SearchResult[] {
  const results: SearchResult[] = [];
  // Normalize URLs the same way on both sides: lowercase, strip trailing
  // punctuation, strip trailing slash.
  const normalizeUrl = (u: string) =>
    u.toLowerCase().replace(/[.,;:!?/]+$/, '');
  const urlMap = new Map(
    candidates
      .filter((c) => c.url)
      .map((c) => [normalizeUrl(c.url!), c]),
  );

  // Match URLs in the LLM response
  const urlRegex = /https?:\/\/[^\s)\]"']+/gi;
  const matches = llmResponse.match(urlRegex);

  if (matches) {
    const seen = new Set<string>();
    for (const url of matches) {
      const normalized = normalizeUrl(url);
      const candidate = urlMap.get(normalized);
      if (candidate && !seen.has(candidate.id)) {
        seen.add(candidate.id);
        results.push({
          bookmarkId: candidate.id,
          title: candidate.title,
          url: candidate.url || '',
          path: candidate.path,
          dateAdded: candidate.dateAdded,
          matchReason: extractReason(llmResponse, candidate.title),
        });
      }
    }
  }

  // Fallback: match by title
  if (results.length === 0) {
    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (seen.size >= 5) break;
      if (llmResponse.toLowerCase().includes(candidate.title.toLowerCase()) && !seen.has(candidate.id)) {
        seen.add(candidate.id);
        results.push({
          bookmarkId: candidate.id,
          title: candidate.title,
          url: candidate.url || '',
          path: candidate.path,
          dateAdded: candidate.dateAdded,
          matchReason: '',
        });
      }
    }
  }

  return results;
}

function extractReason(fullText: string, title: string): string {
  // Try to find a sentence near the title that explains the match
  const idx = fullText.toLowerCase().indexOf(title.toLowerCase());
  if (idx === -1) return '';

  const context = fullText.slice(Math.max(0, idx - 200), idx + 200);
  const sentences = context.split(/[.!?\n]/);
  for (const s of sentences) {
    if (s.toLowerCase().includes(title.toLowerCase()) && s.length > 20) {
      return s.trim();
    }
  }
  return '';
}
