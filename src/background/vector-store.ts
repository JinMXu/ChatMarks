import { getAllEmbeddings } from '@/shared/db';
import { cosineSimilarity } from '@/shared/utils';
import type { EmbeddingVector, EmbeddingEntry } from '@/shared/types';

/**
 * Search embeddings by cosine similarity, returning top-K bookmark IDs.
 */
export async function vectorSearch(
  queryVector: EmbeddingVector,
  topK: number,
): Promise<Array<{ bookmarkId: string; score: number }>> {
  const allEmbeddings = await getAllEmbeddings();

  if (allEmbeddings.length === 0) {
    return [];
  }

  const scored: Array<{ bookmarkId: string; score: number }> = [];

  for (const entry of allEmbeddings) {
    const similarity = cosineSimilarity(queryVector, entry.vector);
    scored.push({ bookmarkId: entry.bookmarkId, score: similarity });
  }

  // Sort by score descending, take top-K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Get all embedding vectors for full-scan (needed for vector search above).
 * Returns map of bookmarkId → vector for efficient lookup.
 */
export async function getEmbeddingMap(): Promise<Map<string, EmbeddingVector>> {
  const all = await getAllEmbeddings();
  const map = new Map<string, EmbeddingVector>();
  for (const entry of all) {
    map.set(entry.bookmarkId, entry.vector);
  }
  return map;
}
