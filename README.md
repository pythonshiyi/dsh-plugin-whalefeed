# dsh-plugin-whalefeed

[English](README_EN.md) | 中文

> DeepSeek Harness 网页端「鲸鱼娘 Token 喂养桌宠」—— 每个聊天会话独立养一只鲸鱼娘，随着 token 消耗自动进食，肚子越来越大、阶段越来越高。支持本地/云端双存储、导出导入、图鉴、喂食趋势、键盘无障碍与明暗主题。

![License](https://img.shields.io/github/license/pythonshiyi/dsh-plugin-whalefeed)
![GitHub release](https://img.shields.io/github/v/release/pythonshiyi/dsh-plugin-whalefeed)
[![dsh-plugin](https://img.shields.io/badge/GitHub-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)

## 功能特性

- **每会话独立鲸鱼娘**：每个聊天会话一只，互不串台；切换会话自动切换。
- **自动按 token 喂养**：读取 `tokenUsage` 投影（输入 + 缓存 + 输出），token 增长自动进食。
- **肚子可视化成长**：肚子大小随累计消耗连续变化，跨阈值升级：
  - 鲸鱼苗 → 小腹微凸 → 肚子圆滚滚 → 大肚鲸娘 → 巨鲸神
- **SVG 手绘风桌宠**：纯本地矢量图，自动适配明暗主题，支持更多表情（开心、害羞、思考、犯困、吃撑等）。
- **进食/升级动画**：摇头晃脑、蹦跳、冒气泡；支持 `prefers-reduced-motion` 自动减少动画。
- **可拖动、可点击、可键盘操作**：默认右下角悬浮，可拖到任意位置；支持 Tab 聚焦、Enter/Space 打开、Esc 关闭。
- **双存储**：
  - 默认浏览器 `localStorage` 作为快速缓存；
  - 启用 Host 半段后，状态同步到 Harness 本地文件，跨浏览器/设备共享；
  - Host 不可用时自动回退本地存储。
- **导出 / 导入**：可把当前鲸鱼娘导出为 JSON 文件，也可粘贴 JSON 导入。
- **鲸鱼娘图鉴**：查看所有会话养过的鲸鱼娘、阶段、已喂总量。
- **喂食趋势**：详情面板内显示最近 30 次进食的迷你趋势图。
- **多标签页同步**：优先使用 `BroadcastChannel`，兼容 `storage` 事件。
- **损坏数据备份**：本地状态损坏时自动备份为 `:bak` 再重建。
- **多语言**：zh/en，缺失时回退中文。
- **会话槽位渲染 + CSS 悬浮**：通过会话头部槽位拿到实时 token 数据，再用 `position: fixed` 让鲸鱼娘悬浮在整个页面上；头部槽位不可用时降级到消息操作区。

## 环境要求

- DeepSeek Harness **web 版**（`dsh --profile web`）
- 标准 web 插件列表
- Host 持久化需要 Node 半段可写 Harness 数据目录；不可用时自动使用 localStorage

## 安装

### 本地目录或 Git 仓库

```bash
cd ~/.dsh/profiles
npm install /path/to/dsh-plugin-whalefeed
# 或：npm install https://github.com/pythonshiyi/dsh-plugin-whalefeed
```

### npm（发布后可用）

```bash
cd ~/.dsh/profiles
npm install dsh-plugin-whalefeed
```

注册到 `cordis.patch.yml`：

```yaml
- insert:
    - id: plugin-whalefeed
      name: "dsh-plugin-whalefeed"
```

重启 `dsh --profile web` 并刷新页面。

## 行级配置

```yaml
- insert:
    - id: plugin-whalefeed
      name: "dsh-plugin-whalefeed"
      config:
        position: bottom-right # bottom-right | bottom-left | top-right | top-left | {x: 20, y: 20}
        size: 96 # 桌宠尺寸 px（32-256，默认 96）
        opacity: 0.92 # 不透明度（0.2-1，默认 0.92）
        showTokenBadge: true # 头顶显示当前会话累计 token
        showStageName: true # 显示当前阶段名
        catchUpOnFirstSeen: true # 首次接入时是否把会话已有消耗一次性补记
        feedRatio: 1 # 1 token = 1 鲸粮；可调成长速度
        resetOnNewSession: false # 新建/首次见到的会话是否强制从 0 开始
        draggable: true # 是否允许拖动桌宠
        hostPersistence: true # 是否启用 Host 文件持久化（不可用时自动回退 localStorage）
        historyLimit: 50 # 喂食历史条数上限
        stages: [] # 自定义阶段，见下方说明
```

### 自定义阶段

`stages` 为空时使用内置默认阶段：

```js
[
  { threshold: 0, belly: 0.75 },
  { threshold: 5000, belly: 1.0 },
  { threshold: 20000, belly: 1.35 },
  { threshold: 80000, belly: 1.75 },
  { threshold: 300000, belly: 2.2 },
];
```

可传 `{ threshold, belly, label? }` 覆盖。插件会自动按 `threshold` 排序，并保证第一个阈值是 0。

## 工作原理

| 环节      | 说明                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------- |
| 主槽位    | `conversation.session.header.utilities`（会话作用域，提供 token 数据）；CSS `fixed` 实现全局悬浮；降级 `conversation.chat.assistant-actions` |
| 数据源    | `useProjection("tokenUsage")`，与会话快照同源                                                           |
| 累计口径  | `uncachedInputTokens + cacheReadTokens + cacheWriteTokens + outputTokens`                               |
| 喂养逻辑  | projection 变化时 `delta = 当前累计 - 上次累计`，`delta > 0` 则喂食                                     |
| 本地存储  | `localStorage` key：`dsh-plugin-whalefeed:v1:{sessionId}`                                               |
| Host 存储 | Node 半段提供 `/dsh-whalefeed-state` 与 `/dsh-whalefeed-states`，写入 `dsh-plugin-whalefeed-store.json` |
| 多标签页  | `BroadcastChannel` + `storage` 事件双通道                                                               |
| 损坏保护  | 解析失败自动写 `:bak` 备份                                                                              |
| 无障碍    | 键盘操作、ARIA、`prefers-reduced-motion`                                                                |

## 常见问题

**换电脑/浏览器后鲸鱼娘还在吗？**
启用 Host 持久化后，同一 Harness profile 下的本地文件会保留；纯 localStorage 模式则只在本机浏览器保留。

**Host 持久化安全吗？**
数据只写入 Harness 本地数据目录，不经过第三方网络，不上传任何远端。

**为什么某些环境不显示鲸鱼娘？**
插件需要会话作用域槽位来读取 token 数据。如果当前 Harness 版本没有 `conversation.session.header.utilities`，会自动尝试 `conversation.chat.assistant-actions`；若都不可用则不会显示。

**如何导出/导入？**
点击鲸鱼娘打开详情 → 导出会下载 JSON 文件；导入会提示粘贴 JSON 状态。

**如何查看所有鲸鱼娘？**
详情面板 → 图鉴，可看到所有会话的鲸鱼娘列表和全局已喂总量。

**重置后会不会重复喂入旧 token？**
不会。重置时会把 `lastTotalTokens` 锚定到当前累计值。

## 兼容范围

- DeepSeek Harness `0.1.0-rc.6`（web profile）
- 依赖 `tokenUsage` projection、`conversation.session.header.utilities` 槽位、Host `webServer` 服务（可选）
- 所有访问均有守卫；Harness 升级导致形状变化时静默降级，不抛错

## 开发

```bash
npm test          # 单元测试
npm run check     # 语法检查
npm run pack      # npm 打包预览
npm run lint      # ESLint（需要先 npm install）
npm run format    # Prettier（需要先 npm install）
```

## 支持与品牌

**公众号：十一AIGC** —— AI 工具评测与教程，第一时间获取本插件更新与更多 DeepSeek Harness 玩法。

如果本项目对你有帮助，欢迎 ⭐ Star，并关注公众号「十一AIGC」。

## License

MIT
