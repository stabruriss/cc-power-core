# CC PowerCore

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![Status](https://img.shields.io/badge/status-Active-green.svg)

**CC PowerCore** is a premium, industrial-styled command center for [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview). It acts as a visual middleware, routing your local Claude Code CLI traffic through [OpenRouter](https://openrouter.ai/), giving you total control over model selection, budget, and API usage.

---

## Core Purpose

The goal of CC PowerCore is to **unlock the full potential of Claude Code**. By decoupling it from the default Anthropic API, it provides a ritualistic "Ignition" interface to inject OpenRouter configuration into your shell environment. This means you can drive the official Claude Code CLI with **any model** available on OpenRouter.

## Target Audience

- **Geek Developers**: People who want to use non-standard models (like `deepseek-r1`, `gemini-2.0-flash`, etc.) in Claude Code.
- **Cost-Conscious Users**: Engineers who want to monitor session costs in real-time and optimize AI spending.
- **Minimalists**: Those who find config files tedious but dislike complex GUIs.

## Features

- **Model Switching**: Configure King (Opus), Queen (Sonnet), and Jack (Haiku) model slots with any OpenRouter-supported model
- **Real-time Cost Tracking**: Monitor your session cost with live updates and countdown timer
- **Ignition System**: Visual toggle to activate/deactivate OpenRouter routing
- **Budget Monitor**: CostKnob displays remaining budget and usage status
- **Shell Integration**: Automatically configures your `.zshrc` or `.bashrc`
- **Industrial UI**: Retro-futuristic command center aesthetic

## Installation

### Download

Download the latest release for your platform:

- **macOS**: `CCPowerCore-Mac-x.x.x-Installer.dmg`
- **Windows**: `CCPowerCore-Windows-x.x.x-Setup.exe`
- **Linux**: `CCPowerCore-Linux-x.x.x.AppImage`

### macOS Installation

1. Download the DMG file
2. Open the DMG and drag CCPowerCore to your Applications folder
3. On first launch, right-click the app and select "Open" (required for unsigned apps)

### Setup

1. Get your API key from [OpenRouter](https://openrouter.ai/keys)
2. Launch CC PowerCore
3. Insert your OpenRouter API key in the ignition drawer
4. Configure your preferred models for King/Queen/Jack slots
5. Turn the ignition key to "ON" to activate routing
6. Open a new terminal and use `claude` as normal

## How It Works

CC PowerCore modifies your shell configuration file (`.zshrc` or `.bashrc`) to set environment variables that redirect Claude Code's API calls through OpenRouter:

```bash
# CCPowerCore Start
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="sk-or-..."
export ANTHROPIC_DEFAULT_OPUS_MODEL="anthropic/claude-3-opus"
export ANTHROPIC_DEFAULT_SONNET_MODEL="anthropic/claude-sonnet-4"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="anthropic/claude-3-haiku"
# CCPowerCore End
```

When you turn off the ignition, these lines are removed, and Claude Code returns to using the default Anthropic API.

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/anthropics/cc-power-core.git
cd cc-power-core

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Project Structure

```
cc-power-core/
├── electron/           # Electron main process
│   ├── main.ts         # Main process entry
│   ├── preload.ts      # Preload script for IPC
│   └── shellUtils.ts   # Shell configuration utilities
├── src/                # React frontend
│   ├── components/     # UI components
│   ├── lib/            # Utilities (OpenRouter API)
│   └── App.tsx         # Main application
├── public/             # Static assets
└── release/            # Build outputs (gitignored)
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) by Anthropic
- [OpenRouter](https://openrouter.ai/) for API routing
- [Electron](https://www.electronjs.org/) for cross-platform desktop support
