import {IMG,nav,inspirationItems,agents,modelPics,esc} from "./data-v181.js";
const $=s=>document.querySelector(s);
const state={boot:null,user:null,page:location.pathname,imageRatio:"1:1",insp:"全部",modelTab:"全部模型",agentMsgs:[],nodes:[{id:"n1",x:90,y:90,t:"文本输入"},{id:"n2",x:350,y:160,t:"AI 大模型"},{id:"n3",x:620,y:100,t:"图像生成"},{id:"n4",x:620,y:360,t:"视频生成"},{id:"n5",x:900,y:230,t:"文件输出"}]};
async function api(path,opt={}){const r=await fetch(path,{credentials:"include",headers:{"content-type":"application/json",...(opt.headers||{})},...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"请求失败");return d}
function toast(t){const e=$("#toast");if(!e)return;e.textContent=t;e.className="show";setTimeout(()=>e.className="",2000)}
function go(p){history.pushState({},'',p);state.page=p;render()}
function shell(content){
return `<div class="app"><aside class="sidebar"><div class="brand brand-original"><img src="/assets/caotu-brand-lockup.png" alt="草图网 AI STUDIO"></div><div class="nav-section">创作</div><nav class="nav">${nav.slice(0,5).map(x=>`<button class="nav-btn ${state.page===x[0]?"active":""}" data-go="${x[0]}"><span class="nav-ico">${x[1]}</span>${x[2]}</button>`).join("")}</nav><div class="nav-section">资源</div><nav class="nav">${nav.slice(5).map(x=>`<button class="nav-btn ${state.page===x[0]?"active":""}" data-go="${x[0]}"><span class="nav-ico">${x[1]}</span>${x[2]}</button>`).join("")}</nav><div class="side-bottom"><button class="side-btn" data-go="/settings">⚙ 设置</button><button class="side-btn" data-go="${state.user?"/profile":"/login"}">◎ ${state.user?esc(state.user.name):"登录"}</button></div></aside><main class="main"><header class="topbar"><div class="global-search"><span>⌕</span><input placeholder="搜索模型、素材、工作流与命令"></div><div class="top-actions"><button class="btn-soft hide-sm" data-go="/models">模型库</button><button class="btn-soft">${state.user?.credits||0} 积分</button><button class="btn btn-primary" data-go="/image">＋ 新建创作</button></div></header>${content}</main></div>`}
function hero(title,sub,img=IMG.hero,extra=""){return `<section class="hero"><div class="hero-bg" style="background-image:url('${img}')"></div><div class="hero-content"><div class="eyebrow">AI CREATIVE STUDIO</div><h1>${title}</h1><p>${sub}</p>${extra}</div></section>`}
function home(){
const quick=[["图像创作","▧","/image"],["视频创作","▶","/video"],["新建工作流","⌘","/workflow"],["打开 Agent","✦","/agent"]];
return shell(`<div class="page"><div class="home-grid"><section class="hero hero-compose"><div class="hero-bg" style="background-image:url('${IMG.hero}')"></div><div class="hero-content"><h1>用 <em>AI</em>，创造无限可能</h1><p>从文字到图像、视频、工作流与 Agent，在这里完成你的创意旅程。</p></div><div class="compose-box"><div class="compose-tabs"><button class="active">图像创作</button><button>视频创作</button><button>工作流</button><button>Agent</button></div><div class="compose-row"><textarea placeholder="描述你想生成的内容，例如：主体、场景、构图、材质、光线、风格…"></textarea><button class="btn btn-primary" data-go="/image">开始创作 →</button></div><div class="compose-tools"><button>添加参考图</button><button>风格</button><button>比例</button><button>更多设置</button></div></div></section><aside class="right-stack"><section class="panel metric-card"><h3>我的创作数据</h3><div class="metric-row"><div class="metric"><strong>${state.user?.credits||0}</strong><span>可用积分</span></div><div class="metric"><strong>0</strong><span>已完成任务</span></div><div class="metric"><strong>0</strong><span>我的作品</span></div></div></section><section class="panel upgrade"><b>升级会员，解锁更多能力</b><p class="muted">更高额度、专属模型与高级功能</p><button class="btn btn-primary">立即升级 →</button></section><section class="panel"><h3 style="margin-top:0">快捷入口</h3><div class="quick-grid">${quick.map(q=>`<button class="quick" data-go="${q[2]}"><i>${q[1]}</i>${q[0]}</button>`).join("")}</div></section></aside></div><section class="section"><div class="section-head"><div><h2>创意灵感</h2><small>从优秀作品中获得启发</small></div><button class="btn-soft" data-go="/inspiration">查看全部 →</button></div><div class="grid grid4">${inspirationItems.slice(0,4).map(x=>`<article class="card"><div class="cover" style="height:190px;background-image:url('${x[1]}')"></div><div class="card-body"><h3>${x[0]}</h3><p>精选高清视觉作品与创作方向</p></div></article>`).join("")}</div></section></div>`)
}
function imagePage(){
const models=state.boot?.imageModels||[];
return shell(`<div class="page"><div class="workspace"><aside class="panel"><div class="panel-title"><h2>图像创作</h2><span class="muted">AI · 4K</span></div><div class="field"><label>选择模型</label><select>${models.map(m=>`<option>${m.name}</option>`).join("")}</select></div><div class="field"><label>画面比例</label><div class="seg">${["1:1","4:3","3:4","16:9","9:16","3:2"].map(r=>`<button data-ratio="${r}" class="${state.imageRatio===r?"active":""}">${r}</button>`).join("")}</div></div><div class="field"><label>输出质量</label><div class="seg"><button>1K</button><button class="active">2K</button><button>4K</button></div></div><div class="field"><label>参考图</label><div class="upload-box">＋ 上传参考图 / 拖拽到这里</div></div><div class="field"><label>高级设置</label><select><option>默认风格</option><option>写实摄影</option><option>扁平插画</option></select></div></aside><section class="panel canvas-main"><div class="panel-title"><h2>创作画布</h2><div class="tabs"><button class="tab active">图像描述</button><button class="tab">参考图生成</button></div></div><div class="artboard" id="image-board" style="background-image:url('${IMG.portrait}')"><div class="empty-state"><i>▧</i><strong>从一个清晰的想法开始</strong><span>输入描述词，AI 将为你生成高质量图像作品</span></div></div><div class="field" style="margin-top:14px"><textarea id="image-prompt" placeholder="描述主体、场景、构图、材质、光影、色彩、镜头等…"></textarea></div><div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" data-action="generate-image">立即生成</button></div></section><aside class="panel history-panel"><div class="panel-title"><h3>版本历史</h3></div><div class="history-list">${inspirationItems.slice(0,5).map((x,i)=>`<article class="history-item"><div class="history-thumb" style="background-image:url('${x[1]}')"></div><div><b>创作版本 ${i+1}</b><span>最近生成</span></div></article>`).join("")}</div></aside></div></div>`)
}
function videoPage(){
return shell(`<div class="page">${hero('用 <em>AI</em>，生成精彩视频','输入创意想法，选择模型与参数，让你的创意动起来。',IMG.video)}<div class="video-layout section"><aside class="panel"><div class="panel-title"><h2>创作设置</h2></div><div class="field"><label>视频模型</label><select><option>Veo 3.1</option><option>Sora 2</option></select></div><div class="field"><label>视频时长</label><div class="seg"><button class="active">5s</button><button>10s</button><button>15s</button></div></div><div class="field"><label>分辨率</label><div class="seg"><button>720P</button><button class="active">1080P</button><button>4K</button></div></div><div class="field"><label>视频风格</label><div class="grid grid3">${[["写实",IMG.mountain],["动漫",IMG.portrait],["电影感",IMG.cyber]].map((x,i)=>`<button class="tab ${i===0?"active":""}" style="height:auto;padding:0;overflow:hidden"><div class="history-thumb" style="height:75px;border-radius:0;background-image:url('${x[1]}')"></div><span style="padding:8px">${x[0]}</span></button>`).join("")}</div></div></aside><section class="panel"><div class="panel-title"><h2>视频预览</h2><button class="btn-soft">全屏预览</button></div><div class="video-preview" id="video-preview" style="background-image:url('${IMG.video}')"><button class="play-btn">▶</button></div><div class="storyboard">${inspirationItems.slice(0,4).map((x,i)=>`<article class="shot"><div style="background-image:url('${x[1]}')"></div><p>0${i+1} · 分镜预览</p></article>`).join("")}</div></section></div><section class="panel section"><div class="panel-title"><h2>视频创意描述</h2><span class="muted">支持自然语言</span></div><div class="compose-row"><textarea id="video-prompt" style="border:1px solid #e5eaf3;border-radius:12px" placeholder="描述视频内容、运镜、节奏与风格…"></textarea><button class="btn btn-primary" data-action="generate-video">开始生成视频 →</button></div></section></div>`)
}
function workflowPage(){
const nodes=state.nodes;
const pos={n1:[120,110],n2:[390,170],n3:[690,90],n4:[690,365],n5:[990,225]};
nodes.forEach(n=>{if(pos[n.id]){n.x=pos[n.id][0];n.y=pos[n.id][1]}})
const edges=[[nodes[0],nodes[1]],[nodes[1],nodes[2]],[nodes[1],nodes[3]],[nodes[2],nodes[4]],[nodes[3],nodes[4]]].filter(x=>x[0]&&x[1]);
const paths=edges.map(([a,b],i)=>{const x1=a.x+210,y1=a.y+62,x2=b.x,y2=b.y+62,dx=Math.max(70,(x2-x1)*.46);return '<path class="wf-edge '+(i===1?'accent':'')+'" d="M'+x1+' '+y1+' C '+(x1+dx)+' '+y1+', '+(x2-dx)+' '+y2+', '+x2+' '+y2+'"/>'}).join('');
const nodeIcon=t=>t.includes('文本')?'T':t.includes('AI')?'✦':t.includes('图像')?'▧':t.includes('视频')?'▶':'▤';
return shell(`<div class="page wf-page">
<header class="wf-master-top">
  <div class="wf-title"><div class="wf-title-icon">⌘</div><div><h2>品牌主视觉生产线</h2><p>已自动保存 · ${nodes.length} 节点 · 5 连线</p></div></div>
  <div class="wf-center-tools"><button class="wf-tool">↶</button><button class="wf-tool">↷</button><button class="wf-tool">−</button><button class="wf-tool">适应画布</button><button class="wf-tool">100%</button><button class="wf-tool">＋</button></div>
  <div class="wf-actions"><button class="btn-soft">节点库</button><button class="btn-soft">模板</button><button class="btn-soft">校验</button><button class="btn-soft">保存</button><button class="btn btn-primary" data-action="run-workflow">▶ 运行工作流</button></div>
</header>
<div class="wf-master">
  <aside class="wf-library">
    <div class="wf-lib-head"><div><strong>节点库</strong><span>拖入或点击添加</span></div><button>＋</button></div>
    <div class="wf-lib-search">⌕ <input placeholder="搜索节点"></div>
    <div class="wf-lib-group"><b>输入</b>
      <button data-add-node="文本输入"><i>T</i><span><strong>文本输入</strong><small>输入文本内容</small></span><em>＋</em></button>
      <button data-add-node="图像输入"><i>▧</i><span><strong>图像输入</strong><small>上传或引用图像</small></span><em>＋</em></button>
      <button data-add-node="文件输入"><i>▤</i><span><strong>文件输入</strong><small>导入本地文件</small></span><em>＋</em></button>
    </div>
    <div class="wf-lib-group"><b>AI 模型</b>
      <button data-add-node="AI 大模型"><i>✦</i><span><strong>AI 大模型</strong><small>理解并优化内容</small></span><em>＋</em></button>
      <button data-add-node="图像生成"><i>▧</i><span><strong>图像生成</strong><small>调用图像模型</small></span><em>＋</em></button>
      <button data-add-node="视频生成"><i>▶</i><span><strong>视频生成</strong><small>调用视频模型</small></span><em>＋</em></button>
    </div>
    <div class="wf-lib-group"><b>处理</b>
      <button data-add-node="图像处理"><i>⌘</i><span><strong>图像处理</strong><small>调整图像参数</small></span><em>＋</em></button>
      <button data-add-node="条件判断"><i>◇</i><span><strong>条件判断</strong><small>根据条件分支</small></span><em>＋</em></button>
      <button data-add-node="文件输出"><i>▤</i><span><strong>文件输出</strong><small>保存最终结果</small></span><em>＋</em></button>
    </div>
  </aside>
  <section class="wf-canvas-master" id="wf-canvas">
    <svg class="wf-edge-layer" viewBox="0 0 1500 900" preserveAspectRatio="none">${paths}</svg>
    ${nodes.map((n,i)=>`<article class="wf-node ${i===2?'selected':''}" style="left:${n.x}px;top:${n.y}px">
      <span class="wf-port in"></span>
      <div class="wf-node-head"><i>${nodeIcon(n.t)}</i><div><strong>${n.t}</strong><small>${n.t.includes('视频')?'基于图像生成动态视频':n.t.includes('图像')?'生成或处理高质量图像':n.t.includes('AI')?'对输入内容进行智能处理':'提供工作流输入与输出'}</small></div><button>•••</button></div>
      <div class="wf-node-value">${n.t==='文本输入'?'高端东方香氛，极简白底，商业…':n.t==='AI 大模型'?'增强结构、光影和材质描述':n.t==='图像生成'?'GPT-Image 2.5 · 2K':n.t==='视频生成'?'Veo 3.1 · 1080p':'PNG · 素材库'}</div>
      <div class="wf-node-foot"><span>预计 ${i*3+2} pts</span><button>▶</button></div>
      <span class="wf-port out"></span>
    </article>`).join('')}
    <div class="wf-minimap"><span></span><span></span><span></span><span></span><span></span></div>
    <div class="wf-status"><i></i>工作流已就绪　 <b>${nodes.length} 个启用节点</b>　预计 85 pts</div>
  </section>
  <aside class="wf-inspector-master">
    <div class="wf-ins-head"><div class="wf-ins-icon">⌘</div><div><strong>图像处理</strong><span>调整图像风格与参数</span></div><button>×</button></div>
    <div class="wf-ins-tabs"><button class="active">参数</button><button>执行设置</button><button>节点说明</button></div>
    <div class="field"><label>节点名称</label><input value="图像处理"></div>
    <div class="field"><label>输入图像</label><select><option>引用上一个节点输出</option></select></div>
    <div class="field"><label>处理方式</label><select><option>图像风格转换</option></select></div>
    <div class="field"><label>风格模型</label><select><option>2.5D 动漫风格</option></select></div>
    <div class="field"><label>图像强度</label><input type="range" value="70"></div>
    <div class="field"><label>输出分辨率</label><select><option>2048 × 1152 (2K)</option></select></div>
    <div class="wf-ins-bottom"><button class="btn-soft">重置</button><button class="btn btn-primary">应用</button></div>
  </aside>
</div></div>`)
}

function agentPage(){
return shell(`<div class="page"><div class="agent-grid"><main>${hero('让专业的 <em>AI Agent</em><br>帮你完成更多可能','从创意构想到内容生成，从研究分析到任务执行，多领域专业 Agent 随时为你工作。',IMG.agent,'<div class="hero-actions"><button class="btn btn-primary">探索全部 Agent →</button><button class="btn-soft">创建我的 Agent ＋</button></div>')}<section class="section"><div class="section-head"><h2>精选 Agent</h2><small>专业能力 · 高效协作</small></div><div class="grid grid4">${agents.map(x=>`<article class="card"><div class="cover" style="background-image:url('${x[1]}')"></div><div class="card-body"><h3>${x[0]}</h3><p>支持复杂任务拆解、创作与持续优化。</p><button class="btn btn-primary" style="margin-top:10px">立即使用 →</button></div></article>`).join("")}</div></section></main><aside class="panel chat-card"><div class="panel-title"><h2>与 Agent 对话</h2></div><div class="messages">${state.agentMsgs.map(m=>`<div class="message ${m.role}">${esc(m.text)}</div>`).join("")}</div><div class="chat-input"><textarea id="agent-msg" placeholder="描述你希望 Agent 完成的任务…"></textarea><button class="btn btn-primary" data-action="agent-send">发送</button></div></aside></div></div>`)
}
function inspirationPage(){
const cats=["全部","人物","风景","二次元","产品设计","建筑空间","游戏CG","摄影写真","艺术插画"];
return shell(`<div class="page">${hero('<em>发现</em> · 灵感','从优秀作品中汲取灵感，让 AI 创作更有想象力。',IMG.hero,'<div class="insp-search"><span>⌕</span><input placeholder="搜索灵感、风格、场景、艺术家…"><button class="btn btn-primary">搜索灵感</button></div>')}<div class="pill-row section">${cats.map(x=>`<button data-insp="${x}" class="pill ${state.insp===x?"active":""}">${x}</button>`).join("")}</div><div class="feature-banners section">${inspirationItems.slice(0,3).map(x=>`<article class="feature-banner" style="background-image:url('${x[1]}')"><div class="copy"><h3>${x[0]}</h3><p>探索更多高质量创作灵感</p></div></article>`).join("")}</div><section class="section"><div class="section-head"><h2>精选作品</h2><button class="btn-soft">换一批</button></div><div class="grid grid4">${inspirationItems.map(x=>`<article class="card"><div class="cover" style="height:190px;background-image:url('${x[1]}')"></div><div class="card-body"><h3>${x[0]}</h3><p>高清视觉参考 · AI 创作灵感</p></div></article>`).join("")}</div></section></div>`)
}
function modelsPage(){
const tabs=["全部模型","图像生成","视频生成","3D 模型","音频生成","图像编辑","风格模型"];
const all=[...(state.boot?.imageModels||[]),...(state.boot?.videoModels||[])];
return shell(`<div class="page">${hero('模型库','发现顶尖 AI 模型，激发无限创意。',IMG.future)}<div class="tabs section">${tabs.map(x=>`<button class="tab ${state.modelTab===x?"active":""}" data-model-tab="${x}">${x}</button>`).join("")}</div><div class="models-layout section"><aside class="panel filter-panel"><h3>筛选条件</h3><div class="check-list">${["全部场景","艺术创作","商业设计","动漫游戏","影视制作","建筑与室内","产品设计","角色与人像"].map((x,i)=>`<label><input type="checkbox" ${i===0?"checked":""}> ${x}</label>`).join("")}</div></aside><main><div class="section-head"><h2>精选推荐</h2><small>高质量模型</small></div><div class="grid grid4">${(all.length?all:[{name:"GPT-Image 2.5",vendor:"OpenAI"},{name:"FLUX.2 Max",vendor:"BFL"},{name:"Seedream 5.0",vendor:"ByteDance"},{name:"Veo 3.1",vendor:"Google"}]).map((m,i)=>`<article class="card model-card"><div class="cover" style="background-image:url('${modelPics[i%modelPics.length]}')"></div><div class="card-body"><span class="badge">精选</span><h3 style="margin-top:8px">${esc(m.name)}</h3><p>${esc(m.vendor||"AI Studio")} · 高质量创作模型</p><div class="card-meta"><span>高质量输出</span><button class="btn btn-primary" style="height:32px">立即使用</button></div></div></article>`).join("")}</div></main></div></div>`)
}
function settingsPage(){
return shell(`<div class="page"><div class="section-head"><div><h2>设置</h2><small>管理账户、偏好与系统配置</small></div></div><div class="settings-layout"><main><section class="panel"><div class="setting-tabs"><button class="active">账户与个人信息</button><button>会员与积分</button><button>偏好设置</button><button>通知设置</button><button>工作空间</button><button>API 与集成</button></div><div class="profile-grid"><div><div class="avatar" style="background-image:url('${IMG.portrait}')"></div></div><div><div class="field"><label>用户名</label><input value="${esc(state.user?.name||"草图网创作者")}"></div><div class="field"><label>邮箱</label><input value="${esc(state.user?.email||"demo@caotu.ai")}"></div><div class="field"><label>个人简介</label><textarea>${esc(state.user?.bio||"用 AI 记录灵感，创造更美好的世界。")}</textarea></div><button class="btn btn-primary">保存更改</button></div></div></section><section class="panel section"><div class="panel-title"><h2>主题设置</h2></div><div class="theme-grid"><div class="theme-card active"><b>浅色模式</b><p class="muted">清新明亮，专注创作</p></div><div class="theme-card"><b>深色模式</b><p class="muted">沉浸体验</p></div><div class="theme-card"><b>跟随系统</b><p class="muted">自动切换</p></div></div></section></main><aside class="right-stack"><section class="panel member-card"><b>当前会员等级</b><div style="font-size:24px;font-weight:800;color:#f1a63e;margin-top:6px">高级会员</div><p class="muted">畅享更多模型、更高额度与专属功能</p><button class="btn btn-primary">升级会员 →</button></section><section class="panel"><b>我的积分</b><div class="points">${state.user?.credits||2850}</div><p class="muted">今日已使用 150 / 1,000</p></section><section class="panel"><b>安全与隐私</b><div class="switch-row"><span>两步验证</span><span class="switch on"></span></div><div class="switch-row"><span>登录通知</span><span class="switch on"></span></div></section></aside></div></div>`)
}
function authPage(kind){
return `<div class="auth-page"><section class="auth-visual" style="background-image:url('${IMG.auth}')"><div class="auth-brand auth-brand-original"><img src="/assets/caotu-brand-lockup.png" alt="草图网 AI STUDIO"></div><div class="auth-copy"><h1>用 AI，<br>创造无限可能</h1><p>从灵感到作品，把想象力变成现实。</p></div></section><section class="auth-side"><div class="auth-box"><h2>${kind==="login"?"欢迎回来":"创建账号"}</h2><p>${kind==="login"?"登录草图网，继续你的创作旅程。":"注册后即可使用图像、视频、Agent 与工作流。"}</p><div class="auth-stack">${kind==="register"?'<input id="auth-name" placeholder="昵称">':""}<input id="auth-email" placeholder="邮箱" value="${kind==="login"?"demo@caotu.ai":""}"><input id="auth-password" type="password" placeholder="密码" value="${kind==="login"?"12345678":""}"><button class="btn btn-primary" data-auth="${kind}">${kind==="login"?"登录":"注册"}</button></div><div class="auth-links"><span>登录即表示同意服务条款</span><button class="btn-soft" data-go="${kind==="login"?"/register":"/login"}">${kind==="login"?"立即注册":"返回登录"}</button></div></div></section></div>`
}
function simple(title){return shell(`<div class="page"><section class="panel"><h2>${title}</h2><p class="muted">V18.1 在线版已经统一接入新 UI 系统。</p></section></div>`)}
function render(){
state.page=location.pathname;
const map={"/":home,"/image":imagePage,"/video":videoPage,"/workflow":workflowPage,"/agent":agentPage,"/inspiration":inspirationPage,"/models":modelsPage,"/settings":settingsPage,"/login":()=>authPage("login"),"/register":()=>authPage("register"),"/assets":()=>simple("素材库"),"/history":()=>simple("作品记录"),"/profile":settingsPage};
$("#app").innerHTML=(map[state.page]||home)()
}
document.addEventListener("click",async e=>{
const g=e.target.closest("[data-go]");if(g){go(g.dataset.go);return}
const r=e.target.closest("[data-ratio]");if(r){state.imageRatio=r.dataset.ratio;render();return}
const i=e.target.closest("[data-insp]");if(i){state.insp=i.dataset.insp;render();return}
const m=e.target.closest("[data-model-tab]");if(m){state.modelTab=m.dataset.modelTab;render();return}
const add=e.target.closest("[data-add-node]");if(add){state.nodes.push({id:crypto.randomUUID(),x:180+Math.random()*600,y:80+Math.random()*500,t:add.dataset.addNode});render();return}
const auth=e.target.closest("[data-auth]");if(auth){try{const kind=auth.dataset.auth;const payload={email:$("#auth-email").value,password:$("#auth-password").value,name:$("#auth-name")?.value};const d=await api("/api/auth/"+kind,{method:"POST",body:JSON.stringify(payload)});state.user=d.user;go("/");toast(kind==="login"?"登录成功":"注册成功")}catch(err){toast(err.message)}return}
const a=e.target.closest("[data-action]");if(!a)return;
try{
if(a.dataset.action==="generate-image"){const d=await api("/api/generate/image",{method:"POST",body:JSON.stringify({prompt:$("#image-prompt").value,ratio:state.imageRatio})});$("#image-board").style.backgroundImage="url("+d.output+")";toast("图像生成完成")}
if(a.dataset.action==="generate-video"){const d=await api("/api/generate/video",{method:"POST",body:JSON.stringify({prompt:$("#video-prompt").value})});$("#video-preview").style.backgroundImage="url("+d.preview+")";toast("视频任务已生成")}
if(a.dataset.action==="run-workflow"){await api("/api/workflows/run",{method:"POST",body:JSON.stringify({nodes:state.nodes})});toast("工作流运行完成")}
if(a.dataset.action==="agent-send"){const text=$("#agent-msg").value.trim();if(!text)return;state.agentMsgs.push({role:"user",text});const d=await api("/api/agent",{method:"POST",body:JSON.stringify({message:text})});state.agentMsgs.push({role:"ai",text:d.reply});render()}
}catch(err){toast(err.message)}
});
window.addEventListener("popstate",render);
(async()=>{try{state.boot=await api("/api/boot");const me=await api("/api/me");state.user=me.user}catch{}render()})();