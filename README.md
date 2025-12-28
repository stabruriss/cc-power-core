# CC PowerCore

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20(Apple%20Silicon)-lightgrey.svg)
![Status](https://img.shields.io/badge/status-Active-green.svg)

**CC PowerCore** is a desktop app for [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) that routes your CLI traffic through [OpenRouter](https://openrouter.ai/), giving you control over model selection, budget, and API usage.

![Screenshot](./public/screenshot.png)

---

## What It Does

CC PowerCore lets you use **any OpenRouter-supported model** with the official Claude Code CLI. It injects OpenRouter configuration into your shell environment, so you can switch models without touching config files.

## Who It's For

- Developers who want to use models like Gemini, Codex, or Z.AI in Claude Code
- Users who want to monitor session costs in real-time
- Anyone who prefers a GUI over manual config file editing

## Features

- **Model Configuration**: Set up King (Opus), Queen (Sonnet), and Jack (Haiku) model slots with any OpenRouter model
- **Cost Tracking**: Monitor session cost with live updates
- **Toggle Routing**: Turn OpenRouter routing on/off with one click
- **Budget Display**: See remaining balance and usage status
- **Shell Integration**: Auto-configures `.zshrc` or `.bashrc`

## Installation

### Download

- **macOS (Apple Silicon)**: `CCPowerCore-Mac-x.x.x-Installer.dmg`

### Install

1. Download the DMG
2. Drag CCPowerCore to Applications
3. Right-click and select "Open" on first launch (required for unsigned apps)

### Setup

1. Get an API key from [OpenRouter](https://openrouter.ai/keys)
2. Launch CC PowerCore
3. Enter your API key
4. Configure your preferred models
5. Turn the ignition to "ON"
6. Start a **new** Claude Code session (see Usage Tips below)

## Usage Tips

> **Important**: After turning the ignition ON/OFF, you must start a new Claude Code session for changes to take effect. The environment variables are only read when a new session starts.

### Terminal (CLI)

- Type `exit` to end the current session, then run `claude` again
- Or open a new terminal window/tab

### IDE Integration

Claude Code IDE plugins (VS Code, Winsurf, Cursor, etc.) do not read shell environment variables. To use CC PowerCore in an IDE, run the CLI in the integrated terminal instead of using the native plugin.

## How It Works

CC PowerCore adds environment variables to your shell config (`.zshrc` or `.bashrc`):

```bash
# CCPowerCore Start
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="sk-or-..."
export ANTHROPIC_DEFAULT_OPUS_MODEL="anthropic/claude-3-opus"
export ANTHROPIC_DEFAULT_SONNET_MODEL="anthropic/claude-sonnet-4"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="anthropic/claude-3-haiku"
# CCPowerCore End
```

When you turn off routing, these lines are removed.

## Development

### Requirements

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone https://github.com/stabruriss/cc-power-core.git
cd cc-power-core
npm install
npm run dev      # Development
npm run build    # Production build
```

### Structure

```
cc-power-core/
├── electron/           # Main process
│   ├── main.ts
│   ├── preload.ts
│   └── shellUtils.ts
├── src/                # React frontend
│   ├── components/
│   ├── lib/
│   └── App.tsx
├── public/
└── release/            # Build output (gitignored)
```

## License

MIT License - see [LICENSE](LICENSE)

## Credits

- [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) by Anthropic
- [OpenRouter](https://openrouter.ai/)
- [Electron](https://www.electronjs.org/)
