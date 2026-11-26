/* 커서 주변으로 옅은 빛과 도트가 드러나는 배경 (직접 작성) */
(() => {
  if (!matchMedia('(pointer: fine)').matches) return;
  const el = document.createElement('div'); el.className = 'bg-spot'; el.setAttribute('aria-hidden', 'true');
  document.body.prepend(el);
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
  const tick = () => {
    x += (tx - x) * 0.15; y += (ty - y) * 0.15;
    el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0;
  };
  addEventListener('pointermove', e => {
    if (!el.classList.contains('on')) { x = e.clientX; y = e.clientY; el.classList.add('on'); }
    tx = e.clientX; ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => el.classList.remove('on'));
})();
