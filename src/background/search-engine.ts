import { embed } from './embedding-provider';
import { vectorSearch } from './vector-store';
import { chatCompletionStream, getSettings } from './llm-client';
import { buildSystemPrompt, buildSearchMessage, buildDegradedSearchMessage } from './prompt-templates';
import { ConversationManager } from './conversation-manager';
import { getBookmarksByIds, getAllBookmarks, getEmbeddingCount } from '@/shared/db';
import type { SearchResult, RuntimeMessage, BookmarkNode } from '@/shared/types';

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
      const queryVector = await embed([query]);
      const topResults = await vectorSearch(queryVector[0], settings.vectorSearchTopK);

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

    // Stream LLM response
    let streamedContent = '';
    let resultsSent = false;

    const fullResponse = await chatCompletionStream(
      [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg },
      ],
      (chunk) => {
        streamedContent += chunk;
        chrome.runtime.sendMessage({
          type: 'SEARCH_STREAM',
          chunk,
        } as RuntimeMessage);
      },
    );

    // Try to parse structured results from LLM response
    let results = extractResults(fullResponse, candidates);

    // Re-rank: fuse vector scores with LLM ordering
    if (scoreMap && scoreMap.size > 0 && results.length > 0) {
      results = reRankResults(results, scoreMap);
    }

    // Send results
    chrome.runtime.sendMessage({
      type: 'SEARCH_RESULT',
      results,
    } as RuntimeMessage);

    // Save assistant message to conversation
    await convManager.addAssistantMessage(conv.id, streamedContent, results);

    // Signal done
    chrome.runtime.sendMessage({ type: 'SEARCH_DONE' } as RuntimeMessage);
  } catch (err) {
    console.error('Search error:', err);
    chrome.runtime.sendMessage({
      type: 'SEARCH_ERROR',
      error: String(err),
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
  const urlMap = new Map(candidates.map((c) => [c.url?.toLowerCase(), c]));

  // Match URLs in the LLM response
  const urlRegex = /https?:\/\/[^\s)\]"']+/gi;
  const matches = llmResponse.match(urlRegex);

  if (matches) {
    const seen = new Set<string>();
    for (const url of matches) {
      const normalized = url.toLowerCase().replace(/[.,;:!?]+$/, '');
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
