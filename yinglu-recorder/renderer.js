const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let settings = {};
let appInfo = {};
let mode = 'screen';
let selectedSource = null;
let sourceFilter = 'all';
let sourceCache = [];
let displayStream = null;
let micStream = null;
let cameraStream = null;
let recorder = null;
let recordStream = null;
let audioContext = null;
let mixDestination = null;
let recording = false;
let paused = false;
let startedAt = 0;
let pausedTotal = 0;
let pauseStartedAt = 0;
let timerHandle = null;
let autoStopHandle = null;
let renderHandle = null;
let meterHandle = null;
let regionPicking = false;
let regionDrag = null;
let region = null;
let sourceNative = { width: 0, height: 0 };
let pinEnabled = false;
let deviceCache = { audio: [], video: [] };
let storageInfo = null;
let lastSavedPath = '';
let preflightBusy = false;

const preview = $('#previewVideo');
const cameraVideo = $('#cameraVideo');
const canvas = $('#compositeCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

function toast(message, type='ok'){
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toastStack').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
function escapeHtml(v){ return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function pad(v){ return String(v).padStart(2,'0'); }
function stamp(){ const d=new Date(); return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }
function timeFmt(ms){ const s=Math.max(0,Math.floor(ms/1000)); return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`; }
function sizeFmt(bytes){ if(bytes<1024) return `${bytes} B`; if(bytes<1024**2) return `${(bytes/1024).toFixed(1)} KB`; if(bytes<1024**3) return `${(bytes/1024**2).toFixed(1)} MB`; return `${(bytes/1024**3).toFixed(2)} GB`; }
function shortPath(p){ if(!p) return '—'; return p.length>42 ? `…${p.slice(-41)}` : p; }
function stopTracks(s){ s?.getTracks().forEach(t => t.stop()); }
function supportedVideoMime(){ for(const m of ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']) if(MediaRecorder.isTypeSupported(m)) return m; return ''; }
function supportedAudioMime(){ for(const m of ['audio/webm;codecs=opus','audio/webm']) if(MediaRecorder.isTypeSupported(m)) return m; return ''; }
function elapsedMs(){ if(!recording) return 0; const now=paused?pauseStartedAt:Date.now(); return now-startedAt-pausedTotal; }

function modeLabel(v=mode){ return ({screen:'全屏',window:'窗口',region:'区域',device:'摄像头',audio:'音频'})[v]||'录制'; }
function safeFilePart(v){ return String(v||'').replace(/[<>:"/\\|?*\x00-\x1F]/g,'_').replace(/\s+/g,' ').trim().slice(0,48)||'未命名'; }
function fileTokens(){
  const d=new Date(), date=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`, time=`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return {date,time,mode:safeFilePart(modeLabel()),source:safeFilePart(selectedSource?.name||(mode==='device'?'摄像头':'录制来源'))};
}
function recordingFilename(onlyAudio=false){
  const t=fileTokens(); let pattern=$('#filenamePattern')?.value?.trim()||settings.filenamePattern||'映录_{date}_{time}';
  pattern=pattern.replace(/\{date\}/g,t.date).replace(/\{time\}/g,t.time).replace(/\{mode\}/g,t.mode).replace(/\{source\}/g,t.source);
  pattern=safeFilePart(pattern); if(onlyAudio&&!/音频/.test(pattern)) pattern=`${pattern}_音频`; return `${pattern}.webm`;
}
function updateFilenamePreview(){ const el=$('#filenamePreview'); if(el) el.textContent=recordingFilename(mode==='audio'); }
function iconUse(id){ return `<svg viewBox="0 0 24 24"><use href="#${id}"/></svg>`; }
function setReadyState(id,state,detail){ const el=$(id); if(!el)return; el.classList.remove('ok','warn','off'); el.classList.add(state); el.querySelector('small').textContent=detail; }
async function refreshDevices(){
  try{
    const list=await navigator.mediaDevices.enumerateDevices();
    deviceCache.audio=list.filter(x=>x.kind==='audioinput'); deviceCache.video=list.filter(x=>x.kind==='videoinput');
    const fill=(sel,items,empty)=>{ if(!sel)return; const current=sel.value; sel.innerHTML=`<option value="">${empty}</option>`+items.map((x,i)=>`<option value="${escapeHtml(x.deviceId)}">${escapeHtml(x.label||`${i+1} 号设备`)}</option>`).join(''); if([...sel.options].some(o=>o.value===current))sel.value=current; };
    fill($('#micDevice'),deviceCache.audio,'系统默认麦克风'); fill($('#cameraDevice'),deviceCache.video,'系统默认摄像头');
    return deviceCache;
  }catch{ return deviceCache; }
}
async function runPreflight(showToast=false){
  if(preflightBusy)return; preflightBusy=true; $('#runCheckBtn')?.classList.add('busy');
  try{
    await refreshDevices();
    const sourceOk=mode==='device'||!!selectedSource;
    setReadyState('#sourceReady',sourceOk?'ok':'warn',sourceOk?(mode==='device'?'摄像头设备':selectedSource.name):'请选择来源');
    const micOn=$('#micAudio')?.checked; setReadyState('#micReady',!micOn?'off':(deviceCache.audio.length?'ok':'warn'),!micOn?'已关闭':(deviceCache.audio.length?`${deviceCache.audio.length} 个可用`:'未检测到'));
    const camOn=$('#cameraToggle')?.checked||mode==='device'; setReadyState('#cameraReady',!camOn?'off':(deviceCache.video.length?'ok':'warn'),!camOn?'未启用':(deviceCache.video.length?`${deviceCache.video.length} 个可用`:'未检测到'));
    try{ storageInfo=await window.yinglu.storage(); }catch{ storageInfo=null; }
    if(storageInfo?.free!=null){ const free=storageInfo.free; setReadyState('#storageReady',free>1024**3*2?'ok':'warn',`${sizeFmt(free)} 可用`); $('#storageDetail').textContent=`${sizeFmt(free)} 可用 / ${sizeFmt(storageInfo.total||0)} 总容量`; }
    else { setReadyState('#storageReady','warn','无法读取'); $('#storageDetail').textContent='无法读取磁盘空间'; }
    if(showToast) toast(sourceOk?'检查完成，可以开始录制。':'检查完成：请先选择录制来源。',sourceOk?'ok':'warn');
  }finally{preflightBusy=false;$('#runCheckBtn')?.classList.remove('busy');}
}
function updateRecentSourceUI(){
  const has=!!settings.lastSourceName; $('#lastSourceBtn')?.classList.toggle('hidden',!has||mode==='device'); $('#recentSource')?.classList.toggle('hidden',!has);
  if(has) $('#recentSourceName').textContent=settings.lastSourceName;
}
async function selectLastSource(quiet=false){
  if(!settings.lastSourceName)return false; await loadSources();
  const found=sourceCache.find(x=>x.name===settings.lastSourceName&&(!settings.lastSourceType||x.type===settings.lastSourceType))||sourceCache.find(x=>x.name===settings.lastSourceName);
  if(!found){ if(!quiet)toast('上次录制来源当前不可用。','warn'); return false; }
  await chooseSource(found,{quiet}); return true;
}
async function quickRecord(){
  setPage('recorder');
  if(recording){stopRecording();return;}
  if(mode!=='device'&&!selectedSource){ const ok=await selectLastSource(true); if(!ok){$('#sourceModal').classList.remove('hidden');await loadSources();toast('请选择录制来源后即可开始。','warn');return;} }
  await startRecording();
}
function applyUsePreset(v){
  const presets={
    presentation:{mode:'screen',res:'1920x1080',fps:'60',bit:'12000000',sys:true,mic:true,cam:false,count:'3'},
    course:{mode:'screen',res:'1920x1080',fps:'30',bit:'8000000',sys:true,mic:true,cam:true,count:'3'},
    meeting:{mode:'window',res:'1920x1080',fps:'30',bit:'8000000',sys:true,mic:true,cam:true,count:'3'},
    game:{mode:'screen',res:'2560x1440',fps:'60',bit:'20000000',sys:true,mic:true,cam:false,count:'3'}
  };
  if(!presets[v])return; const p=presets[v]; setMode(p.mode); $('#resolution').value=p.res;$('#fps').value=p.fps;$('#bitrate').value=p.bit;$('#countdown').value=p.count;$('#sysAudio').checked=p.sys;$('#micAudio').checked=p.mic;$('#cameraToggle').checked=p.cam; updateQualityLabel(); ensureCamera(); saveCurrentDefaults(); runPreflight(); toast('已应用用途预设');
}
function showPostRecord(path,size){
  lastSavedPath=path||''; const bar=$('#postRecordBar'); if(!bar)return; $('#postRecordMeta').textContent=`${sizeFmt(size||0)} · ${path||'已保存到本地'}`; bar.classList.remove('hidden'); clearTimeout(showPostRecord._t); showPostRecord._t=setTimeout(()=>bar.classList.add('hidden'),12000);
}

function setPage(page){
  $$('.page').forEach(x => x.classList.toggle('active', x.id===`page-${page}`));
  $$('.navItem').forEach(x => x.classList.toggle('active', x.dataset.page===page));
  const map={recorder:['录制工作台','高清录制屏幕、摄像头与声音，轻松创建专业视频'],library:['录制库','管理本地录制文件与截图'],settings:['偏好设置','外观、保存、命名与快捷操作']};
  $('#pageTitle').textContent=map[page][0]; $('#pageSubtitle').textContent=map[page][1];
  if(page==='library') loadLibrary();
}

function applyTheme(theme){ document.documentElement.dataset.theme = theme==='dark'?'dark':'light'; $('#themeSelect').value=theme==='dark'?'dark':'light'; }
async function persist(partial){ settings = await window.yinglu.saveSettings(partial); }

function applyCameraPreviewStyle(){
  const corner=$('#cameraCorner').value, shape=$('#cameraShape').value, size=+$('#cameraSize').value;
  cameraVideo.className=`cameraPreview ${corner} ${shape}${cameraStream?'':' hidden'}`;
  cameraVideo.style.width=`${size}%`;
}

async function ensureCamera(){
  if(!$('#cameraToggle').checked && mode!=='device') { stopTracks(cameraStream); cameraStream=null; cameraVideo.srcObject=null; cameraVideo.classList.add('hidden'); return null; }
  if(cameraStream?.active){ applyCameraPreviewStyle(); return cameraStream; }
  try{
    const deviceId=$('#cameraDevice')?.value||'';
    cameraStream = await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30},...(deviceId?{deviceId:{exact:deviceId}}:{})},audio:false});
    cameraVideo.srcObject=cameraStream;
    await cameraVideo.play().catch(()=>{});
    applyCameraPreviewStyle();
    return cameraStream;
  }catch(e){
    $('#cameraToggle').checked=false;
    toast('摄像头不可用，请检查系统隐私权限。','warn');
    return null;
  }
}

function stopPreview(){
  if(recording) return;
  stopTracks(displayStream); displayStream=null;
  preview.srcObject=null; preview.classList.add('hidden');
  sourceNative={width:0,height:0};
  $('#previewResolution').textContent='—'; $('#previewFps').textContent='—';
  $('#emptyPreview').classList.remove('hidden');
  $('#stateDot').className='stateDot'; $('#stateText').textContent='就绪';
  region=null; updateRegionBox();
}

async function startPreview(){
  if(mode==='device'){
    stopTracks(displayStream); displayStream=null;
    preview.srcObject=null; preview.classList.add('hidden');
    $('#emptyPreview').classList.add('hidden');
    await ensureCamera();
    $('#sourceHeading').textContent='摄像头设备'; $('#selectedSourceLabel').textContent='摄像头录制';
    $('#stateDot').className='stateDot ready'; $('#stateText').textContent='预览中';
    return;
  }
  if(!selectedSource) return;
  if(recording) return;
  stopTracks(displayStream); displayStream=null;
  await window.yinglu.chooseSource(selectedSource.id,$('#sysAudio').checked);
  try{
    displayStream = await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:+$('#fps').value}},audio:$('#sysAudio').checked});
    preview.srcObject=displayStream; preview.classList.remove('hidden'); $('#emptyPreview').classList.add('hidden');
    await preview.play();
    await new Promise(r => preview.videoWidth ? r() : preview.addEventListener('loadedmetadata',r,{once:true}));
    sourceNative={width:preview.videoWidth,height:preview.videoHeight};
    $('#previewResolution').textContent=`${sourceNative.width} × ${sourceNative.height}`;
    const track=displayStream.getVideoTracks()[0],fr=Math.round(track.getSettings().frameRate||+$('#fps').value||0); $('#previewFps').textContent=`${fr} FPS`;
    $('#stateDot').className='stateDot ready'; $('#stateText').textContent='预览中';
    displayStream.getVideoTracks()[0]?.addEventListener('ended',()=>{ if(recording) stopRecording(); else stopPreview(); },{once:true});
    if($('#cameraToggle').checked) await ensureCamera();
    updateRegionBox();
  }catch(e){
    stopPreview();
    toast('无法开始屏幕预览，请重新选择录制来源。','warn');
  }
}

function videoDisplayRect(){
  const stage=$('#previewStage').getBoundingClientRect();
  const sw=stage.width,sh=stage.height,vw=preview.videoWidth||16,vh=preview.videoHeight||9;
  const scale=Math.min(sw/vw,sh/vh),w=vw*scale,h=vh*scale;
  return {x:(sw-w)/2,y:(sh-h)/2,w,h,stage};
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function updateRegionBox(){
  const box=$('#regionBox');
  if(mode!=='region'||!region||!preview.videoWidth){ box.classList.add('hidden'); $('#stageBadge').classList.add('hidden'); return; }
  const r=videoDisplayRect();
  const x=r.x+(region.x/preview.videoWidth)*r.w, y=r.y+(region.y/preview.videoHeight)*r.h;
  const w=(region.w/preview.videoWidth)*r.w, h=(region.h/preview.videoHeight)*r.h;
  Object.assign(box.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
  box.querySelector('span').textContent=`${Math.round(region.w)} × ${Math.round(region.h)}`;
  box.classList.remove('hidden'); $('#stageBadge').classList.remove('hidden');
}
function beginRegionPick(){
  if(!displayStream){toast('请先选择来源并开始预览。','warn');return;}
  regionPicking=true; $('#regionPickBtn').textContent='拖动鼠标框选…'; $('#previewStage').style.cursor='crosshair';
}
function stagePoint(ev){ const rect=$('#previewStage').getBoundingClientRect(); return {x:ev.clientX-rect.left,y:ev.clientY-rect.top}; }
function pointerToVideo(p){
  const r=videoDisplayRect();
  const x=clamp(p.x-r.x,0,r.w),y=clamp(p.y-r.y,0,r.h);
  return {x:x/r.w*preview.videoWidth,y:y/r.h*preview.videoHeight};
}
$('#previewStage').addEventListener('pointerdown',ev=>{ if(!regionPicking)return; const p=stagePoint(ev); const r=videoDisplayRect(); if(p.x<r.x||p.x>r.x+r.w||p.y<r.y||p.y>r.y+r.h)return; regionDrag={start:pointerToVideo(p),current:pointerToVideo(p)}; });
$('#previewStage').addEventListener('pointermove',ev=>{ if(!regionPicking||!regionDrag)return; regionDrag.current=pointerToVideo(stagePoint(ev)); const a=regionDrag.start,b=regionDrag.current; region={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)}; updateRegionBox(); });
$('#previewStage').addEventListener('pointerup',()=>{
  if(!regionPicking||!regionDrag)return;
  regionPicking=false; regionDrag=null; $('#previewStage').style.cursor=''; $('#regionPickBtn').textContent='重新框选';
  if(!region||region.w<50||region.h<50){region=null;updateRegionBox();toast('区域太小，请重新框选。','warn');return;}
  toast('录制区域已设置');
});
window.addEventListener('resize',updateRegionBox);

function outputSize(srcW,srcH){
  const [mw,mh]=$('#resolution').value.split('x').map(Number),ratio=srcW/srcH;
  let w=mw,h=Math.round(w/ratio);
  if(h>mh){h=mh;w=Math.round(h*ratio);}
  w=Math.max(2,w-(w%2)); h=Math.max(2,h-(h%2));
  return {w,h};
}
function roundedRect(c,x,y,w,h,r){ c.beginPath(); c.roundRect(x,y,w,h,r); c.closePath(); }
function drawVideoCover(c,video,x,y,w,h){
  const vw=video.videoWidth||w,vh=video.videoHeight||h,scale=Math.max(w/vw,h/vh),sw=w/scale,sh=h/scale,sx=(vw-sw)/2,sy=(vh-sh)/2;
  c.drawImage(video,sx,sy,sw,sh,x,y,w,h);
}
function cameraRect(w,h){
  const pct=+$('#cameraSize').value/100, cw=Math.round(w*pct),ch=$('#cameraShape').value==='circle'?cw:Math.round(cw*0.75),pad=Math.round(w*.018);
  const corner=$('#cameraCorner').value;
  let x=corner.endsWith('r')?w-cw-pad:pad, y=corner.startsWith('b')?h-ch-pad:pad;
  return {x,y,w:cw,h:ch};
}
function drawOverlayFrame(c,w,h){
  if($('#cameraToggle').checked && cameraStream && cameraVideo.readyState>=2){
    const r=cameraRect(w,h),shape=$('#cameraShape').value;
    c.save();
    if(shape==='circle'){c.beginPath();c.arc(r.x+r.w/2,r.y+r.h/2,r.w/2,0,Math.PI*2);c.clip();}
    else if(shape==='rounded'){roundedRect(c,r.x,r.y,r.w,r.h,Math.max(12,Math.round(r.w*.06)));c.clip();}
    drawVideoCover(c,cameraVideo,r.x,r.y,r.w,r.h);
    c.restore();
    c.save(); c.lineWidth=Math.max(2,Math.round(w*.002)); c.strokeStyle='rgba(255,255,255,.92)';
    if(shape==='circle'){c.beginPath();c.arc(r.x+r.w/2,r.y+r.h/2,r.w/2,0,Math.PI*2);c.stroke();}
    else {roundedRect(c,r.x,r.y,r.w,r.h,shape==='rounded'?Math.max(12,Math.round(r.w*.06)):1);c.stroke();}
    c.restore();
  }
  const wm=$('#watermarkText').value.trim(), showTs=$('#timestampToggle').checked;
  c.save(); c.font=`600 ${Math.max(14,Math.round(w*.014))}px "Segoe UI","Microsoft YaHei",sans-serif`; c.textBaseline='middle';
  if(wm){ const pad=Math.round(w*.009),tw=c.measureText(wm).width,bh=Math.round(w*.028),x=Math.round(w*.018),y=h-bh-Math.round(w*.018); c.fillStyle='rgba(7,10,16,.56)'; roundedRect(c,x,y,tw+pad*2,bh,Math.round(bh*.28));c.fill(); c.fillStyle='rgba(255,255,255,.93)';c.fillText(wm,x+pad,y+bh/2); }
  if(showTs){ const d=new Date(),txt=`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,pad=Math.round(w*.009),tw=c.measureText(txt).width,bh=Math.round(w*.028),x=w-tw-pad*2-Math.round(w*.018),y=Math.round(w*.018); c.fillStyle='rgba(7,10,16,.56)';roundedRect(c,x,y,tw+pad*2,bh,Math.round(bh*.28));c.fill();c.fillStyle='rgba(255,255,255,.93)';c.fillText(txt,x+pad,y+bh/2); }
  c.restore();
}
function pad2(n){return String(n).padStart(2,'0')}
function renderCompositeFrame(){
  let baseVideo = mode==='device'?cameraVideo:preview;
  if(!baseVideo || baseVideo.readyState<2) return;
  const nativeW=baseVideo.videoWidth||1280,nativeH=baseVideo.videoHeight||720;
  let crop={x:0,y:0,w:nativeW,h:nativeH};
  if(mode==='region'&&region) crop={...region};
  const out=outputSize(crop.w,crop.h);
  if(canvas.width!==out.w||canvas.height!==out.h){canvas.width=out.w;canvas.height=out.h;}
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(baseVideo,crop.x,crop.y,crop.w,crop.h,0,0,canvas.width,canvas.height);
  if(mode!=='device') drawOverlayFrame(ctx,canvas.width,canvas.height);
  else {
    const wm=$('#watermarkText').value.trim(); if(wm||$('#timestampToggle').checked) drawOverlayFrame(ctx,canvas.width,canvas.height);
  }
}
function startRenderLoop(){ cancelAnimationFrame(renderHandle); const loop=()=>{renderCompositeFrame(); renderHandle=requestAnimationFrame(loop)}; loop(); }
function stopRenderLoop(){ cancelAnimationFrame(renderHandle); renderHandle=null; }

async function ensureMic(){
  if(!$('#micAudio').checked){ stopTracks(micStream); micStream=null; return null; }
  if(micStream?.active) return micStream;
  try{ const deviceId=$('#micDevice')?.value||''; micStream=await navigator.mediaDevices.getUserMedia({audio:{noiseSuppression:true,echoCancellation:false,autoGainControl:false,...(deviceId?{deviceId:{exact:deviceId}}:{})},video:false}); return micStream; }
  catch(e){ $('#micAudio').checked=false; toast('麦克风不可用，将继续录制其他音频。','warn'); return null; }
}
function analyserFor(stream){
  if(!stream?.getAudioTracks().length) return null;
  const src=audioContext.createMediaStreamSource(new MediaStream(stream.getAudioTracks())); const a=audioContext.createAnalyser();a.fftSize=512;src.connect(a);return {src,a};
}
function meterValue(a){ if(!a)return 0; const data=new Uint8Array(a.frequencyBinCount);a.getByteFrequencyData(data);let sum=0;for(const v of data)sum+=v;return Math.min(100,(sum/data.length)/1.3); }
function startMeters(sysAnalyser,micAnalyser){
  cancelAnimationFrame(meterHandle); const loop=()=>{ $('#systemMeter').style.width=`${Math.max(3,meterValue(sysAnalyser?.a))}%`; $('#micMeter').style.width=`${Math.max(3,meterValue(micAnalyser?.a))}%`; meterHandle=requestAnimationFrame(loop);};loop();
}
function stopMeters(){cancelAnimationFrame(meterHandle);meterHandle=null;$('#systemMeter').style.width='3%';$('#micMeter').style.width='3%';}

async function buildRecordStream(){
  if(mode!=='device'&&!displayStream) await startPreview();
  if(mode==='device') await ensureCamera();
  if(mode==='region'&&!region) throw new Error('请先框选录制区域');
  await ensureMic();
  audioContext=new AudioContext(); mixDestination=audioContext.createMediaStreamDestination();
  let sysAnalyser=null,micAnalyser=null;
  if($('#sysAudio').checked&&displayStream?.getAudioTracks().length){ const s=new MediaStream(displayStream.getAudioTracks()); const src=audioContext.createMediaStreamSource(s); src.connect(mixDestination); sysAnalyser=analyserFor(s); }
  if($('#micAudio').checked&&micStream?.getAudioTracks().length){ const src=audioContext.createMediaStreamSource(micStream); src.connect(mixDestination); micAnalyser=analyserFor(micStream); }
  startMeters(sysAnalyser,micAnalyser); $('#audioStatus').textContent='活动';
  const out=new MediaStream();
  if(mode!=='audio'){
    startRenderLoop(); renderCompositeFrame(); const fps=+$('#fps').value; const cvs=canvas.captureStream(fps); cvs.getVideoTracks().forEach(t=>out.addTrack(t));
  }
  mixDestination.stream.getAudioTracks().forEach(t=>out.addTrack(t));
  return out;
}

async function countdown(){
  const total=+$('#countdown').value;if(!total)return;
  $('#countdownOverlay').classList.remove('hidden');
  for(let i=total;i>0;i--){$('#countdownNumber').textContent=i;await new Promise(r=>setTimeout(r,1000));}
  $('#countdownOverlay').classList.add('hidden');
}

async function startRecording(){
  if(recording)return;
  await runPreflight();
  if(mode!=='device'&&!selectedSource) throw new Error('请先选择录制来源');
  if(storageInfo?.free!=null && storageInfo.free < 512*1024*1024) throw new Error('磁盘剩余空间不足 512 MB，请先清理空间或更换保存目录');
  if($('#cameraToggle').checked) await ensureCamera();
  await countdown();
  recordStream=await buildRecordStream();
  if(!recordStream.getTracks().length) throw new Error('没有可录制的音视频轨道');
  const onlyAudio=mode==='audio'; const mime=onlyAudio?supportedAudioMime():supportedVideoMime();
  const opts={mimeType:mime,audioBitsPerSecond:192000}; if(!onlyAudio)opts.videoBitsPerSecond=+$('#bitrate').value;
  recorder=new MediaRecorder(recordStream,opts); const chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=async()=>{
    try{
      const blob=new Blob(chunks,{type:mime}); const buf=await blob.arrayBuffer();
      const res=await window.yinglu.saveRecording(recordingFilename(onlyAudio),buf);
      toast(`录制已保存 · ${sizeFmt(res.size)}`); $('#dockState').textContent='录制完成'; showPostRecord(res.path,res.size); await loadLibrary();
    }catch(e){toast('保存录制文件失败。','warn')}
    finishRecordingState();
  };
  recorder.start(1000); recording=true;paused=false;startedAt=Date.now();pausedTotal=0;
  await window.yinglu.recordingGuard({enabled:true,keepAwake:$('#keepAwakeToggle')?.checked!==false,minimize:!!$('#minimizeOnRecordToggle')?.checked});
  $('#recordBtn').classList.add('stop');$('#recordLabel').textContent='停止录制';$('#pauseBtn').disabled=false;$('#pauseLabel').textContent='暂停';
  $('#recordDot').classList.add('live');$('#stateDot').className='stateDot live';$('#stateText').textContent='正在录制';$('#dockState').textContent='正在录制';
  timerHandle=setInterval(updateTimer,250); updateTimer();
  const stopSec=+$('#autoStop').value;if(stopSec>0)autoStopHandle=setTimeout(()=>{if(recording)stopRecording();},stopSec*1000);
}
function updateTimer(){
  const ms=elapsedMs(); $('#timer').textContent=timeFmt(ms); const bytes=(+$('#bitrate').value+192000)/8*(ms/1000); $('#sizeEstimate').textContent=`预计大小 ${sizeFmt(bytes)}`;
}
function togglePause(){
  if(!recording||!recorder)return;
  if(!paused){recorder.pause();paused=true;pauseStartedAt=Date.now();$('#pauseLabel').textContent='继续';$('#stateDot').className='stateDot paused';$('#stateText').textContent='已暂停';$('#dockState').textContent='录制已暂停';}
  else{recorder.resume();paused=false;pausedTotal+=Date.now()-pauseStartedAt;$('#pauseLabel').textContent='暂停';$('#stateDot').className='stateDot live';$('#stateText').textContent='正在录制';$('#dockState').textContent='正在录制';}
}
function stopRecording(){ if(recorder&&recorder.state!=='inactive')recorder.stop(); }
function finishRecordingState(){
  recording=false;paused=false;clearInterval(timerHandle);clearTimeout(autoStopHandle);timerHandle=autoStopHandle=null;
  $('#timer').textContent='00:00:00';$('#sizeEstimate').textContent='预计大小 0 MB';$('#recordDot').classList.remove('live');$('#recordBtn').classList.remove('stop');$('#recordLabel').textContent='开始录制';$('#pauseBtn').disabled=true;$('#pauseLabel').textContent='暂停';
  $('#stateDot').className=displayStream||cameraStream?'stateDot ready':'stateDot';$('#stateText').textContent=displayStream||cameraStream?'预览中':'就绪';$('#audioStatus').textContent='待机';
  stopRenderLoop(); stopMeters(); recordStream?.getTracks().forEach(t=>t.stop()); recordStream=null;
  audioContext?.close().catch(()=>{});audioContext=null;mixDestination=null; stopTracks(micStream);micStream=null;
  window.yinglu.recordingGuard({enabled:false}).catch(()=>{});
}

async function screenshot(){
  if(mode!=='device'&&!displayStream){toast('请先选择来源并开始预览。','warn');return;}
  if(mode==='device'&&!cameraStream)await ensureCamera();
  renderCompositeFrame();
  try{const res=await window.yinglu.saveScreenshot(`截图_${stamp()}.png`,canvas.toDataURL('image/png'));toast(`截图已保存 · ${sizeFmt(res.size)}`);loadLibrary();}
  catch(e){toast('截图保存失败。','warn')}
}

function setMode(next){
  if(recording){toast('录制过程中不能切换模式。','warn');return;}
  mode=next; $$('.modeTab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  $('#regionPickBtn').classList.toggle('hidden',mode!=='region');
  if(mode==='device'){selectedSource=null;$('#selectedSourceLabel').textContent='摄像头录制';$('#sourceHeading').textContent='摄像头设备';$('#selectSourceBtn').classList.add('hidden');startPreview();}
  else{$('#selectSourceBtn').classList.remove('hidden');if(selectedSource){$('#sourceHeading').textContent=selectedSource.name;startPreview();}else stopPreview();}
  if(mode!=='region'){region=null;updateRegionBox();}
  updateRecentSourceUI(); updateFilenamePreview(); runPreflight();
}

async function loadSources(){
  $('#sourceGrid').innerHTML='<div class="rowMuted">正在读取屏幕和窗口…</div>';
  sourceCache=await window.yinglu.listSources(); renderSources(); updateRecentSourceUI();
}
function renderSources(){
  const q=$('#sourceSearch').value.trim().toLowerCase();
  const list=sourceCache.filter(x=>(sourceFilter==='all'||x.type===sourceFilter)&&(!q||x.name.toLowerCase().includes(q)));
  $('#sourceGrid').innerHTML=list.map((x,i)=>`<button class="sourceCard" data-i="${sourceCache.indexOf(x)}"><img src="${x.thumbnail}"><div><strong>${escapeHtml(x.name)}</strong><span>${x.type==='screen'?'显示器':'窗口'}</span></div></button>`).join('')||'<div class="rowMuted">没有匹配的录制来源</div>';
}
async function chooseSource(x,{quiet=false}={}){
  selectedSource=x; $('#sourceModal').classList.add('hidden'); $('#sourceHeading').textContent=x.name; $('#selectedSourceLabel').textContent=x.name; region=null; updateRegionBox();
  settings=await window.yinglu.saveSettings({lastSourceName:x.name,lastSourceType:x.type}); updateRecentSourceUI(); updateFilenamePreview(); await startPreview(); await runPreflight(); if(!quiet)toast('录制来源已就绪');
}

function applyQualityPreset(v){
  const map={balanced:['1920x1080','60','12000000'],smooth:['1920x1080','30','8000000'],sharp:['2560x1440','60','20000000'],ultra:['3840x2160','60','35000000']};
  if(!map[v])return;[$('#resolution').value,$('#fps').value,$('#bitrate').value]=map[v];updateQualityLabel();saveCurrentDefaults();
}
function updateQualityLabel(){ const t=$('#resolution').selectedOptions[0]?.textContent||'';$('#qualityLabel').textContent=`${t} · ${$('#fps').value}FPS`; }
async function saveCurrentDefaults(){
  await persist({resolution:$('#resolution').value,fps:+$('#fps').value,bitrate:+$('#bitrate').value,countdown:+$('#countdown').value,autoStop:+$('#autoStop').value,cameraCorner:$('#cameraCorner').value,cameraShape:$('#cameraShape').value,cameraSize:+$('#cameraSize').value,watermarkText:$('#watermarkText').value,showTimestamp:$('#timestampToggle').checked,theme:$('#themeSelect').value,micDevice:$('#micDevice')?.value||'',cameraDevice:$('#cameraDevice')?.value||'',filenamePattern:$('#filenamePattern')?.value?.trim()||'映录_{date}_{time}',usePreset:$('#usePreset')?.value||'custom',systemAudio:$('#sysAudio').checked,micAudio:$('#micAudio').checked,cameraEnabled:$('#cameraToggle').checked,keepAwake:$('#keepAwakeToggle')?.checked!==false,minimizeOnRecord:!!$('#minimizeOnRecordToggle')?.checked});
}

async function loadLibrary(){
  const items=await window.yinglu.listOutput(); $('#libraryCount').textContent=items.length;$('#statFiles').textContent=items.length;
  $('#statSize').textContent=sizeFmt(items.reduce((a,b)=>a+b.size,0));$('#statLatest').textContent=items[0]?new Date(items[0].mtimeMs).toLocaleString():'—';
  $('#libraryEmpty').classList.toggle('hidden',items.length>0);
  $('#libraryRows').innerHTML=items.map((x,i)=>`<div class="libraryRow" data-path="${escapeHtml(x.path)}"><div class="fileName"><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(x.path)}</span></div><div class="fileType">${x.type}</div><div class="rowMuted">${sizeFmt(x.size)}</div><div class="rowMuted">${new Date(x.mtimeMs).toLocaleString()}</div><div class="rowActions"><button data-act="open">${iconUse('i-open')}<span>打开</span></button><button data-act="show">${iconUse('i-locate')}<span>定位</span></button><button data-act="delete" class="danger">${iconUse('i-trash')}<span>删除</span></button></div></div>`).join('');
}

async function init(){
  settings=await window.yinglu.getSettings();appInfo=await window.yinglu.info();
  applyTheme(settings.theme);$('#themeSelect').value=settings.theme||'light';
  $('#resolution').value=settings.resolution||'1920x1080';$('#fps').value=String(settings.fps||60);$('#bitrate').value=String(settings.bitrate||12000000);$('#countdown').value=String(settings.countdown??3);$('#autoStop').value=String(settings.autoStop||0);
  $('#cameraCorner').value=settings.cameraCorner||'br';$('#cameraShape').value=settings.cameraShape||'rounded';$('#cameraSize').value=String(settings.cameraSize||24);$('#watermarkText').value=settings.watermarkText||'';$('#timestampToggle').checked=!!settings.showTimestamp;$('#sysAudio').checked=settings.systemAudio!==false;$('#micAudio').checked=settings.micAudio!==false;$('#cameraToggle').checked=!!settings.cameraEnabled;
  $('#filenamePattern').value=settings.filenamePattern||'映录_{date}_{time}'; $('#usePreset').value=settings.usePreset||'custom';
  if($('#keepAwakeToggle')) $('#keepAwakeToggle').checked=settings.keepAwake!==false;
  if($('#minimizeOnRecordToggle')) $('#minimizeOnRecordToggle').checked=!!settings.minimizeOnRecord;
  $('#outputPathFull').textContent=settings.outputDir;$('#savePathShort').textContent=shortPath(settings.outputDir);$('#versionText').textContent=`v${appInfo.version}${appInfo.portable?' · Portable':''}`;
  await refreshDevices();
  if(settings.micDevice&&[...$('#micDevice').options].some(o=>o.value===settings.micDevice))$('#micDevice').value=settings.micDevice;
  if(settings.cameraDevice&&[...$('#cameraDevice').options].some(o=>o.value===settings.cameraDevice))$('#cameraDevice').value=settings.cameraDevice;
  updateQualityLabel();applyCameraPreviewStyle();updateRecentSourceUI();updateFilenamePreview();await loadLibrary();await runPreflight();
  navigator.mediaDevices?.addEventListener?.('devicechange',async()=>{await refreshDevices();await runPreflight();});
}

$('#navList').onclick=e=>{const b=e.target.closest('.navItem');if(b)setPage(b.dataset.page)};
$('#modeTabs').onclick=e=>{const b=e.target.closest('.modeTab');if(b){$('#usePreset').value='custom';setMode(b.dataset.mode);saveCurrentDefaults();}};
async function openSourcePicker(){ $('#sourceModal').classList.remove('hidden'); await loadSources(); }
$('#selectSourceBtn').onclick=$('#emptySelectBtn').onclick=openSourcePicker;
$('#lastSourceBtn').onclick=()=>selectLastSource();
$('#recentSource').onclick=()=>selectLastSource();
$('#closeSourceModal').onclick=()=>$('#sourceModal').classList.add('hidden');
$('#sourceFilters').onclick=e=>{const b=e.target.closest('button');if(!b)return;sourceFilter=b.dataset.filter;$$('#sourceFilters button').forEach(x=>x.classList.toggle('active',x===b));renderSources();};
$('#sourceSearch').oninput=renderSources;
$('#sourceGrid').onclick=e=>{const b=e.target.closest('.sourceCard');if(!b)return;chooseSource(sourceCache[+b.dataset.i]);};
$('#regionPickBtn').onclick=beginRegionPick;
$('#recordBtn').onclick=async()=>{try{recording?stopRecording():await startRecording()}catch(e){toast(e.message||String(e),'warn');finishRecordingState();}};
$('#quickRecordBtn').onclick=async()=>{try{await quickRecord()}catch(e){toast(e.message||String(e),'warn')}};
$('#pauseBtn').onclick=togglePause;$('#shotBtn').onclick=screenshot;
$('#runCheckBtn').onclick=()=>runPreflight(true);
$('#cameraToggle').onchange=async()=>{await ensureCamera();applyCameraPreviewStyle();await runPreflight();saveCurrentDefaults()};
$('#micAudio').onchange=()=>{runPreflight();saveCurrentDefaults()};
$('#cameraDevice').onchange=async()=>{if(recording)return;stopTracks(cameraStream);cameraStream=null;cameraVideo.srcObject=null;if($('#cameraToggle').checked||mode==='device')await ensureCamera();saveCurrentDefaults();runPreflight();};
$('#micDevice').onchange=()=>{if(!recording){stopTracks(micStream);micStream=null;}saveCurrentDefaults();runPreflight();};
['cameraCorner','cameraShape','cameraSize'].forEach(id=>$('#'+id).onchange=()=>{applyCameraPreviewStyle();saveCurrentDefaults()});
['resolution','fps','bitrate','countdown','autoStop'].forEach(id=>$('#'+id).onchange=()=>{$('#usePreset').value='custom';updateQualityLabel();updateFilenamePreview();saveCurrentDefaults()});
$('#qualityPreset').onchange=e=>{$('#usePreset').value='custom';applyQualityPreset(e.target.value);};
$('#usePreset').onchange=e=>{if(e.target.value!=='custom')applyUsePreset(e.target.value);else saveCurrentDefaults();};
$('#timestampToggle').onchange=saveCurrentDefaults;$('#watermarkText').onchange=saveCurrentDefaults;$('#clearWatermark').onclick=()=>{$('#watermarkText').value='';saveCurrentDefaults()};
let nameTimer=0;$('#filenamePattern').oninput=()=>{updateFilenamePreview();clearTimeout(nameTimer);nameTimer=setTimeout(saveCurrentDefaults,350)};
$('#sysAudio').onchange=async()=>{if(displayStream&&!recording)await startPreview();runPreflight();saveCurrentDefaults()};
$('#themeSelect').onchange=async e=>{applyTheme(e.target.value);await persist({theme:e.target.value})};
$('#keepAwakeToggle').onchange=saveCurrentDefaults;$('#minimizeOnRecordToggle').onchange=saveCurrentDefaults;
$('#changeOutputBtn').onclick=$('#chooseOutputSettings').onclick=async()=>{const r=await window.yinglu.chooseOutput();if(r){settings=r;$('#outputPathFull').textContent=r.outputDir;$('#savePathShort').textContent=shortPath(r.outputDir);toast('保存目录已更新');loadLibrary();runPreflight();}};
$('#openOutputTop').onclick=$('#openOutputLibrary').onclick=()=>window.yinglu.openFolder();$('#refreshLibrary').onclick=loadLibrary;
$('#libraryRows').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const row=e.target.closest('.libraryRow'),p=row.dataset.path;if(b.dataset.act==='open')await window.yinglu.openFile(p);if(b.dataset.act==='show')await window.yinglu.showFile(p);if(b.dataset.act==='delete'){const ok=await window.yinglu.deleteFile(p);if(ok){toast('文件已删除');loadLibrary();runPreflight();}}};
$('#postOpen').onclick=()=>lastSavedPath&&window.yinglu.openFile(lastSavedPath);$('#postShow').onclick=()=>lastSavedPath&&window.yinglu.showFile(lastSavedPath);$('#postAgain').onclick=async()=>{$('#postRecordBar').classList.add('hidden');try{await quickRecord()}catch(e){toast(e.message||String(e),'warn')}};$('#postDismiss').onclick=()=>$('#postRecordBar').classList.add('hidden');
async function setPin(v){pinEnabled=await window.yinglu.pin(v);$('#pinBtn').classList.toggle('active',pinEnabled);$('#pinSetting').checked=pinEnabled;}
$('#pinBtn').onclick=()=>setPin(!pinEnabled);$('#pinSetting').onchange=e=>setPin(e.target.checked);
$('#minBtn').onclick=()=>window.yinglu.minimize();$('#maxBtn').onclick=()=>window.yinglu.maximize();$('#closeBtn').onclick=()=>window.yinglu.close();
window.yinglu.onHotkey(async event=>{try{if(event==='record-toggle')recording?stopRecording():await quickRecord();if(event==='record-pause')togglePause();if(event==='screenshot')await screenshot();}catch(e){toast(e.message||String(e),'warn')}});
window.addEventListener('beforeunload',()=>{stopRenderLoop();stopMeters();stopTracks(displayStream);stopTracks(micStream);stopTracks(cameraStream);audioContext?.close().catch(()=>{});window.yinglu.recordingGuard({enabled:false}).catch(()=>{});});

init();

/* v1.9.0 real-control UI interactions */
function setTargetInspectorTab(name){
  $$('#targetInspectorTabs button').forEach(b=>b.classList.toggle('active',b.dataset.targetTab===name));
  document.body.classList.toggle('preview-focus',name==='preview');
  if(name==='control'){
    $('#inspectorScroll')?.scrollTo({top:0,behavior:'smooth'});
  }else if(name==='more'){
    document.body.classList.remove('preview-focus');
    $('#qualitySection')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
$('#targetInspectorTabs')?.addEventListener('click',e=>{
  const b=e.target.closest('button[data-target-tab]');
  if(b)setTargetInspectorTab(b.dataset.targetTab);
});
$('#previewSnapBtn')?.addEventListener('click',()=>$('#shotBtn')?.click());
$('#previewRefreshBtn')?.addEventListener('click',()=>$('#selectSourceBtn')?.click());
$('#previewFocusBtn')?.addEventListener('click',()=>{
  const next=document.body.classList.contains('preview-focus')?'control':'preview';
  setTargetInspectorTab(next);
});
