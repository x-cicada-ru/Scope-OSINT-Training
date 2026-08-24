const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  readFile: (relativePath) => ipcRenderer.invoke('fs:readFile', relativePath),
  userRead: () => ipcRenderer.invoke('user:read'),
  userSave: (data) => ipcRenderer.invoke('user:save', data),
  settingsGetApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
  settingsSetApiKey: (key) => ipcRenderer.invoke('settings:setApiKey', key),

  nvidiaChatStream: (opts) => ipcRenderer.invoke('nvidia:chat:start', opts),
  nvidiaChatStop: (reqId) => ipcRenderer.invoke('nvidia:chat:stop', reqId),
  onNvidiaChunk: (cb) => {
    const handler = (_event, payload) => cb(payload)
    ipcRenderer.on('nvidia:chat:chunk', handler)
    return () => ipcRenderer.removeListener('nvidia:chat:chunk', handler)
  },
  onNvidiaDone: (cb) => {
    const handler = (_event, payload) => cb(payload)
    ipcRenderer.on('nvidia:chat:done', handler)
    return () => ipcRenderer.removeListener('nvidia:chat:done', handler)
  },

  sessionCreate: () => ipcRenderer.invoke('session:create'),
  sessionAppend: (data) => ipcRenderer.invoke('session:append', data),
  sessionList: () => ipcRenderer.invoke('session:list'),
  sessionLoad: (id) => ipcRenderer.invoke('session:load', id),
  sessionDelete: (id) => ipcRenderer.invoke('session:delete', id)
})
