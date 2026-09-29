const { app, BrowserWindow, ipcMain, desktopCapturer, session, dialog, shell, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');

const portable = process.env.PORTABLE_EXECUTABLE_DIR || process.argv.includes('--portable');
if (portable && process.env.PORTABLE_EXECUTABLE_DIR) {
  app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'YingLuScreenData'));
}

let win;
let selectedSourceId = null;
let selectedSourceAudio = true;

const DEFAULTS = {
  outputDir: '',
  theme: 'light',
  resolution: '1920x1080',
  fps: 60,
  bitrate: 12000000,
  countdown: 3,
  autoStop: 0,
  cameraCorner: 'br',
  cameraShape: 'rounded',
  cameraSize: 24,
  watermarkText: '',
  showTimestamp: false,
  rememberPreview: true,
  filenamePattern: '映录_{date}_{time}',
  lastSourceName: '',
  lastSourceType: '',
  micDevice: '',
  cameraDevice: '',
  usePreset: 'custom',
  systemAudio: true,
  micAudio: true,
  cameraEnabled: false
};

function settingsFile(){ return path.join(app.getPath('userData'), 'settings.json'); }
function readSettings(){
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch {}
  return { ...DEFAULTS, outputDir: path.join(app.getPath('videos'), 'YingLu Screen'), ...saved };
}
function saveSettings(next){
  const merged = { ...readSettings(), ...(next || {}) };
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}
function ensureDir(d){ fs.mkdirSync(d, { recursive: true }); return d; }
function uniquePath(dir, name){
  const safe = String(name || 'capture.webm').replace(/[<>:"/\\|?*]/g, '_');
  let p = path.join(dir, safe), i = 2;
  const ext = path.extname(safe), base = path.basename(safe, ext);
  while (fs.existsSync(p)) p = path.join(dir, `${base}_${i++}${ext}`);
  return p;
}
function isMediaFile(name){ return /\.(webm|mp4|mkv|mov|gif|png|jpg|jpeg)$/i.test(name); }
function formatType(name){
  const ext = path.extname(name).toLowerCase();
  if (['.png','.jpg','.jpeg'].includes(ext)) return 'image';
  if (ext === '.gif') return 'gif';
  return 'video';
}

function createWindow(){
  win = new BrowserWindow({
    width: 1520,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    title: '映录 Screen',    backgroundColor: '#F4F6FA',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());
}

function registerShortcuts(){
  const map = [
    ['F9', 'record-toggle'],
    ['F10', 'record-pause'],
    ['F11', 'screenshot']
  ];
  for (const [key, event] of map) {
    try { globalShortcut.register(key, () => win?.webContents.send('hotkey', event)); } catch {}
  }
}

app.whenReady().then(() => {
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      const source = sources.find(s => s.id === selectedSourceId) || sources.find(s => s.id.startsWith('screen:')) || sources[0];
      if (!source) return callback({});
      const grant = { video: source };
      if (process.platform === 'win32' && request.audioRequested && selectedSourceAudio) grant.audio = 'loopback';
      callback(grant);
    } catch { callback({}); }
  });
  createWindow();
  registerShortcuts();
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle('app:info', () => ({ version: app.getVersion(), portable: !!portable, platform: process.platform }));
ipcMain.handle('sources:list', async () => {
  const src = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 480, height: 270 },
    fetchWindowIcons: true
  });
  return src.map(s => ({
    id: s.id,
    name: s.name,
    type: s.id.startsWith('screen:') ? 'screen' : 'window',
    thumbnail: s.thumbnail?.toDataURL() || ''
  }));
});
ipcMain.handle('sources:choose', (_, p) => {
  selectedSourceId = p?.id || null;
  selectedSourceAudio = p?.audio !== false;
  return true;
});

ipcMain.handle('settings:get', () => readSettings());
ipcMain.handle('settings:save', (_, next) => saveSettings(next));
ipcMain.handle('system:storage', () => {
  try {
    const dir = ensureDir(readSettings().outputDir);
    if (typeof fs.statfsSync !== 'function') return null;
    const st = fs.statfsSync(dir);
    return { free: Number(st.bavail) * Number(st.bsize), total: Number(st.blocks) * Number(st.bsize) };
  } catch { return null; }
});
ipcMain.handle('settings:choose-output', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  return saveSettings({ outputDir: r.filePaths[0] });
});
ipcMain.handle('output:open', () => {
  const d = ensureDir(readSettings().outputDir);
  shell.openPath(d);
  return true;
});
ipcMain.handle('output:list', () => {
  const dir = ensureDir(readSettings().outputDir);
  const items = [];
  for (const name of fs.readdirSync(dir)) {
    if (!isMediaFile(name)) continue;
    const full = path.join(dir, name);
    let st;
    try { st = fs.statSync(full); } catch { continue; }
    if (!st.isFile()) continue;
    items.push({ name, path: full, size: st.size, mtimeMs: st.mtimeMs, type: formatType(name) });
  }
  items.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return items.slice(0, 200);
});
ipcMain.handle('file:open', (_, p) => shell.openPath(String(p || '')));
ipcMain.handle('file:show', (_, p) => { shell.showItemInFolder(String(p || '')); return true; });
ipcMain.handle('file:delete', async (_, p) => {
  const target = String(p || '');
  if (!target || !fs.existsSync(target)) return false;
  const result = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['删除', '取消'],
    defaultId: 1,
    cancelId: 1,
    title: '删除录制文件',
    message: `确定删除“${path.basename(target)}”吗？`,
    detail: '此操作会删除本地文件。'
  });
  if (result.response !== 0) return false;
  try { fs.unlinkSync(target); return true; } catch { return false; }
});

ipcMain.handle('recording:save', async (_, { name, buffer }) => {
  const dir = ensureDir(readSettings().outputDir);
  const p = uniquePath(dir, name || 'recording.webm');
  fs.writeFileSync(p, Buffer.from(buffer));
  return { path: p, size: fs.statSync(p).size };
});
ipcMain.handle('screenshot:save', async (_, { name, dataUrl }) => {
  const dir = ensureDir(readSettings().outputDir);
  const p = uniquePath(dir, name || 'screenshot.png');
  const b64 = String(dataUrl).replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(p, Buffer.from(b64, 'base64'));
  return { path: p, size: fs.statSync(p).size };
});

ipcMain.on('window:min', () => win?.minimize());
ipcMain.on('window:max', () => { if (!win) return; win.isMaximized() ? win.unmaximize() : win.maximize(); });
ipcMain.on('window:close', () => win?.close());
ipcMain.handle('window:pin', (_, enabled) => { win?.setAlwaysOnTop(!!enabled, 'floating'); return !!enabled; });
