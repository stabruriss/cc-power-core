import electron from 'electron'
import type { BrowserWindow as BrowserWindowType } from 'electron'
const { app, BrowserWindow, ipcMain } = electron
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import Store from 'electron-store'
import fs from 'node:fs'
import os from 'node:os'

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
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
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
      configPath: configPath
    }
  })

  ipcMain.handle('open-config-folder', async () => {
    // Open Home Directory where .zshrc/.bashrc lives
    await electron.shell.openPath(os.homedir())
    return true
  })

  ipcMain.handle('save-settings', async (_, settings) => {
    store.set('apiKey', settings.apiKey)
    store.set('model', settings.model)

    try {
      updateShellConfig(settings.apiKey, settings.model)
      return { success: true }
    } catch (error: any) {
      console.error(error)
      return { success: false, error: error.message }
    }
  })
})

function updateShellConfig(apiKey: string, model: string) {
  const shell = process.env.SHELL
  let configPath = ''

  if (shell?.includes('zsh')) {
    configPath = path.join(os.homedir(), '.zshrc')
  } else if (shell?.includes('bash')) {
    configPath = path.join(os.homedir(), '.bashrc')
  } else {
    configPath = path.join(os.homedir(), '.zshrc')
  }

  let content = ''
  if (fs.existsSync(configPath)) {
    content = fs.readFileSync(configPath, 'utf-8')
  }

  const startMarker = '# CCPowerCore Start'
  const endMarker = '# CCPowerCore End'

  const newBlock = `${startMarker}
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_API_KEY="${apiKey}"
export ANTHROPIC_DEFAULT_SONNET_MODEL="${model}"
${endMarker}`

  const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'g')

  if (regex.test(content)) {
    content = content.replace(regex, newBlock)
  } else {
    content += `\n${newBlock}\n`
  }

  fs.writeFileSync(configPath, content, 'utf-8')
}
