# lanson-docs-center

LansonAI 文档中心 — 基于 [shadcn-vue](https://github.com/unovue/shadcn-vue) 官方文档站 UI 构建，内容为 LansonAI 语音 API 开发者文档。

## 文档内容

- **Start** — API key、5 分钟 Quickstart、认证、选择 API
- **Realtime** — WebSocket 实时转写
- **Recorded** — 批量转写（audio URL）
- **Concepts** — Voice Context Layer、稳定性、延迟模型
- **Guides** — 浏览器字幕、服务端推流、重连等实战指南
- **API Reference** — 端点、消息、事件、错误、限流
- **Production** — 上线检查清单与最佳实践

## Development

```bash
pnpm install
pnpm dev        # 文档站（apps/v4）
```

文档内容位于 `apps/v4/content/docs/`，使用 Nuxt Content（Markdown）编写。

## Structure

```
apps/v4        # 文档站 Nuxt 应用（源自 shadcn-vue 官方文档站）
packages/cli   # shadcn-vue CLI（上游保留）
```

## License

MIT
