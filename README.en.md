<div align="center">

<img src="screenshots/logo.png" width="160" />

# CCCC+ · CCCC Personal Fork

### A personal experimental workspace built on CCCC

**CCCC is an open-source, lightweight, local-first, chat-native multi-agent collaboration framework. I started this fork to fit my own workflow, and the more I worked on it, the more it pulled me in...**

For the original project intro, installation guide, architecture notes, and full documentation, see:

[Original README (ChesterRa/cccc)](https://github.com/ChesterRa/cccc#readme) · [中文](README.md) · **English** · [Full Chinese mirror](README.zh-CN.md) · [日本語](README.ja.md)

**This README only covers the secondary development work in this fork.**

</div>

---

## Why I Built on CCCC

I have wanted to build my own workbench for a while. Instead of starting from scratch, I wanted to stand on top of a reliable core and shape the product into something closer to how I actually work every day. I first heard about CCCC from a colleague. Among the similar tools I tried, it was the one that felt easiest to pick up: low entry cost, friendly frontend UI, and a rich feature set. It may not be the absolute best, but it fits me.

### Core Capabilities of the Original CCCC

- **Chat-native interaction**: human-agent and agent-agent interaction through a chatroom-style interface.

- **Role-based work splitting**: create multiple role-configurable agents and let them collaborate in the same group.

- **Persistent collaboration**: reliable message semantics built on message routing, queues, and state tracking.

- **Multi-model support**: supports first-class LLM providers and runtimes such as Claude Code, Codex CLI, Gemini CLI, and others.

- **Unified control plane**: Web UI, CLI, MCP, and IM bridges all operate through the same daemon, avoiding split-brain state.

- **Multiple ways to use it**: supports Web UI, CLI, MCP, and mainstream IM bridges such as Telegram, Slack, Discord, WeChat, Feishu, and more.

## What This Fork Adds

- **Solo mode**: compared with full multi-agent collaboration, many developers prefer to open multiple windows, terminals, or sessions in parallel. Claude Code, Codex, and similar tools already have built-in multi-agent capabilities, and the multi-agent needs around vibe coding are being covered quickly by major vendors. There is no need to rebuild the same wheel. This fork adds a mode closer to multiple terminal/session instances and calls it Solo mode.

- **Temporary terminal**: adds a quick terminal entry so you do not need to switch away just to run a command.

- **Toolbox - Notes**: adds notes to the toolbox, making it easy to jot down ideas and reminders without opening a separate notes app.

- **Toolbox - Scripts**: adds script management to the toolbox, so common scripts can be managed visually and persistently, such as starting remote tunnels, launching local services, or building and releasing projects. Write once, reuse for a long time.

- **File workspace**: adds IDE-like capabilities including a file tree, file preview, and diffs.

- **Notification sounds**: inspired by Vibe-kanban, agent replies can play notification sounds so you know when to send the next instruction and keep human scheduling capacity fully used. It includes several sound effects, such as cow, horse, and chicken sounds, mostly for a bit of emotional value.

- **No permanent MCP injection**: the original CCCC permanently inserts its MCP config into local agent settings, which means agents launched elsewhere also load the CCCC MCP. This fork changes that to session-scoped injection to avoid polluting global local configuration.

- **LLM Provider**: experimental support for GitHub Copilot Agent.

- **UI and workflow improvements**: reorganized Settings, unified modals, and improved search, mention, reply quote, group mode, and other high-frequency interactions so daily use has fewer interruptions.

## TODO Roadmap

I want a single workbench that covers most of my daily development work, so I don’t have to burn my energy constantly with dozens of tools, terminals, and IDEs. Ideally, I can sit there with a cup of tea, check the screen once in a while, and get most things done.

- [ ] **Refactor the multi-agent collaboration core**: I hit quite a few framework bugs while using collaboration mode, and in practice I mostly use Solo mode. The root issue is that collaboration communication through MCP is not reliable enough. A more deterministic message layer is needed, with clearer separation between the message layer and the collaboration semantics layer.
- [ ] **Voice control**: add Typeless-like speech-to-text capabilities. Since CCCC already supports mobile use, combining the two should make it much more convenient.
- [ ] **Improve the file workspace**: the file workspace is currently read-only. I will continue adding meaningful IDE-like capabilities.
- [ ] **Polish mobile and IM usage**: the next stage will explore mobile and IM-based remote control, then improve the related UX.
- [ ] **Improve plugin management**: MCP and skills currently lack unified management. I will try to build unified MCP/Skill sync and management so multiple models can share a common harness.
- [ ] **Improve remote capabilities**: remote development is almost a must-have for developers, but current tools still have limitations: Codex/Claude Desktop do not support remote use; remote command lines cannot copy images, which CCCC can solve; many solutions require installing a service remotely; local and remote context/memory are not shared; and so on. CCCC has already solved the first two problems, but there is still room to improve.
- [ ] **Improve the UI**: many frontend layout and UI details in CCCC still need more polish.

## Upstream and License

This project is a fork of [ChesterRa/cccc](https://github.com/ChesterRa/cccc) and follows the original project's [Apache-2.0](LICENSE) license.

If you want to understand the original CCCC capabilities, start with the [original README](https://github.com/ChesterRa/cccc#readme) and [official documentation](https://chesterra.github.io/cccc/).
