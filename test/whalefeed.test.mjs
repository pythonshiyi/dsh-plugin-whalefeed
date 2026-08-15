import test from "node:test";
import assert from "node:assert/strict";

// Browser global stubs — must exist before the client module is imported.
const loaded = [];
globalThis.window = {
  __ModuleLoader__: {
    load(entry) {
      loaded.push(entry);
    },
  },
};
globalThis.document = {
  querySelector() {
    return null;
  },
  createElement() {
    return { dataset: {}, appendChild() {} };
  },
  head: { appendChild() {} },
};

await import("../lib/client.js");

const ReactStub = {
  createElement(type, props, ...children) {
    return { type, props: props ?? null, children };
  },
  Fragment: Symbol("react.fragment"),
  useState(initial) {
    return [typeof initial === "function" ? initial() : initial, () => {}];
  },
  useEffect() {},
  useRef(initial) {
    return { current: initial };
  },
  useCallback(fn) {
    return fn;
  },
  useMemo(fn) {
    return fn();
  },
  useId() {
    return "test-id";
  },
};

const entry = loaded.find((e) => e.id === "dsh-plugin-whalefeed");
assert.ok(entry, "client module registered via __ModuleLoader__");
const mod = entry.factory((spec) => {
  if (spec === "react") return ReactStub;
  throw new Error(`unexpected require(${spec})`);
});
const { apply, inject, _internals } = mod;
const {
  STORAGE_PREFIX,
  STORAGE_BAK_SUFFIX,
  DEFAULT_STAGES,
  DEFAULT_HISTORY_LIMIT,
  num,
  fmt,
  normalizeConfig,
  normalizeStages,
  computeStage,
  stageProgress,
  bellyScale,
  stageLabel,
  initialState,
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
  buildGalleryFromMap,
  sparklinePoints,
  WhaleSvg,
} = _internals;

test("module registers under the loader and exports apply/inject", () => {
  assert.equal(typeof apply, "function");
  assert.ok(Array.isArray(inject) && inject.includes("slots"));
});

test("num clamps non-finite and non-positive values to zero", () => {
  assert.equal(num(42), 42);
  assert.equal(num(0), 0);
  assert.equal(num(-5), 0);
  assert.equal(num(Number.NaN), 0);
  assert.equal(num(Number.POSITIVE_INFINITY), 0);
  assert.equal(num("12"), 0);
  assert.equal(num(undefined), 0);
});

test("fmt formats compact token counts", () => {
  assert.equal(fmt(0), "0");
  assert.equal(fmt(999), "999");
  assert.equal(fmt(1200), "1.2k");
  assert.equal(fmt(12000), "12k");
  assert.equal(fmt(1234567), "1.23M");
});

test("normalizeConfig applies defaults and tolerates malformed input", () => {
  const d = normalizeConfig(undefined);
  assert.equal(d.position, "bottom-right");
  assert.equal(d.size, 144);
  assert.equal(d.opacity, 0.92);
  assert.equal(d.showTokenBadge, true);
  assert.equal(d.showStageName, true);
  assert.equal(d.catchUpOnFirstSeen, true);
  assert.equal(d.feedRatio, 1);
  assert.equal(d.draggable, true);
  assert.equal(d.stages.length, DEFAULT_STAGES.length);

  const custom = normalizeConfig({
    position: { x: 10, y: 20 },
    size: 120,
    opacity: 0.5,
    showTokenBadge: false,
    showStageName: false,
    catchUpOnFirstSeen: false,
    feedRatio: 0.5,
    draggable: false,
  });
  assert.deepEqual(custom.position, { x: 10, y: 20 });
  assert.equal(custom.size, 120);
  assert.equal(custom.opacity, 0.5);
  assert.equal(custom.showTokenBadge, false);
  assert.equal(custom.showStageName, false);
  assert.equal(custom.catchUpOnFirstSeen, false);
  assert.equal(custom.feedRatio, 0.5);
  assert.equal(custom.draggable, false);
});

test("normalizeConfig clamps size and rejects bad position", () => {
  assert.equal(normalizeConfig({ size: 9999 }).size, 320);
  assert.equal(normalizeConfig({ size: 1 }).size, 32);
  assert.equal(normalizeConfig({ position: "middle" }).position, "bottom-right");
});

test("normalizeStages sorts, dedupes invalid entries, and prepends zero threshold", () => {
  const stages = normalizeStages([
    { threshold: 20000, belly: 1.5, label: "B" },
    { threshold: 5000, belly: 1.1 },
    { threshold: -1, belly: 2 },
    "bad",
  ]);
  assert.equal(stages[0].threshold, 0);
  assert.equal(stages[1].threshold, 5000);
  assert.equal(stages[2].threshold, 20000);
  assert.equal(stages[2].label, "B");
  assert.deepEqual(normalizeStages([]), DEFAULT_STAGES);
  assert.deepEqual(normalizeStages(null), DEFAULT_STAGES);
});

test("computeStage picks highest satisfied threshold", () => {
  assert.equal(computeStage(0, DEFAULT_STAGES), 0);
  assert.equal(computeStage(9999999, DEFAULT_STAGES), 0);
  assert.equal(computeStage(10000000, DEFAULT_STAGES), 1);
  assert.equal(computeStage(50000000, DEFAULT_STAGES), 2);
  assert.equal(computeStage(1000000000, DEFAULT_STAGES), 4);
  assert.equal(computeStage(10 ** 9, DEFAULT_STAGES), 4);
  assert.equal(computeStage(1000, []), 0);
});

test("stageProgress returns progress toward next stage", () => {
  const p = stageProgress(20000000, DEFAULT_STAGES);
  assert.equal(p.stage, 1);
  assert.equal(p.next.threshold, 50000000);
  assert.ok(p.progress > 0.2 && p.progress < 0.3);
  const last = stageProgress(10 ** 9, DEFAULT_STAGES);
  assert.equal(last.stage, 4);
  assert.equal(last.next, null);
  assert.equal(last.progress, 1);
});

test("bellyScale increases with fed tokens and clamps gracefully", () => {
  const b0 = bellyScale(0, DEFAULT_STAGES);
  const b1 = bellyScale(10000000, DEFAULT_STAGES);
  const b2 = bellyScale(1000000000, DEFAULT_STAGES);
  assert.ok(b1 > b0);
  assert.ok(b2 > b1);
  assert.ok(Number.isFinite(bellyScale(-100, DEFAULT_STAGES)));
});

test("stageLabel uses custom label then localized fallback", () => {
  const t = (k) => ({ stage0: "LocalZero" })[k] || k;
  assert.equal(stageLabel(0, DEFAULT_STAGES, t), "LocalZero");
  assert.equal(stageLabel(0, [{ threshold: 0, belly: 1, label: "Custom" }], t), "Custom");
  assert.equal(stageLabel(0, [{ threshold: 0, belly: 1 }], t), "LocalZero");
});

test("storageKey encodes session id and uses stable prefix", () => {
  assert.equal(storageKey("abc/def"), STORAGE_PREFIX + "abc%2Fdef");
  assert.equal(storageKey("中文"), STORAGE_PREFIX + encodeURIComponent("中文"));
  assert.equal(storageKey(""), STORAGE_PREFIX + "default");
});

test("parseStoredState handles invalid/mismatched data and preserves valid state", () => {
  const sid = "s1";
  assert.equal(parseStoredState(null, sid).exists, false);
  assert.equal(parseStoredState("", sid).exists, false);
  assert.equal(parseStoredState("{bad json", sid).exists, false);
  assert.equal(parseStoredState(JSON.stringify({ version: 2, sessionId: sid }), sid).exists, false);
  assert.equal(parseStoredState(JSON.stringify({ version: 1, sessionId: "other" }), sid).exists, false);

  const raw = serializeState({
    version: 1,
    sessionId: sid,
    fedTokens: 1200,
    lastTotalTokens: 1200,
    stage: 1,
    mood: "eating",
    lastFedAt: 123,
    feedEvents: 2,
    createdAt: 456,
    pos: { x: 10, y: 20 },
  });
  const parsed = parseStoredState(raw, sid);
  assert.equal(parsed.exists, true);
  assert.equal(parsed.state.fedTokens, 1200);
  assert.deepEqual(parsed.state.pos, { x: 10, y: 20 });
});

test("applyTokenDelta feeds tokens, counts events, and detects stage up", () => {
  const base = {
    ...initialState("s1"),
    fedTokens: 9999990,
    lastTotalTokens: 9999990,
    stage: 0,
    feedEvents: 1,
    createdAt: 1,
  };
  const r = applyTokenDelta(base, 20, {});
  assert.equal(r.delta, 20);
  assert.equal(r.state.fedTokens, 10000010);
  assert.equal(r.state.lastTotalTokens, 10000010);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.feedEvents, 2);
  assert.equal(r.stageUp, true);
  assert.equal(r.state.mood, "happy");

  const r2 = applyTokenDelta({ ...base, stage: 1 }, 10, {});
  assert.equal(r2.stageUp, false);
  assert.equal(r2.state.mood, "eating");
});

test("applyTokenDelta honors feedRatio and ignores non-positive delta", () => {
  const base = { ...initialState("s1"), fedTokens: 0, lastTotalTokens: 0, stage: 0 };
  const r = applyTokenDelta(base, 1000, { feedRatio: 0.5 });
  assert.equal(r.delta, 1000);
  assert.equal(r.foodDelta, 500);
  assert.equal(r.state.fedTokens, 500);
  assert.equal(r.state.lastTotalTokens, 1000);
  assert.equal(applyTokenDelta(base, -5, {}).delta, 0);
  assert.equal(applyTokenDelta(base, Number.NaN, {}).delta, 0);
});

test("projectionTotal sums all token buckets safely", () => {
  assert.equal(projectionTotal(null), 0);
  assert.equal(projectionTotal({}), 0);
  assert.equal(
    projectionTotal({ uncachedInputTokens: 100, cacheReadTokens: 50, cacheWriteTokens: 20, outputTokens: 30 }),
    200,
  );
  assert.equal(projectionTotal({ uncachedInputTokens: -1, cacheReadTokens: "x" }), 0);
});

test("extractSessionId finds session id from props or snapshot", () => {
  assert.equal(extractSessionId({ sessionId: "p" }, {}), "p");
  assert.equal(extractSessionId({}, { sessionId: "s" }), "s");
  assert.equal(extractSessionId({}, { session: { id: "nested" } }), "nested");
  assert.equal(extractSessionId({}, { chat: { sessionId: "chat" } }), "chat");
  assert.equal(extractSessionId({}, {}), "default");
});

test("formatRelativeTime renders friendly labels", () => {
  const t = (k) =>
    ({
      neverFed: "never",
      justNow: "now",
      minutesAgo: "{n}m",
      hoursAgo: "{n}h",
      daysAgo: "{n}d",
    })[k] || k;
  assert.equal(formatRelativeTime(0, t, Date.now()), "never");
  assert.equal(formatRelativeTime(Date.now() - 1000, t, Date.now()), "now");
  assert.equal(formatRelativeTime(Date.now() - 120000, t, Date.now()), "2m");
  assert.equal(formatRelativeTime(Date.now() - 7200000, t, Date.now()), "2h");
  assert.equal(formatRelativeTime(Date.now() - 172800000, t, Date.now()), "2d");
});

test("positionStyle supports corners and absolute positions", () => {
  assert.deepEqual(positionStyle("bottom-right", 96), { right: 16, bottom: 16 });
  assert.deepEqual(positionStyle("top-left", 96), { left: 16, top: 16 });
  assert.deepEqual(positionStyle({ x: 30, y: 40 }, 96), { left: 30, top: 40 });
  assert.deepEqual(positionStyle("bogus", 96), { right: 16, bottom: 16 });
});

test("safeReadState and safeWriteState round-trip through localStorage", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
  const sid = "roundtrip";
  const key = storageKey(sid);
  const initial = safeReadState(key, sid);
  assert.equal(initial.exists, false);

  const next = { ...initialState(sid), fedTokens: 321, lastTotalTokens: 321, feedEvents: 3 };
  assert.equal(safeWriteState(key, next), true);
  const loaded = safeReadState(key, sid);
  assert.equal(loaded.exists, true);
  assert.equal(loaded.state.fedTokens, 321);
  assert.equal(loaded.state.feedEvents, 3);
  assert.equal(store.get(key), serializeState(next));

  delete globalThis.localStorage;
});

test("applyTokenDelta keeps fractional whale food without losing tokens", () => {
  const base = { ...initialState("s1"), fedTokens: 0, lastTotalTokens: 0, stage: 0 };
  const r = applyTokenDelta(base, 1, { feedRatio: 0.5 });
  assert.equal(r.delta, 1);
  assert.equal(r.foodDelta, 0.5);
  assert.equal(r.state.fedTokens, 0.5);
  assert.equal(r.state.lastTotalTokens, 1);
});

test("normalizeConfig handles resetOnNewSession and custom stages", () => {
  const c = normalizeConfig({
    resetOnNewSession: true,
    stages: [
      { threshold: 0, belly: 0.8, label: "Baby" },
      { threshold: 100, belly: 1.2 },
    ],
  });
  assert.equal(c.resetOnNewSession, true);
  assert.equal(c.stages.length, 2);
  assert.equal(c.stages[0].label, "Baby");
  assert.equal(c.stages[1].threshold, 100);
});

test("normalizeConfig defaults visual to auto and accepts svg/custom", () => {
  assert.equal(normalizeConfig(undefined).visual, "auto");
  assert.equal(normalizeConfig({ visual: "svg" }).visual, "svg");
  assert.equal(normalizeConfig({ visual: "custom" }).visual, "custom");
  assert.equal(normalizeConfig({ visual: "bogus" }).visual, "auto");
});

test("normalizeConfig clamps feedRatio and opacity", () => {
  assert.equal(normalizeConfig({ feedRatio: 0 }).feedRatio, 0.000001);
  assert.equal(normalizeConfig({ feedRatio: 999999999 }).feedRatio, 1000000);
  assert.equal(normalizeConfig({ opacity: 0 }).opacity, 0.2);
  assert.equal(normalizeConfig({ opacity: 2 }).opacity, 1);
});

test("normalizeStages handles unsorted custom stages and missing belly", () => {
  const stages = normalizeStages([{ threshold: 50 }, { threshold: 10, belly: 1.1 }]);
  assert.equal(stages[0].threshold, 0);
  assert.equal(stages[1].threshold, 10);
  assert.equal(stages[2].threshold, 50);
  assert.equal(stages[1].belly, 1.1);
  assert.equal(stages[2].belly, 1);
});

test("computeStage handles negative and custom stage boundaries", () => {
  assert.equal(computeStage(-1, DEFAULT_STAGES), 0);
  const stages = [
    { threshold: 0, belly: 1 },
    { threshold: 100, belly: 2 },
  ];
  assert.equal(computeStage(99, stages), 0);
  assert.equal(computeStage(100, stages), 1);
});

test("stageProgress handles empty/custom and negative fed", () => {
  const p = stageProgress(-5, DEFAULT_STAGES);
  assert.equal(p.stage, 0);
  assert.equal(p.progress, 0);
  // Empty stages fall back to the built-in defaults (same as normalizeConfig).
  const empty = stageProgress(100, []);
  assert.equal(empty.stage, 0);
  assert.equal(empty.next.threshold, 10000000);
});

test("bellyScale respects custom belly values and keeps growing past max", () => {
  const stages = [
    { threshold: 0, belly: 1 },
    { threshold: 100, belly: 2 },
  ];
  assert.equal(bellyScale(0, stages), 1);
  assert.equal(bellyScale(100, stages), 2);
  assert.ok(bellyScale(1000, stages) > 2);
});

test("parseStoredState defaults missing fields and ignores invalid pos", () => {
  const sid = "s2";
  const parsed = parseStoredState(JSON.stringify({ version: 1, sessionId: sid }), sid);
  assert.equal(parsed.exists, true);
  assert.equal(parsed.state.fedTokens, 0);
  assert.equal(parsed.state.stage, 0);
  assert.equal(parsed.state.pos, undefined);

  const withBadPos = parseStoredState(
    JSON.stringify({ version: 1, sessionId: sid, fedTokens: 10, pos: { x: "a" } }),
    sid,
  );
  assert.equal(withBadPos.state.pos, undefined);

  // A stored integer stage is preserved; rendering recomputes from fedTokens
  // with the active config anyway, so this does not cause visual drift.
  const withStageMismatch = parseStoredState(
    JSON.stringify({ version: 1, sessionId: sid, fedTokens: 6000, stage: 0 }),
    sid,
  );
  assert.equal(withStageMismatch.state.stage, 0);
});

test("applyTokenDelta handles null state and custom stages", () => {
  const r = applyTokenDelta(null, 10, {
    stages: [
      { threshold: 0, belly: 1 },
      { threshold: 5, belly: 2 },
    ],
  });
  assert.equal(r.state.fedTokens, 10);
  assert.equal(r.state.stage, 1);
  assert.equal(r.stageUp, true);
});

test("projectionTotal ignores partial/malformed projections", () => {
  assert.equal(projectionTotal({ uncachedInputTokens: 10 }), 10);
  assert.equal(projectionTotal({ outputTokens: 5, cacheReadTokens: "x" }), 5);
});

test("extractSessionId supports meta and non-object props", () => {
  assert.equal(extractSessionId(null, { meta: { sessionId: "m" } }), "m");
  assert.equal(extractSessionId(undefined, { chat: { session: { id: "deep" } } }), "deep");
});

test("positionStyle handles numeric zero position", () => {
  assert.deepEqual(positionStyle({ x: 0, y: 0 }, 96), { left: 0, top: 0 });
});

test("normalizeHistory filters invalid entries and caps length", () => {
  const hist = normalizeHistory(
    [{ at: 1, delta: 10, total: 10 }, { at: 2, delta: "bad", total: 20 }, null, { at: 3, delta: 5, total: 25 }],
    2,
  );
  assert.equal(hist.length, 2);
  assert.equal(hist[0].delta, 10);
  assert.equal(hist[1].delta, 5);
  assert.equal(normalizeHistory("bad", DEFAULT_HISTORY_LIMIT).length, 0);
});

test("buildGalleryFromMap sorts and computes stats", () => {
  const gallery = buildGalleryFromMap({
    a: { fedTokens: 100, lastTotalTokens: 200, stage: 1, updatedAt: 1 },
    b: { fedTokens: 50, lastTotalTokens: 60, stage: 0, updatedAt: 2 },
    bad: null,
  });
  assert.equal(gallery.length, 2);
  assert.equal(gallery[0].sessionId, "b");
  assert.equal(gallery[0].totalTokens, 60);
  assert.equal(gallery[1].stage, 1);
});

test("sparklinePoints produces an SVG path", () => {
  const path = sparklinePoints([{ delta: 1 }, { delta: 3 }, { delta: 2 }], 100, 36);
  assert.ok(path.startsWith("M"));
  assert.ok(path.includes("L"));
  assert.equal(sparklinePoints([], 100, 36), "");
  const single = sparklinePoints([{ delta: 2 }], 100, 36);
  assert.ok(single.startsWith("M"));
  assert.ok(!single.includes("NaN"));
});

test("WhaleSvg renders an SVG with unique gradient ids", () => {
  const svg = WhaleSvg({ belly: 1, mood: "idle", stage: 0 });
  assert.equal(svg.type, "svg");
  const defs = svg.children.find((c) => c && c.type === "defs");
  assert.ok(defs, "svg should contain defs");
  const ids = defs.children.map((c) => c.props.id);
  assert.ok(ids.includes("dsh-wf-body-test-id"));
  assert.ok(ids.includes("dsh-wf-belly-test-id"));
});

test("parseStoredState backs up corrupted data before resetting", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
  const sid = "corrupt";
  const result = parseStoredState("{bad json", sid);
  assert.equal(result.exists, false);
  assert.ok(store.has(storageKey(sid) + STORAGE_BAK_SUFFIX));
  delete globalThis.localStorage;
});
