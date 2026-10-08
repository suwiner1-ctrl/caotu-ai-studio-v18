(() => {
  'use strict';
  const doc = document;
  const header = doc.getElementById('site-header');
  const menuBtn = doc.querySelector('.menu-toggle');
  const mobileNav = doc.getElementById('mobile-nav');
  const floating = doc.querySelector('.floating-download');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const closeMenu = () => {
    if (!menuBtn || !mobileNav) return;
    menuBtn.setAttribute('aria-expanded','false');
    menuBtn.setAttribute('aria-label','展开菜单');
    mobileNav.classList.remove('open');
  };
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.getAttribute('aria-expanded') !== 'true';
      menuBtn.setAttribute('aria-expanded',String(open));
      menuBtn.setAttribute('aria-label',open?'关闭菜单':'展开菜单');
      mobileNav.classList.toggle('open',open);
    });
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click',closeMenu));
    doc.addEventListener('keydown',e => {if(e.key === 'Escape') closeMenu();});
    doc.addEventListener('click',e => {if(!header?.contains(e.target)) closeMenu();});
  }
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled',y>36);
    if (floating) floating.classList.toggle('shown',y>560);
    doc.documentElement.style.setProperty('--scroll-progress',`${Math.round(y/Math.max(1,doc.documentElement.scrollHeight-window.innerHeight)*100)}%`);
  };
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();
  doc.querySelectorAll('[data-year]').forEach(el=>el.textContent=String(new Date().getFullYear()));
  const reveals = doc.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}});},{rootMargin:'0px 0px -60px 0px',threshold:.04});
    reveals.forEach((el)=>obs.observe(el));
  } else reveals.forEach(el=>el.classList.add('visible'));
  // Page-specific download panel: no redirects to missing or unverified installer URLs.
  const noticeBtn = doc.querySelectorAll('[data-download-notice]');
  const dialog = doc.getElementById('release-dialog');
  noticeBtn.forEach(btn=>btn.addEventListener('click',()=>{
    if (!dialog) return;
    const platform = btn.getAttribute('data-download-notice');
    const name = platform==='win'?'Windows 64 位':'Android 手机';
    const filename = platform==='win'?'Moye-18.3.2-Setup-Win64.exe':'Moye-18.3.1-Android.apk';
    dialog.querySelector('[data-dialog-platform]').textContent=name;
    dialog.querySelector('[data-dialog-filename]').textContent=filename;
    if (typeof dialog.showModal==='function') dialog.showModal();
    else dialog.hidden=false;
  }));
  doc.querySelectorAll('[data-close-dialog]').forEach(btn=>btn.addEventListener('click',()=>{
    if (dialog?.close) dialog.close();else if(dialog)dialog.hidden=true;
  }));
  dialog?.addEventListener('click',e=>{if(e.target===dialog && dialog.close)dialog.close();});
  const copyBtns = doc.querySelectorAll('[data-copy]');
  copyBtns.forEach(btn=>btn.addEventListener('click',async()=>{
    const val=btn.dataset.copy || '';
    if(!val)return;
    try {await navigator.clipboard.writeText(val);const before=btn.textContent;btn.textContent='已复制 ✓';setTimeout(()=>{btn.textContent=before},1800);} catch {btn.title='当前浏览器不支持自动复制';}
  }));
  // Lightweight parallax, only on fine pointers and never for reduced motion.
  if (!reduce && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const stage = doc.querySelector('.hero-stage');
    if (stage) {
      stage.addEventListener('pointermove',e=>{
        const r=stage.getBoundingClientRect();
        const x=(e.clientX-r.left-r.width/2)/r.width;
        const y=(e.clientY-r.top-r.height/2)/r.height;
        stage.style.setProperty('--dx',`${x*8}px`);
        stage.style.setProperty('--dy',`${y*7}px`);
      },{passive:true});
      stage.addEventListener('pointerleave',()=>{stage.style.setProperty('--dx','0px');stage.style.setProperty('--dy','0px');});
    }
  }
})();