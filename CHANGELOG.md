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
- `shell.overlay` slot fallback to `conversation.session.header.utilities` compact badge.
- GitHub Actions CI (`npm run check`, `npm test`, `npm run pack`).
- ESLint flat config and Prettier config.
- New config options: `hostPersistence`, `historyLimit`.

### Changed

- `bellyScale` now keeps growing modestly past the max stage.
- `applyTokenDelta` stores fractional whale food without losing tokens.
- `normalizeHistory` validates and caps feed history.
- README (zh/en) and CHANGELOG updated.

### Fixed

- Feed ratio no longer drops fractional food.
- Empty stage configs consistently fall back to built-in defaults.
- SVG gradient IDs are unique per instance.
