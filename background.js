/**
 * BUGpairoj Mobile SIM - MV3 service worker
 * Handles panel injection, scoped DNR rules, screenshots and tab recording.
 */

const RULE_BLOCK = 10;
const RULE_BASE = 10000;

function ruleIdsForTab(tabId) {
  const base = RULE_BASE + (tabId % 100000) * RULE_BLOCK;
  return {
    xfo: base + 1,
    csp: base + 2,
    uaAndroid: base + 3,
    uaIos: base + 4
  };
}

async function removeRules(tabId) {
  const ids = Object.values(ruleIdsForTab(tabId));
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids });
  } catch (error) {
    console.warn('BUGpairoj Mobile SIM: removeRules failed', error);
  }
}

async function applyRules(tabId, compatibilityMode = false) {
  const ids = ruleIdsForTab(tabId);
  await removeRules(tabId);

  const rules = [
    {
      id: ids.xfo,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{ header: 'x-frame-options', operation: 'remove' }]
      },
      condition: {
        tabIds: [tabId],
        urlFilter: '__bugsim=',
        resourceTypes: ['sub_frame']
      }
    },
    {
      id: ids.uaAndroid,
      priority: 2,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'user-agent',
            operation: 'set',
            value: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36'
          }
        ]
      },
      condition: {
        tabIds: [tabId],
        urlFilter: '__bugsim_platform=android',
        resourceTypes: ['sub_frame']
      }
    },
    {
      id: ids.uaIos,
      priority: 2,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'user-agent',
            operation: 'set',
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
          }
        ]
      },
      condition: {
        tabIds: [tabId],
        urlFilter: '__bugsim_platform=ios',
        resourceTypes: ['sub_frame']
      }
    }
  ];

  if (compatibilityMode) {
    rules.push({
      id: ids.csp,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{ header: 'content-security-policy', operation: 'remove' }]
      },
      condition: {
        tabIds: [tabId],
        urlFilter: '__bugsim=',
        resourceTypes: ['sub_frame']
      }
    });
  }

  try {
    await chrome.declarativeNetRequest.updateSessionRules({ addRules: rules });
  } catch (error) {
    console.error('BUGpairoj Mobile SIM: applyRules failed', error);
    // Fallback: at least remove X-Frame-Options if a UA rule is rejected.
    try {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: Object.values(ids),
        addRules: [rules[0], ...(compatibilityMode ? [rules[rules.length - 1]] : [])]
      });
    } catch (fallbackError) {
      console.error('BUGpairoj Mobile SIM: DNR fallback failed', fallbackError);
    }
  }
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
  } catch {
    return null;
  }
}

async function ensurePanel(tab) {
  if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) return;

  const existing = await sendToTab(tab.id, { type: 'BUGSIM_TOGGLE' });
  if (existing) {
    if (existing.visible) {
      await applyRules(tab.id, Boolean(existing.compatibilityMode));
    } else {
      await stopRecording(tab.id);
      await removeRules(tab.id);
    }
    return;
  }

  try {
    const stored = await chrome.storage.sync.get('bugpairoj.mobileSim.settings');
    const compatibilityMode = Boolean(stored?.['bugpairoj.mobileSim.settings']?.compatibilityMode);
    // Apply scoped iframe rules before the injected UI creates its first preview frames.
    await applyRules(tab.id, compatibilityMode);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      files: ['content.js']
    });
  } catch (error) {
    console.warn('BUGpairoj Mobile SIM: injection failed', error);
  }
}

chrome.action.onClicked.addListener(ensurePanel);

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === 'toggle-panel') {
    await ensurePanel(tab);
    return;
  }

  if (command === 'take-screenshot') {
    const result = await sendToTab(tab.id, { type: 'BUGSIM_COMMAND_SCREENSHOT' });
    if (!result) {
      await ensurePanel(tab);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void removeRules(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    void removeRules(tabId);
  }
});

async function ensureOffscreenDocument() {
  const url = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [url]
  });
  if (contexts.length) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA', 'BLOBS'],
    justification: 'Record the user-invoked active tab and create a local WebM download.'
  });
}

async function startRecording(tabId) {
  try {
    await ensureOffscreenDocument();
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'BUGSIM_START_RECORDING',
      streamId,
      tabId
    });
    await sendToTab(tabId, { type: 'BUGSIM_RECORDING_STATE', recording: true });
    return { ok: true };
  } catch (error) {
    console.error('BUGpairoj Mobile SIM: start recording failed', error);
    return { ok: false, error: String(error?.message || error) };
  }
}

async function stopRecording(tabId) {
  try {
    await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'BUGSIM_STOP_RECORDING',
      tabId
    });
  } catch {
    // Offscreen may not exist; safe to ignore.
  }
  await sendToTab(tabId, { type: 'BUGSIM_RECORDING_STATE', recording: false });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender?.tab?.id ?? message?.tabId;

  if (message?.type === 'BUGSIM_PANEL_STATE' && tabId) {
    (async () => {
      if (message.visible) {
        await applyRules(tabId, Boolean(message.compatibilityMode));
      } else {
        await stopRecording(tabId);
        await removeRules(tabId);
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === 'BUGSIM_SET_COMPATIBILITY' && tabId) {
    applyRules(tabId, Boolean(message.enabled))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === 'BUGSIM_CAPTURE_VISIBLE' && tabId) {
    (async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        sendResponse({ ok: true, dataUrl });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  if (message?.type === 'BUGSIM_START_RECORDING' && tabId) {
    startRecording(tabId).then(sendResponse);
    return true;
  }

  if (message?.type === 'BUGSIM_STOP_RECORDING' && tabId) {
    stopRecording(tabId).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === 'BUGSIM_RECORDING_READY') {
    (async () => {
      try {
        const downloadId = await chrome.downloads.download({
          url: message.url,
          filename: message.filename,
          saveAs: false,
          conflictAction: 'uniquify'
        });
        sendResponse({ ok: true, downloadId });
        setTimeout(() => {
          void chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'BUGSIM_REVOKE_URL',
            url: message.url
          });
        }, 5000);
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  return false;
});
