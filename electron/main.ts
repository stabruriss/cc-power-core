import electron from 'electron'
import type { BrowserWindow as BrowserWindowType } from 'electron'
const { app, BrowserWindow, ipcMain, shell } = electron
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import Store from 'electron-store'
import os from 'node:os'
import { updateShellConfig } from './shellUtils'

// App version from package.json
const APP_VERSION = app.getVersion()

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindowType | null
const store = new Store({ name: 'cc-power-core-config' })

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'app-icons/icon-512.png'),
    width: 900,
    height: 700,
    useContentSize: false,
    resizable: true, // Allow resizing with constraints
    minWidth: 700,
    maxWidth: 1100,
    minHeight: 650,
    maxHeight: 700,
    titleBarStyle: 'hidden', // Hides the title bar but keeps traffic lights
    trafficLightPosition: { x: 18, y: 10 }, // Aligned inside the top mechanical ridge (h-8 = 32px height)
    backgroundColor: '#18181b', // Zinc-950 to match app usage, prevents white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()

  ipcMain.handle('get-settings', () => {
    // Determine shell config path dynamically
    const shell = process.env.SHELL
    let configPath = ''
    if (shell?.includes('zsh')) {
      configPath = path.join(os.homedir(), '.zshrc')
    } else if (shell?.includes('bash')) {
      configPath = path.join(os.homedir(), '.bashrc')
    } else {
      configPath = path.join(os.homedir(), '.zshrc') // Default
    }

    return {
      apiKey: store.get('apiKey', ''),
      model: store.get('model', ''),
      kingModel: store.get('kingModel', ''),
      queenModel: store.get('queenModel', ''),
      jackModel: store.get('jackModel', ''),
      configPath: configPath
    }
  })

  ipcMain.handle('open-config-folder', async () => {
    // Open Home Directory where .zshrc/.bashrc lives
    await electron.shell.openPath(os.homedir())
    return true
  })

  ipcMain.handle('open-path', async (_, targetPath) => {
    // Open specific file logic (Robust macOS method)
    // shell.openPath sometimes opens the folder for config files.
    // 'open' command handles it better.
    const { spawn } = await import('node:child_process')
    return new Promise((resolve) => {
      // Use -e (opens in TextEdit) or let default association handle it?
      // -e forces TextEdit. If user has VS Code set for zshrc, 'open <path>' should respect it.
      // But user complained it opened FOLDER. That happens if path is treated as dir?
      // If we use 'open' with file path on macOS, it should work.
      // The issue was likely the 'openConfigFolder' call in App.tsx.
      // However, to be safe, let's just pass the path.
      // Wait, if permission denied, 'open' might fail subtly.
      // Let's stick to standard `open path`. The bug was definitely the wrong handler in App.tsx.
      // But I will add error logging here too.
      const child = spawn('open', [targetPath])
      child.on('error', (err) => {
        console.error('Failed to open path:', err)
        resolve(false)
      })
      child.on('close', (code) => {
        resolve(code === 0)
      })
    })
  })

  ipcMain.handle('get-shell-status', async () => {
    // Determine config path
    const shell = process.env.SHELL
    let configPath = ''
    if (shell?.includes('zsh')) {
      configPath = path.join(os.homedir(), '.zshrc')
    } else {
      configPath = path.join(os.homedir(), '.bashrc') // Fallback
    }

    if (!electron.shell) return false
    // Using fs to read
    const fs = await import('node:fs')
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      return content.includes('# CCPowerCore Start')
    }
    return false
  })

  // NEW: Get actual values from shell config file
  ipcMain.handle('get-shell-config-values', async () => {
    const shell = process.env.SHELL
    let configPath = ''
    if (shell?.includes('zsh')) {
      configPath = path.join(os.homedir(), '.zshrc')
    } else {
      configPath = path.join(os.homedir(), '.bashrc')
    }

    const fs = await import('node:fs')
    if (!fs.existsSync(configPath)) {
      return { found: false }
    }

    const content = fs.readFileSync(configPath, 'utf-8')
    const startMarker = '# CCPowerCore Start'
    const endMarker = '# CCPowerCore End'

    const startIdx = content.indexOf(startMarker)
    const endIdx = content.indexOf(endMarker)

    if (startIdx === -1 || endIdx === -1) {
      return { found: false }
    }

    const block = content.substring(startIdx, endIdx + endMarker.length)

    // Parse export lines
    const parseVar = (varName: string): string => {
      const regex = new RegExp(`export ${varName}="([^"]*)"`)
      const match = block.match(regex)
      return match ? match[1] : ''
    }

    return {
      found: true,
      baseUrl: parseVar('ANTHROPIC_BASE_URL'),
      authToken: parseVar('ANTHROPIC_AUTH_TOKEN') ? 'ACTIVATED' : '',
      opusModel: parseVar('ANTHROPIC_DEFAULT_OPUS_MODEL'),
      sonnetModel: parseVar('ANTHROPIC_DEFAULT_SONNET_MODEL'),
      haikuModel: parseVar('ANTHROPIC_DEFAULT_HAIKU_MODEL')
    }
  })

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return APP_VERSION
  })

  // Check for updates from GitHub releases
  ipcMain.handle('check-for-updates', async () => {
    try {
      const response = await fetch('https://api.github.com/repos/stabruriss/cc-power-core/releases/latest')
      if (!response.ok) {
        return { hasUpdate: false, error: 'Failed to fetch releases' }
      }
      const data = await response.json()
      const latestVersion = data.tag_name?.replace(/^v/, '') || ''
      const currentVersion = APP_VERSION

      // Simple version comparison (works for semver)
      const hasUpdate = latestVersion !== currentVersion && latestVersion > currentVersion

      return {
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseUrl: data.html_url || 'https://github.com/stabruriss/cc-power-core/releases/latest'
      }
    } catch (error: any) {
      return { hasUpdate: false, error: error.message }
    }
  })

  // Open external URL
  ipcMain.handle('open-external', async (_, url: string) => {
    await shell.openExternal(url)
    return true
  })

  ipcMain.handle('save-settings', async (_, settings) => {
    store.set('apiKey', settings.apiKey)
    store.set('kingModel', settings.kingModel)
    store.set('queenModel', settings.queenModel)
    store.set('jackModel', settings.jackModel)
    // Legacy support for single model field if needed by shellUtils, or use King/Queen/Jack?
    // shellUtils only takes ONE model currently. We should probably pass the "Active" one?
    // Or does shellUtils need updating? The previous code passed `settings.model`.
    // Let's assume for now we still pass `settings.model` (which might be the "default" one, e.g. Sonnet/Queen)
    // to shellUtils, if it sets a default env var.
    // However, the user request implies we just want to SAVE the selection in the app.
    store.set('model', settings.model) // Keep saving the "primary" model too if logic depends on it

    // Determine configPath again (or refactor to shared helper)
    const shell = process.env.SHELL
    let configPath = ''
    if (shell?.includes('zsh')) {
      configPath = path.join(os.homedir(), '.zshrc')
    } else if (shell?.includes('bash')) {
      configPath = path.join(os.homedir(), '.bashrc')
    } else {
      configPath = path.join(os.homedir(), '.zshrc')
    }

    try {
      updateShellConfig(
        settings.apiKey,
        settings.kingModel || '',
        settings.queenModel || settings.model, // Fallback to 'model' for Queen/Sonnet
        settings.jackModel || '',
        configPath,
        settings.active
      )
      return { success: true }
    } catch (error: any) {
      console.error(error)
      return { success: false, error: error.message }
    }
  })
})
