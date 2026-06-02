import { useState, useEffect } from 'preact/hooks';
import type { IndexStatus } from '@/shared/types';

export function useIndexStatus() {
  const [status, setStatus] = useState<IndexStatus>({
    total: 0,
    indexed: 0,
    phase: 'idle',
  });

  useEffect(() => {
    // Get initial status
    chrome.runtime.sendMessage({ type: 'GET_INDEX_STATUS' }, (response) => {
      if (response?.status) {
        setStatus(response.status);
      }
    });

    // Listen for status updates
    const listener = (message: { type: string; status?: IndexStatus }) => {
      if (message.type === 'INDEX_STATUS' && message.status) {
        setStatus(message.status);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return status;
}
