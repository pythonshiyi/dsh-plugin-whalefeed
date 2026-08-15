# Changelog

## [0.2.0] - 2026-08-15

### Added

- Host half file persistence (`/dsh-whalefeed-state`, `/dsh-whalefeed-states`) with localStorage fallback.
- Export current whale girl as JSON.
- Import whale girl state by pasting JSON.
- Whale Girl Gallery with per-session list and global fed totals.
- Feed history storage and mini sparkline trend in the detail panel.
- More whale moods: excited, shy, thinking; CSS animations and `prefers-reduced-motion` support.
- `useId()`-based SVG gradient ids to avoid collisions.
- Keyboard accessibility: Tab focus, Enter/Space toggle, Esc close, ARIA labels/dialog roles.
- BroadcastChannel multi-tab sync with `storage` event fallback.
- Corrupted localStorage backup (`:bak`) before reset.
- Session-scoped slot rendering (`conversation.session.header.utilities`) with CSS fixed floating; fallback to `conversation.chat.assistant-actions`.
- GitHub Actions CI (`npm run check`, `npm test`, `npm run pack`).
- ESLint flat config and Prettier config.
- New config options: `hostPersistence`, `historyLimit`, `visual`, `affectionEnabled`, `petCooldownMs`, `healthReminders`, `spikeThreshold`, `sessionBudget`, `dailyBudget`, `warningCooldownMs`.
- Bundled custom PNG whale girl assets (`assets/`) with 5 belly stages and eating/happy/sleepy expressions, served by the Host half with SVG fallback.
- Affection / headpat interaction: double-click the whale to increase affection (Stranger → Familiar → Friendly → Close → Soulmate) with a cooldown.
- Token health reminders: gentle bubble-only warnings for large single bites, session budget, and daily budget.
- README preview banner (`docs/preview.png`) generated from bundled whale-girl assets via `scripts/make_preview.py`.

### Changed

- `bellyScale` now keeps growing modestly past the max stage.
- `applyTokenDelta` stores fractional whale food without losing tokens.
- `normalizeHistory` validates and caps feed history.
- Detail panel redesigned as an immersive game-style attribute panel; export/import/gallery/reset are now hidden behind a Settings submenu.
- Import uses an inline textarea instead of `window.prompt`; export falls back to clipboard copy when download is unavailable.
- README (zh/en) and CHANGELOG updated.

### Fixed

- Feed ratio no longer drops fractional food.
- Empty stage configs consistently fall back to built-in defaults.
- SVG gradient IDs are unique per instance.
- Reset button no longer depends on `window.confirm`; uses an inline two-step confirm that works in embedded/WebView environments.
- Default pet size increased to 144px and custom image is scaled slightly so the whale girl is more visible.
- Rebalanced default stage thresholds to 10M / 50M / 250M / 1B tokens so progression remains challenging for heavy usage (roughly 5× per stage).
