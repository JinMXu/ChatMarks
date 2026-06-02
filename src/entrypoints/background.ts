import { messageRouter } from '@/background/message-router';
import { startBookmarkWatcher } from '@/background/bookmark-watcher';
import { STORAGE_KEY_SETTINGS } from '@/shared/constants';
import { DEFAULT_SETTINGS } from '@/shared/types';

export default defineBackground(() => {
  // Initialize settings with defaults
  chrome.runtime.onInstalled.addListener(async () => {
    const existing = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
    if (!existing[STORAGE_KEY_SETTINGS]) {
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: DEFAULT_SETTINGS });
    }
  });

  // Handle keyboard shortcut — opens the full dashboard
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open-chatmarks') {
      const url = chrome.runtime.getURL('dashboard.html');
      const tabs = await chrome.tabs.query({ url });
      if (tabs.length > 0 && tabs[0].id) {
        await chrome.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId) {
          await chrome.windows.update(tabs[0].windowId, { focused: true });
        }
      } else {
        await chrome.tabs.create({ url });
      }
    }
  });

  // Listen for messages from popup/sidepanel/options
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    messageRouter(message, sender, sendResponse);
    return true; // always keep open — messageRouter handles sendResponse internally
  });

  // Start bookmark change watcher
  startBookmarkWatcher();

  // Open dashboard on extension icon click
  chrome.action.onClicked.addListener(async (tab) => {
    const url = chrome.runtime.getURL('dashboard.html');
    const tabs = await chrome.tabs.query({ url });
    if (tabs.length > 0 && tabs[0].id) {
      await chrome.tabs.update(tabs[0].id, { active: true });
      if (tabs[0].windowId) {
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      }
    } else {
      await chrome.tabs.create({ url });
    }
  });
});
