# QA Report — BUGpairoj Mobile SIM 1.0.0

Date: 22 August 2026

## Automated checks performed

- `manifest.json` parses as valid JSON
- Thai/English locale JSON parses as valid JSON
- `background.js` passes `node --check`
- `content.js` passes `node --check`
- `frame-agent.js` passes `node --check`
- `offscreen.js` passes `node --check`
- No `eval()` or `new Function()`
- No external JS/CSS/CDN dependency
- Manifest is MV3 and uses a service worker
- Preview header modification is implemented as **session rules** and scoped to URLs containing `__bugsim=`
- Compatibility Mode is off by default

## Manual Chrome checks recommended before Web Store submission

1. Load unpacked on current stable Chrome for Windows.
2. Test `https://example.com` and one responsive internal site.
3. Test a site with `X-Frame-Options: DENY`.
4. Test Compatibility Mode only on a trusted test page that uses CSP `frame-ancestors 'none'`.
5. Verify screenshot download.
6. Verify WebM recording and stop flow.
7. Verify shortcuts do not conflict with existing Chrome/OS shortcuts.
8. Review Chrome Web Store permission disclosure text.

## Known limitations

- Hardware/browser-engine emulation is not equivalent to DevTools Device Mode; this build uses real iframe viewport sizing plus scoped document User-Agent override.
- Some anti-framing/anti-bot/cookie/COEP/CORP scenarios cannot be made fully compatible without materially weakening security.
- Recording captures the visible tab, including the overlay UI.
