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
 * Uses embedding-specific API key/base URL if set, otherwise falls back to chat API settings.
 */
async function embedRemote(texts: string[], settings: Settings): Promise<EmbeddingVector[]> {
  const apiKey = settings.embeddingApiKey || settings.apiKey;
  const apiBaseUrl = settings.embeddingApiBaseUrl || settings.apiBaseUrl;
  const url = `${apiBaseUrl}/embeddings`;

  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
// Serializes offscreen document creation so concurrent embedLocal calls
// don't both pass the getContexts check and race createDocument.
let creatingOffscreen: Promise<void> | null = null;

// Closes the offscreen document after a period of inactivity so the MiniLM
// model (tens of MB) doesn't sit in memory forever. An MV3 service worker is
// normally killed by Chrome when idle anyway; this timer covers the case
// where the SW stays alive for a long time (e.g. a persistent message port).
const OFFSCREEN_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let offscreenIdleTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleOffscreenIdleClose(): void {
  if (offscreenIdleTimer !== null) {
    clearTimeout(offscreenIdleTimer);
  }
  offscreenIdleTimer = setTimeout(() => {
    offscreenIdleTimer = null;
    void (async () => {
      try {
        const contexts = await chrome.runtime.getContexts({
          contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
          documentUrls: [chrome.runtime.getURL('/offscreen.html')],
        });
        if (contexts.length > 0) {
          await chrome.offscreen.closeDocument();
        }
      } catch {
        // Document already gone or close failed; next embedLocal recreates it.
      }
    })();
  }, OFFSCREEN_IDLE_TIMEOUT_MS);
}

async function embedLocal(texts: string[]): Promise<EmbeddingVector[]> {
  // Check if offscreen document exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL('/offscreen.html')],
  });

  if (existingContexts.length === 0) {
    creatingOffscreen ??= chrome.offscreen
      .createDocument({
        url: '/offscreen.html',
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'Local embedding model inference',
      })
      .finally(() => {
        creatingOffscreen = null;
      });
    await creatingOffscreen;
  }

  // Send message to offscreen document
  const vectors = await new Promise<EmbeddingVector[]>((resolve, reject) => {
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

  // Reset the idle close timer on every successful embed.
  scheduleOffscreenIdleClose();
  return vectors;
}
