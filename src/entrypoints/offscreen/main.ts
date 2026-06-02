import type { EmbeddingVector } from '@/shared/types';

let embedder: any = null;
let isLoaded = false;

async function loadModel() {
  if (isLoaded) return;
  const statusEl = document.getElementById('status');

  try {
    // Dynamically import Transformers.js
    const { pipeline } = await import('@xenova/transformers');

    if (statusEl) statusEl.textContent = 'Loading embedding model...';

    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    isLoaded = true;
    if (statusEl) statusEl.textContent = 'Model ready';
    console.log('[ChatMarks Offscreen] Embedding model loaded');
  } catch (err) {
    console.error('[ChatMarks Offscreen] Failed to load model:', err);
    if (statusEl) statusEl.textContent = 'Error loading model';
    throw err;
  }
}

/**
 * Generate embeddings for an array of texts.
 */
async function embed(texts: string[]): Promise<EmbeddingVector[]> {
  if (!embedder) {
    await loadModel();
  }

  const results: EmbeddingVector[] = [];

  for (const text of texts) {
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert tensor to regular array
    const vector = Array.from(output.data) as EmbeddingVector;
    results.push(vector);
  }

  return results;
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EMBED_LOCAL') {
    embed(message.texts)
      .then((vectors) => sendResponse({ vectors }))
      .catch((err) => sendResponse({ error: String(err) }));
    return true; // Keep channel open for async
  }
  return false;
});

// Start loading the model immediately
loadModel().catch(console.error);

export default undefined;
