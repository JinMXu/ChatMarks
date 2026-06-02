import type { Settings, EmbeddingVector } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { STORAGE_KEY_SETTINGS } from '@/shared/constants';

/**
 * Generate embeddings for an array of texts.
 * Routes to remote API or local model based on settings.
 */
export async function embed(texts: string[]): Promise<EmbeddingVector[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  const settings: Settings = stored[STORAGE_KEY_SETTINGS] || DEFAULT_SETTINGS;

  if (settings.embeddingMode === 'local') {
    return embedLocal(texts);
  }
  return embedRemote(texts, settings);
}

/**
 * Remote embedding via OpenAI-compatible API.
 */
async function embedRemote(texts: string[], settings: Settings): Promise<EmbeddingVector[]> {
  const url = `${settings.apiBaseUrl}/embeddings`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.embeddingModel,
      input: texts,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const items = data.data as Array<{ embedding: number[]; index: number }>;
  return items
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Local embedding via offscreen document.
 */
async function embedLocal(texts: string[]): Promise<EmbeddingVector[]> {
  // Check if offscreen document exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL('/offscreen.html')],
  });

  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: '/offscreen.html',
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: 'Local embedding model inference',
    });
  }

  // Send message to offscreen document
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'EMBED_LOCAL', texts },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.vectors);
        }
      },
    );
  });
}
