/* MOYE official · 2026 · progressive interaction & canvas particles */
(()=>{
'use strict';
const doc=document,root=doc.documentElement,header=doc.querySelector('.topbar'),nav=doc.querySelector('.mobile-menu'),menuBtn=doc.querySelector('.menu-btn');
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
const floating=doc.querySelector('.floating-action');
let lastScroll=-1;
function onScroll(){
 const y=window.scrollY;
 if(Math.abs(y-lastScroll)<2)return;
 lastScroll=y;
 if(header)header.classList.toggle('scrolled',y>18);
 if(floating)floating.classList.toggle('visible',y>570);
 const range=Math.max(1,doc.documentElement.scrollHeight-window.innerHeight);
 root.style.setProperty('--scroll',(100*y/range).toFixed(2)+'%');
}
window.addEventListener('scroll',onScroll,{passive:true});
onScroll();
function closeMenu(){
 if(!nav||!menuBtn)return;
 nav.classList.remove('open');
 menuBtn.setAttribute('aria-expanded','false');
 menuBtn.setAttribute('aria-label','打开导航菜单');
}
if(nav&&menuBtn){
 menuBtn.addEventListener('click',()=>{
  const opening=!nav.classList.contains('open');
  nav.classList.toggle('open',opening);
  menuBtn.setAttribute('aria-expanded',String(opening));
  menuBtn.setAttribute('aria-label',opening?'关闭导航菜单':'打开导航菜单');
 });
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
 doc.addEventListener('click',e=>{if(!header?.contains(e.target))closeMenu();});
 doc.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
}
const revealNodes=Array.from(doc.querySelectorAll('[data-reveal]'));
if('IntersectionObserver' in window && !reduce.matches){
 root.classList.add('js-motion');
 const ob=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');ob.unobserve(e.target);}});
 },{threshold:.08,rootMargin:'0px 0px -20px 0px'});
 requestAnimationFrame(()=>revealNodes.forEach(el=>ob.observe(el)));
}
const releases={
 win:{name:'Windows 64 位',file:'Moye-18.3.2-Setup-Win64.exe',version:'18.3.2',hash:'c040b1616524e84b8f46ca3d4da52146034fba87be478dc1d16b9b11dd835194'},
 android:{name:'Android',file:'Moye-18.3.1-Android.apk',version:'18.3.1',hash:'15461f5ceb466a0f9afb5cfc5764843d22c6bc26a1d173fdbf1aa55a779dcaa2'}
};
const downloadDialog=doc.querySelector('#download-dialog');
if(downloadDialog){
 doc.querySelectorAll('[data-release]').forEach(btn=>btn.addEventListener('click',()=>{
  const item=releases[btn.getAttribute('data-release')];
  if(!item)return;
  downloadDialog.querySelector('[data-dialog-name]').textContent=item.name+' '+item.version;
  downloadDialog.querySelector('[data-dialog-file]').textContent=item.file;
  downloadDialog.querySelector('[data-dialog-sha]').textContent=item.hash;
  if(typeof downloadDialog.showModal==='function')downloadDialog.showModal();
  else downloadDialog.setAttribute('open','');
 }));
 downloadDialog.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',()=>downloadDialog.close()));
 downloadDialog.addEventListener('click',e=>{
  const r=downloadDialog.getBoundingClientRect();
  if(e.target===downloadDialog && (e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))downloadDialog.close();
 });
}
doc.querySelectorAll('[data-copy-hash]').forEach(button=>{
 button.addEventListener('click',async()=>{
  const code=button.closest('.hash-item')?.querySelector('code')?.textContent?.trim();
  if(!code)return;
  let copied=false;
  try{await navigator.clipboard.writeText(code);copied=true;}catch(e){}
  if(!copied){
   const t=doc.createElement('textarea');t.value=code;t.style.position='fixed';t.style.opacity='0';doc.body.appendChild(t);t.select();
   try{copied=doc.execCommand('copy');}catch(e){}
   t.remove();
  }
  const before=button.textContent;
  button.textContent=copied?'已复制':'请手动复制';
  setTimeout(()=>{button.textContent=before;},1800);
 });
});
/* Adaptive, pointer-responsive particle field. Flat 2D; never transforms device UI. */
const canvas=doc.querySelector('canvas.particle-layer');
const hero=doc.querySelector('.hero');
if(!canvas||!hero)return;
const ctx=canvas.getContext('2d',{alpha:true});
if(!ctx)return;
let particles=[],raf=0,active=true,width=0,height=0,dpr=1,lastTime=0;
const pointer={x:-9999,y:-9999,on:false};
const palette=[[185,237,192],[114,210,151],[224,239,202],[108,179,142]];
function random(a,b){return a+Math.random()*(b-a);}
function reset(){
 const rect=hero.getBoundingClientRect();
 width=Math.max(1,Math.round(rect.width));
 height=Math.max(1,Math.round(rect.height));
 dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 canvas.style.width=width+'px';canvas.style.height=height+'px';
 ctx.setTransform(dpr,0,0,dpr,0,0);
 const count=reduce.matches?55:(width<600?40:width<920?60:93);
 particles=Array.from({length:count},()=>({
  x:random(0,width),y:random(0,height),
  ox:0,oy:0,
  r:random(.75,2.0),speed:random(.12,.36),
  drift:random(.0005,.002),phase:random(0,Math.PI*2),
  tint:palette[Math.floor(random(0,palette.length))],alpha:random(.18,.62)
 }));
 draw(0,true);
}
function draw(time,still=false){
 ctx.clearRect(0,0,width,height);
 const dt=Math.min((time-lastTime)||16,40);
 lastTime=time;
 const t=time*.001;
 const move=!still&&!reduce.matches;
 // soft luminous trails around pointer, never over UI elements
 if(pointer.on&&!reduce.matches){
  const g=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,155);
  g.addColorStop(0,'rgba(163,242,176,0.105)');
  g.addColorStop(.46,'rgba(125,208,149,0.035)');
  g.addColorStop(1,'rgba(125,208,149,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(pointer.x,pointer.y,155,0,Math.PI*2);ctx.fill();
 }
 for(let i=0;i<particles.length;i++){
  const p=particles[i];
  if(move){
   p.y-=p.speed*dt*.035;
   p.x+=Math.sin(t*.43+p.phase)*.055*dt*.06;
   if(p.y< -12)p.y=height+12;
   if(p.x< -12)p.x=width+12;
   if(p.x>width+12)p.x=-12;
  }
  let x=p.x+Math.sin(t*.68+p.phase)*10,y=p.y+Math.cos(t*.55+p.phase)*7;
  if(pointer.on&&!reduce.matches){
   const dx=x-pointer.x,dy=y-pointer.y;
   const distance=Math.hypot(dx,dy);
   if(distance<135&&distance>.01){
    const force=(135-distance)/135;
    x+=dx/distance*force*16;
    y+=dy/distance*force*16;
   }
  }
  p.ox=x;p.oy=y;
 }
 // sparse constellations, deliberately low contrast
 ctx.lineWidth=.62;
 for(let i=0;i<particles.length;i++){
  const p=particles[i];
  for(let j=i+1;j<particles.length;j++){
   const q=particles[j],dx=p.ox-q.ox,dy=p.oy-q.oy,dist2=dx*dx+dy*dy;
   if(dist2>9600)continue;
   const alpha=(1-Math.sqrt(dist2)/98)*.11;
   if(alpha<.009)continue;
   ctx.strokeStyle='rgba(185,229,188,'+alpha.toFixed(3)+')';
   ctx.beginPath();ctx.moveTo(p.ox,p.oy);ctx.lineTo(q.ox,q.oy);ctx.stroke();
  }
 }
 for(const p of particles){
  const glow=.66+.34*Math.sin(t*1.3+p.phase);
  const [r,g,b]=p.tint;
  const alpha=p.alpha*glow;
  const radius=p.r+(p.r>1.5?.15*Math.sin(t*1.2+p.phase):0);
  ctx.fillStyle='rgba('+r+','+g+','+b+','+alpha.toFixed(3)+')';
  ctx.beginPath();ctx.arc(p.ox,p.oy,Math.max(.5,radius),0,Math.PI*2);ctx.fill();
  if(p.r>1.72){
   ctx.fillStyle='rgba('+r+','+g+','+b+','+(alpha*.11).toFixed(3)+')';
   ctx.beginPath();ctx.arc(p.ox,p.oy,radius*4,0,Math.PI*2);ctx.fill();
  }
 }
}
function frame(t){
 raf=0;
 if(!active||reduce.matches||doc.hidden)return;
 if(t-lastTime<24){raf=requestAnimationFrame(frame);return;}
 draw(t);
 raf=requestAnimationFrame(frame);
}
function start(){
 if(raf||reduce.matches||!active||doc.hidden)return;
 lastTime=performance.now();
 raf=requestAnimationFrame(frame);
}
function stop(){if(raf){cancelAnimationFrame(raf);raf=0;}}
hero.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch')return;
 const r=hero.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;pointer.on=true;
},{passive:true});
hero.addEventListener('pointerleave',()=>{pointer.on=false;});
window.addEventListener('resize',()=>{
 window.clearTimeout(reset.timer);
 reset.timer=window.setTimeout(()=>{stop();reset();start();},150);
},{passive:true});
doc.addEventListener('visibilitychange',()=>{if(doc.hidden)stop();else start();});
if('IntersectionObserver' in window){
 const view=new IntersectionObserver(([entry])=>{active=entry.isIntersecting;if(active)start();else stop();},{threshold:0});
 view.observe(hero);
}
reduce.addEventListener?.('change',()=>{stop();reset();start();});
reset();start();
})();
