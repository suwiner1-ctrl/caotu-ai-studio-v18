/* MOYE / motion and accessibility enhancements */
(()=>{
  'use strict';
  const doc=document;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero=doc.querySelector('.hero');
  const stage=doc.querySelector('.hero-stage');
  if(hero){
    const ribbon=doc.createElement('div');
    ribbon.className='story-ribbon';
    ribbon.setAttribute('aria-hidden','true');
    const text='MOYE  /  READ BETTER  /  WRITE FREELY  /  YOUR STORIES, YOUR SPACE';
    ribbon.innerHTML='<div class="ribbon-runner">'+Array.from({length:6},()=>'<span>'+text+'</span><b>*</b>').join('')+'</div>';
    hero.insertAdjacentElement('afterend',ribbon);
  }
  if(stage){
    const orbit=doc.createElement('div');orbit.className='hero-ambient';orbit.setAttribute('aria-hidden','true');stage.prepend(orbit);
    const replay=doc.createElement('button');
    replay.type='button';replay.className='hero-motion-toggle';
    replay.setAttribute('aria-label','Re-play device entrance animation');
    replay.innerHTML='<i aria-hidden="true"></i><span>\u91cd\u64ad\u52a8\u6548</span>';
    stage.append(replay);
    replay.addEventListener('click',()=>{
      if(reduced.matches)return;
      const nodes=stage.querySelectorAll('.desktop-device,.mobile-device');
      nodes.forEach(n=>{n.style.animation='none';void n.offsetWidth;n.style.animation='';});
      replay.querySelector('span').textContent='\u52a8\u6548\u64ad\u653e\u4e2d';
      window.setTimeout(()=>{if(replay.isConnected)replay.querySelector('span').textContent='\u91cd\u64ad\u52a8\u6548';},1700);
    });
    if(!reduced.matches && matchMedia('(pointer:fine)').matches){
      let frame=0,x=50,y=50;
      stage.addEventListener('pointermove',e=>{
        const box=stage.getBoundingClientRect();x=((e.clientX-box.left)/box.width)*100;y=((e.clientY-box.top)/box.height)*100;
        if(!frame){frame=requestAnimationFrame(()=>{frame=0;stage.style.setProperty('--pointer-x',x.toFixed(2)+'%');stage.style.setProperty('--pointer-y',y.toFixed(2)+'%');});}
      },{passive:true});
    }
  }
  doc.querySelectorAll('.reveal').forEach((el,i)=>{
    el.style.setProperty('--stagger',((i%3)*85)+'ms');
  });
  if(!reduced.matches && 'IntersectionObserver' in window){
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('scene-active');obs.unobserve(entry.target);}});
    },{threshold:.23,rootMargin:'0px 0px -45px 0px'});
    doc.querySelectorAll('.feature-reading,.feature-library,.feature-writing,.ecosystem').forEach(el=>obs.observe(el));
  }
  // Keep small floating CTA out of the way of the footer and open nav.
  const floating=doc.querySelector('.floating-download');
  const footer=doc.querySelector('.footer');
  if(floating && footer && 'IntersectionObserver' in window){
    const ob=new IntersectionObserver(entries=>{
      floating.classList.toggle('footer-near',entries[0].isIntersecting);
    },{threshold:0});ob.observe(footer);
  }
  const menu=doc.querySelector('.menu-toggle');
  if(menu){menu.addEventListener('click',()=>{
    const expanded=menu.getAttribute('aria-expanded')==='true';
    doc.body.classList.toggle('mobile-menu-open',expanded);
  });}
  doc.querySelectorAll('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>doc.body.classList.remove('mobile-menu-open')));
})();