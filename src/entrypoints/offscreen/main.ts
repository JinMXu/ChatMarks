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
    const msg = err instanceof Error ? err.message : String(err);
    isLoaded = false;
    if (statusEl) statusEl.textContent = `Error: ${msg}`;
    throw new Error(
      msg.includes('Failed to resolve module')
        ? 'Local embedding model not available. @xenova/transformers is not installed. Switch to remote mode or run: npm install @xenova/transformers'
        : `Failed to load local embedding model: ${msg}`,
    );
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
loadModel().catch((err) => {
  console.warn('[ChatMarks Offscreen]', err.message);
});

export default undefined;
