const { app, BrowserWindow, ipcMain, desktopCapturer, session, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const portable = process.env.PORTABLE_EXECUTABLE_DIR || process.argv.includes('--portable');
if (portable && process.env.PORTABLE_EXECUTABLE_DIR) {
  app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'YingLuScreenData'));
}
let win;
let selectedSourceId = null;
let selectedSourceAudio = true;

function settingsFile(){ return path.join(app.getPath('userData'),'settings.json'); }
function readSettings(){
  try { return JSON.parse(fs.readFileSync(settingsFile(),'utf8')); } catch {}
  return { outputDir: path.join(app.getPath('videos'),'YingLu Screen') };
}
function saveSettings(s){
  fs.mkdirSync(path.dirname(settingsFile()),{recursive:true});
  fs.writeFileSync(settingsFile(),JSON.stringify(s,null,2),'utf8');
}
function ensureDir(d){ fs.mkdirSync(d,{recursive:true}); return d; }

function createWindow(){
  win = new BrowserWindow({
    width: 1460, height: 900, minWidth: 1100, minHeight: 720,
    title: '映录 Screen', backgroundColor: '#F4F7FB',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname,'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.removeMenu();
  win.loadFile('index.html');
}

app.whenReady().then(()=>{
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback)=>{
    try {
      const sources = await desktopCapturer.getSources({types:['screen','window']});
      const source = sources.find(s=>s.id===selectedSourceId) || sources.find(s=>s.id.startsWith('screen:')) || sources[0];
      if(!source) return callback({});
      const grant={video:source};
      if(process.platform==='win32' && request.audioRequested && selectedSourceAudio) grant.audio='loopback';
      callback(grant);
    } catch { callback({}); }
  });
  createWindow();
});

app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) createWindow(); });

ipcMain.handle('sources:list', async ()=>{
  const src=await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:320,height:180},fetchWindowIcons:true});
  return src.map(s=>({id:s.id,name:s.name,type:s.id.startsWith('screen:')?'screen':'window',thumbnail:s.thumbnail?.toDataURL()||''}));
});
ipcMain.handle('sources:choose',(_,p)=>{ selectedSourceId=p.id||null; selectedSourceAudio=p.audio!==false; return true; });
ipcMain.handle('settings:get',()=>readSettings());
ipcMain.handle('settings:choose-output', async ()=>{
  const r=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory']});
  if(r.canceled||!r.filePaths[0]) return null;
  const s=readSettings(); s.outputDir=r.filePaths[0]; saveSettings(s); return s;
});
ipcMain.handle('output:open',()=>{ const d=ensureDir(readSettings().outputDir); shell.openPath(d); return true; });

ipcMain.handle('recording:save', async (_, {name,buffer})=>{
  const s=readSettings(); const dir=ensureDir(s.outputDir);
  const safe=String(name||'recording.webm').replace(/[<>:"/\\|?*]/g,'_');
  let p=path.join(dir,safe),i=2,ext=path.extname(safe),base=path.basename(safe,ext);
  while(fs.existsSync(p)) p=path.join(dir,`${base}_${i++}${ext}`);
  fs.writeFileSync(p,Buffer.from(buffer));
  return p;
});
ipcMain.handle('screenshot:save', async (_, {name,dataUrl})=>{
  const s=readSettings(); const dir=ensureDir(s.outputDir);
  const safe=String(name||'screenshot.png').replace(/[<>:"/\\|?*]/g,'_');
  const p=path.join(dir,safe);
  const b64=String(dataUrl).replace(/^data:image\/png;base64,/,'');
  fs.writeFileSync(p,Buffer.from(b64,'base64'));
  return p;
});

ipcMain.on('window:min',()=>win?.minimize());
ipcMain.on('window:max',()=>{ if(!win) return; win.isMaximized()?win.unmaximize():win.maximize(); });
ipcMain.on('window:close',()=>win?.close());
