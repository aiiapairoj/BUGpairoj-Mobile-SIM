# QA Report — BUGpairoj Mobile SIM v1.5.0

## Static checks
- manifest.json valid JSON
- JavaScript syntax checked with Node `--check`
- No eval / new Function
- Manifest V3
- No remote code/CDN

## v1.5 logic checks
- FRAME_READY_TIMEOUT = 1200 ms
- Smart Auto default ON
- Unknown site starts Compatibility by default
- Known Deep site is restored from per-domain memory before panel injection
- Deep Compatibility detach path retained on panel/tab close
- DNR session cleanup retained

Interactive browser QA is still required for target sites, especially login redirects, Service Worker controlled pages, and recording.
