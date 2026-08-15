# dsh-plugin-whalefeed

English | [中文](README.md)

> A floating "Whale Girl" token-feeding desktop pet for the DeepSeek Harness web UI. Each conversation session gets its own independent whale girl: as the session consumes tokens, the whale automatically eats, her belly grows, and she levels up. Supports local/host dual storage, export/import, gallery, feed trends, keyboard accessibility, and light/dark themes.

![License](https://img.shields.io/github/license/pythonshiyi/dsh-plugin-whalefeed)
![GitHub release](https://img.shields.io/github/v/release/pythonshiyi/dsh-plugin-whalefeed)
[![dsh-plugin](https://img.shields.io/badge/GitHub-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)

## Features

- **One whale girl per session**: sessions never share a whale; switching sessions loads that session's own whale.
- **Automatic token feeding**: reads the Harness `tokenUsage` projection (input + cache + output) and feeds the whale whenever token usage grows.
- **Visual belly growth**: belly scales continuously with cumulative consumption and levels up at thresholds:
  - Whale Fry → Tiny Belly → Round Belly → Big Belly Whale → Mega Whale
- **Replaceable character art**: built-in SVG placeholder plus a bundled custom PNG set (`assets/`) with 5 belly stages and eating/happy/sleepy expressions; falls back to SVG if images fail to load.
- **Animations**: eating wiggle, level-up bounce, bubbles; respects `prefers-reduced-motion`.
- **Draggable, clickable, keyboard accessible**: floats at the bottom-right by default; supports Tab focus, Enter/Space to open, Esc to close.
- **Dual storage**:
  - Browser `localStorage` as a fast cache by default;
  - Optional host-backed file persistence for cross-browser/device sharing on the same Harness profile;
  - Automatically falls back to localStorage when the host half is unavailable.
- **Export / Import**: export the current whale girl as JSON, or paste JSON to import.
- **Whale Girl Gallery**: view all session whale girls, stages, and total fed amounts.
- **Feed trend**: a mini sparkline of the latest feeding events in the detail panel.
- **Multi-tab sync**: `BroadcastChannel` first, `storage` event fallback.
- **Corrupted data backup**: damaged local state is backed up as `:bak` before rebuilding.
- **i18n**: zh/en, with Chinese fallback.
- **Session-slot rendering + CSS floating**: reads live token data from the session header slot, then uses `position: fixed` to float the whale over the whole page; falls back to the message actions slot when the header slot is unavailable.

## Requirements

- DeepSeek Harness **web edition** (`dsh --profile web`)
- Standard web plugin list
- Host persistence requires the Node half to write to the Harness data directory; it automatically falls back to localStorage when unavailable

## Install

### Local directory or Git repository

```bash
cd ~/.dsh/profiles
npm install /path/to/dsh-plugin-whalefeed
# or: npm install https://github.com/pythonshiyi/dsh-plugin-whalefeed
```

### npm (once published)

```bash
cd ~/.dsh/profiles
npm install dsh-plugin-whalefeed
```

Register in `cordis.patch.yml`:

```yaml
- insert:
    - id: plugin-whalefeed
      name: "dsh-plugin-whalefeed"
```

Restart `dsh --profile web` and refresh the page.

## Configuration

```yaml
- insert:
    - id: plugin-whalefeed
      name: "dsh-plugin-whalefeed"
      config:
        position: bottom-right # bottom-right | bottom-left | top-right | top-left | {x: 20, y: 20}
        size: 144 # pet size px (32-320, default 144)
        opacity: 0.92 # opacity (0.2-1, default 0.92)
        showTokenBadge: true # show session token total above the pet
        showStageName: true # show current stage name below the pet
        catchUpOnFirstSeen: true # backfill existing session usage on first sight
        feedRatio: 1 # 1 token = 1 whale food; adjust growth speed
        resetOnNewSession: false # force newly-seen sessions to start at 0
        draggable: true # allow dragging the pet
        hostPersistence: true # enable host file persistence (falls back to localStorage)
        historyLimit: 50 # max number of feed history entries
        visual: auto # auto uses assets/ PNGs and falls back to SVG; svg forces built-in SVG; custom forces custom images
        stages: [] # custom stages, see below
```

### Custom stages

An empty `stages` uses the built-in defaults:

```js
[
  { threshold: 0, belly: 0.75 },
  { threshold: 10000000, belly: 1.0 },
  { threshold: 50000000, belly: 1.35 },
  { threshold: 250000000, belly: 1.75 },
  { threshold: 1000000000, belly: 2.2 },
];
```

You can override with `{ threshold, belly, label? }`. Stages are automatically sorted by threshold and a zero threshold is ensured.

## How it works

| Area          | Details                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary slot  | `conversation.session.header.utilities` (session scope, provides token data); CSS `fixed` for global floating; fallback `conversation.chat.assistant-actions` |
| Data source   | `useProjection("tokenUsage")`, same source as the conversation snapshot                                                                                       |
| Total         | `uncachedInputTokens + cacheReadTokens + cacheWriteTokens + outputTokens`                                                                                     |
| Feeding       | On projection change, `delta = current total - last total`; if `delta > 0`, feed the current session's whale                                                  |
| Local storage | `localStorage` key: `dsh-plugin-whalefeed:v1:{sessionId}`                                                                                                     |
| Host storage  | Node half serves `/dsh-whalefeed-state` and `/dsh-whalefeed-states`, stored in `dsh-plugin-whalefeed-store.json`                                              |
| Multi-tab     | `BroadcastChannel` + `storage` event dual channel                                                                                                             |
| Corruption    | Failed parses are backed up as `:bak` before rebuilding                                                                                                       |
| Accessibility | Keyboard operations, ARIA, `prefers-reduced-motion`                                                                                                           |

## FAQ

**Will my whale survive changing browsers/devices?**
With host persistence enabled, state is kept in a local file on the same Harness profile. Pure localStorage mode only persists in the current browser.

**Is host persistence safe?**
Data is written only to the Harness local data directory; no third-party network or remote upload is involved.

**Why is the whale not visible in some environments?**
The plugin needs a session-scoped slot to read token data. If `conversation.session.header.utilities` is unavailable, it tries `conversation.chat.assistant-actions`; if neither exists, it does not render.

**How do I export/import?**
Open the pet details → Export downloads a JSON file; Import prompts you to paste a JSON state.

**How do I see all whale girls?**
Open the details panel → Gallery to see all session whale girls and global fed totals.

**If I reset, will old tokens be fed again?**
No. Reset anchors `lastTotalTokens` to the current projection total, so previously consumed tokens are not fed twice.

## Compatibility

- DeepSeek Harness `0.1.0-rc.6` (web profile)
- Depends on the `tokenUsage` projection, `conversation.session.header.utilities` slot, and optionally the Host `webServer` service
- All accesses are guarded; if Harness changes shape in a future release, the plugin degrades silently instead of throwing

## Development

```bash
npm test          # unit tests
npm run check     # syntax checks
npm run pack      # npm pack preview
npm run lint      # ESLint (requires npm install)
npm run format    # Prettier (requires npm install)
```

## Support & Brand

**WeChat Official Account: 十一AIGC** — AI tool reviews and tutorials, plus early access to this plugin and more DeepSeek Harness tricks.

If this project helps you, feel free to ⭐ Star and follow **十一AIGC**.

## License

MIT
