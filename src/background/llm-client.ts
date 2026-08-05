import type { Settings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { STORAGE_KEY_SETTINGS } from '@/shared/constants';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  return stored[STORAGE_KEY_SETTINGS] || DEFAULT_SETTINGS;
}

/**
 * POST a chat completion request. Thinking/reasoning is disabled by default
 * (DeepSeek-style `thinking` switch plus OpenAI-style `reasoning_effort`) —
 * search/organize don't need a chain of thought, and reasoning models are
 * slow and burn the token budget before answering. Providers that reject
 * unknown params get one retry without them.
 */
async function postChat(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<Response> {
  const thinkingParams = {
    reasoning_effort: 'low',
    thinking: { type: 'disabled' },
  };
  const send = (b: Record<string, unknown>) =>
    fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(b),
    });

  let response = await send({ ...body, ...thinkingParams });
  if (response.status === 400) {
    // Strict provider rejected the extra params — retry without them
    response = await send(body);
  }
  return response;
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

  const response = await postChat(
    url,
    settings.apiKey,
    {
      model: settings.chatModel,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1024,
      max_completion_tokens: options?.maxTokens ?? 1024,
    },
    30_000,
  );

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

  const response = await postChat(
    url,
    settings.apiKey,
    {
      model: settings.chatModel,
      messages,
      temperature: 0.3,
      // Reasoning models burn most of the budget on chain-of-thought before
      // emitting any content — give them headroom.
      max_tokens: 4096,
      stream: true,
    },
    // Longer timeout: first token of a stream can take a while
    120_000,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error ${response.status}: ${body}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  // Raw body kept as a fallback: some proxies ignore `stream: true` and
  // return a plain (non-SSE) JSON completion with a 200 status.
  let rawText = '';
  let finishReason: string | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const decoded = decoder.decode(value, { stream: true });
      rawText += decoded;
      buffer += decoded;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        // Accept both `data: {...}` and `data:{...}` (no space)
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trimStart();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (choice?.finish_reason) finishReason = choice.finish_reason;
          // delta.content is the standard; some proxies return a full
          // `message` object per event instead of deltas. Reasoning models'
          // reasoning_content is deliberately ignored — it's the chain of
          // thought, not the answer.
          const delta = choice?.delta?.content ?? choice?.message?.content;
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

  // A reasoning model can exhaust max_tokens on chain-of-thought before
  // producing any content — surface that specifically instead of a generic
  // empty response.
  if (!fullText && finishReason === 'length') {
    throw new Error(
      'LLM response was truncated by max_tokens before any answer was produced. ' +
        'A reasoning model may need the whole budget for thinking — consider using a non-reasoning chat model for search.',
    );
  }

  // Non-SSE fallback: the body was a plain JSON completion all along
  if (!fullText && rawText.trim()) {
    try {
      const parsed = JSON.parse(rawText);
      const msg = parsed.choices?.[0]?.message;
      fullText = msg?.content || '';
      if (fullText) onChunk(fullText);
    } catch {
      // Not JSON either — genuinely empty response
    }
  }

  return fullText;
}
