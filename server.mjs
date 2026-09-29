import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);
const ROOT=path.dirname(__filename);
const PUBLIC=path.join(ROOT,'public');
const PORT=Number(process.env.PORT||3080);
const HOST=process.env.HOST||'0.0.0.0';

const users=new Map();
const sessions=new Map();
const workflows=new Map();
const tasks=[];
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();

users.set('demo@caotu.ai',{
  id:'demo-user',email:'demo@caotu.ai',password:'12345678',
  name:'草图网创作者',role:'admin',credits:2888,bio:'把灵感变成可以交付的视觉作品。'
});

function json(res,status,data,headers={}){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});
  res.end(JSON.stringify(data));
}
function body(req){
  return new Promise((resolve,reject)=>{
    let raw=''; req.on('data',c=>{raw+=c;if(raw.length>2e6)req.destroy();});
    req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch(e){reject(e);}});
    req.on('error',reject);
  });
}
function cookies(req){
  return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{
    const i=x.indexOf('='); return [decodeURIComponent(x.slice(0,i)),decodeURIComponent(x.slice(i+1))];
  }));
}
function sessionUser(req){
  const sid=cookies(req).caotu_online_session;
  if(!sid)return null;
  const email=sessions.get(sid);
  return email?users.get(email)||null:null;
}
function safeUser(u){
  if(!u)return null;
  const {password,...safe}=u; return safe;
}
function mime(file){
  const ext=path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'})[ext]||'application/octet-stream';
}
function boot(){
  return {
    version:'18.0.0-online',
    ratios:['1:1','4:3','3:4','16:9','9:16','3:2','2:3','21:9'],
    imageModels:[
      {id:'gpt-image-2.5-sunburst',name:'GPT-Image 2.5 Sunburst',vendor:'OpenAI',baseCredits:28,resolutions:['1K','2K','4K']},
      {id:'flux-2-max',name:'FLUX.2 Max',vendor:'Black Forest Labs',baseCredits:24,resolutions:['1K','2K','4K']},
      {id:'seedream-5-pro',name:'Seedream 5.0 Pro',vendor:'ByteDance Seed',baseCredits:22,resolutions:['1K','2K','4K']}
    ],
    videoModels:[
      {id:'veo-3.1',name:'Veo 3.1',vendor:'Google',creditsPerSecond:9,resolutions:['720P','1080P','4K']},
      {id:'sora-2',name:'Sora 2',vendor:'OpenAI',creditsPerSecond:10,resolutions:['720P','1080P']}
    ]
  };
}
function task(type,prompt,output){
  const t={id:uid(),type,prompt,outputs:[output],createdAt:now(),completedAt:now(),status:'completed'};
  tasks.unshift(t); return t;
}
function picsum(seed,w=1600,h=1000){return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;}

async function api(req,res,url){
  if(url.pathname==='/api/health')return json(res,200,{ok:true,version:'18.0.0-online',runtime:'render-node',time:now()});
  if(url.pathname==='/api/boot')return json(res,200,boot());

  if(url.pathname==='/api/auth/login'&&req.method==='POST'){
    const p=await body(req); const email=String(p.email||'').trim().toLowerCase();
    const u=users.get(email);
    if(!u||u.password!==String(p.password||''))return json(res,401,{error:'邮箱或密码错误'});
    const sid=uid(); sessions.set(sid,email);
    return json(res,200,{user:safeUser(u)},{'set-cookie':`caotu_online_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`});
  }
  if(url.pathname==='/api/auth/register'&&req.method==='POST'){
    const p=await body(req); const email=String(p.email||'').trim().toLowerCase();
    if(!email.includes('@')||String(p.password||'').length<8)return json(res,400,{error:'请输入有效邮箱，密码至少 8 位'});
    if(users.has(email))return json(res,409,{error:'该邮箱已注册'});
    const u={id:uid(),email,password:String(p.password),name:String(p.name||'草图网用户'),role:'user',credits:120,bio:''};
    users.set(email,u); const sid=uid(); sessions.set(sid,email);
    return json(res,200,{user:safeUser(u)},{'set-cookie':`caotu_online_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`});
  }
  if(url.pathname==='/api/logout'&&req.method==='POST'){
    const sid=cookies(req).caotu_online_session; if(sid)sessions.delete(sid);
    return json(res,200,{ok:true},{'set-cookie':'caotu_online_session=; Path=/; Max-Age=0; SameSite=Lax'});
  }
  if(url.pathname==='/api/me'){
    const u=sessionUser(req);
    return json(res,200,{user:safeUser(u),tasks:tasks.slice(0,20),workflows:[...workflows.values()].slice(-10)});
  }
  if(url.pathname==='/api/generate/image'&&req.method==='POST'){
    const p=await body(req); const prompt=String(p.prompt||'草图网创意作品');
    const output=picsum('caotu-'+crypto.createHash('md5').update(prompt+Date.now()).digest('hex').slice(0,8),1600,1000);
    return json(res,200,{task:task('image',prompt,output),output});
  }
  if(url.pathname==='/api/generate/video'&&req.method==='POST'){
    const p=await body(req); const prompt=String(p.prompt||'草图网视频创作');
    const preview=picsum('caotu-video-'+Date.now(),1920,1080);
    const output='https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
    return json(res,200,{task:task('video',prompt,preview),output,preview});
  }
  if(url.pathname==='/api/workflows'&&req.method==='POST'){
    const p=await body(req); const w={id:p.id||uid(),name:p.name||'未命名工作流',nodes:p.nodes||[],edges:p.edges||[],updatedAt:now()};
    workflows.set(w.id,w); return json(res,200,{workflow:w});
  }
  if(url.pathname==='/api/workflows/run'&&req.method==='POST'){
    const p=await body(req); return json(res,200,{ok:true,runId:uid(),nodeCount:(p.nodes||[]).length,finishedAt:now()});
  }
  if(url.pathname==='/api/agent'&&req.method==='POST'){
    const p=await body(req);
    return json(res,200,{reply:`已收到：“${String(p.message||'').slice(0,160)}”。在线演示 Agent 已完成任务拆解，可继续接入你的真实模型网关。`});
  }
  return false;
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(url.pathname.startsWith('/api/')){
      const handled=await api(req,res,url);
      if(handled!==false)return;
      return json(res,404,{error:'Not found'});
    }
    let rel=decodeURIComponent(url.pathname);
    if(rel==='/'||!path.extname(rel))rel='/index.html';
    let file=path.normalize(path.join(PUBLIC,rel));
    if(!file.startsWith(PUBLIC))return json(res,403,{error:'Forbidden'});
    if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(PUBLIC,'index.html');
    const data=fs.readFileSync(file);
    res.writeHead(200,{'content-type':mime(file),'cache-control':file.endsWith('.html')?'no-cache':'public, max-age=3600'});
    res.end(data);
  }catch(err){
    console.error(err); if(!res.headersSent)json(res,500,{error:'Server error'});
  }
});
server.listen(PORT,HOST,()=>console.log(`Caotu AI Studio V18 Online: http://${HOST}:${PORT}`));
