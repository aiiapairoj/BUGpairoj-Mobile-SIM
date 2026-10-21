/**
 * BUGpairoj Mobile SIM v1.5.0 - frame sync/readiness agent.
 * Runs in preview frames and reports successful rendering to the host overlay.
 */

(() => {
  if (window.__BUGSIM_FRAME_AGENT__) return;
  window.__BUGSIM_FRAME_AGENT__ = true;

  const frameName = String(window.name || '');
  let parsedUrl = null;
  try { parsedUrl = new URL(location.href); } catch {}

  const nameDeviceId = frameName.startsWith('bugsim-device-')
    ? frameName.slice('bugsim-device-'.length)
    : '';
  const markerDeviceId = parsedUrl?.searchParams.get('__bugsim') || '';
  const deviceId = nameDeviceId || markerDeviceId;
  if (!deviceId) return;

  let applyingUntil = 0;
  let inputTimer = null;
  let scrollTimer = null;
  const markerPlatform = parsedUrl?.searchParams.get('__bugsim_platform') || 'android';

  function isApplying() {
    return Date.now() < applyingUntil;
  }

  function selectorFor(el) {
    if (!(el instanceof Element)) return '';
    if (el.id) {
      try {
        if (document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
          return `#${CSS.escape(el.id)}`;
        }
      } catch {}
    }

    const parts = [];
    let node = el;
    for (let depth = 0; node && node.nodeType === 1 && depth < 7; depth += 1) {
      let part = node.localName;
      if (!part) break;
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((child) => child.localName === node.localName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      if (node === document.body || node === document.documentElement) break;
      node = parent;
    }
    return parts.join(' > ');
  }

  function post(kind, payload) {
    try {
      window.parent.postMessage({
        source: 'BUGSIM_FRAME',
        deviceId,
        kind,
        payload,
        nonce: `${deviceId}-${Date.now()}-${Math.random().toString(16).slice(2)}`
      }, '*');
    } catch {}
  }

  function reportReady() {
    post('ready', {
      url: location.href,
      title: document.title || '',
      readyState: document.readyState
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reportReady, { once: true });
  } else {
    queueMicrotask(reportReady);
  }
  window.addEventListener('pageshow', reportReady);

  function normalizedScroll() {
    const scroller = document.scrollingElement || document.documentElement;
    const maxY = Math.max(1, scroller.scrollHeight - window.innerHeight);
    const maxX = Math.max(1, scroller.scrollWidth - window.innerWidth);
    return {
      y: Math.min(1, Math.max(0, scroller.scrollTop / maxY)),
      x: Math.min(1, Math.max(0, scroller.scrollLeft / maxX))
    };
  }

  window.addEventListener('scroll', () => {
    if (isApplying()) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => post('scroll', normalizedScroll()), 35);
  }, { passive: true, capture: true });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('a,button,[role="button"],input[type="button"],input[type="submit"]')
      : null;
    if (!target) return;

    // Do not rewrite URLs with BUGSIM markers after navigation. window.name is
    // enough to identify the preview frame and avoids breaking canonical/login URLs.
    if (target instanceof HTMLAnchorElement && target.href && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      const requestedTarget = String(target.target || '_self').toLowerCase();
      if (['_top', '_parent'].includes(requestedTarget)) {
        event.preventDefault();
        location.href = target.href;
        return;
      }
    }

    if (isApplying()) return;
    const selector = selectorFor(target);
    if (selector) post('click', { selector });
  }, true);

  document.addEventListener('input', (event) => {
    if (isApplying()) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    const selector = selectorFor(target);
    if (!selector) return;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      post('input', {
        selector,
        value: target.value,
        checked: 'checked' in target ? Boolean(target.checked) : undefined
      });
    }, 60);
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (['_top', '_parent'].includes(String(form.target).toLowerCase())) form.target = '_self';
  }, true);

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== 'BUGSIM_HOST') return;
    applyingUntil = Date.now() + 150;

    if (data.kind === 'scroll') {
      const scroller = document.scrollingElement || document.documentElement;
      const maxY = Math.max(0, scroller.scrollHeight - window.innerHeight);
      const maxX = Math.max(0, scroller.scrollWidth - window.innerWidth);
      window.scrollTo({
        top: Math.round(maxY * Number(data.payload?.y || 0)),
        left: Math.round(maxX * Number(data.payload?.x || 0)),
        behavior: 'auto'
      });
      return;
    }

    if (data.kind === 'click') {
      const el = safeQuery(data.payload?.selector);
      if (el instanceof HTMLElement) el.click();
      return;
    }

    if (data.kind === 'input') {
      const el = safeQuery(data.payload?.selector);
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
      el.value = data.payload?.value ?? '';
      if ('checked' in el && typeof data.payload?.checked === 'boolean') el.checked = data.payload.checked;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  function safeQuery(selector) {
    if (!selector || typeof selector !== 'string' || selector.length > 1000) return null;
    try { return document.querySelector(selector); } catch { return null; }
  }
})();
