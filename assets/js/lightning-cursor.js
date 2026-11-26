/* 번개 커서 — 마우스 궤적을 따라 지지직 튀는 번개 꼬리 + 번개 모양 포인터 (직접 작성) */
(() => {
  if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.id = 'lightning-cursor';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const hide = document.createElement('style');
  hide.textContent = '*, a, button { cursor: none !important; }';
  const GLYPH = [[0,0],[0,18],[5,14],[9,23],[12,21],[8,12],[15,12],[0,0]];
  const TRAIL = 12, STEP = 8, SPREAD = 14;
  let w, h, trail = [], mx = 0, my = 0, inside = false, lastMove = 0, fade = 0, jit = [], jt = 0, prev = performance.now();
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  addEventListener('resize', size); size();
  const shuffle = () => { jit = Array.from({ length: 64 }, () => Math.random() - 0.5); };
  shuffle();
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    if (!inside) { document.head.appendChild(hide); trail = []; }
    inside = true;
    for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : []).concat(e)) {
      mx = ev.clientX; my = ev.clientY;
      const p = trail[0];
      if (!p || Math.hypot(mx - p.x, my - p.y) >= STEP) trail.unshift({ x: mx, y: my });
    }
    if (trail.length > TRAIL) trail.length = TRAIL;
    lastMove = performance.now();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { inside = false; hide.remove(); });

  function zig(a, b, amp, seed) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 1) return;
    const n = Math.max(2, Math.min(40, Math.ceil(d / 5))), nx = -dy / d, ny = dx / d, A = Math.min(d * 0.3, amp);
    ctx.moveTo(a.x, a.y);
    for (let i = 1; i < n; i++) { const t = i / n, o = jit[(i + seed) % 64] * A; ctx.lineTo(a.x + dx * t + nx * o, a.y + dy * t + ny * o); }
    ctx.lineTo(b.x, b.y);
  }
  function bolt(pairs, width, amp, alpha, color, core) {
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.strokeStyle = color; ctx.lineWidth = width * 2.4;
    ctx.beginPath(); pairs.forEach(([a, b, s]) => zig(a, b, amp, s)); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = core; ctx.lineWidth = width;
    ctx.beginPath(); pairs.forEach(([a, b, s]) => zig(a, b, amp, s)); ctx.stroke();
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    jt += dt; if (jt > 0.025) { jt = 0; shuffle(); }
    ctx.clearRect(0, 0, w, h);
    if (inside && now - lastMove > 50 && trail.length > 1) { fade += dt * 90; while (fade >= 1 && trail.length > 1) { fade--; trail.pop(); } } else fade = 0;
    const dark = document.documentElement.dataset.theme === 'dark';
    const color = dark ? '#7FB2FF' : '#3B82F6', core = dark ? '#FFFFFF' : '#1E3A8A';
    ctx.lineCap = ctx.lineJoin = 'round';
    for (let i = 0; i < trail.length - 1; i++) {
      const f = 1 - i / (trail.length - 1);
      bolt([[trail[i], trail[i + 1], i * 7]], 1.2 * f + 0.2, SPREAD, f, color, core);
    }
    if (inside) {
      const pairs = [];
      for (let i = 0; i < GLYPH.length - 1; i++) pairs.push([{ x: mx + GLYPH[i][0], y: my + GLYPH[i][1] }, { x: mx + GLYPH[i + 1][0], y: my + GLYPH[i + 1][1] }, i * 9]);
      bolt(pairs, 1.6, 2, 1, color, core);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
