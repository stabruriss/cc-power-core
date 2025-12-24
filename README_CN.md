# CC PowerCore (核心动力组)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Active-green.svg)

**CC PowerCore** 是一个专为 [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) 打造的工业风硬核控制台。它作为一个可视化的中间件，将你本地的 Claude Code CLI 流量路由至 [OpenRouter](https://openrouter.ai/)，让你能够完全掌控模型选择、成本预算和 API 调用。

![Preview](./public/preview_dashboard.png) *(注：请替换为实际截图)*

---

## 🚀 核心用途
CC PowerCore 的核心目标是**解锁 Claude Code 的全部潜力**。通过解耦默认的 Anthropic API，它提供了一个富有仪式感的“点火”接口，将 OpenRouter 的配置注入到你的 Shell 环境中。这意味着你可以让官方的 Claude Code CLI 驱动任何模型（如 Gemini, GPT， GLM 等）。

## 👥 目标用户
- **极客开发者**：希望在 Claude Code 中使用非官方支持模型（如 `deepseek-r1` 或 `claude-3-5-sonnet` 旧版）的人。
- **成本敏感型用户**：希望实时监控会话成本（精确到 $0.00000）并优化 AI 支出的人。
- **简洁爱好者**：觉得配置文件繁琐，又不喜欢复杂GUI的人。

## ⚡ 应用场景
1.  **模型自由切换**：想用 **Gemini 3 Pro** 来写代码？只需在控制台切换，即可让 `claude` 命令调用它。
2.  **可视化成本**：在仪表盘上实时查看将会话消耗。
3.  **随时切换**：关闭router，即可让 Claude Code 走默认的 Anthropic API。

## 🛠 安装与设置
*(即将更新)*

## 📄 许可证
本项目采用 MIT 许可证 - 详情请见 [LICENSE](LICENSE) 文件。
