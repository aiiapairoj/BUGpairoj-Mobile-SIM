# Privacy — BUGpairoj Mobile SIM v1.5.0

BUGpairoj Mobile SIM does not require an account and does not send analytics or browsing data to BUGpairoj servers.

Settings are stored with `chrome.storage.sync`. Screenshots and recordings are created only after user action and are downloaded locally.

Compatibility Mode temporarily creates session-scoped Declarative Net Request rules for iframe compatibility. Rules are removed when the preview closes or the tab closes.

The `webRequest` permission is used only for passive diagnostics of subframe response headers and network errors while a BUGpairoj Mobile SIM preview is active. It is not used with `webRequestBlocking`, does not modify requests, and diagnostic state stays in `chrome.storage.session`.

The extension does not contain remote executable code.
