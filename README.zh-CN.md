<div align="center">

<img src="screenshots/logo.png" width="160" />

# CCCC+ · CCCC Personal Fork

### 基于 CCCC 的个人实验工作台

**CCCC是一个开源轻量级、本地优先、支持聊天式交互的多智能体协作框架。**

**为了满足个人需求进行了二次开发，做着做着就进去了......**

英文默认 README、原版项目介绍、安装方式、架构说明和完整上游文档请看：

[English](README.md) | [原版 README（ChesterRa/cccc）](https://github.com/ChesterRa/cccc#readme)

**当前 README 仅记录本分支的二次开发说明。**

</div>

---

## 为什么基于 CCCC 二次开发

我一直希望建立自己的工作台，相比从零重新造一个，站在一个已有内核上修改，把产品打磨成更贴近日常使用的样子显然更靠谱。接触 CCCC 是来自公司同事分享，是我在众多类似产品中用得最顺手一个：入门门槛低，前端 UI 友好，功能丰富。不是最好的，但刚好适合我。

### 原本 CCCC 的核心能力

- **聊天式交互**：以聊天室方式进行人-agent 和 agent-agent 交互。

- **角色化分工**：支持创建多个可设置角色的 agent 在同一协作组内协同工作。

- **持久化协作**：构建了完整的消息路由、消息队列和状态追踪，实现可靠的消息语义。

- **多模型支持**：支持包括 Claude Code、Codex CLI、Gemini CLI 等一线 LLM Provider。底层使用 terminal，能享受模型完整原生能力。

- **统一控制面**：Web UI、CLI、MCP、IM 桥接全部围绕同一 daemon 运作，不会出现多套状态。

- **多样使用方式**：支持 Web UI、CLI、MCP 等多种控制方式，支持 Telegram、Slack、Discord、微信、飞书等主流 IM 桥接。

## 本分支的差异化功能

- **Solo 模式**：相比于多 agent 协作，更多开发者喜欢开多窗口/终端并行，况且 Claude Code、Codex 等已经内嵌了协作能力，Vibe coding 的多 agent 需求在被大厂快速覆盖，没必要重复造轮子。因此提供一种类似于多终端/多 session 会话的交互模式，称为 Solo 模式。

- **临时终端**：提供临时终端入口，当你需要临时使用命令行，不用再切出呼唤终端。

- **工具箱-笔记**：工具箱提供笔记功能，方便随时记录想法或备忘，不用再切出打开笔记软件。

- **工具箱-脚本**：工具箱提供脚本管理功能，可视化、持久化地管理常用脚本，比如开启远程隧穿，启动本地服务，编译发版项目。一次编写，长期提效。

- **文件工作区**：支持文件树，文件预览，Diff 等 IDE 能力。

- **通知音**：借鉴 Vibe-kanban 项目，Agent 回复时可以发通知音，提醒你给 Agent 发送下一步指令，榨干人的调度能力。内置多种音效：牛叫、马叫、鸡叫等，提供趣味。

- **MCP 侵入去除**：原版会将 CCCC 的 MCP 永久插入本地的 Agent 配置，导致在其他地方使用 Agent 也会加载 CCCC MCP。将其修改为 session 级注入，避免污染。

- **LLM Provider**：新增支持 GitHub Copilot Agent（实验中）。

- **UI 与操作流优化**：重组 Settings、统一 Modal、优化搜索 / mention / reply quote / group mode 等交互，让日常高频操作更少打断。

## 从源码编译和使用

本分支沿用原版 CCCC 的打包方式：后端是 Python 包，前端是随包分发的 Vite/React Web UI。日常本地开发可以使用 editable install；前端改动后需要重新构建 Web UI；发版或验证包产物时，先构建前端，再构建 Python 包。

### 克隆本 fork

```bash
git clone https://github.com/wayblink/cccc.git
cd cccc
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
pip install -e .
```

> 环境要求：CCCC 本身需要 Python 3.9+；如果要构建随包分发的 Web UI，还需要 Node.js/npm。

### 构建随包分发的 Web UI

```bash
bash scripts/build_web.sh
```

构建结果会写入 `src/cccc/ports/web/dist`，Python 包会把这个目录作为内置 Web UI 一起分发。

### 本地启动

```bash
cccc
```

启动后打开 http://127.0.0.1:8848/ui/。运行时状态会放在 `CCCC_HOME`，不会写进源码目录。

### 构建可分发包

```bash
python -m pip install -U build twine
bash scripts/build_web.sh
python -m compileall -q src/cccc
python -m build .
python -m twine check dist/*
```

构建出的 wheel 和源码包会放在 `dist/`。如果 checkout 后 shell 脚本没有执行权限，按上面的方式用 `bash` 调用即可。

## TODO Roadmap

我希望用一个工作台解决大部分开发需求，不再疲于在各种工具、命令行、IDE 间切换，可以端着茶，偶尔看下屏幕就解决大部分问题......

- [ ] **重构多 Agent 协作底层**：在协作模式使用过程中，遇到了不少框架的 bug，实际中我几乎都使用 Solo 模式。根本原因是通过 MCP 来实现协作通信可靠性较低，为了让协作框架更可靠，需要更具确定性的消息层，以及消息层和协作语义层的解耦。
- [ ] **语音控制**：引入类 Typeless 的语音转文字能力，CCCC 本身支持手机端，两者结合会更加便利。
- [ ] **完善文件工作区**：当前文件工作区仅支持只读，会继续完善有意义的类 IDE 能力。
- [ ] **打磨手机端和 IM**：下一阶段会尝试手机端和 IM 远程控制，会打磨这部分功能和体验。
- [ ] **完善插件管理**：当前对于 MCP、skill 缺少统一管理。会尝试做统一的 MCP/Skill 同步和管理，实现多模型的统一 Harness。
- [ ] **远程能力提升**：远程开发几乎是开发者刚需，但目前各种产品在远程开发都会有些限制或不便：比如 Codex/Claude Desktop 不支持远程；远程命令行无法复制图片（CCCC 可解决）；必须远程安装一个服务；本地和远程上下文及记忆不共享等等。CCCC 已经解决了前两个问题，但还有一些可以做再优化。
- [ ] **UI 优化**：CCCC 的细节前端布局和 UI 设计还待完善。

我会将一些有通用价值的改动回馈给 CCCC，并且选择性同步 CCCC 的 bugfix 和功能更新。

## 上游与许可

本项目基于 [ChesterRa/cccc](https://github.com/ChesterRa/cccc) 二次开发，遵循原项目的 [Apache-2.0](LICENSE) 许可证。

如果你想了解 CCCC 原版能力，请优先阅读 [原版 README](https://github.com/ChesterRa/cccc#readme) 和 [官方文档](https://chesterra.github.io/cccc/)。
