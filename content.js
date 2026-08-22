/**
 * BUGpairoj Mobile SIM - top-frame overlay UI.
 * Injected only after user action. Uses a closed Shadow DOM to avoid host CSS collisions.
 */

(() => {
  if (window.__BUGPAIROJ_MOBILE_SIM__) {
    window.__BUGPAIROJ_MOBILE_SIM__.show();
    return;
  }

  const STORAGE_KEY = 'bugpairoj.mobileSim.settings';
  const MARKER = '__bugsim';
  const MAX_DEVICES = 5;

  const DEVICE_PRESETS = [
    { id: 'iphone-se', label: 'iPhone SE', platform: 'ios', width: 375, height: 667, radius: 34, notch: 'none' },
    { id: 'iphone-13-mini', label: 'iPhone 13 mini', platform: 'ios', width: 375, height: 812, radius: 42, notch: 'notch' },
    { id: 'iphone-15', label: 'iPhone 15', platform: 'ios', width: 393, height: 852, radius: 52, notch: 'dynamic' },
    { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', platform: 'ios', width: 430, height: 932, radius: 55, notch: 'dynamic' },
    { id: 'pixel-7', label: 'Pixel 7', platform: 'android', width: 412, height: 915, radius: 42, notch: 'punch' },
    { id: 'pixel-8-pro', label: 'Pixel 8 Pro', platform: 'android', width: 448, height: 998, radius: 44, notch: 'punch' },
    { id: 'galaxy-s23', label: 'Galaxy S23', platform: 'android', width: 360, height: 780, radius: 38, notch: 'punch' },
    { id: 'galaxy-s24-ultra', label: 'Galaxy S24 Ultra', platform: 'android', width: 412, height: 915, radius: 24, notch: 'punch' },
    { id: 'galaxy-z-fold5', label: 'Galaxy Z Fold5', platform: 'android', width: 344, height: 882, radius: 28, notch: 'punch' },
    { id: 'xiaomi-13', label: 'Xiaomi 13', platform: 'android', width: 393, height: 873, radius: 38, notch: 'punch' },
    { id: 'ipad-mini', label: 'iPad mini', platform: 'ios', width: 744, height: 1133, radius: 28, notch: 'none' },
    { id: 'ipad-pro-11', label: 'iPad Pro 11', platform: 'ios', width: 834, height: 1194, radius: 24, notch: 'none' },
    { id: 'ipad-pro-129', label: 'iPad Pro 12.9', platform: 'ios', width: 1024, height: 1366, radius: 24, notch: 'none' },
    { id: 'galaxy-tab-s9', label: 'Galaxy Tab S9', platform: 'android', width: 800, height: 1280, radius: 22, notch: 'none' },
    { id: 'surface-duo', label: 'Surface Duo', platform: 'android', width: 540, height: 720, radius: 18, notch: 'none' },
    { id: 'desktop-small', label: 'Desktop 1366', platform: 'android', width: 1366, height: 768, radius: 14, notch: 'none' }
  ];

  const DEFAULT_SETTINGS = {
    version: 1,
    theme: 'dark',
    activeDevices: ['iphone-15', 'pixel-8-pro', 'ipad-mini'],
    orientation: {},
    scale: 62,
    showDeviceChrome: true,
    focusMode: false,
    syncScroll: true,
    syncClick: true,
    syncInput: true,
    compatibilityMode: false,
    customDevice: { id: 'custom', label: 'Custom', platform: 'android', width: 390, height: 844, radius: 28, notch: 'none' }
  };

  const svg = {
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.55v-.1A1.7 1.7 0 0 0 8.4 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06L3.6 16.94l.06-.06A1.7 1.7 0 0 0 4 15a1.7 1.7 0 0 0-.6-1A1.7 1.7 0 0 0 2.3 13.6H2V9.55h.3A1.7 1.7 0 0 0 4 8.4a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.46 3.6l.06.06A1.7 1.7 0 0 0 8.4 4a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 9.8 2.3V2h4.05v.3A1.7 1.7 0 0 0 15 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.4a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4.05h-.1A1.7 1.7 0 0 0 19.4 15Z"/></svg>',
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></svg>',
    record: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M18.2 17.2A8 8 0 1 1 20 12"/></svg>',
    focus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.41M17.66 6.34l1.41-1.41"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  function t(key, fallback) {
    return chrome.i18n?.getMessage(key) || fallback || key;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  function cleanBaseUrl() {
    const url = new URL(location.href);
    url.searchParams.delete(MARKER);
    url.searchParams.delete('__bugsim_platform');
    return url.toString();
  }

  function buildFrameUrl(platform, deviceId) {
    const url = new URL(cleanBaseUrl());
    url.searchParams.set(MARKER, deviceId);
    url.searchParams.set('__bugsim_platform', platform);
    return url.toString();
  }

  function getAllDevices(settings) {
    return [...DEVICE_PRESETS, settings.customDevice];
  }

  function getDevice(settings, id) {
    return getAllDevices(settings).find((d) => d.id === id) || DEVICE_PRESETS[0];
  }

  function dateStamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  class MobileSim {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.root = null;
      this.drawer = null;
      this.grid = null;
      this.toastEl = null;
      this.settings = clone(DEFAULT_SETTINGS);
      this.visible = true;
      this.recording = false;
      this.recordStartedAt = 0;
      this.recordTimer = null;
      this.boundWindowMessage = this.onWindowMessage.bind(this);
      this.boundRuntimeMessage = this.onRuntimeMessage.bind(this);
      this.init();
    }

    async init() {
      const stored = await chrome.storage.sync.get(STORAGE_KEY);
      this.settings = { ...clone(DEFAULT_SETTINGS), ...(stored?.[STORAGE_KEY] || {}) };
      this.settings.orientation = { ...DEFAULT_SETTINGS.orientation, ...(this.settings.orientation || {}) };
      this.settings.customDevice = { ...DEFAULT_SETTINGS.customDevice, ...(this.settings.customDevice || {}) };

      this.host = document.createElement('div');
      this.host.id = 'bugpairoj-mobile-sim-host';
      this.host.style.position = 'fixed';
      this.host.style.inset = '0';
      this.host.style.zIndex = '2147483647';
      this.host.style.pointerEvents = 'none';
      (document.documentElement || document.body).appendChild(this.host);

      this.shadow = this.host.attachShadow({ mode: 'closed' });
      this.renderShell();
      this.attachListeners();
      this.renderAll();

      window.addEventListener('message', this.boundWindowMessage);
      chrome.runtime.onMessage.addListener(this.boundRuntimeMessage);
      await this.notifyPanelState();
    }

    renderShell() {
      this.shadow.innerHTML = `
        <style>${this.styles()}</style>
        <div class="sim-root" data-theme="${escapeHtml(this.settings.theme)}">
          <div class="backdrop"></div>
          <header class="toolbar" role="toolbar" aria-label="BUGpairoj Mobile SIM">
            <div class="brand">
              <div class="brand-mark">B</div>
              <div><strong>BUGpairoj Mobile SIM</strong><span>Multi-device preview</span></div>
            </div>
            <div class="toolbar-center">
              <label class="scale-box"><span>${t('scale', 'Scale')}</span><input id="scaleRange" type="range" min="40" max="110" step="1"><b id="scaleValue"></b></label>
            </div>
            <div class="toolbar-actions">
              <button class="icon-btn" id="focusBtn" type="button" aria-label="${t('focus', 'Focus')}">${svg.focus}</button>
              <button class="icon-btn" id="themeBtn" type="button" aria-label="${t('theme', 'Theme')}">${svg.sun}</button>
              <button class="text-btn" id="shotBtn" type="button" aria-label="${t('screenshot', 'Screenshot')}">${svg.camera}<span>${t('screenshot', 'Screenshot')}</span></button>
              <button class="text-btn" id="recordBtn" type="button" aria-label="${t('record', 'Record')}">${svg.record}<span>${t('record', 'Record')}</span></button>
              <button class="icon-btn" id="settingsBtn" type="button" aria-label="${t('settings', 'Settings')}">${svg.settings}</button>
              <button class="icon-btn danger" id="closeBtn" type="button" aria-label="${t('close', 'Close')}">${svg.close}</button>
            </div>
          </header>
          <main class="workspace">
            <div class="device-grid" id="deviceGrid"></div>
          </main>
          <aside class="drawer" id="drawer" aria-label="${t('settings', 'Settings')}"></aside>
          <div class="toast" id="toast" role="status"></div>
        </div>
      `;
      this.root = this.shadow.querySelector('.sim-root');
      this.drawer = this.shadow.querySelector('#drawer');
      this.grid = this.shadow.querySelector('#deviceGrid');
      this.toastEl = this.shadow.querySelector('#toast');
    }

    styles() {
      return `
        :host{all:initial}
        *{box-sizing:border-box}
        button,input,select{font:inherit}
        .sim-root{--bg:#0a0e1a;--surface:#131a2b;--surface2:#1b2438;--text:#e8edf7;--muted:#98a2b3;--line:rgba(255,255,255,.12);--accent:#ff7a18;--danger:#ff5364;--shadow:0 20px 60px rgba(0,0,0,.35);position:fixed;inset:0;pointer-events:auto;color:var(--text);font-family:Arial,"Noto Sans Thai",sans-serif;isolation:isolate}
        .sim-root[data-theme="light"]{--bg:#f6f8fc;--surface:#fff;--surface2:#eef2f7;--text:#101828;--muted:#667085;--line:rgba(16,24,40,.12);--accent:#e85d04;--shadow:0 20px 60px rgba(16,24,40,.16)}
        .backdrop{position:absolute;inset:0;background:rgba(4,8,18,.62);backdrop-filter:blur(2px);transition:.18s}
        .sim-root[data-theme="light"] .backdrop{background:rgba(226,232,240,.76)}
        .sim-root.focus .backdrop{background:rgba(0,0,0,.88);backdrop-filter:blur(8px)}
        .toolbar{position:absolute;z-index:10;top:14px;left:14px;right:14px;min-height:62px;padding:10px 12px;display:flex;align-items:center;gap:16px;border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 80%,transparent);backdrop-filter:blur(20px);border-radius:16px;box-shadow:var(--shadow)}
        .brand{display:flex;align-items:center;gap:10px;min-width:250px}.brand-mark{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#ff9b46,var(--accent));display:grid;place-items:center;color:#fff;font-weight:900;font-size:18px}.brand strong{font-size:14px;display:block}.brand span{font-size:11px;color:var(--muted)}
        .toolbar-center{flex:1;display:flex;justify-content:center}.scale-box{display:flex;align-items:center;gap:9px;color:var(--muted);font-size:12px}.scale-box input{width:150px;accent-color:var(--accent)}.scale-box b{min-width:42px;color:var(--text)}
        .toolbar-actions{display:flex;align-items:center;gap:7px}.icon-btn,.text-btn{height:38px;border:1px solid var(--line);background:var(--surface2);color:var(--text);border-radius:11px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;transition:.18s}.icon-btn{width:38px}.text-btn{padding:0 12px;font-size:12px;font-weight:700}.icon-btn:hover,.text-btn:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--accent) 55%,var(--line))}.icon-btn svg,.text-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}.danger{color:#ff7a86}.recording{background:rgba(255,83,100,.14);border-color:rgba(255,83,100,.5);color:#ff7180}.recording svg{animation:pulse 1s infinite}@keyframes pulse{50%{opacity:.35}}
        .workspace{position:absolute;inset:92px 12px 12px;overflow:auto;padding:12px 20px 40px}.device-grid{min-height:100%;display:flex;align-items:flex-start;justify-content:flex-start;gap:26px;padding:8px 22px 70px;width:max-content;min-width:100%}
        .device-card{display:flex;flex-direction:column;align-items:center;gap:9px}.device-head{height:34px;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;color:var(--text);font-size:12px}.device-head .meta{display:flex;flex-direction:column}.device-head small{color:var(--muted);font-size:10px}.mini-btn{width:30px;height:30px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--text);cursor:pointer;display:grid;place-items:center}.mini-btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8}
        .scaled-shell{position:relative;transition:width .18s,height .18s}.scaled-inner{position:absolute;left:0;top:0;transform-origin:top left;transition:transform .18s}.device{position:relative;background:#06080d;border:10px solid #0d1119;box-shadow:0 25px 60px rgba(0,0,0,.38),inset 0 0 0 1px rgba(255,255,255,.08);overflow:hidden}.sim-root[data-theme="light"] .device{box-shadow:0 25px 50px rgba(16,24,40,.18)}
        .device.no-chrome{border-width:1px;border-radius:8px!important}.device.no-chrome .status,.device.no-chrome .browserbar,.device.no-chrome .homebar,.device.no-chrome .notch{display:none}.device.no-chrome iframe{height:100%!important}
        .status{height:24px;background:#0c1018;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:10px;position:relative}.browserbar{height:36px;background:#111827;color:#cbd5e1;display:flex;align-items:center;gap:7px;padding:0 10px;font-size:10px}.address{flex:1;height:22px;background:#202938;border-radius:9px;display:flex;align-items:center;padding:0 9px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.browserbar .dot{width:5px;height:5px;border-radius:50%;background:#64748b}.device iframe{border:0;display:block;background:#fff;width:100%;height:calc(100% - 60px)}.homebar{position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:32%;height:4px;border-radius:4px;background:rgba(255,255,255,.65);pointer-events:none}.notch{position:absolute;z-index:3;top:6px;left:50%;transform:translateX(-50%);background:#000;pointer-events:none}.notch.dynamic{width:86px;height:24px;border-radius:14px}.notch.notch{width:118px;height:23px;border-radius:0 0 14px 14px;top:0}.notch.punch{width:12px;height:12px;border-radius:50%;top:8px}
        .drawer{position:absolute;z-index:20;top:88px;right:14px;bottom:14px;width:min(390px,calc(100vw - 28px));background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:18px;overflow:auto;transform:translateX(calc(100% + 30px));transition:transform .18s}.drawer.open{transform:translateX(0)}.drawer h2{font-size:17px;margin:0 0 4px}.drawer .sub{color:var(--muted);font-size:11px;margin-bottom:18px}.section{padding:14px 0;border-top:1px solid var(--line)}.section:first-of-type{border-top:0}.section h3{font-size:12px;margin:0 0 10px}.chips{display:flex;flex-wrap:wrap;gap:7px}.chip{border:1px solid var(--line);background:var(--surface2);color:var(--text);padding:7px 9px;border-radius:999px;font-size:10px;cursor:pointer}.chip.active{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--surface2));color:var(--accent)}.toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;font-size:12px}.toggle-row small{display:block;color:var(--muted);font-size:10px;max-width:260px;margin-top:3px}.switch{position:relative;width:42px;height:24px;flex:0 0 auto}.switch input{opacity:0;width:0;height:0}.slider{position:absolute;inset:0;background:#475467;border-radius:20px;cursor:pointer;transition:.18s}.slider:before{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.18s}.switch input:checked+.slider{background:var(--accent)}.switch input:checked+.slider:before{transform:translateX(18px)}.custom-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.field{display:flex;flex-direction:column;gap:5px;font-size:10px;color:var(--muted)}.field input,.field select{height:36px;border:1px solid var(--line);border-radius:10px;background:var(--surface2);color:var(--text);padding:0 10px;outline:none}.primary{width:100%;height:38px;border:0;border-radius:10px;background:var(--accent);color:#fff;font-weight:800;cursor:pointer;margin-top:9px}.about{font-size:11px;color:var(--muted);line-height:1.6}.about strong{color:var(--text)}.about a{color:var(--accent)}
        .toast{position:absolute;z-index:30;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);padding:10px 14px;border-radius:11px;font-size:12px;transition:.18s;pointer-events:none}.toast.show{transform:translate(-50%,0);opacity:1}
        @media(max-width:980px){.brand{min-width:auto}.brand span,.toolbar-center,.text-btn span{display:none}.toolbar{gap:8px}.workspace{inset-top:84px}.text-btn{width:38px;padding:0}}
      `;
    }

    attachListeners() {
      const $ = (selector) => this.shadow.querySelector(selector);
      $('#closeBtn').addEventListener('click', () => this.hide());
      $('#settingsBtn').addEventListener('click', () => this.drawer.classList.toggle('open'));
      $('#themeBtn').addEventListener('click', () => {
        this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.saveAndRender(false);
      });
      $('#focusBtn').addEventListener('click', () => {
        this.settings.focusMode = !this.settings.focusMode;
        this.saveAndRender(false);
      });
      $('#shotBtn').addEventListener('click', () => this.captureScreenshot());
      $('#recordBtn').addEventListener('click', () => this.toggleRecording());
      $('#scaleRange').addEventListener('input', (event) => {
        this.settings.scale = Number(event.target.value);
        this.renderDevices();
        this.updateToolbarState();
      });
      $('#scaleRange').addEventListener('change', () => this.saveSettings());
      this.shadow.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.drawer.classList.remove('open');
      });
    }

    async saveSettings() {
      await chrome.storage.sync.set({ [STORAGE_KEY]: this.settings });
    }

    async saveAndRender(full = true) {
      await this.saveSettings();
      if (full) this.renderAll();
      else this.updateToolbarState();
    }

    renderAll() {
      this.updateToolbarState();
      this.renderDevices();
      this.renderDrawer();
    }

    updateToolbarState() {
      this.root.dataset.theme = this.settings.theme;
      this.root.classList.toggle('focus', Boolean(this.settings.focusMode));
      const scale = this.shadow.querySelector('#scaleRange');
      const scaleValue = this.shadow.querySelector('#scaleValue');
      scale.value = String(this.settings.scale);
      scaleValue.textContent = `${this.settings.scale}%`;
      this.shadow.querySelector('#focusBtn').classList.toggle('active', this.settings.focusMode);
      const recordBtn = this.shadow.querySelector('#recordBtn');
      recordBtn.classList.toggle('recording', this.recording);
      recordBtn.querySelector('span').textContent = this.recording ? this.recordLabel() : t('record', 'Record');
    }

    recordLabel() {
      if (!this.recording) return t('record', 'Record');
      const elapsed = Math.max(0, Math.floor((Date.now() - this.recordStartedAt) / 1000));
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      return `${t('recording', 'Recording')} ${mm}:${ss}`;
    }

    renderDevices() {
      const scale = this.settings.scale / 100;
      const cards = this.settings.activeDevices.map((id) => {
        const device = getDevice(this.settings, id);
        const landscape = this.settings.orientation[id] === 'landscape';
        const width = landscape ? device.height : device.width;
        const height = landscape ? device.width : device.height;
        const outerHeight = height + (this.settings.showDeviceChrome ? 60 : 0);
        const radius = Math.min(device.radius, Math.floor(Math.min(width, height) / 8));
        const url = buildFrameUrl(device.platform, device.id);
        const notch = device.notch && device.notch !== 'none' ? `<div class="notch ${escapeHtml(device.notch)}"></div>` : '';
        return `
          <section class="device-card" data-device-id="${escapeHtml(id)}">
            <div class="device-head">
              <div class="meta"><strong>${escapeHtml(device.label)}</strong><small>${width} × ${height} · ${device.platform.toUpperCase()}</small></div>
              <button class="mini-btn rotate-device" type="button" data-id="${escapeHtml(id)}" aria-label="${t('rotate', 'Rotate')}">${svg.rotate}</button>
            </div>
            <div class="scaled-shell" style="width:${Math.round(width * scale)}px;height:${Math.round(outerHeight * scale)}px">
              <div class="scaled-inner" style="transform:scale(${scale})">
                <div class="device ${this.settings.showDeviceChrome ? '' : 'no-chrome'}" style="width:${width}px;height:${outerHeight}px;border-radius:${radius}px">
                  ${notch}
                  <div class="status"><span>9:41</span><span>● ●● ▰</span></div>
                  <div class="browserbar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="address">${escapeHtml(location.hostname || 'localhost')}</div></div>
                  <iframe
                    title="${escapeHtml(device.label)} preview"
                    name="bugsim-device-${escapeHtml(id)}"
                    src="${escapeHtml(url)}"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allow="clipboard-read; clipboard-write; fullscreen"
                  ></iframe>
                  <div class="homebar"></div>
                </div>
              </div>
            </div>
          </section>
        `;
      }).join('');
      this.grid.innerHTML = cards || '<div style="padding:40px;color:var(--muted)">Select at least one device.</div>';
      this.grid.querySelectorAll('.rotate-device').forEach((button) => {
        button.addEventListener('click', () => this.rotateDevice(button.dataset.id));
      });
    }

    renderDrawer() {
      const allDevices = getAllDevices(this.settings);
      this.drawer.innerHTML = `
        <h2>${t('settings', 'Settings')}</h2>
        <div class="sub">BUGpairoj Mobile SIM · MV3</div>
        <section class="section">
          <h3>${t('devices', 'Devices')} <span style="color:var(--muted);font-weight:400">(${this.settings.activeDevices.length}/${MAX_DEVICES})</span></h3>
          <div class="chips">
            ${allDevices.map((d) => `<button type="button" class="chip ${this.settings.activeDevices.includes(d.id) ? 'active' : ''}" data-device="${escapeHtml(d.id)}">${escapeHtml(d.label)}</button>`).join('')}
          </div>
          <div style="margin-top:8px;color:var(--muted);font-size:10px">${t('maxDevices', 'Choose up to 5 devices')}</div>
        </section>
        <section class="section">
          ${this.toggleRow('syncScroll', t('syncScroll', 'Sync scroll'), this.settings.syncScroll)}
          ${this.toggleRow('syncClick', t('syncClick', 'Sync click'), this.settings.syncClick)}
          ${this.toggleRow('syncInput', t('syncInput', 'Sync input'), this.settings.syncInput)}
          ${this.toggleRow('showDeviceChrome', t('deviceChrome', 'Show device chrome'), this.settings.showDeviceChrome)}
          ${this.toggleRow('compatibilityMode', t('compatibility', 'Compatibility Mode'), this.settings.compatibilityMode, t('compatibilityHelp', 'Use when iframe is blank'))}
        </section>
        <section class="section">
          <h3>${t('customResolution', 'Custom resolution')}</h3>
          <div class="custom-grid">
            <label class="field">${t('width', 'Width')}<input id="customWidth" type="number" min="240" max="2560" value="${Number(this.settings.customDevice.width)}"></label>
            <label class="field">${t('height', 'Height')}<input id="customHeight" type="number" min="320" max="2560" value="${Number(this.settings.customDevice.height)}"></label>
            <label class="field">Platform<select id="customPlatform"><option value="android" ${this.settings.customDevice.platform === 'android' ? 'selected' : ''}>Android/Chrome</option><option value="ios" ${this.settings.customDevice.platform === 'ios' ? 'selected' : ''}>iOS/Safari</option></select></label>
            <label class="field">Label<input id="customLabel" type="text" maxlength="30" value="${escapeHtml(this.settings.customDevice.label)}"></label>
          </div>
          <button class="primary" id="addCustomBtn" type="button">${t('addCustom', 'Add custom')}</button>
        </section>
        <section class="section about">
          <h3>${t('about', 'About')}</h3>
          <strong>AI Pairoj — by BUGpairoj</strong><br>
          Local-first · ไม่มี Login · ไม่มี Analytics · ไม่มีการส่งข้อมูลออกจาก Extension<br>
          YouTube: youtube.com/c/BUGpairoj
        </section>
      `;

      this.drawer.querySelectorAll('.chip').forEach((button) => {
        button.addEventListener('click', () => this.toggleDevice(button.dataset.device));
      });

      ['syncScroll', 'syncClick', 'syncInput', 'showDeviceChrome', 'compatibilityMode'].forEach((key) => {
        const input = this.drawer.querySelector(`#toggle-${key}`);
        input?.addEventListener('change', async () => {
          this.settings[key] = Boolean(input.checked);
          await this.saveSettings();
          if (key === 'showDeviceChrome') this.renderDevices();
          if (key === 'compatibilityMode') {
            await chrome.runtime.sendMessage({ type: 'BUGSIM_SET_COMPATIBILITY', enabled: this.settings.compatibilityMode });
            this.renderDevices();
          }
        });
      });

      this.drawer.querySelector('#addCustomBtn')?.addEventListener('click', async () => {
        const width = Math.max(240, Math.min(2560, Number(this.drawer.querySelector('#customWidth').value) || 390));
        const height = Math.max(320, Math.min(2560, Number(this.drawer.querySelector('#customHeight').value) || 844));
        const platform = this.drawer.querySelector('#customPlatform').value === 'ios' ? 'ios' : 'android';
        const label = this.drawer.querySelector('#customLabel').value.trim() || 'Custom';
        this.settings.customDevice = { id: 'custom', label, platform, width, height, radius: 28, notch: 'none' };
        if (!this.settings.activeDevices.includes('custom')) {
          if (this.settings.activeDevices.length >= MAX_DEVICES) this.settings.activeDevices.pop();
          this.settings.activeDevices.push('custom');
        }
        await this.saveSettings();
        this.renderAll();
      });
    }

    toggleRow(key, label, checked, help = '') {
      return `
        <div class="toggle-row">
          <div><span>${escapeHtml(label)}</span>${help ? `<small>${escapeHtml(help)}</small>` : ''}</div>
          <label class="switch"><input id="toggle-${key}" type="checkbox" ${checked ? 'checked' : ''}><span class="slider"></span></label>
        </div>
      `;
    }

    async toggleDevice(id) {
      const list = [...this.settings.activeDevices];
      const index = list.indexOf(id);
      if (index >= 0) {
        if (list.length === 1) return;
        list.splice(index, 1);
      } else {
        if (list.length >= MAX_DEVICES) {
          this.toast(t('maxDevices', 'Choose up to 5 devices'));
          return;
        }
        list.push(id);
      }
      this.settings.activeDevices = list;
      await this.saveSettings();
      this.renderAll();
    }

    async rotateDevice(id) {
      this.settings.orientation[id] = this.settings.orientation[id] === 'landscape' ? 'portrait' : 'landscape';
      await this.saveSettings();
      this.renderDevices();
    }

    onWindowMessage(event) {
      const data = event.data;
      if (!data || data.source !== 'BUGSIM_FRAME' || !data.deviceId) return;
      if (!this.settings.activeDevices.includes(data.deviceId)) return;

      const enabled = {
        scroll: this.settings.syncScroll,
        click: this.settings.syncClick,
        input: this.settings.syncInput
      }[data.kind];
      if (!enabled) return;

      this.grid.querySelectorAll('iframe').forEach((frame) => {
        const deviceId = frame.closest('.device-card')?.dataset.deviceId;
        if (!deviceId || deviceId === data.deviceId) return;
        try {
          frame.contentWindow.postMessage({
            source: 'BUGSIM_HOST',
            kind: data.kind,
            payload: data.payload,
            sourceId: data.deviceId,
            nonce: data.nonce
          }, '*');
        } catch {
          // Cross-origin messaging is intentionally best-effort.
        }
      });
    }

    onRuntimeMessage(message, _sender, sendResponse) {
      if (!message?.type?.startsWith('BUGSIM_')) return false;

      if (message.type === 'BUGSIM_TOGGLE') {
        this.visible ? this.hide(false) : this.show(false);
        sendResponse({ visible: this.visible, compatibilityMode: this.settings.compatibilityMode });
        return false;
      }
      if (message.type === 'BUGSIM_GET_STATE') {
        sendResponse({ visible: this.visible, compatibilityMode: this.settings.compatibilityMode });
        return false;
      }
      if (message.type === 'BUGSIM_COMMAND_SCREENSHOT') {
        if (!this.visible) this.show(false);
        void this.captureScreenshot();
        sendResponse({ ok: true });
        return false;
      }
      if (message.type === 'BUGSIM_RECORDING_STATE') {
        this.setRecording(Boolean(message.recording));
        sendResponse({ ok: true });
        return false;
      }
      return false;
    }

    async notifyPanelState() {
      try {
        await chrome.runtime.sendMessage({
          type: 'BUGSIM_PANEL_STATE',
          visible: this.visible,
          compatibilityMode: this.settings.compatibilityMode
        });
      } catch {
        // Service worker may be restarting; no action needed.
      }
    }

    show(notify = true) {
      this.visible = true;
      this.host.style.display = 'block';
      if (notify) void this.notifyPanelState();
    }

    hide(notify = true) {
      this.visible = false;
      this.host.style.display = 'none';
      if (this.recording) void this.stopRecording();
      if (notify) void this.notifyPanelState();
    }

    async captureScreenshot() {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'BUGSIM_CAPTURE_VISIBLE' });
        if (!response?.ok || !response.dataUrl) throw new Error(response?.error || 'capture failed');

        const rect = this.grid.getBoundingClientRect();
        const img = new Image();
        img.src = response.dataUrl;
        await img.decode();

        const scaleX = img.naturalWidth / window.innerWidth;
        const scaleY = img.naturalHeight / window.innerHeight;
        const x = Math.max(0, Math.round(rect.left * scaleX));
        const y = Math.max(0, Math.round(rect.top * scaleY));
        const w = Math.max(1, Math.min(img.naturalWidth - x, Math.round(rect.width * scaleX)));
        const h = Math.max(1, Math.min(img.naturalHeight - y, Math.round(rect.height * scaleY)));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG encoding failed');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bugpairoj-mobile-sim-${dateStamp()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        this.toast(t('captureDone', 'Screenshot saved'));
      } catch (error) {
        console.error('BUGpairoj Mobile SIM screenshot error', error);
        this.toast(`Screenshot error: ${error?.message || error}`);
      }
    }

    async toggleRecording() {
      if (this.recording) {
        await this.stopRecording();
        return;
      }
      const response = await chrome.runtime.sendMessage({ type: 'BUGSIM_START_RECORDING' });
      if (!response?.ok) {
        this.toast(`Record error: ${response?.error || 'unknown error'}`);
      }
    }

    async stopRecording() {
      try {
        await chrome.runtime.sendMessage({ type: 'BUGSIM_STOP_RECORDING' });
      } finally {
        this.setRecording(false);
      }
    }

    setRecording(value) {
      this.recording = value;
      if (value) {
        this.recordStartedAt = Date.now();
        clearInterval(this.recordTimer);
        this.recordTimer = setInterval(() => this.updateToolbarState(), 1000);
      } else {
        clearInterval(this.recordTimer);
        this.recordTimer = null;
      }
      this.updateToolbarState();
    }

    toast(message) {
      this.toastEl.textContent = message;
      this.toastEl.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 2200);
    }
  }

  window.__BUGPAIROJ_MOBILE_SIM__ = new MobileSim();
})();
