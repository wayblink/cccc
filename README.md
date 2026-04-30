<div align="center">

<img src="screenshots/logo.png" width="160" />

# CCCC · Personal Fork

### 基于 CCCC 的个人工作台实验

**CCCC是一个轻量级、却具备基础设施级可靠性的多智能体框架。**

原版项目介绍、安装方式、架构说明和完整文档请看：

[原版 README（ChesterRa/cccc）](https://github.com/ChesterRa/cccc#readme) · [本仓库保留的英文 README](README.en.md) · [中文完整版镜像](README.zh-CN.md) · [日本語](README.ja.md)

[![Upstream](https://img.shields.io/badge/upstream-ChesterRa%2Fcccc-blue)](https://github.com/ChesterRa/cccc)
[![License](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)

**当前 README 仅记录本分支的二次开发说明。**

</div>

---

## 为什么基于 CCCC 二次开发

我选择基于 CCCC 二次开发，是因为原版已经把多 agent 协作里最难、也最容易被低估的底座问题处理得足够清楚：它不是简单地把几个终端窗口拼在一起，而是提供了一套可以长期运行、可恢复、可追踪的协作内核。

| 原版 CCCC 的核心能力 | 它解决的问题 | 我基于它继续做什么 |
|----------------------|--------------|--------------------|
| **Append-only ledger** | 协作记录不再散落在终端 scrollback 里，消息和事件可以回放、审计、恢复。 | 把长期 agent 工作流沉淀成可追踪的工作台历史，而不是一次性会话。 |
| **可靠消息语义** | 支持路由、已读游标、ACK、reply-required、回复引用，能知道谁看到了什么、谁还欠回复。 | 在多人 / 多 agent 场景里减少“我以为它收到了”的不确定性。 |
| **Daemon 单写者模型** | 所有状态变更经由同一 daemon，避免 Web、CLI、MCP、IM 各管一套状态。 | 在它上面继续叠加 UI、终端、脚本、笔记等能力，而不拆散事实源。 |
| **统一控制面** | Web UI、CLI、MCP 工具、IM bridge 都围绕同一套 daemon 状态工作。 | 把 CCCC 从协作内核扩展成日常可用的 agent 工作台。 |
| **多运行时 actor 抽象** | Claude Code、Codex CLI、Gemini CLI 等运行时可以在同一 group 里协作。 | 让不同模型 / 工具各自做擅长的事，而不是被单一 runtime 绑定。 |
| **本地优先运行方式** | 单机即可启动，运行时状态放在 `CCCC_HOME`，需要时再暴露 Web / IM 远程值守。 | 保持个人开发环境可控，同时支持长任务和远程查看。 |

相比从零重新造一个 orchestrator，我更希望站在这个可靠内核上，把产品方向推进到更贴近日常使用的 **agent 工作台**。

这个分支的重点不是替代上游，而是把 CCCC 从“可靠协作内核”继续扩展成适合我自己长期使用的个人 / 小团队操作台：中文优先、终端可见、工作区可浏览、脚本与笔记可沉淀，并让 Claude Code、Codex CLI、GitHub Copilot CLI 等运行时在同一工作流里更顺手地协作。

## 本分支的差异化功能

| 方向 | 差异化能力 |
|------|------------|
| **中文默认入口** | 根目录 `README.md` 改为中文优先，只保留本分支二开说明；原版 README 通过链接访问。 |
| **Direct / 直连工作台** | 强化 Terminal Direct Mode、快速终端入口、直连模式 group 默认终端显示，减少“先建协作组再找终端”的摩擦。 |
| **工作区洞察** | 增加 Workspace Inspector、图片预览、文本文档查看等能力，让 agent 协作时能直接围绕仓库文件、diff 和素材沟通。 |
| **本地生产力组件** | 增加 Notes / Script Manager / 通知音 / 全局字号等工作台功能，把临时经验、常用脚本和长任务提醒沉淀下来。 |
| **运行时适配与稳定性** | 增强 Codex session-scoped MCP 上下文、GitHub Copilot CLI 支持、PTY composer-ready 检测、headless trace recovery 等细节。 |
| **UI 与操作流优化** | 重组 Settings、统一 Modal、优化搜索 / mention / reply quote / group mode 等交互，让日常高频操作更少打断。 |

## TODO Roadmap

- [x] 中文默认 README 与多语言入口重排。
- [x] Direct / 直连模式 group 默认终端视图、快速终端入口、Terminal Direct Mode。
- [x] Workspace Inspector、图片预览、文本文档预览。
- [x] Notes、Script Manager、通知音、全局字号等本地工作台能力。
- [x] Codex / Copilot 等运行时的 MCP 注入、投递链路和 PTY 可用性修复。
- [ ] 完善远程 backend group discovery / management，把多机器上的 group 管理做成稳定入口。
- [ ] 强化 Workspace Inspector：补齐更完整的 diff、搜索、文件操作和 agent 引用链路。
- [ ] 打通 Notes / Script Manager / Automation，让常用脚本和经验沉淀可以被 agent 安全复用。
- [ ] 继续收敛 Direct / 直连模式与 Collaboration / 协作模式两种 group mode 的信息架构和默认体验。
- [ ] 完善安全与发布文档：访问令牌、远程暴露、源码安装、Docker 与升级路径。

## 上游与许可

本项目基于 [ChesterRa/cccc](https://github.com/ChesterRa/cccc) 二次开发，遵循原项目的 [Apache-2.0](LICENSE) 许可证。

如果你想了解 CCCC 原版能力，请优先阅读 [原版 README](https://github.com/ChesterRa/cccc#readme) 和 [官方文档](https://chesterra.github.io/cccc/)。
