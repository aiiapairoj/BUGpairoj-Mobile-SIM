# Privacy Policy — BUGpairoj Mobile SIM

Last updated: 22 August 2026

BUGpairoj Mobile SIM is designed as a local-first developer utility.

## Data collection

The extension does **not** collect, transmit, sell, or share browsing data, personal data, analytics, telemetry, credentials, screenshots, or recordings with any external server.

## Local processing

- Device preferences are stored using `chrome.storage.sync` under the user's Chrome account settings.
- Screenshots are generated locally in the active tab and downloaded by the browser.
- Recordings are captured locally with `chrome.tabCapture`, encoded locally with `MediaRecorder`, and downloaded as WebM.
- No remote code, CDN scripts, analytics SDKs, or external API calls are included.

## Network header modification

When the user opens the preview overlay, the extension creates temporary Manifest V3 session rules scoped to that tab to support iframe previewing. Rules are removed when the panel is closed, the tab navigates, or the tab is closed.

Compatibility Mode can remove the `Content-Security-Policy` response header for preview subframes in the active tab. This mode is off by default and must be explicitly enabled by the user.

## Contact / credit

AI Pairoj — by BUGpairoj
YouTube: https://www.youtube.com/c/BUGpairoj
