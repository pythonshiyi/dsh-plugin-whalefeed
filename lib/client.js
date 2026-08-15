/**
 * dsh-plugin-whalefeed — browser half.
 *
 * A floating whale-girl desktop pet for the DeepSeek Harness web UI.
 *
 * Highlights (v0.2):
 * - One independent whale girl per conversation session.
 * - Automatic feeding from the `tokenUsage` projection.
 * - Optional host-backed persistence with localStorage cache/fallback.
 * - Export/import, gallery, feed history sparkline.
 * - Drag, click details, reset, keyboard accessibility, reduced-motion support.
 * - `shell.overlay` primary slot with a compact header fallback.
 */
window.__ModuleLoader__.load({
  id: "dsh-plugin-whalefeed",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const { useState, useEffect, useRef, useMemo, useCallback, useId } = React;
    const safeUseId = typeof useId === "function" ? useId : () => "dsh-wf";

    // ── styles ─────────────────────────────────────────────────────────
    const CSS_ID = "dsh-plugin-whalefeed/client.css";
    if (
      typeof document !== "undefined" &&
      document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID) + "]") === null
    ) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-plugin-whalefeed";
      tag.dataset.pluginCss = CSS_ID;
      tag.textContent = `
        .dsh-wf-root {
          --dsh-wf-body: #8fd0f7;
          --dsh-wf-body-dark: #5aa7d9;
          --dsh-wf-belly: #f9c9d8;
          --dsh-wf-line: #2b5b7a;
          --dsh-wf-accent: #ff8fb3;
          --dsh-wf-panel-bg: rgba(255,255,255,0.96);
          --dsh-wf-panel-text: #1f2329;
          --dsh-wf-panel-border: rgba(31,35,41,0.12);
          --dsh-wf-shadow: rgba(31,35,41,0.18);
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }
        @media (prefers-color-scheme: dark) {
          .dsh-wf-root {
            --dsh-wf-body: #4f9fd6;
            --dsh-wf-body-dark: #3b7fae;
            --dsh-wf-belly: #c98a9f;
            --dsh-wf-line: #d9e9f5;
            --dsh-wf-accent: #ff9cbc;
            --dsh-wf-panel-bg: rgba(30,32,38,0.96);
            --dsh-wf-panel-text: #e8eaed;
            --dsh-wf-panel-border: rgba(255,255,255,0.14);
            --dsh-wf-shadow: rgba(0,0,0,0.4);
          }
        }
        .dsh-wf-root.dsh-wf-floating {
          position: fixed;
          z-index: 2147483000;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          cursor: grab;
        }
        .dsh-wf-root.dsh-wf-floating:active { cursor: grabbing; }
        .dsh-wf-root.dsh-wf-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          user-select: none;
        }
        .dsh-wf-pet { position: relative; width: 100%; height: auto; }
        .dsh-wf-pet svg { display: block; width: 100%; height: auto; overflow: visible; }
        .dsh-wf-custom-img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: contain;
          image-rendering: auto;
          transform: scale(1.12);
          transform-origin: center bottom;
          filter: drop-shadow(0 4px 12px var(--dsh-wf-shadow));
        }
        .dsh-wf-bubble {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 4px);
          transform: translateX(-50%);
          background: var(--dsh-wf-panel-bg);
          color: var(--dsh-wf-panel-text);
          border: 1px solid var(--dsh-wf-panel-border);
          border-radius: 12px;
          padding: 4px 9px;
          font-size: 12px;
          line-height: 1.3;
          white-space: nowrap;
          box-shadow: 0 4px 16px var(--dsh-wf-shadow);
          pointer-events: none;
          animation: dsh-wf-pop 0.25s ease-out;
        }
        .dsh-wf-token-badge, .dsh-wf-stage-badge {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          background: var(--dsh-wf-panel-bg);
          color: var(--dsh-wf-panel-text);
          border: 1px solid var(--dsh-wf-panel-border);
          border-radius: 999px;
          padding: 1px 7px;
          font-size: 10px;
          line-height: 1.5;
          white-space: nowrap;
          box-shadow: 0 2px 8px var(--dsh-wf-shadow);
          pointer-events: none;
        }
        .dsh-wf-token-badge { top: -22px; }
        .dsh-wf-stage-badge { bottom: -8px; }
        /* Keep the stage name subtle so the pet image stays the focus. */
        .dsh-wf-root.dsh-wf-floating .dsh-wf-stage-badge {
          background: transparent;
          border-color: transparent;
          box-shadow: none;
          color: var(--dsh-wf-panel-text);
          opacity: 0.42;
          font-size: 9px;
          font-weight: 300;
          letter-spacing: 0.4px;
          padding: 0 4px;
          text-shadow: 0 1px 4px var(--dsh-wf-shadow);
        }
        .dsh-wf-root.dsh-wf-badge .dsh-wf-token-badge,
        .dsh-wf-root.dsh-wf-badge .dsh-wf-stage-badge {
          position: static;
          transform: none;
          box-shadow: none;
        }
        .dsh-wf-info, .dsh-wf-gallery {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 18px);
          transform: translateX(-50%);
          width: 240px;
          max-height: 70vh;
          overflow: auto;
          background: var(--dsh-wf-panel-bg);
          color: var(--dsh-wf-panel-text);
          border: 1px solid var(--dsh-wf-panel-border);
          border-radius: 16px;
          box-shadow:
            0 0 0 1px var(--dsh-wf-panel-border),
            0 12px 40px var(--dsh-wf-shadow);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 12px 14px;
          font-size: 12px;
          line-height: 1.6;
          z-index: 10;
          pointer-events: auto;
          cursor: default;
        }
        .dsh-wf-root.dsh-wf-badge .dsh-wf-info,
        .dsh-wf-root.dsh-wf-badge .dsh-wf-gallery {
          position: fixed;
          bottom: auto;
          top: 44px;
          left: 50%;
          transform: translateX(-50%);
        }
        .dsh-wf-info h4, .dsh-wf-gallery h4 { margin: 0 0 6px; font-size: 14px; }
        .dsh-wf-info dl, .dsh-wf-stats { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; }
        .dsh-wf-info dt, .dsh-wf-stats dt { opacity: 0.7; }
        .dsh-wf-info dd, .dsh-wf-stats dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
        .dsh-wf-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .dsh-wf-settings-toggle {
          margin-top: 10px;
          width: 100%;
          border: 1px dashed var(--dsh-wf-panel-border);
          background: transparent;
          color: var(--dsh-wf-panel-text);
          border-radius: 8px;
          padding: 3px 8px;
          font-size: 11px;
          opacity: 0.65;
          cursor: pointer;
        }
        .dsh-wf-settings-toggle:hover, .dsh-wf-settings-open { opacity: 1; background: rgba(127,127,127,0.08); }
        .dsh-wf-settings {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--dsh-wf-panel-border);
        }
        .dsh-wf-settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .dsh-wf-settings-grid .dsh-wf-reset { margin-top: 0; width: auto; grid-column: 1 / -1; }
        .dsh-wf-import-box { margin-top: 8px; }
        .dsh-wf-import-input {
          width: 100%;
          box-sizing: border-box;
          resize: vertical;
          border: 1px solid var(--dsh-wf-panel-border);
          border-radius: 8px;
          background: transparent;
          color: var(--dsh-wf-panel-text);
          padding: 6px;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        }
        .dsh-wf-import-actions { display: flex; gap: 6px; margin-top: 6px; }
        .dsh-wf-import-actions .dsh-wf-btn { flex: 1; }
        .dsh-wf-import-confirm { border-color: #4caf7d; color: #4caf7d; }
        .dsh-wf-btn {
          flex: 1 1 auto;
          border: 1px solid var(--dsh-wf-panel-border);
          background: transparent;
          color: var(--dsh-wf-panel-text);
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
        }
        .dsh-wf-btn:hover { background: rgba(127,127,127,0.12); }
        .dsh-wf-reset {
          margin-top: 10px;
          width: 100%;
          border: 1px solid var(--dsh-wf-panel-border);
          background: transparent;
          color: var(--dsh-wf-panel-text);
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
        }
        .dsh-wf-reset:hover { background: rgba(127,127,127,0.12); }
        .dsh-wf-reset-confirm { border-color: #e5534b; color: #e5534b; }
        .dsh-wf-spark { width: 100%; height: 36px; margin-top: 6px; }
        .dsh-wf-gallery-list { display: grid; gap: 6px; margin-top: 6px; }
        .dsh-wf-gallery-item {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid var(--dsh-wf-panel-border);
          border-radius: 8px;
          padding: 6px 8px;
        }
        .dsh-wf-gallery-item strong { font-size: 12px; }
        .dsh-wf-close {
          float: right;
          border: 0;
          background: transparent;
          color: var(--dsh-wf-panel-text);
          font-size: 14px;
          cursor: pointer;
          line-height: 1;
        }
        .dsh-wf-root.dsh-wf-eating .dsh-wf-pet { animation: dsh-wf-wiggle 0.6s ease-in-out; }
        .dsh-wf-root.dsh-wf-happy .dsh-wf-pet,
        .dsh-wf-root.dsh-wf-excited .dsh-wf-pet { animation: dsh-wf-bounce 0.7s ease-in-out; }
        .dsh-wf-root.dsh-wf-full .dsh-wf-pet { animation: dsh-wf-belly-pulse 2s ease-in-out infinite; }
        .dsh-wf-root.dsh-wf-sleepy .dsh-wf-pet { animation: dsh-wf-float 3s ease-in-out infinite; }
        .dsh-wf-root.dsh-wf-shy .dsh-wf-pet { animation: dsh-wf-shy 1.2s ease-in-out; }
        .dsh-wf-root.dsh-wf-thinking .dsh-wf-pet { animation: dsh-wf-think 2s ease-in-out infinite; }
        @keyframes dsh-wf-pop { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes dsh-wf-wiggle { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
        @keyframes dsh-wf-bounce { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-10px); } 70% { transform: translateY(0); } }
        @keyframes dsh-wf-belly-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes dsh-wf-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes dsh-wf-shy { 0%,100% { transform: translateX(0); } 30% { transform: translateX(-3px) rotate(-3deg); } 60% { transform: translateX(3px) rotate(3deg); } }
        @keyframes dsh-wf-think { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @media (prefers-reduced-motion: reduce) {
          .dsh-wf-root * { animation: none !important; transition: none !important; }
        }
      `;
      document.head.appendChild(tag);
    }

    // ── locale ─────────────────────────────────────────────────────────
    const NS = "dshPluginWhalefeed";
    const DICTS = {
      zh: {
        whale: "鲸鱼娘",
        totalTokens: "累计消耗",
        fedTokens: "已喂食",
        stage: "阶段",
        nextStage: "下一阶段还需 {n} tokens",
        maxStage: "已满级",
        feedEvents: "进食次数",
        lastFed: "最近进食",
        neverFed: "尚未进食",
        justNow: "刚刚",
        minutesAgo: "{n} 分钟前",
        hoursAgo: "{n} 小时前",
        daysAgo: "{n} 天前",
        reset: "重置这只鲸鱼娘",
        resetConfirm: "确定要重置这只鲸鱼娘吗？",
        resetConfirmShort: "再点一次确认重置",
        resetDone: "已经重置啦，重新开始吃~",
        eating: "嗝~ 吃了 {n}",
        stageUp: "升级啦！{label}",
        welcome: "你好呀~ +{n}",
        dragHint: "拖动我，点击看详情",
        close: "关闭",
        export: "导出",
        exportDone: "已导出~",
        exportCopied: "已复制到剪贴板",
        import: "导入",
        importPrompt: "请粘贴鲸鱼娘 JSON 状态：",
        importDone: "导入成功~",
        importFailed: "导入失败：不是有效的鲸鱼娘状态",
        settings: "设置",
        confirmImport: "确认导入",
        cancel: "取消",
        gallery: "图鉴",
        galleryTitle: "鲸鱼娘图鉴",
        noGallery: "还没有其他鲸鱼娘",
        globalStats: "总计 {n} 只 · 已喂 {tokens}",
        history: "喂食趋势",
        storageMode: "存储",
        storageLocal: "本地",
        storageHost: "云端",
        affection: "好感度",
        affection0: "陌生",
        affection1: "熟悉",
        affection2: "友好",
        affection3: "亲密",
        affection4: "挚友",
        petCount: "摸头次数",
        petBubble: "嘿嘿~ 再摸一下嘛",
        petCooldown: "已经摸过啦，先让我缓一缓~",
        petHint: "双击摸摸头",
        spikeWarning: "这一口有点大哦",
        sessionBudgetWarning: "这个会话吃得有点多了",
        dailyBudgetWarning: "今天已经吃了很多啦",
        health: "健康提醒",
        stage0: "鲸鱼苗",
        stage1: "小腹微凸",
        stage2: "肚子圆滚滚",
        stage3: "大肚鲸娘",
        stage4: "巨鲸神",
      },
      en: {
        whale: "Whale Girl",
        totalTokens: "Session tokens",
        fedTokens: "Fed",
        stage: "Stage",
        nextStage: "{n} tokens to next stage",
        maxStage: "Max stage",
        feedEvents: "Feedings",
        lastFed: "Last fed",
        neverFed: "Never fed",
        justNow: "just now",
        minutesAgo: "{n}m ago",
        hoursAgo: "{n}h ago",
        daysAgo: "{n}d ago",
        reset: "Reset this whale girl",
        resetConfirm: "Reset this whale girl?",
        resetConfirmShort: "Click again to confirm",
        resetDone: "Reset! Let's eat again~",
        eating: "Burp~ +{n}",
        stageUp: "Level up! {label}",
        welcome: "Hi there~ +{n}",
        dragHint: "Drag me, click for details",
        close: "Close",
        export: "Export",
        exportDone: "Exported~",
        exportCopied: "Copied to clipboard",
        import: "Import",
        importPrompt: "Paste whale girl JSON state:",
        importDone: "Imported~",
        importFailed: "Import failed: not a valid whale state",
        settings: "Settings",
        confirmImport: "Confirm import",
        cancel: "Cancel",
        gallery: "Gallery",
        galleryTitle: "Whale Girl Gallery",
        noGallery: "No other whale girls yet",
        globalStats: "{n} total · {tokens} fed",
        history: "Feed trend",
        storageMode: "Storage",
        storageLocal: "Local",
        storageHost: "Host",
        affection: "Affection",
        affection0: "Stranger",
        affection1: "Familiar",
        affection2: "Friendly",
        affection3: "Close",
        affection4: "Soulmate",
        petCount: "Headpats",
        petBubble: "Hehe~ one more pat?",
        petCooldown: "Already patted, give me a moment~",
        petHint: "Double-click to pat",
        spikeWarning: "That was a big bite!",
        sessionBudgetWarning: "This session is eating a lot",
        dailyBudgetWarning: "You've eaten a lot today",
        health: "Health",
        stage0: "Whale Fry",
        stage1: "Tiny Belly",
        stage2: "Round Belly",
        stage3: "Big Belly Whale",
        stage4: "Mega Whale",
      },
    };

    // ── constants & pure helpers ────────────────────────────────────────
    const STORAGE_PREFIX = "dsh-plugin-whalefeed:v1:";
    const STORAGE_BAK_SUFFIX = ":bak";
    const BROADCAST_CHANNEL = "dsh-plugin-whalefeed";
    const DEFAULT_HISTORY_LIMIT = 50;
    const DEFAULT_STAGES = [
      { threshold: 0, belly: 0.75 },
      { threshold: 10000000, belly: 1.0 },
      { threshold: 50000000, belly: 1.35 },
      { threshold: 250000000, belly: 1.75 },
      { threshold: 1000000000, belly: 2.2 },
    ];
    const DEFAULT_AFFECTION_LEVELS = [
      { threshold: 0, labelKey: "affection0" },
      { threshold: 50, labelKey: "affection1" },
      { threshold: 200, labelKey: "affection2" },
      { threshold: 500, labelKey: "affection3" },
      { threshold: 1000, labelKey: "affection4" },
    ];
    const DAILY_USAGE_KEY = "dsh-plugin-whalefeed:daily:v1";

    const num = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

    const fmt = (n) => {
      if (!Number.isFinite(n) || n <= 0) return "0";
      if (n < 1000) return String(Math.floor(n));
      if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + "k";
      return (n / 1000000).toFixed(2) + "M";
    };

    const clamp = (v, min, max, fallback) =>
      typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

    const normalizePosition = (position) => {
      const set = new Set(["bottom-right", "bottom-left", "top-right", "top-left"]);
      if (typeof position === "string" && set.has(position)) return position;
      if (
        position !== null &&
        typeof position === "object" &&
        Number.isFinite(position.x) &&
        Number.isFinite(position.y)
      ) {
        return { x: Math.round(position.x), y: Math.round(position.y) };
      }
      return "bottom-right";
    };

    const normalizeStages = (stages) => {
      if (!Array.isArray(stages) || stages.length === 0) {
        return DEFAULT_STAGES.map((s) => ({ ...s }));
      }
      const out = [];
      for (const raw of stages) {
        if (raw === null || typeof raw !== "object") continue;
        const threshold = Number.isFinite(raw.threshold) && raw.threshold >= 0 ? Math.floor(raw.threshold) : null;
        if (threshold === null) continue;
        const belly = Number.isFinite(raw.belly) && raw.belly > 0 ? raw.belly : 1;
        const label = typeof raw.label === "string" && raw.label.length > 0 ? raw.label : undefined;
        out.push({ threshold, belly, label });
      }
      if (out.length === 0) return DEFAULT_STAGES.map((s) => ({ ...s }));
      out.sort((a, b) => a.threshold - b.threshold);
      if (out[0].threshold !== 0) out.unshift({ threshold: 0, belly: 0.75, label: undefined });
      return out;
    };

    const normalizeConfig = (config) => {
      const cfg = config !== null && typeof config === "object" ? config : {};
      return {
        position: normalizePosition(cfg.position),
        size: clamp(cfg.size, 32, 320, 144),
        opacity: clamp(cfg.opacity, 0.2, 1, 0.92),
        showTokenBadge: cfg.showTokenBadge !== false,
        showStageName: cfg.showStageName !== false,
        catchUpOnFirstSeen: cfg.catchUpOnFirstSeen !== false,
        feedRatio: clamp(cfg.feedRatio, 0.000001, 1000000, 1),
        resetOnNewSession: cfg.resetOnNewSession === true,
        draggable: cfg.draggable !== false,
        hostPersistence: cfg.hostPersistence !== false,
        historyLimit:
          Number.isInteger(cfg.historyLimit) && cfg.historyLimit > 0 ? cfg.historyLimit : DEFAULT_HISTORY_LIMIT,
        visual: cfg.visual === "svg" || cfg.visual === "custom" || cfg.visual === "auto" ? cfg.visual : "auto",
        affectionEnabled: cfg.affectionEnabled !== false,
        petCooldownMs: clamp(cfg.petCooldownMs, 0, 600000, 3000),
        healthReminders: cfg.healthReminders !== false,
        spikeThreshold: clamp(cfg.spikeThreshold, 0, Number.MAX_SAFE_INTEGER, 10000000),
        sessionBudget: clamp(cfg.sessionBudget, 0, Number.MAX_SAFE_INTEGER, 500000000),
        dailyBudget: clamp(cfg.dailyBudget, 0, Number.MAX_SAFE_INTEGER, 1000000000),
        warningCooldownMs: clamp(cfg.warningCooldownMs, 0, 86400000, 60000),
        stages: normalizeStages(cfg.stages),
      };
    };

    const computeStage = (fedTokens, stages) => {
      const list = Array.isArray(stages) && stages.length > 0 ? stages : DEFAULT_STAGES;
      let stage = 0;
      for (let i = 0; i < list.length; i++) {
        if (fedTokens >= list[i].threshold) stage = i;
        else break;
      }
      return stage;
    };

    const stageProgress = (fedTokens, stages) => {
      const list = Array.isArray(stages) && stages.length > 0 ? stages : DEFAULT_STAGES;
      const stage = computeStage(fedTokens, list);
      const current = list[stage];
      const next = list[stage + 1];
      if (!next || next.threshold <= current.threshold) {
        return { stage, progress: 1, current, next: null };
      }
      const progress = Math.min(1, Math.max(0, (fedTokens - current.threshold) / (next.threshold - current.threshold)));
      return { stage, progress, current, next };
    };

    const bellyScale = (fedTokens, stages) => {
      const { progress, current, next } = stageProgress(fedTokens, stages);
      const from = current && Number.isFinite(current.belly) ? current.belly : 1;
      if (!next) {
        const overflow = Math.max(0, fedTokens - (current ? current.threshold : 0));
        const extra =
          current && current.threshold > 0
            ? Math.min(0.5, (overflow / current.threshold) * 0.5)
            : Math.min(0.5, (overflow / 100000) * 0.5);
        return from + extra;
      }
      const to = Number.isFinite(next.belly) ? next.belly : from + 0.3;
      return from + (to - from) * progress;
    };

    const stageLabel = (stage, stages, t) => {
      const list = Array.isArray(stages) && stages.length > 0 ? stages : DEFAULT_STAGES;
      const s = list[stage];
      if (s && typeof s.label === "string" && s.label.length > 0) return s.label;
      const localized = t("stage" + stage);
      return localized || (s && s.label) || String(stage + 1);
    };

    const initialState = (sessionId) => ({
      version: 1,
      sessionId: typeof sessionId === "string" && sessionId.length > 0 ? sessionId : "default",
      fedTokens: 0,
      lastTotalTokens: 0,
      stage: 0,
      mood: "idle",
      lastFedAt: 0,
      feedEvents: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [],
      pos: undefined,
      affection: 0,
      petCount: 0,
      lastPetAt: 0,
      health: { spikeWarnedAt: 0, sessionBudgetWarned: false },
    });

    const isValidPos = (pos) =>
      pos !== null && typeof pos === "object" && Number.isFinite(pos.x) && Number.isFinite(pos.y);

    const storageKey = (sessionId) => STORAGE_PREFIX + encodeURIComponent(String(sessionId || "default"));

    const normalizeHistory = (history, limit) => {
      if (!Array.isArray(history)) return [];
      const cap = Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_HISTORY_LIMIT;
      return history
        .filter((h) => h !== null && typeof h === "object" && Number.isFinite(h.delta))
        .slice(-cap)
        .map((h) => ({
          at: num(h.at),
          delta: h.delta,
          total: Number.isFinite(h.total) ? h.total : 0,
        }));
    };

    const parseStoredState = (raw, sessionId) => {
      if (typeof raw !== "string" || raw.length === 0) {
        return { state: initialState(sessionId), exists: false };
      }
      try {
        const obj = JSON.parse(raw);
        if (obj === null || typeof obj !== "object" || obj.version !== 1) {
          return { state: initialState(sessionId), exists: false };
        }
        const sid = typeof obj.sessionId === "string" && obj.sessionId.length > 0 ? obj.sessionId : sessionId;
        if (sid !== sessionId) return { state: initialState(sessionId), exists: false };
        const fed = num(obj.fedTokens);
        return {
          state: {
            version: 1,
            sessionId,
            fedTokens: fed,
            lastTotalTokens: num(obj.lastTotalTokens),
            stage: Number.isInteger(obj.stage) && obj.stage >= 0 ? obj.stage : computeStage(fed, DEFAULT_STAGES),
            mood: typeof obj.mood === "string" ? obj.mood : "idle",
            lastFedAt: num(obj.lastFedAt),
            feedEvents: num(obj.feedEvents),
            createdAt: num(obj.createdAt) || Date.now(),
            updatedAt: num(obj.updatedAt) || num(obj.createdAt) || Date.now(),
            history: normalizeHistory(obj.history, DEFAULT_HISTORY_LIMIT),
            pos: isValidPos(obj.pos) ? { x: obj.pos.x, y: obj.pos.y } : undefined,
            affection: num(obj.affection),
            petCount: num(obj.petCount),
            lastPetAt: num(obj.lastPetAt),
            health: {
              spikeWarnedAt: num(obj.health && obj.health.spikeWarnedAt),
              sessionBudgetWarned: !!(obj.health && obj.health.sessionBudgetWarned === true),
            },
          },
          exists: true,
        };
      } catch {
        // Corrupted data: keep a backup before falling back to a fresh state.
        try {
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(storageKey(sessionId) + STORAGE_BAK_SUFFIX, raw);
          }
        } catch {
          /* best effort */
        }
        return { state: initialState(sessionId), exists: false };
      }
    };

    const serializeState = (state) => JSON.stringify(state);

    const safeReadState = (key, sessionId) => {
      try {
        if (typeof localStorage === "undefined") return { state: initialState(sessionId), exists: false };
        const raw = localStorage.getItem(key);
        return parseStoredState(raw, sessionId);
      } catch {
        return { state: initialState(sessionId), exists: false };
      }
    };

    const safeWriteState = (key, state) => {
      try {
        if (typeof localStorage === "undefined") return false;
        localStorage.setItem(key, serializeState(state));
        return true;
      } catch {
        return false;
      }
    };

    const projectionTotal = (projection) => {
      if (projection === null || typeof projection !== "object") return 0;
      return (
        num(projection.uncachedInputTokens) +
        num(projection.cacheReadTokens) +
        num(projection.cacheWriteTokens) +
        num(projection.outputTokens)
      );
    };

    const extractSessionId = (props, snapshot) => {
      const p = props !== null && typeof props === "object" ? props : {};
      if (typeof p.sessionId === "string" && p.sessionId.length > 0) return p.sessionId;
      const s = snapshot !== null && typeof snapshot === "object" ? snapshot : {};
      const candidates = [
        s.sessionId,
        s.id,
        s.session && s.session.id,
        s.chat && s.chat.sessionId,
        s.chat && s.chat.session && s.chat.session.id,
        s.meta && s.meta.sessionId,
      ];
      for (const c of candidates) {
        if (typeof c === "string" && c.length > 0) return c;
      }
      return "default";
    };

    const applyTokenDelta = (state, delta, config) => {
      const options = normalizeConfig(config);
      const rawDelta = Number.isFinite(delta) && delta > 0 ? delta : 0;
      const foodDelta = rawDelta * options.feedRatio;
      const base = state !== null && typeof state === "object" ? state : initialState("default");
      const fed = num(base.fedTokens) + foodDelta;
      const nextStage = computeStage(fed, options.stages);
      const stageUp = nextStage > num(base.stage);
      const now = Date.now();
      const history = normalizeHistory(base.history, options.historyLimit);
      if (rawDelta > 0) {
        history.push({ at: now, delta: rawDelta, total: fed });
      }
      const next = {
        version: 1,
        sessionId: typeof base.sessionId === "string" && base.sessionId.length > 0 ? base.sessionId : "default",
        fedTokens: fed,
        lastTotalTokens: num(base.lastTotalTokens) + rawDelta,
        stage: nextStage,
        mood: stageUp ? "happy" : "eating",
        lastFedAt: now,
        feedEvents: num(base.feedEvents) + (rawDelta > 0 ? 1 : 0),
        createdAt: num(base.createdAt) || now,
        updatedAt: now,
        history,
        pos: isValidPos(base.pos) ? { x: base.pos.x, y: base.pos.y } : undefined,
        affection: num(base.affection),
        petCount: num(base.petCount),
        lastPetAt: num(base.lastPetAt),
        health: {
          spikeWarnedAt: num(base.health && base.health.spikeWarnedAt),
          sessionBudgetWarned: !!(base.health && base.health.sessionBudgetWarned === true),
        },
      };
      return { state: next, stageUp, delta: rawDelta, foodDelta };
    };

    const formatRelativeTime = (ts, t, now) => {
      if (!ts) return t("neverFed");
      const diff = Math.max(0, (now || Date.now()) - ts);
      if (diff < 60000) return t("justNow");
      if (diff < 3600000) return t("minutesAgo").replace("{n}", String(Math.floor(diff / 60000)));
      if (diff < 86400000) return t("hoursAgo").replace("{n}", String(Math.floor(diff / 3600000)));
      return t("daysAgo").replace("{n}", String(Math.floor(diff / 86400000)));
    };

    const affectionLevel = (affection) => {
      let level = 0;
      for (let i = 0; i < DEFAULT_AFFECTION_LEVELS.length; i++) {
        if (affection >= DEFAULT_AFFECTION_LEVELS[i].threshold) level = i;
        else break;
      }
      return level;
    };

    const affectionInfo = (affection) => {
      const list = DEFAULT_AFFECTION_LEVELS;
      const level = affectionLevel(affection);
      const current = list[level];
      const next = list[level + 1] || null;
      return {
        level,
        current,
        next,
        need: next ? Math.max(0, next.threshold - affection) : 0,
        progress: next
          ? Math.min(1, Math.max(0, (affection - current.threshold) / (next.threshold - current.threshold)))
          : 1,
      };
    };

    const affectionLabel = (affection, t) => {
      const info = affectionInfo(affection);
      const key = info.current.labelKey;
      return t(key) || String(info.level + 1);
    };

    const todayKey = () => {
      try {
        return new Date().toISOString().slice(0, 10);
      } catch {
        return "1970-01-01";
      }
    };

    const readDailyUsage = () => {
      try {
        if (typeof localStorage === "undefined") return { date: todayKey(), tokens: 0, budgetWarned: false };
        const raw = localStorage.getItem(DAILY_USAGE_KEY);
        if (raw) {
          const obj = JSON.parse(raw);
          if (obj && obj.date === todayKey() && Number.isFinite(obj.tokens)) {
            return { date: obj.date, tokens: obj.tokens, budgetWarned: obj.budgetWarned === true };
          }
        }
      } catch {
        /* fall through */
      }
      return { date: todayKey(), tokens: 0, budgetWarned: false };
    };

    const writeDailyUsage = (data) => {
      try {
        if (typeof localStorage === "undefined") return;
        localStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(data));
      } catch {
        /* best effort */
      }
    };

    const addDailyUsage = (delta) => {
      const data = readDailyUsage();
      data.tokens += Number.isFinite(delta) && delta > 0 ? delta : 0;
      writeDailyUsage(data);
      return data;
    };

    const collectHealthWarnings = ({ delta, totalTokens, state, daily, options }) => {
      const warnings = [];
      if (!options.healthReminders) return warnings;
      const health = state && state.health ? state.health : { spikeWarnedAt: 0, sessionBudgetWarned: false };
      const now = Date.now();
      if (
        options.spikeThreshold > 0 &&
        delta >= options.spikeThreshold &&
        now - num(health.spikeWarnedAt) >= options.warningCooldownMs
      ) {
        warnings.push({ type: "spike", key: "spikeWarning" });
      }
      if (options.sessionBudget > 0 && totalTokens >= options.sessionBudget && !health.sessionBudgetWarned) {
        warnings.push({ type: "session", key: "sessionBudgetWarning" });
      }
      if (options.dailyBudget > 0 && daily.tokens >= options.dailyBudget && !daily.budgetWarned) {
        warnings.push({ type: "daily", key: "dailyBudgetWarning" });
      }
      return warnings;
    };

    const applyHealthWarnings = (state, warnings, now) => {
      const health = {
        spikeWarnedAt: num(state.health && state.health.spikeWarnedAt),
        sessionBudgetWarned: !!(state.health && state.health.sessionBudgetWarned === true),
      };
      let daily = null;
      for (const w of warnings) {
        if (w.type === "spike") health.spikeWarnedAt = now;
        if (w.type === "session") health.sessionBudgetWarned = true;
        if (w.type === "daily") {
          daily = readDailyUsage();
          daily.budgetWarned = true;
          writeDailyUsage(daily);
        }
      }
      return { state: { ...state, health, updatedAt: now }, daily };
    };

    const positionStyle = (position, _size) => {
      if (position !== null && typeof position === "object") {
        return { left: position.x, top: position.y };
      }
      const map = {
        "bottom-right": { right: 16, bottom: 16 },
        "bottom-left": { left: 16, bottom: 16 },
        "top-right": { right: 16, top: 16 },
        "top-left": { left: 16, top: 16 },
      };
      return map[position] || map["bottom-right"];
    };

    const buildGalleryFromMap = (map) => {
      if (map === null || typeof map !== "object") return [];
      return Object.keys(map)
        .map((sessionId) => {
          const s = map[sessionId];
          if (s === null || typeof s !== "object") return null;
          return {
            sessionId,
            fedTokens: num(s.fedTokens),
            totalTokens: num(s.lastTotalTokens),
            stage: Number.isInteger(s.stage) && s.stage >= 0 ? s.stage : computeStage(num(s.fedTokens), DEFAULT_STAGES),
            updatedAt: num(s.updatedAt) || num(s.createdAt) || 0,
            mood: typeof s.mood === "string" ? s.mood : "idle",
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    };

    const sparklinePoints = (history, width, height) => {
      const list = Array.isArray(history) ? history.slice(-30) : [];
      if (list.length === 0) return "";
      const max = Math.max(1, ...list.map((h) => (Number.isFinite(h.delta) ? h.delta : 0)));
      const denom = Math.max(1, list.length - 1);
      return list
        .map((h, i) => {
          const x = (i / denom) * width;
          const y = height - (Math.max(0, h.delta) / max) * (height - 4) - 2;
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    };

    // ── SVG whale girl ──────────────────────────────────────────────────
    function WhaleSvg({ belly, mood, stage }) {
      const uid = safeUseId().replace(/[^a-zA-Z0-9_-]/g, "");
      const bodyGrad = "dsh-wf-body-" + uid;
      const bellyGrad = "dsh-wf-belly-" + uid;
      const b = Math.max(0.6, Math.min(3, belly));
      const line = "var(--dsh-wf-line)";
      const body = "var(--dsh-wf-body)";
      const bodyDark = "var(--dsh-wf-body-dark)";
      const bellyFill = "var(--dsh-wf-belly)";
      const accent = "var(--dsh-wf-accent)";

      const eyes = [];
      const mouth = [];
      if (mood === "eating") {
        eyes.push(
          React.createElement("path", {
            key: "e1",
            d: "M135,78 Q142,70 149,78",
            fill: "none",
            stroke: line,
            strokeWidth: 3.5,
            strokeLinecap: "round",
          }),
          React.createElement("path", {
            key: "e2",
            d: "M165,78 Q172,70 179,78",
            fill: "none",
            stroke: line,
            strokeWidth: 3.5,
            strokeLinecap: "round",
          }),
        );
        mouth.push(
          React.createElement("ellipse", {
            key: "m",
            cx: 157,
            cy: 96,
            rx: 7,
            ry: 10,
            fill: "#8a4b5a",
            stroke: line,
            strokeWidth: 2,
          }),
        );
      } else if (mood === "happy" || mood === "excited") {
        eyes.push(
          React.createElement("path", {
            key: "e1",
            d: "M134,78 Q141,68 148,78",
            fill: "none",
            stroke: line,
            strokeWidth: 3.5,
            strokeLinecap: "round",
          }),
          React.createElement("path", {
            key: "e2",
            d: "M164,78 Q171,68 178,78",
            fill: "none",
            stroke: line,
            strokeWidth: 3.5,
            strokeLinecap: "round",
          }),
        );
        mouth.push(
          React.createElement("path", {
            key: "m",
            d: "M146,98 Q157,112 168,98",
            fill: "none",
            stroke: line,
            strokeWidth: 3.5,
            strokeLinecap: "round",
          }),
        );
      } else if (mood === "full") {
        eyes.push(
          React.createElement("circle", { key: "e1", cx: 141, cy: 78, r: 4, fill: line }),
          React.createElement("circle", { key: "e2", cx: 171, cy: 78, r: 4, fill: line }),
        );
        mouth.push(React.createElement("ellipse", { key: "m", cx: 157, cy: 98, rx: 4, ry: 6, fill: line }));
      } else if (mood === "sleepy") {
        eyes.push(
          React.createElement("path", {
            key: "e1",
            d: "M134,78 Q141,84 148,78",
            fill: "none",
            stroke: line,
            strokeWidth: 3,
            strokeLinecap: "round",
          }),
          React.createElement("path", {
            key: "e2",
            d: "M164,78 Q171,84 178,78",
            fill: "none",
            stroke: line,
            strokeWidth: 3,
            strokeLinecap: "round",
          }),
        );
        mouth.push(React.createElement("ellipse", { key: "m", cx: 157, cy: 98, rx: 3, ry: 4, fill: line }));
      } else if (mood === "shy") {
        eyes.push(
          React.createElement("circle", { key: "e1", cx: 141, cy: 78, r: 5, fill: line }),
          React.createElement("circle", { key: "e2", cx: 171, cy: 78, r: 5, fill: line }),
          React.createElement("circle", { key: "h1", cx: 143, cy: 76, r: 1.8, fill: "#fff" }),
          React.createElement("circle", { key: "h2", cx: 173, cy: 76, r: 1.8, fill: "#fff" }),
        );
        mouth.push(
          React.createElement("path", {
            key: "m",
            d: "M152,100 Q157,104 162,100",
            fill: "none",
            stroke: line,
            strokeWidth: 3,
            strokeLinecap: "round",
          }),
        );
      } else if (mood === "thinking") {
        eyes.push(
          React.createElement("circle", { key: "e1", cx: 141, cy: 78, r: 4, fill: line }),
          React.createElement("circle", { key: "e2", cx: 171, cy: 78, r: 4, fill: line }),
        );
        mouth.push(
          React.createElement("path", {
            key: "m",
            d: "M150,100 Q157,104 164,100",
            fill: "none",
            stroke: line,
            strokeWidth: 2.5,
            strokeLinecap: "round",
          }),
        );
      } else {
        eyes.push(
          React.createElement("circle", { key: "e1", cx: 141, cy: 78, r: 5, fill: line }),
          React.createElement("circle", { key: "e2", cx: 171, cy: 78, r: 5, fill: line }),
          React.createElement("circle", { key: "h1", cx: 143, cy: 76, r: 1.8, fill: "#fff" }),
          React.createElement("circle", { key: "h2", cx: 173, cy: 76, r: 1.8, fill: "#fff" }),
        );
        mouth.push(
          React.createElement("path", {
            key: "m",
            d: "M149,98 Q157,106 165,98",
            fill: "none",
            stroke: line,
            strokeWidth: 3,
            strokeLinecap: "round",
          }),
        );
      }

      const blush = [
        React.createElement("ellipse", {
          key: "b1",
          cx: 130,
          cy: 88,
          rx: 8,
          ry: 5,
          fill: accent,
          opacity: mood === "shy" ? 0.9 : 0.55,
        }),
        React.createElement("ellipse", {
          key: "b2",
          cx: 182,
          cy: 88,
          rx: 8,
          ry: 5,
          fill: accent,
          opacity: mood === "shy" ? 0.9 : 0.55,
        }),
      ];

      const accessories = [];
      if (stage >= 1) {
        accessories.push(
          React.createElement("path", {
            key: "bow",
            d: "M108,48 Q120,38 132,48 Q120,52 108,48 Z",
            fill: accent,
            stroke: line,
            strokeWidth: 2,
          }),
          React.createElement("circle", {
            key: "bowc",
            cx: 120,
            cy: 48,
            r: 4,
            fill: "#fff",
            stroke: line,
            strokeWidth: 1.5,
          }),
        );
      }
      if (stage >= 2) {
        accessories.push(
          React.createElement("circle", {
            key: "pearl1",
            cx: 102,
            cy: 58,
            r: 3.5,
            fill: "#fff",
            stroke: line,
            strokeWidth: 1.5,
          }),
          React.createElement("circle", {
            key: "pearl2",
            cx: 138,
            cy: 58,
            r: 3.5,
            fill: "#fff",
            stroke: line,
            strokeWidth: 1.5,
          }),
        );
      }
      if (stage >= 3) {
        accessories.push(
          React.createElement("path", {
            key: "crown",
            d: "M104,40 L108,26 L116,34 L124,24 L132,34 L140,26 L144,40 Z",
            fill: "#ffd76e",
            stroke: line,
            strokeWidth: 2,
            strokeLinejoin: "round",
          }),
        );
      }
      if (stage >= 4) {
        accessories.push(
          React.createElement("path", {
            key: "aura",
            d: "M80,100 Q60,70 80,40",
            fill: "none",
            stroke: accent,
            strokeWidth: 3,
            opacity: 0.5,
          }),
          React.createElement("path", {
            key: "aura2",
            d: "M150,100 Q172,70 150,40",
            fill: "none",
            stroke: accent,
            strokeWidth: 3,
            opacity: 0.5,
          }),
        );
      }

      return React.createElement(
        "svg",
        { viewBox: "0 0 220 200", role: "img", "aria-label": "whale girl" },
        React.createElement(
          "defs",
          null,
          React.createElement(
            "radialGradient",
            { id: bodyGrad, cx: "40%", cy: "30%", r: "80%" },
            React.createElement("stop", { offset: "0%", stopColor: body }),
            React.createElement("stop", { offset: "100%", stopColor: bodyDark }),
          ),
          React.createElement(
            "radialGradient",
            { id: bellyGrad, cx: "40%", cy: "35%", r: "75%" },
            React.createElement("stop", { offset: "0%", stopColor: bellyFill }),
            React.createElement("stop", { offset: "100%", stopColor: "#e8a8bc" }),
          ),
        ),
        React.createElement("path", {
          d: "M48,120 Q12,108 4,70 Q22,104 48,104 Z",
          fill: body,
          stroke: line,
          strokeWidth: 3,
          strokeLinejoin: "round",
        }),
        React.createElement("path", {
          d: "M20,102 Q14,112 8,108",
          fill: "none",
          stroke: line,
          strokeWidth: 2,
          strokeLinecap: "round",
          opacity: 0.6,
        }),
        React.createElement("ellipse", {
          cx: 118,
          cy: 118,
          rx: 68 + b * 6,
          ry: 58 + b * 8,
          fill: "url(#" + bodyGrad + ")",
          stroke: line,
          strokeWidth: 3,
        }),
        React.createElement("ellipse", {
          cx: 122,
          cy: 142,
          rx: 42 * b,
          ry: 40 * b,
          fill: "url(#" + bellyGrad + ")",
          stroke: line,
          strokeWidth: 2.5,
        }),
        React.createElement("path", {
          d: "M92,138 Q122,168 152,138",
          fill: "none",
          stroke: "#fff",
          strokeWidth: 2,
          strokeLinecap: "round",
          opacity: 0.45,
        }),
        React.createElement("ellipse", {
          cx: 74,
          cy: 152,
          rx: 16,
          ry: 9,
          fill: body,
          stroke: line,
          strokeWidth: 2.5,
          transform: "rotate(24 74 152)",
        }),
        React.createElement("ellipse", {
          cx: 166,
          cy: 148,
          rx: 16,
          ry: 9,
          fill: body,
          stroke: line,
          strokeWidth: 2.5,
          transform: "rotate(-24 166 148)",
        }),
        ...eyes,
        ...blush,
        ...mouth,
        ...accessories,
        mood === "sleepy"
          ? React.createElement("text", { x: 188, y: 58, fontSize: 14, fill: line, fontWeight: "bold" }, "Z")
          : null,
        mood === "eating"
          ? React.createElement("path", {
              d: "M176,94 L190,90 L178,102 Z",
              fill: accent,
              stroke: line,
              strokeWidth: 1.5,
            })
          : null,
        mood === "thinking" ? React.createElement("text", { x: 186, y: 48, fontSize: 12, fill: line }, "?") : null,
      );
    }

    // ── async host persistence helpers ──────────────────────────────────
    async function fetchHostState(sessionId) {
      const res = await fetch("/dsh-whalefeed-state?session=" + encodeURIComponent(sessionId), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.ok === true ? data.state || null : null;
    }

    async function pushHostState(sessionId, state) {
      const res = await fetch("/dsh-whalefeed-state?session=" + encodeURIComponent(sessionId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data && data.ok === true;
    }

    async function fetchAllHostStates() {
      const res = await fetch("/dsh-whalefeed-states", { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.ok === true ? data.states || {} : null;
    }

    // ── plugin component ────────────────────────────────────────────────
    function WhaleFeed(props) {
      const { options, t, variant = "floating" } = props;
      const [state, setState] = useState(() => initialState("default"));
      const [showInfo, setShowInfo] = useState(false);
      const [showSettings, setShowSettings] = useState(false);
      const [showGallery, setShowGallery] = useState(false);
      const [gallery, setGallery] = useState([]);
      const [importOpen, setImportOpen] = useState(false);
      const [importDraft, setImportDraft] = useState("");
      const [bubble, setBubble] = useState(null);
      const [mood, setMood] = useState("idle");
      const [drag, setDrag] = useState(null);
      const [dragPos, setDragPos] = useState(null);
      const [hostReady, setHostReady] = useState(false);
      const [customImageFailed, setCustomImageFailed] = useState(false);
      const [confirmReset, setConfirmReset] = useState(false);
      const stateRef = useRef(state);
      stateRef.current = state;
      const sessionIdRef = useRef("default");
      const initializedRef = useRef(false);
      const lastTotalRef = useRef(0);
      const bubbleTimerRef = useRef(null);
      const clickTimerRef = useRef(null);
      const dragRef = useRef(null);
      dragRef.current = drag;
      const broadcastRef = useRef(null);

      const projection = props.useProjection("tokenUsage");
      const totalTokens = projectionTotal(projection);

      const sessionIdFromSnapshot = props.useSession(
        (s) => extractSessionId(props, s),
        (a, b) => a === b,
      );
      const sessionId =
        typeof props.sessionId === "string" && props.sessionId.length > 0 ? props.sessionId : sessionIdFromSnapshot;

      const persistState = useCallback(
        (nextState) => {
          const currentKey = storageKey(sessionId);
          safeWriteState(currentKey, nextState);
          if (options.hostPersistence && typeof fetch !== "undefined") {
            pushHostState(sessionId, nextState).catch(() => {});
          }
          if (broadcastRef.current && typeof broadcastRef.current.postMessage === "function") {
            try {
              broadcastRef.current.postMessage({ sessionId, state: nextState });
            } catch {
              /* best effort */
            }
          }
        },
        [sessionId, options.hostPersistence],
      );

      // Switch sessions: load local state, then try host state.
      useEffect(() => {
        if (sessionIdRef.current === sessionId) return;
        sessionIdRef.current = sessionId;
        initializedRef.current = false;
        const stored = safeReadState(storageKey(sessionId), sessionId);
        setState(stored.state);
        lastTotalRef.current = stored.exists ? stored.state.lastTotalTokens : 0;
        setMood("idle");
        setBubble(null);
        setShowInfo(false);
        setShowSettings(false);
        setShowGallery(false);
        setCustomImageFailed(false);
        setConfirmReset(false);
        setImportOpen(false);
        setImportDraft("");

        if (options.hostPersistence && typeof fetch !== "undefined") {
          fetchHostState(sessionId)
            .then((remote) => {
              if (!remote || typeof remote !== "object") return;
              const local = safeReadState(storageKey(sessionId), sessionId);
              const remoteTime = num(remote.updatedAt) || num(remote.createdAt) || 0;
              const localTime = local.exists ? num(local.state.updatedAt) || num(local.state.createdAt) || 0 : 0;
              if (!local.exists || remoteTime > localTime) {
                const parsed = parseStoredState(JSON.stringify(remote), sessionId);
                if (parsed.exists) {
                  setState(parsed.state);
                  lastTotalRef.current = parsed.state.lastTotalTokens;
                  initializedRef.current = true;
                  setHostReady(true);
                }
              } else if (local.exists) {
                setHostReady(true);
              }
            })
            .catch(() => {});
        }
      }, [sessionId, options.hostPersistence]);

      // Core feeding effect: initialize/catch up, then feed on token growth.
      useEffect(() => {
        if (!sessionId) return;
        const currentKey = storageKey(sessionId);
        if (!initializedRef.current) {
          initializedRef.current = true;
          const stored = safeReadState(currentKey, sessionId);
          setState(stored.state);
          lastTotalRef.current = stored.exists ? stored.state.lastTotalTokens : 0;

          if (!stored.exists && totalTokens > 0) {
            if (options.catchUpOnFirstSeen && !options.resetOnNewSession) {
              const { state: next } = applyTokenDelta(stored.state, totalTokens, options);
              next.lastTotalTokens = totalTokens;
              setState(next);
              persistState(next);
              lastTotalRef.current = totalTokens;
              setMood("eating");
              setBubble(t("welcome").replace("{n}", fmt(totalTokens)));
            } else {
              const next = { ...stored.state, lastTotalTokens: totalTokens, updatedAt: Date.now() };
              setState(next);
              persistState(next);
              lastTotalRef.current = totalTokens;
            }
          } else if (stored.exists && totalTokens < stored.state.lastTotalTokens) {
            const next = { ...stored.state, lastTotalTokens: totalTokens, updatedAt: Date.now() };
            setState(next);
            persistState(next);
            lastTotalRef.current = totalTokens;
          } else if (stored.exists) {
            // Ensure host has the local state when host is ready.
            if (options.hostPersistence && typeof fetch !== "undefined" && hostReady) {
              pushHostState(sessionId, stored.state).catch(() => {});
            }
          }
          return;
        }

        const delta = totalTokens - lastTotalRef.current;
        if (delta <= 0) {
          if (delta < 0) lastTotalRef.current = totalTokens;
          return;
        }
        const { state: next, stageUp } = applyTokenDelta(stateRef.current, delta, options);
        next.lastTotalTokens = totalTokens;
        const daily = addDailyUsage(delta);
        const warnings = collectHealthWarnings({ delta, totalTokens, state: next, daily, options });
        const healthResult =
          warnings.length > 0 ? applyHealthWarnings(next, warnings, Date.now()) : { state: next, daily: null };
        const finalState = healthResult.state;
        setState(finalState);
        persistState(finalState);
        lastTotalRef.current = totalTokens;
        let bubbleText;
        if (warnings.length > 0) {
          const warnText = warnings.map((w) => t(w.key)).join(" · ");
          bubbleText = stageUp
            ? t("stageUp").replace("{label}", stageLabel(finalState.stage, options.stages, t)) + " · " + warnText
            : warnText;
        } else {
          bubbleText = stageUp
            ? t("stageUp").replace("{label}", stageLabel(finalState.stage, options.stages, t))
            : t("eating").replace("{n}", fmt(delta));
        }
        setMood(stageUp ? "excited" : warnings.length > 0 ? "thinking" : "eating");
        setBubble(bubbleText);
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(
          () => {
            setBubble(null);
            setMood("idle");
          },
          stageUp ? 3200 : warnings.length > 0 ? 3000 : 2200,
        );
      }, [totalTokens, sessionId, options, t, persistState, hostReady]);

      // When the host becomes ready, make sure the latest local state is pushed.
      useEffect(() => {
        if (hostReady && options.hostPersistence && typeof fetch !== "undefined") {
          pushHostState(sessionId, stateRef.current).catch(() => {});
        }
      }, [hostReady, sessionId, options.hostPersistence]);

      // Cleanup timers.
      useEffect(
        () => () => {
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        },
        [],
      );

      // Multi-tab sync: BroadcastChannel first, storage event fallback.
      useEffect(() => {
        if (typeof window === "undefined") return;
        let channel = null;
        try {
          if (typeof BroadcastChannel !== "undefined") {
            channel = new BroadcastChannel(BROADCAST_CHANNEL);
            broadcastRef.current = channel;
            channel.addEventListener("message", (e) => {
              const data = e.data;
              if (!data || data.sessionId !== sessionId || !data.state) return;
              const parsed = parseStoredState(JSON.stringify(data.state), sessionId);
              if (parsed.exists) {
                const incoming = num(data.state.updatedAt) || 0;
                const current = num(stateRef.current.updatedAt) || 0;
                if (incoming >= current) {
                  setState(parsed.state);
                  lastTotalRef.current = parsed.state.lastTotalTokens;
                }
              }
            });
          }
        } catch {
          channel = null;
        }

        const onStorage = (e) => {
          if (e.key === storageKey(sessionId) && e.newValue) {
            const parsed = parseStoredState(e.newValue, sessionId);
            if (parsed.exists) {
              const incoming = num(parsed.state.updatedAt) || 0;
              const current = num(stateRef.current.updatedAt) || 0;
              if (incoming >= current) {
                setState(parsed.state);
                lastTotalRef.current = parsed.state.lastTotalTokens;
              }
            }
          }
        };
        window.addEventListener("storage", onStorage);
        return () => {
          window.removeEventListener("storage", onStorage);
          if (channel) {
            try {
              channel.close();
            } catch {
              /* best effort */
            }
            broadcastRef.current = null;
          }
        };
      }, [sessionId]);

      // Gallery loading.
      const loadGallery = useCallback(() => {
        const collectLocal = () => {
          const out = {};
          if (typeof localStorage === "undefined") return out;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (typeof key === "string" && key.startsWith(STORAGE_PREFIX) && !key.endsWith(STORAGE_BAK_SUFFIX)) {
              const raw = localStorage.getItem(key);
              const sid = decodeURIComponent(key.slice(STORAGE_PREFIX.length));
              const parsed = parseStoredState(raw, sid);
              if (parsed.exists) out[sid] = parsed.state;
            }
          }
          return out;
        };

        if (options.hostPersistence && typeof fetch !== "undefined") {
          fetchAllHostStates()
            .then((remote) => {
              const local = collectLocal();
              const merged = { ...local, ...(remote || {}) };
              setGallery(buildGalleryFromMap(merged));
            })
            .catch(() => setGallery(buildGalleryFromMap(collectLocal())));
        } else {
          setGallery(buildGalleryFromMap(collectLocal()));
        }
      }, [options.hostPersistence]);

      const stages = options.stages;
      const stage = useMemo(() => computeStage(state.fedTokens, stages), [state.fedTokens, stages]);
      const progress = useMemo(() => stageProgress(state.fedTokens, stages), [state.fedTokens, stages]);
      const belly = useMemo(() => bellyScale(state.fedTokens, stages), [state.fedTokens, stages]);
      const stageName = useMemo(() => stageLabel(stage, stages, t), [stage, stages, t]);
      const affectionName = useMemo(() => affectionLabel(state.affection, t), [state.affection, t]);
      const needNext = progress.next ? Math.max(0, progress.next.threshold - state.fedTokens) : 0;
      const customImageUrl = useMemo(() => {
        if (options.visual === "svg" || customImageFailed) return null;
        if (mood === "eating") return "/dsh-whalefeed-assets/face-eating.png";
        if (mood === "happy" || mood === "excited") return "/dsh-whalefeed-assets/face-happy.png";
        if (mood === "sleepy") return "/dsh-whalefeed-assets/face-sleepy.png";
        return `/dsh-whalefeed-assets/stage-${Math.min(Math.max(stage, 0), 4)}.png`;
      }, [options.visual, customImageFailed, mood, stage]);
      const displayPos = dragPos || state.pos || options.position;
      const posStyle = positionStyle(displayPos, options.size);

      const handlePointerDown = useCallback(
        (e) => {
          if (!options.draggable || variant !== "floating") return;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* optional */
          }
          const rect = e.currentTarget.getBoundingClientRect();
          setDrag({
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            originLeft: rect.left,
            originTop: rect.top,
            moved: false,
          });
        },
        [options.draggable, variant],
      );

      const handlePointerMove = useCallback(
        (e) => {
          const d = dragRef.current;
          if (!d || !d.active) return;
          const dx = e.clientX - d.startX;
          const dy = e.clientY - d.startY;
          const moved = d.moved || Math.abs(dx) + Math.abs(dy) > 4;
          const size = options.size;
          const maxX = Math.max(0, (typeof window !== "undefined" ? window.innerWidth : 0) - size);
          const maxY = Math.max(0, (typeof window !== "undefined" ? window.innerHeight : 0) - size * 0.9);
          const x = Math.min(Math.max(d.originLeft + dx, 0), maxX);
          const y = Math.min(Math.max(d.originTop + dy, 0), maxY);
          setDragPos({ x, y });
          setDrag({ ...d, moved });
        },
        [options.size],
      );

      const handlePointerUp = useCallback(() => {
        const d = dragRef.current;
        if (d && d.active && d.moved && dragPos) {
          const next = { ...stateRef.current, pos: dragPos, updatedAt: Date.now() };
          setState(next);
          persistState(next);
        }
        setDrag(null);
      }, [dragPos, persistState]);

      const handlePet = useCallback(() => {
        if (!options.affectionEnabled) return;
        const now = Date.now();
        const lastPetAt = num(stateRef.current.lastPetAt);
        if (options.petCooldownMs > 0 && now - lastPetAt < options.petCooldownMs) {
          setBubble(t("petCooldown"));
          setMood("shy");
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          bubbleTimerRef.current = setTimeout(() => {
            setBubble(null);
            setMood("idle");
          }, 1800);
          return;
        }
        const next = {
          ...stateRef.current,
          affection: num(stateRef.current.affection) + 1,
          petCount: num(stateRef.current.petCount) + 1,
          lastPetAt: now,
          updatedAt: now,
        };
        setState(next);
        persistState(next);
        setMood("shy");
        setBubble(t("petBubble"));
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => {
          setBubble(null);
          setMood("idle");
        }, 2000);
      }, [options.affectionEnabled, options.petCooldownMs, t, persistState]);

      const handleClick = useCallback(() => {
        if (dragRef.current && dragRef.current.moved) return;
        // Delay single-click so double-click can be interpreted as a headpat
        // instead of toggling the panel twice.
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
          handlePet();
          return;
        }
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          setShowSettings(false);
          setImportOpen(false);
          setShowGallery(false);
          setShowInfo((v) => !v);
        }, 250);
      }, [handlePet]);

      const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShowSettings(false);
          setImportOpen(false);
          setShowGallery(false);
          setShowInfo((v) => !v);
        } else if (e.key === "Escape") {
          setShowSettings(false);
          setImportOpen(false);
          setShowInfo(false);
          setShowGallery(false);
        }
      }, []);

      const handleReset = useCallback(() => {
        // Two-step confirm avoids relying on window.confirm, which can be
        // blocked in embedded/WebView environments.
        if (!confirmReset) {
          setConfirmReset(true);
          setTimeout(() => setConfirmReset(false), 3000);
          return;
        }
        setConfirmReset(false);
        const next = initialState(sessionId);
        next.lastTotalTokens = totalTokens;
        next.createdAt = Date.now();
        next.updatedAt = Date.now();
        setState(next);
        persistState(next);
        lastTotalRef.current = totalTokens;
        setShowInfo(false);
        setBubble(t("resetDone"));
        setMood("idle");
      }, [confirmReset, sessionId, totalTokens, t, persistState]);

      const handleExport = useCallback(() => {
        const json = serializeState(state);
        try {
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "whalefeed-" + sessionId + ".json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setBubble(t("exportDone"));
        } catch {
          if (
            typeof navigator !== "undefined" &&
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === "function"
          ) {
            navigator.clipboard.writeText(json).then(
              () => setBubble(t("exportCopied")),
              () => {},
            );
          }
        }
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => setBubble(null), 2200);
      }, [state, sessionId, t]);

      const handleImportConfirm = useCallback(() => {
        const raw = importDraft.trim();
        if (!raw) return;
        const parsed = parseStoredState(raw, sessionId);
        if (!parsed.exists) {
          setBubble(t("importFailed"));
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          bubbleTimerRef.current = setTimeout(() => setBubble(null), 2200);
          return;
        }
        const next = { ...parsed.state, sessionId, updatedAt: Date.now() };
        setState(next);
        persistState(next);
        lastTotalRef.current = next.lastTotalTokens;
        setImportOpen(false);
        setImportDraft("");
        setBubble(t("importDone"));
        setMood("happy");
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => {
          setBubble(null);
          setMood("idle");
        }, 2200);
      }, [importDraft, sessionId, t, persistState]);

      const toggleGallery = useCallback(() => {
        setShowInfo(false);
        setShowGallery((v) => {
          const next = !v;
          if (next) loadGallery();
          return next;
        });
      }, [loadGallery]);

      const infoPanel = showInfo
        ? React.createElement(
            "div",
            { className: "dsh-wf-info", role: "dialog", "aria-label": t("whale"), onClick: (e) => e.stopPropagation() },
            React.createElement(
              "button",
              { className: "dsh-wf-close", onClick: () => setShowInfo(false), "aria-label": t("close") },
              "×",
            ),
            React.createElement("h4", null, t("whale") + " · " + stageName),
            React.createElement(
              "dl",
              { className: "dsh-wf-stats" },
              React.createElement("dt", null, t("totalTokens")),
              React.createElement("dd", null, fmt(totalTokens)),
              React.createElement("dt", null, t("fedTokens")),
              React.createElement("dd", null, fmt(state.fedTokens)),
              React.createElement("dt", null, t("stage")),
              React.createElement("dd", null, String(stage + 1) + "/" + String(stages.length) + " · " + stageName),
              React.createElement("dt", null, progress.next ? t("nextStage") : t("maxStage")),
              React.createElement("dd", null, progress.next ? fmt(needNext) : "✓"),
              React.createElement("dt", null, t("affection")),
              React.createElement("dd", null, affectionName + " · " + String(state.affection)),
              React.createElement("dt", null, t("petCount")),
              React.createElement("dd", null, String(state.petCount)),
              React.createElement("dt", null, t("feedEvents")),
              React.createElement("dd", null, String(state.feedEvents)),
              React.createElement("dt", null, t("lastFed")),
              React.createElement("dd", null, formatRelativeTime(state.lastFedAt, t, Date.now())),
              React.createElement("dt", null, t("storageMode")),
              React.createElement("dd", null, hostReady ? t("storageHost") : t("storageLocal")),
            ),
            state.history && state.history.length > 1
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement("div", { className: "dsh-wf-history-label" }, t("history")),
                  React.createElement(
                    "svg",
                    { className: "dsh-wf-spark", viewBox: "0 0 100 36", preserveAspectRatio: "none" },
                    React.createElement("polyline", {
                      points: sparklinePoints(state.history, 100, 36),
                      fill: "none",
                      stroke: "var(--dsh-wf-accent)",
                      strokeWidth: 2,
                      vectorEffect: "non-scaling-stroke",
                    }),
                  ),
                )
              : null,
            React.createElement(
              "button",
              {
                className: "dsh-wf-settings-toggle" + (showSettings ? " dsh-wf-settings-open" : ""),
                onClick: () => {
                  setShowSettings((v) => !v);
                  setImportOpen(false);
                },
              },
              "⚙ " + t("settings"),
            ),
            showSettings
              ? React.createElement(
                  "div",
                  { className: "dsh-wf-settings" },
                  React.createElement(
                    "div",
                    { className: "dsh-wf-settings-grid" },
                    React.createElement("button", { className: "dsh-wf-btn", onClick: handleExport }, t("export")),
                    React.createElement(
                      "button",
                      {
                        className: "dsh-wf-btn",
                        onClick: () => {
                          setImportOpen((v) => !v);
                          if (!importOpen) setImportDraft("");
                        },
                      },
                      t("import"),
                    ),
                    React.createElement("button", { className: "dsh-wf-btn", onClick: toggleGallery }, t("gallery")),
                    React.createElement(
                      "button",
                      {
                        className: "dsh-wf-reset" + (confirmReset ? " dsh-wf-reset-confirm" : ""),
                        onClick: handleReset,
                      },
                      confirmReset ? t("resetConfirmShort") : t("reset"),
                    ),
                  ),
                  importOpen
                    ? React.createElement(
                        "div",
                        { className: "dsh-wf-import-box" },
                        React.createElement("textarea", {
                          className: "dsh-wf-import-input",
                          value: importDraft,
                          onChange: (e) => setImportDraft(e.target.value),
                          placeholder: t("importPrompt"),
                          rows: 4,
                        }),
                        React.createElement(
                          "div",
                          { className: "dsh-wf-import-actions" },
                          React.createElement(
                            "button",
                            { className: "dsh-wf-btn dsh-wf-import-confirm", onClick: handleImportConfirm },
                            t("confirmImport"),
                          ),
                          React.createElement(
                            "button",
                            {
                              className: "dsh-wf-btn",
                              onClick: () => {
                                setImportOpen(false);
                                setImportDraft("");
                              },
                            },
                            t("cancel"),
                          ),
                        ),
                      )
                    : null,
                )
              : null,
          )
        : null;

      const galleryPanel = showGallery
        ? React.createElement(
            "div",
            {
              className: "dsh-wf-gallery",
              role: "dialog",
              "aria-label": t("galleryTitle"),
              onClick: (e) => e.stopPropagation(),
            },
            React.createElement(
              "button",
              { className: "dsh-wf-close", onClick: () => setShowGallery(false), "aria-label": t("close") },
              "×",
            ),
            React.createElement("h4", null, t("galleryTitle")),
            React.createElement(
              "div",
              { className: "dsh-wf-gallery-stats" },
              t("globalStats")
                .replace("{n}", String(gallery.length))
                .replace("{tokens}", fmt(gallery.reduce((sum, g) => sum + g.fedTokens, 0))),
            ),
            React.createElement(
              "div",
              { className: "dsh-wf-gallery-list" },
              gallery.length === 0
                ? React.createElement("div", null, t("noGallery"))
                : gallery.map((g) =>
                    React.createElement(
                      "div",
                      { key: g.sessionId, className: "dsh-wf-gallery-item" },
                      React.createElement("strong", null, stageLabel(g.stage, stages, t)),
                      React.createElement("span", null, fmt(g.fedTokens) + " / " + fmt(g.totalTokens)),
                    ),
                  ),
            ),
          )
        : null;

      const children = [
        bubble ? React.createElement("div", { key: "bubble", className: "dsh-wf-bubble" }, bubble) : null,
        variant === "floating"
          ? React.createElement(
              "div",
              { key: "pet", className: "dsh-wf-pet" },
              customImageUrl
                ? React.createElement("img", {
                    key: "custom",
                    className: "dsh-wf-custom-img",
                    src: customImageUrl,
                    alt: stageName,
                    draggable: false,
                    onError: () => setCustomImageFailed(true),
                  })
                : React.createElement(WhaleSvg, { belly, mood, stage }),
            )
          : null,
        options.showStageName && variant === "floating"
          ? React.createElement("div", { key: "stage", className: "dsh-wf-stage-badge" }, stageName)
          : null,
        options.showTokenBadge && !bubble
          ? React.createElement("div", { key: "token", className: "dsh-wf-token-badge" }, fmt(totalTokens))
          : null,
        infoPanel,
        galleryPanel,
      ].filter(Boolean);

      const rootStyle =
        variant === "floating"
          ? Object.assign({}, posStyle, { width: options.size, opacity: options.opacity })
          : { opacity: options.opacity };

      return React.createElement(
        "div",
        {
          className: "dsh-wf-root dsh-wf-" + variant + " dsh-wf-" + mood,
          style: rootStyle,
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onClick: handleClick,
          onKeyDown: handleKeyDown,
          role: "button",
          tabIndex: 0,
          "aria-label": t("whale") + " · " + stageName,
          "aria-expanded": showInfo || showGallery,
          title: t("dragHint") + " · " + t("petHint"),
        },
        ...children,
      );
    }

    // ── plugin registration ─────────────────────────────────────────────
    const inject = ["slots"];

    function apply(ctx, config) {
      const slots = ctx.get("slots");
      if (slots === undefined) return;
      const options = normalizeConfig(config);

      const locale = ctx.get("locale");
      const hasLocale =
        locale !== undefined && typeof locale.register === "function" && typeof locale.bind === "function";
      let boundT = null;
      if (hasLocale) {
        try {
          locale.register(NS, DICTS);
          boundT = locale.bind(NS);
        } catch {
          boundT = null;
        }
      }
      const zhFallback = (key) => (DICTS.zh && DICTS.zh[key]) || key;
      const tLabel = boundT !== null ? boundT : zhFallback;

      const makeRegistration = (name, id, variant) => {
        const registration = {
          name,
          id,
          order: 5,
          label: () => tLabel("whale"),
        };
        if (hasLocale) registration.locale = NS;
        return slots.register(registration, (props) => {
          if (typeof props.useProjection !== "function" || typeof props.useSession !== "function") return null;
          const t = typeof props.t === "function" ? props.t : boundT !== null ? boundT : zhFallback;
          return React.createElement(WhaleFeed, {
            options,
            t,
            variant,
            useProjection: props.useProjection,
            useSession: props.useSession,
            sessionId: typeof props.sessionId === "string" ? props.sessionId : undefined,
          });
        });
      };

      // `shell.overlay` is a root-scope slot and does NOT provide the session
      // standard kit (useSession/useProjection). We therefore render the
      // floating pet from a session-scoped slot and use `position: fixed` CSS
      // to float it over the whole viewport. This is what makes the whale
      // visible in static row plugins.
      try {
        slots.inject("conversation.session.header.utilities", () =>
          makeRegistration("conversation.session.header.utilities", "whale-feed", "floating"),
        );
      } catch {
        try {
          slots.inject("conversation.chat.assistant-actions", () =>
            makeRegistration("conversation.chat.assistant-actions", "whale-feed", "floating"),
          );
        } catch {
          /* no compatible session slot */
        }
      }
    }

    exports.apply = apply;
    exports.inject = inject;
    exports._internals = {
      STORAGE_PREFIX,
      STORAGE_BAK_SUFFIX,
      BROADCAST_CHANNEL,
      DEFAULT_STAGES,
      DEFAULT_HISTORY_LIMIT,
      DEFAULT_AFFECTION_LEVELS,
      DAILY_USAGE_KEY,
      num,
      fmt,
      clamp,
      normalizePosition,
      normalizeStages,
      normalizeConfig,
      computeStage,
      stageProgress,
      bellyScale,
      stageLabel,
      initialState,
      isValidPos,
      storageKey,
      normalizeHistory,
      parseStoredState,
      serializeState,
      safeReadState,
      safeWriteState,
      projectionTotal,
      extractSessionId,
      applyTokenDelta,
      formatRelativeTime,
      positionStyle,
      affectionLevel,
      affectionInfo,
      affectionLabel,
      readDailyUsage,
      writeDailyUsage,
      addDailyUsage,
      collectHealthWarnings,
      applyHealthWarnings,
      buildGalleryFromMap,
      sparklinePoints,
      WhaleSvg,
    };
    return module.exports;
  },
});
