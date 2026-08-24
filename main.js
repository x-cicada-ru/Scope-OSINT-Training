const { app, BrowserWindow, screen, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// ── GPU acceleration ──
// Hardware acceleration is ON (Electron default). The old experimental
// switches (enable-gpu-rasterization, enable-zero-copy, SharedImageBuffer,
// use-gl=angle) are gone — they caused GPU process crashes (0xC0000005)
// on some Windows drivers. Plain defaults are stable and GPU-accelerated.
// If the GPU process ever dies, Chromium falls back to software rendering
// automatically; we just log it so the cause is visible in the console.
app.on('child-process-gone', (_event, details) => {
  if (details.type === 'GPU') {
    console.warn(`[GPU] process ${details.reason} (exit code ${details.exitCode}) — falling back to software rendering`)
  }
})


let mainWindow

function createWindow () {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
  const winW = 1280
  const winH = 820

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.round((screenW - winW) / 2),
    y: Math.round((screenH - winH) / 2),
    frame: false,
    transparent: true,
    resizable: false,
    roundedCorners: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))
  mainWindow.once('ready-to-show', () => { mainWindow.show() })
  mainWindow.on('closed', () => { mainWindow = null })
}

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:close', () => mainWindow?.close())

ipcMain.handle('fs:readFile', async (event, relativePath) => {
  const fullPath = path.resolve(__dirname, relativePath)
  // Security: prevent path traversal attacks
  if (!fullPath.startsWith(__dirname)) {
    throw new Error('Access denied: invalid path')
  }
  return fs.readFileSync(fullPath, 'utf-8')
})

const USER_PATH = path.join(__dirname, 'user.json')
const PROVIDERS = {
  nvidia: { baseUrl: 'https://integrate.api.nvidia.com/v1', keyField: 'apiKey' }
}

const USER_DEFAULTS = {
  defaultModel: 'nvidia/nemotron-3-super-120b-a12b',
  username: 'SOT student',
  email: 'user@sot.app',
  avatar: ''
}

function loadUser () {
  try {
    if (fs.existsSync(USER_PATH)) {
      const raw = fs.readFileSync(USER_PATH, 'utf-8')
      const data = JSON.parse(raw)
      // Limit avatar size to prevent file bloat
      if (data.avatar && data.avatar.length > 1048576) {
        console.warn('Avatar too large (>1MB), removing')
        data.avatar = ''
      }
      return { ...USER_DEFAULTS, ...data }
    }
  } catch (e) {
    console.error('user.json load error:', e)
  }
  return null
}

function saveUser (data) {
  fs.writeFileSync(USER_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

ipcMain.handle('user:read', async () => {
  let user = loadUser()
  if (!user) {
    user = { ...USER_DEFAULTS }
    saveUser(user)
  }
  return user
})

ipcMain.handle('user:save', async (event, data) => {
  saveUser(data)
  return true
})

// ── Sessions ──
const sessionsDir = path.join(app.getPath('userData'), 'sessions')

function ensureSessionsDir () {
  if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true })
}

ipcMain.handle('session:create', () => {
  ensureSessionsDir()
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  fs.writeFileSync(path.join(sessionsDir, `${id}.jsonl`), '', 'utf-8')
  return id
})

ipcMain.handle('session:append', (_, { id, messages }) => {
  ensureSessionsDir()
  const filePath = path.join(sessionsDir, `${id}.jsonl`)
  const lines = messages.map(m => JSON.stringify(m) + '\n').join('')
  fs.appendFileSync(filePath, lines, 'utf-8')
})

ipcMain.handle('session:list', async () => {
  try {
    await fs.promises.mkdir(sessionsDir, { recursive: true })
    const files = await fs.promises.readdir(sessionsDir)
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'))

    // Limit to 500 most recent sessions, sorted by modification time
    const sessions = jsonlFiles
      .map(f => ({
        file: f,
        fullPath: path.join(sessionsDir, f),
        mtime: new Date()
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 500)

    // Process sessions in batches to prevent UI freeze
    const result = []
    const BATCH_SIZE = 50

    for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
      const batch = sessions.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map(async (s) => {
          try {
            const stats = await fs.promises.stat(s.fullPath)

            // Read only first 1KB to prevent memory overload
            const fd = await fs.promises.open(s.fullPath, 'r')
            const buffer = Buffer.alloc(1024)
            const { bytesRead } = await fd.read(buffer, 0, 1024, 0)
            await fd.close()

            const raw = buffer.slice(0, bytesRead).toString('utf-8').trim()

            // Parse messages
            const lines = raw.split('\n').filter(Boolean)
            const messages = lines.slice(0, 50) // Limit to 50 messages for preview

            let firstUser = null
            let firstAi = null

            for (const line of messages) {
              try {
                const msg = JSON.parse(line)
                if (!firstUser && msg.role === 'user') {
                  firstUser = msg
                } else if (!firstAi && msg.role === 'assistant') {
                  firstAi = msg
                }
              } catch (e) {
                continue
              }
            }

            return {
              id: s.file.replace('.jsonl', ''),
              title: firstUser?.content?.slice(0, 80) || 'New chat',
              preview: firstAi?.content?.slice(0, 120).replace(/<[^>]*>/g, '') || '',
              date: stats.mtime,
              messages: messages.length
            }
          } catch (e) {
            // Skip corrupted sessions instead of failing entire list
            return null
          }
        })
      )

      batchResults.forEach(resultItem => {
        if (resultItem.status === 'fulfilled' && resultItem.value) {
          result.push(resultItem.value)
        }
      })
    }

    return result.sort((a, b) => b.date - a.date)
  } catch (e) {
    console.error('session:list error:', e)
    return []
  }
})

ipcMain.handle('session:load', (_, id) => {
  ensureSessionsDir()
  const filePath = path.join(sessionsDir, `${id}.jsonl`)
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, 'utf-8').trim()
  return raw ? raw.split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
})

ipcMain.handle('session:delete', (_, id) => {
  ensureSessionsDir()
  const filePath = path.join(sessionsDir, `${id}.jsonl`)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
})

// ── AI Chat ──
// API key is NOT stored in code (repo is public).
// Set it in the app: Settings → API ключи, or manually in user.json ("nvidiaApiKey").
let NVIDIA_API_KEY = ''
try {
  const storedUser = loadUser()
  if (storedUser && storedUser.nvidiaApiKey) NVIDIA_API_KEY = storedUser.nvidiaApiKey
} catch (e) {}

ipcMain.handle('settings:getApiKey', async () => NVIDIA_API_KEY)

ipcMain.handle('settings:setApiKey', async (event, key) => {
  const trimmed = String(key || '').trim()
  if (!/^nvapi-[\w-]{20,}$/.test(trimmed)) return false
  NVIDIA_API_KEY = trimmed
  const user = loadUser() || { ...USER_DEFAULTS }
  user.nvidiaApiKey = trimmed
  saveUser(user)
  return true
})

// Active streaming requests: reqId -> AbortController (allows client cancel)
const activeStreams = new Map()

ipcMain.handle('nvidia:chat:start', async (event, { provider, model, messages, maxTokens, reqId }) => {
  const prov = PROVIDERS[provider]
  if (!prov) throw new Error(`Unknown provider: ${provider}`)
  if (!NVIDIA_API_KEY) throw new Error('API ключ не настроен. Откройте Settings → API ключи и добавьте nvapi-ключ.')

  const controller = new AbortController()
  if (reqId !== undefined) activeStreams.set(reqId, controller)

  try {
    const res = await fetch(`${prov.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens || 4096,
        stream: true
      }),
      signal: controller.signal
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`${provider} API error ${res.status}: ${errText}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content || ''
          if (content && !event.sender.isDestroyed()) {
            event.sender.send('nvidia:chat:chunk', { id: reqId, content })
          }
        } catch (e) {
          // skip malformed chunk
        }
      }
    }

    if (!event.sender.isDestroyed()) {
      event.sender.send('nvidia:chat:done', { id: reqId })
    }
  } finally {
    if (reqId !== undefined) activeStreams.delete(reqId)
  }
})

ipcMain.handle('nvidia:chat:stop', (event, reqId) => {
  const controller = activeStreams.get(reqId)
  if (controller) {
    activeStreams.delete(reqId)
    controller.abort()
  }
})

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
