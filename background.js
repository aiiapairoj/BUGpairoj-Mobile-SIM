/**
 * BUGpairoj Mobile SIM v1.5.0 - MV3 service worker
 *
 * Fast Deep Engine changes in v1.5:
 *  - DNR compatibility is scoped ONLY by active tabId (no topDomains/regex race).
 *  - Removes X-Frame-Options + legacy Frame-Options for all sub-frame navigations.
 *  - Compatibility Mode also removes CSP frame-ancestors carriers.
 *  - Smart Auto can escalate to Deep Compatibility (chrome.debugger/CDP) when
 *    normal compatibility still fails; debugger is always detached on close.
 *  - Diagnostics report installed rules, recently matched rules, header observations,
 *    redirect/error details, and whether a response came from a Service Worker.
 */

const RULE_BLOCK = 20;
const RULE_BASE = 10000;
const ACTIVE_KEY = 'bugsim.activeTabs.v4';
const SETTINGS_KEY = 'bugpairoj.mobileSim.settings';
const DIAG_KEY = 'bugsim.diag.v2';
const SITE_PROFILES_KEY = 'bugsim.siteProfiles.v1';
const DEBUG_PROTOCOL_VERSION = '1.3';

function chromeMajor() {
  const ua = self.navigator?.userAgent || '';
  const match = ua.match(/(?:Chrome|Chromium)\/(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function ruleIdsForTab(tabId) {
  const base = RULE_BASE + (tabId % 100000) * RULE_BLOCK;
  return {
    frameHeaders: base + 1,
    uaAndroid: base + 2,
    uaIos: base + 3
  };
}

function cleanUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}


function siteKey(rawUrl) {
  const parsed = cleanUrl(rawUrl);
  return parsed?.hostname?.toLowerCase() || '';
}

async function getSiteProfiles() {
  const result = await chrome.storage.local.get(SITE_PROFILES_KEY);
  return result?.[SITE_PROFILES_KEY] || {};
}

async function getRememberedSiteMode(rawUrl) {
  const key = siteKey(rawUrl);
  if (!key) return null;
  const profiles = await getSiteProfiles();
  const entry = profiles[key];
  return ['standard', 'compatibility', 'deep'].includes(entry?.mode) ? entry.mode : null;
}

async function rememberSiteMode(rawUrl, mode) {
  const key = siteKey(rawUrl);
  if (!key || !['standard', 'compatibility', 'deep'].includes(mode)) return { ok: false };
  const profiles = await getSiteProfiles();
  profiles[key] = { mode, updatedAt: Date.now() };
  const entries = Object.entries(profiles).sort((a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0));
  const pruned = Object.fromEntries(entries.slice(0, 80));
  await chrome.storage.local.set({ [SITE_PROFILES_KEY]: pruned });
  return { ok: true, host: key, mode };
}

async function forgetSiteMode(rawUrl) {
  const key = siteKey(rawUrl);
  if (!key) return { ok: false };
  const profiles = await getSiteProfiles();
  delete profiles[key];
  await chrome.storage.local.set({ [SITE_PROFILES_KEY]: profiles });
  return { ok: true, host: key };
}

async function getActiveMap() {
  const result = await chrome.storage.session.get(ACTIVE_KEY);
  return result?.[ACTIVE_KEY] || {};
}

async function getActiveState(tabId) {
  const map = await getActiveMap();
  return map[String(tabId)] || null;
}

async function setActiveState(tabId, state) {
  const map = await getActiveMap();
  const key = String(tabId);
  if (state) map[key] = state;
  else delete map[key];
  await chrome.storage.session.set({ [ACTIVE_KEY]: map });
}

async function setDiag(tabId, patch) {
  const result = await chrome.storage.session.get(DIAG_KEY);
  const all = result?.[DIAG_KEY] || {};
  const key = String(tabId);
  all[key] = { ...(all[key] || {}), ...patch, at: Date.now() };
  await chrome.storage.session.set({ [DIAG_KEY]: all });
}

async function getDiag(tabId) {
  const result = await chrome.storage.session.get(DIAG_KEY);
  return result?.[DIAG_KEY]?.[String(tabId)] || {};
}

async function clearDiag(tabId) {
  const result = await chrome.storage.session.get(DIAG_KEY);
  const all = result?.[DIAG_KEY] || {};
  delete all[String(tabId)];
  await chrome.storage.session.set({ [DIAG_KEY]: all });
}

async function removeRules(tabId) {
  const ids = Object.values(ruleIdsForTab(tabId));
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids });
  } catch (error) {
    console.warn('BUGpairoj Mobile SIM: removeRules failed', error);
  }
}

/**
 * The most reliable scope for this use-case is the tab itself. Redirects, URL
 * markers and nested iframe initiators can all change; tabId does not.
 */
async function applyRules(tabId, compatibilityMode = true, deepCompatibility = false, topUrl = '') {
  const ids = ruleIdsForTab(tabId);
  await removeRules(tabId);

  const responseHeaders = [
    { header: 'x-frame-options', operation: 'remove' },
    { header: 'frame-options', operation: 'remove' }
  ];

  if (compatibilityMode) {
    responseHeaders.push(
      { header: 'content-security-policy', operation: 'remove' },
      { header: 'content-security-policy-report-only', operation: 'remove' },
      { header: 'x-content-security-policy', operation: 'remove' },
      { header: 'x-webkit-csp', operation: 'remove' }
    );
  }

  if (deepCompatibility) {
    responseHeaders.push(
      { header: 'cross-origin-embedder-policy', operation: 'remove' },
      { header: 'cross-origin-resource-policy', operation: 'remove' },
      { header: 'cross-origin-opener-policy', operation: 'remove' }
    );
  }

  const requestHeaders = deepCompatibility ? [
    { header: 'cache-control', operation: 'set', value: 'no-cache' },
    { header: 'pragma', operation: 'set', value: 'no-cache' }
  ] : undefined;

  const rules = [{
    id: ids.frameHeaders,
    priority: 500,
    action: {
      type: 'modifyHeaders',
      responseHeaders,
      ...(requestHeaders ? { requestHeaders } : {})
    },
    condition: {
      tabIds: [tabId],
      resourceTypes: ['sub_frame']
    }
  }];

  // Best-effort UA on the initial marked navigation. After a redirect or normal
  // in-frame navigation, viewport simulation remains correct even if UA falls back.
  rules.push({
    id: ids.uaAndroid,
    priority: 520,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        { header: 'user-agent', operation: 'set', value: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36' },
        { header: 'sec-ch-ua-mobile', operation: 'set', value: '?1' },
        { header: 'sec-ch-ua-platform', operation: 'set', value: '"Android"' }
      ]
    },
    condition: {
      tabIds: [tabId],
      urlFilter: '__bugsim_platform=android',
      resourceTypes: ['sub_frame']
    }
  });

  rules.push({
    id: ids.uaIos,
    priority: 520,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        { header: 'user-agent', operation: 'set', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
        { header: 'sec-ch-ua-mobile', operation: 'set', value: '?1' },
        { header: 'sec-ch-ua-platform', operation: 'set', value: '"iOS"' }
      ]
    },
    condition: {
      tabIds: [tabId],
      urlFilter: '__bugsim_platform=ios',
      resourceTypes: ['sub_frame']
    }
  });

  let installed = rules;
  let uaRules = true;
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ addRules: rules });
  } catch (error) {
    // Keep the essential embed fix even if this Chromium build rejects a CH-UA edit.
    console.warn('BUGpairoj Mobile SIM: full DNR set rejected, retrying frame rule only', error);
    uaRules = false;
    installed = [rules[0]];
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: Object.values(ids),
      addRules: installed
    });
  }

  const parsed = cleanUrl(topUrl);
  await setDiag(tabId, {
    chromeMajor: chromeMajor(),
    scopeMode: 'tabId',
    topHost: parsed?.host || '',
    compatibilityMode: Boolean(compatibilityMode),
    deepCompatibility: Boolean(deepCompatibility),
    ruleIds: installed.map((rule) => rule.id),
    uaRules,
    lastApplyError: ''
  });

  return {
    ok: true,
    scopeMode: 'tabId',
    topHost: parsed?.host || '',
    ruleCount: installed.length,
    uaRules
  };
}

async function isDebuggerAttached(tabId) {
  try {
    const targets = await chrome.debugger.getTargets();
    return targets.some((target) => target.tabId === tabId && target.attached);
  } catch {
    return false;
  }
}

async function enableDeepCompatibility(tabId) {
  const debuggee = { tabId };
  try {
    if (!await isDebuggerAttached(tabId)) {
      await chrome.debugger.attach(debuggee, DEBUG_PROTOCOL_VERSION);
    }
    await chrome.debugger.sendCommand(debuggee, 'Network.enable');
    await chrome.debugger.sendCommand(debuggee, 'Network.setBypassServiceWorker', { bypass: true });
    await chrome.debugger.sendCommand(debuggee, 'Network.setCacheDisabled', { cacheDisabled: true });
    await setDiag(tabId, { debuggerAttached: true, serviceWorkerBypass: true, cacheDisabled: true, debuggerError: '' });
    return { ok: true };
  } catch (error) {
    const message = String(error?.message || error);
    await setDiag(tabId, { debuggerAttached: false, serviceWorkerBypass: false, cacheDisabled: false, debuggerError: message });
    return { ok: false, error: message };
  }
}

async function disableDeepCompatibility(tabId) {
  const debuggee = { tabId };
  try {
    if (await isDebuggerAttached(tabId)) {
      try { await chrome.debugger.sendCommand(debuggee, 'Network.setBypassServiceWorker', { bypass: false }); } catch {}
      try { await chrome.debugger.sendCommand(debuggee, 'Network.setCacheDisabled', { cacheDisabled: false }); } catch {}
      try { await chrome.debugger.detach(debuggee); } catch {}
    }
  } finally {
    await setDiag(tabId, { debuggerAttached: false, serviceWorkerBypass: false, cacheDisabled: false });
  }
}

async function sendToTab(tabId, message) {
  try { return await chrome.tabs.sendMessage(tabId, message, { frameId: 0 }); }
  catch { return null; }
}

async function injectPanel(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['content.js'] });
    return true;
  } catch (error) {
    console.warn('BUGpairoj Mobile SIM: injection failed', error);
    return false;
  }
}

async function defaultSettings(topUrl = '') {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const settings = stored?.[SETTINGS_KEY] || {};
  const smartCompatibility = settings.smartCompatibility !== false;
  const rememberedMode = smartCompatibility ? await getRememberedSiteMode(topUrl) : null;
  let compatibilityMode = settings.compatibilityMode !== false;
  let deepCompatibility = false;
  if (rememberedMode === 'standard') compatibilityMode = false;
  if (rememberedMode === 'compatibility') compatibilityMode = true;
  if (rememberedMode === 'deep') {
    compatibilityMode = true;
    deepCompatibility = true;
  }
  return { compatibilityMode, deepCompatibility, smartCompatibility, rememberedMode };
}

async function ensurePanel(tab) {
  if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) return;

  const existing = await sendToTab(tab.id, { type: 'BUGSIM_TOGGLE' });
  if (existing) {
    if (existing.visible) {
      const state = {
        compatibilityMode: Boolean(existing.compatibilityMode),
        deepCompatibility: Boolean(existing.deepCompatibility),
        topUrl: tab.url,
        smartCompatibility: existing.smartCompatibility !== false,
        rememberedMode: existing.rememberedMode || null
      };
      await setActiveState(tab.id, state);
      await applyRules(tab.id, state.compatibilityMode, state.deepCompatibility, tab.url);
      if (state.deepCompatibility) await enableDeepCompatibility(tab.id);
    } else {
      await setActiveState(tab.id, null);
      await stopRecording(tab.id);
      await removeRules(tab.id);
      await disableDeepCompatibility(tab.id);
      await clearDiag(tab.id);
    }
    return;
  }

  const defaults = await defaultSettings(tab.url);
  const state = { ...defaults, topUrl: tab.url };
  await setActiveState(tab.id, state);
  await applyRules(tab.id, state.compatibilityMode, state.deepCompatibility, tab.url);
  if (state.deepCompatibility) await enableDeepCompatibility(tab.id);
  await injectPanel(tab.id);
}

chrome.action.onClicked.addListener(ensurePanel);

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  if (command === 'toggle-panel') return void ensurePanel(tab);
  if (command === 'take-screenshot') {
    const result = await sendToTab(tab.id, { type: 'BUGSIM_COMMAND_SCREENSHOT' });
    if (!result) await ensurePanel(tab);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    await setActiveState(tabId, null);
    await removeRules(tabId);
    await disableDeepCompatibility(tabId);
    await clearDiag(tabId);
  })();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void (async () => {
    const state = await getActiveState(tabId);
    if (!state) return;
    const topUrl = tab?.url || changeInfo.url || state.topUrl || '';
    if (changeInfo.url) await setActiveState(tabId, { ...state, topUrl });
    if (changeInfo.status === 'loading') {
      await applyRules(tabId, Boolean(state.compatibilityMode), Boolean(state.deepCompatibility), topUrl);
      return;
    }
    if (changeInfo.status === 'complete' && /^https?:/i.test(topUrl)) {
      await applyRules(tabId, Boolean(state.compatibilityMode), Boolean(state.deepCompatibility), topUrl);
      if (state.deepCompatibility) await enableDeepCompatibility(tabId);
      const existing = await sendToTab(tabId, { type: 'BUGSIM_GET_STATE' });
      if (!existing) await injectPanel(tabId);
    }
  })();
});

// Passive network diagnostics. These listeners never modify traffic.
chrome.webRequest.onBeforeRedirect.addListener((details) => {
  void (async () => {
    if (details.type !== 'sub_frame' || details.tabId < 0) return;
    if (!await getActiveState(details.tabId)) return;
    await setDiag(details.tabId, {
      lastRedirectFrom: details.url,
      lastRedirectTo: details.redirectUrl,
      lastFrameUrl: details.redirectUrl
    });
  })();
}, { urls: ['<all_urls>'], types: ['sub_frame'] });

chrome.webRequest.onErrorOccurred.addListener((details) => {
  void (async () => {
    if (details.type !== 'sub_frame' || details.tabId < 0) return;
    if (!await getActiveState(details.tabId)) return;
    await setDiag(details.tabId, {
      lastFrameUrl: details.url,
      lastError: details.error || 'sub_frame error'
    });
  })();
}, { urls: ['<all_urls>'], types: ['sub_frame'] });

chrome.webRequest.onHeadersReceived.addListener((details) => {
  void (async () => {
    if (details.type !== 'sub_frame' || details.tabId < 0) return;
    if (!await getActiveState(details.tabId)) return;
    const headers = details.responseHeaders || [];
    const pick = (name) => headers
      .filter((header) => String(header.name || '').toLowerCase() === name)
      .map((header) => header.value || '')
      .filter(Boolean);
    const csp = pick('content-security-policy');
    await setDiag(details.tabId, {
      lastFrameUrl: details.url,
      observedXfo: pick('x-frame-options'),
      observedCspFrameAncestors: csp.filter((value) => /frame-ancestors/i.test(value)).slice(0, 3)
    });
  })();
}, { urls: ['<all_urls>'], types: ['sub_frame'] }, ['responseHeaders', 'extraHeaders']);

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (!source?.tabId || method !== 'Network.responseReceived') return;
  void (async () => {
    const state = await getActiveState(source.tabId);
    if (!state?.deepCompatibility) return;
    const response = params?.response;
    if (!response || params?.type !== 'Document') return;
    await setDiag(source.tabId, {
      debuggerLastDocumentUrl: response.url || '',
      debuggerStatus: response.status,
      debuggerFromServiceWorker: Boolean(response.fromServiceWorker),
      debuggerServiceWorkerSource: response.serviceWorkerResponseSource || ''
    });
  })();
});

chrome.debugger.onDetach.addListener((source, reason) => {
  if (!source?.tabId) return;
  void (async () => {
    const state = await getActiveState(source.tabId);
    if (state?.deepCompatibility) {
      await setActiveState(source.tabId, { ...state, deepCompatibility: false });
      await setDiag(source.tabId, {
        debuggerAttached: false,
        serviceWorkerBypass: false,
        cacheDisabled: false,
        debuggerError: `Detached: ${reason || 'unknown'}`
      });
      await sendToTab(source.tabId, { type: 'BUGSIM_DEEP_DETACHED', reason: reason || 'unknown' });
    }
  })();
});

async function ensureOffscreenDocument() {
  const url = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [url] });
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
    await chrome.runtime.sendMessage({ target: 'offscreen', type: 'BUGSIM_START_RECORDING', streamId, tabId });
    await sendToTab(tabId, { type: 'BUGSIM_RECORDING_STATE', recording: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

async function stopRecording(tabId) {
  try { await chrome.runtime.sendMessage({ target: 'offscreen', type: 'BUGSIM_STOP_RECORDING', tabId }); } catch {}
  await sendToTab(tabId, { type: 'BUGSIM_RECORDING_STATE', recording: false });
}

function cleanExternalUrl(raw) {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.searchParams.delete('__bugsim');
    url.searchParams.delete('__bugsim_platform');
    return url.toString();
  } catch {
    return null;
  }
}

async function openDeviceWindow(message) {
  const url = cleanExternalUrl(message.url);
  if (!url) return { ok: false, error: 'Invalid URL' };
  const viewportWidth = Math.max(240, Math.min(1900, Math.round(Number(message.width) || 390)));
  const viewportHeight = Math.max(320, Math.min(1900, Math.round(Number(message.height) || 844)));
  try {
    const win = await chrome.windows.create({
      url,
      type: 'popup',
      width: Math.min(2000, viewportWidth + 16),
      height: Math.min(2000, viewportHeight + 88),
      focused: true
    });
    return { ok: true, windowId: win?.id };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

function originPattern(rawUrl) {
  const parsed = cleanUrl(rawUrl);
  if (!parsed) return null;
  return `${parsed.protocol}//${parsed.hostname}/*`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender?.tab?.id ?? message?.tabId;

  if (message?.type === 'BUGSIM_PANEL_STATE' && tabId) {
    (async () => {
      if (message.visible) {
        const tab = await chrome.tabs.get(tabId);
        const state = {
          compatibilityMode: Boolean(message.compatibilityMode),
          deepCompatibility: Boolean(message.deepCompatibility),
          topUrl: tab.url || '',
          smartCompatibility: message.smartCompatibility !== false,
          rememberedMode: message.rememberedMode || await getRememberedSiteMode(tab.url || '')
        };
        await setActiveState(tabId, state);
        const result = await applyRules(tabId, state.compatibilityMode, state.deepCompatibility, state.topUrl);
        if (state.deepCompatibility) {
          const deep = await enableDeepCompatibility(tabId);
          if (!deep.ok) return sendResponse({ ok: false, error: deep.error, ...result });
        }
        sendResponse({ ok: true, ...result });
      } else {
        await setActiveState(tabId, null);
        await stopRecording(tabId);
        await removeRules(tabId);
        await disableDeepCompatibility(tabId);
        await clearDiag(tabId);
        sendResponse({ ok: true });
      }
    })().catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === 'BUGSIM_SET_COMPATIBILITY' && tabId) {
    (async () => {
      const enabled = Boolean(message.enabled);
      const tab = await chrome.tabs.get(tabId);
      const previous = await getActiveState(tabId) || {};
      const state = {
        ...previous,
        compatibilityMode: enabled,
        topUrl: tab.url || previous.topUrl || ''
      };
      await setActiveState(tabId, state);
      const result = await applyRules(tabId, state.compatibilityMode, Boolean(state.deepCompatibility), state.topUrl);
      sendResponse({ ok: true, ...result });
    })().catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === 'BUGSIM_SET_DEEP_COMPATIBILITY' && tabId) {
    (async () => {
      const enabled = Boolean(message.enabled);
      const tab = await chrome.tabs.get(tabId);
      const previous = await getActiveState(tabId) || { compatibilityMode: true };
      const state = {
        ...previous,
        compatibilityMode: true,
        deepCompatibility: enabled,
        topUrl: tab.url || previous.topUrl || ''
      };
      await setActiveState(tabId, state);
      const result = await applyRules(tabId, true, enabled, state.topUrl);
      if (enabled) {
        const deep = await enableDeepCompatibility(tabId);
        if (!deep.ok) {
          await setActiveState(tabId, { ...state, deepCompatibility: false });
          await applyRules(tabId, true, false, state.topUrl);
          return sendResponse({ ok: false, error: deep.error, ...result });
        }
      } else {
        await disableDeepCompatibility(tabId);
      }
      sendResponse({ ok: true, enabled, ...result });
    })().catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === 'BUGSIM_GET_DIAGNOSTICS' && tabId) {
    (async () => {
      const diag = await getDiag(tabId);
      const tab = await chrome.tabs.get(tabId);
      const rules = await chrome.declarativeNetRequest.getSessionRules();
      const ownIds = new Set(Object.values(ruleIdsForTab(tabId)));
      let matchedRules = [];
      try {
        const matched = await chrome.declarativeNetRequest.getMatchedRules({ tabId });
        matchedRules = (matched?.rulesMatchedInfo || []).filter((item) => ownIds.has(item?.rule?.ruleId));
      } catch (error) {
        await setDiag(tabId, { matchedRulesError: String(error?.message || error) });
      }
      let hostAccess = null;
      const pattern = originPattern(tab.url || '');
      if (pattern) {
        try { hostAccess = await chrome.permissions.contains({ origins: [pattern] }); } catch {}
      }
      sendResponse({
        ok: true,
        diag: await getDiag(tabId),
        activeRules: rules.filter((rule) => ownIds.has(rule.id)),
        matchedRules,
        hostAccess,
        debuggerAttached: await isDebuggerAttached(tabId),
        rememberedMode: await getRememberedSiteMode(tab.url || '')
      });
    })().catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === 'BUGSIM_FORCE_REAPPLY' && tabId) {
    (async () => {
      const tab = await chrome.tabs.get(tabId);
      const previous = await getActiveState(tabId) || {};
      const state = {
        ...previous,
        compatibilityMode: true,
        topUrl: tab.url || previous.topUrl || ''
      };
      await setActiveState(tabId, state);
      const result = await applyRules(tabId, true, Boolean(state.deepCompatibility), state.topUrl);
      sendResponse({ ok: true, ...result });
    })().catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === 'BUGSIM_REMEMBER_SITE_MODE' && tabId) {
    (async () => {
      const tab = await chrome.tabs.get(tabId);
      const result = await rememberSiteMode(tab.url || '', message.mode);
      const state = await getActiveState(tabId);
      if (state) await setActiveState(tabId, { ...state, rememberedMode: message.mode || null });
      sendResponse(result);
    })().catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === 'BUGSIM_FORGET_SITE_MODE' && tabId) {
    (async () => {
      const tab = await chrome.tabs.get(tabId);
      const result = await forgetSiteMode(tab.url || '');
      const state = await getActiveState(tabId);
      if (state) await setActiveState(tabId, { ...state, rememberedMode: null });
      sendResponse(result);
    })().catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === 'BUGSIM_OPEN_DEVICE_WINDOW') {
    openDeviceWindow(message).then(sendResponse);
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
        const filename = `BUGpairoj-Mobile-SIM-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        await chrome.downloads.download({ url: message.url, filename, saveAs: true });
        if (message.tabId) await sendToTab(message.tabId, { type: 'BUGSIM_RECORDING_STATE', recording: false });
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }
});
