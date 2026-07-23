const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendSlideUpdate: (slide) => {
    ipcRenderer.send('slide-update', slide);
  },
  onSlideUpdate: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('slide-update-relay', subscription);
    return () => {
      ipcRenderer.removeListener('slide-update-relay', subscription);
    };
  },
  writeClipboard: (text) => {
    ipcRenderer.send('write-clipboard', text);
  }
});
