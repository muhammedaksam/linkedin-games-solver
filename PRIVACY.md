# Privacy Policy — LinkedIn Games Solver

Last updated: 2026-05-27

LinkedIn Games Solver provides puzzle-solving helpers for LinkedIn Games pages. This privacy policy explains what data the extension accesses, why, and how that data is used.

## Single purpose

The extension's single purpose is to read the game state and clues from LinkedIn Games pages (pages matching `https://*.linkedin.com/games/*`) and provide puzzle-solving assistance to the user (display solutions, suggest moves, or auto-fill inputs when explicitly requested).

## What data is accessed and why

- Website content: game board state and clue text from `https://*.linkedin.com/games/*`. Purpose: to compute or request a solution and present it to the user. This data is only read when you are on a supported LinkedIn Games page and request the extension's functionality.
- Settings and preferences: language, UI preferences, solve statistics (streaks, personal bests, daily solved counts), chosen AI provider/model, and optional API key or custom AI endpoint. Purpose: to persist user configuration so the extension works across browser sessions.

## Network requests and AI assistance

- **AI Assistance**: The extension does not transmit any data off-device unless you explicitly enable AI assistance and provide an API key or custom endpoint. If AI assistance is enabled, the extension will send only the necessary game content and a generated prompt to the AI provider you configured (for example, OpenAI, Google Gemini, Anthropic, or a custom endpoint) to obtain a suggested solution. API keys you enter are stored locally in your browser storage and are used only to authenticate requests to the provider you chose.
- **Daily Pre-solved Answers Registry**: To optimize solving speeds, completely eliminate AI token costs, and avoid LLM hallucinations, the extension securely fetches pre-solved daily game answers for Pinpoint and Crossclimb from our public registry hosted on GitHub (`https://raw.githubusercontent.com/*`). This request is strictly a secure download of public answers; no user-identifying data, browser metadata, or game session logs are ever transmitted.

## Permissions used

- `storage`: used to store preferences, themes, solving history, streaks, and optional API keys. Non-sensitive settings and solve statistics are synchronized across your logged-in browser profiles using `chrome.storage.sync` to ensure a seamless cross-device dashboard. Sensitive values like AI credentials remain strictly confined to `chrome.storage.local` on your local device.
- `session`: used as high-performance, RAM-only ephemeral storage (`chrome.storage.session`) to cache active debugger logs and solving trace logs. This data lives purely in memory, produces zero disk wear, and is automatically wiped clean when your browser session ends.
- `activeTab`: used only when you interact with the extension (popup/dashboard) to detect and message the active LinkedIn Games tab.
- `sidePanel`: used to display a responsive, persistent panel next to the LinkedIn page for a fluid workspace without blocking active game interactions.
- `alarms`: used to register background alarms in the service worker to perform daily scheduled checks for unsolved games and protect your active streak.
- `notifications`: used to display native system-level desktop notifications (Streak Protector) if today's games remain unsolved by your chosen alarm time.
- `contextMenus`: used to add right-click context menu options (`⚡ Solve Active LinkedIn Game`, `💡 Get a Hint`, and `📊 View Results`) to LinkedIn game pages for quick solver accessibility.
- Host Permission `https://raw.githubusercontent.com/*`: used by the background service worker to fetch pre-solved puzzle solutions securely and directly from our public GitHub answers registry.
- Optional Host Permission `https://*.linkedin.com/games/*`: we request site permissions on-demand. Access to LinkedIn Game pages is only requested when you first click a solver button or try to run the helper. This ensures you can install the extension with zero initial site-read access, placing privacy and user control first.

## Data retention and sharing

- Settings, solved statistics, and optional API keys remain stored locally in your browser storage (`local` and `sync` spaces) until you remove them or uninstall the extension.
- Game content and prompts are sent only to the AI provider you configured and only when you request AI assistance. We do not sell or transfer user data for advertising or unrelated purposes.

## No analytics or tracking

This extension does not include analytics, telemetry, or crash-reporting integrations. It does not collect or transmit personal identifiers, location, contacts, browsing history, or keystrokes.

## Developer contact

For questions, contact: Muhammed Mustafa AKŞAM <info@muhammedaksam.com.tr>
