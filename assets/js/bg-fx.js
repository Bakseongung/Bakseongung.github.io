/* 도트 필드 배경 — 커서 주변 점이 커지고 색이 번지는 효과 (직접 작성) */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.id = 'bg-fx';
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  const GAP = 26, R = 170, cols = ['#A855F7', '#EC4899', '#3B82F6'];
  let w, h, dpr, mx = -9999, my = -9999, sx = -9999, sy = -9999, t = 0, active = 0, last = 0;
  const rgb = cols.map(c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16)));
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener('resize', size); size();
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; last = performance.now(); if (sx < -999) { sx = mx; sy = my; } });
  addEventListener('pointerleave', () => { mx = my = -9999; });
  function frame(now) {
    t = now / 1000;
    sx += (mx - sx) * 0.12; sy += (my - sy) * 0.12;
    const idle = now - last > 4000 || mx < -999;
    active += ((idle ? 0 : 1) - active) * 0.06;
    const dark = document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark';
    ctx.clearRect(0, 0, w, h);
    const base = dark ? 'rgba(255,255,255,0.09)' : 'rgba(30,40,80,0.10)';
    for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) {
      const d = Math.hypot(x - sx, y - sy), f = Math.max(0, 1 - d / R) * active;
      if (f < 0.01) { ctx.fillStyle = base; ctx.fillRect(x - 1, y - 1, 2, 2); continue; }
      const a = Math.atan2(y - sy, x - sx) + t * 0.8, k = (Math.sin(a) + 1) / 2 * 2;
      const i = Math.floor(k), fr = k - i, c0 = rgb[i % 3], c1 = rgb[(i + 1) % 3];
      const c = c0.map((v, j) => Math.round(v + (c1[j] - v) * fr));
      const ease = f * f * (3 - 2 * f), r = 1 + ease * 2.6, push = ease * 6;
      const px = x + (x - sx) / (d || 1) * push, py = y + (y - sy) / (d || 1) * push;
      ctx.fillStyle = `rgba(${c},${0.15 + ease * 0.75})`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
