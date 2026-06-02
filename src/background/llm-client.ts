import type { Settings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { STORAGE_KEY_SETTINGS } from '@/shared/constants';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  return stored[STORAGE_KEY_SETTINGS] || DEFAULT_SETTINGS;
}

/**
 * Non-streaming chat completion.
 */
export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const settings = await getSettings();
  const url = `${settings.apiBaseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.chatModel,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1024,
      max_completion_tokens: options?.maxTokens ?? 1024,
      reasoning_effort: 'low',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const msg = data.choices?.[0]?.message;
  // Some reasoning models (DeepSeek-R1/V3, etc.) put output in reasoning_content
  return msg?.content || msg?.reasoning_content || '';
}

/**
 * Streaming chat completion. Calls onChunk for each text delta.
 * Returns the full concatenated response.
 */
export async function chatCompletionStream(
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
): Promise<string> {
  const settings = await getSettings();
  const url = `${settings.apiBaseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.chatModel,
      messages,
      temperature: 0.3,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error ${response.status}: ${body}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // Ignore parse errors for individual chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}
