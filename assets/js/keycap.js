/*!
 * 테마 키캡 버튼 — IsometricButton을 바닐라 JS로 옮겨 이름과 색을 바꾼 것
 * Original: IsometricButton, a DesignPass.dev component by Ernest Liu (ernestliu.com)
 * https://designpass.dev/components/isometric-button
 * MIT licensed. Keep this notice in copies and adaptations.
 */
(() => {
  document.querySelectorAll('.keycap').forEach((root) => {
  const cfg = {
    fill: '#16121D', glow: '#3B82F6', text: '#7FB2FF', hoverText: '#FFFFFF',
    thickness: 9, float: 6, hoverFloat: 4, tilt: 49, rotate: -37, rounded: 45, intensity: 100
  };
  const SIDE_LAYERS = 12, PRESS_FLOAT = 1.5, LEAN = -10, SHIFT_Y = 2, TEXT_GLOW = 8;

  const hex = h => { const n = parseInt(h.slice(1), 16); return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 }; };
  const rgb = c => `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`;
  const rgba = (c, a) => `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`;
  const mix = (a, b, k) => ({ r: a.r + (b.r - a.r) * k, g: a.g + (b.g - a.g) * k, b: a.b + (b.b - a.b) * k });
  const toHsl = ({ r, g, b }) => {
    const R = r / 255, G = g / 255, B = b / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2;
    if (mx === mn) return { h: 0, s: 0, l };
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === R ? ((G - B) / d + (G < B ? 6 : 0)) * 60 : mx === G ? ((B - R) / d + 2) * 60 : ((R - G) / d + 4) * 60;
    return { h, s, l };
  };
  const fromHsl = (h, s, l) => {
    h = ((h % 360) + 360) % 360; l = Math.min(1, Math.max(0, l));
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  };
  const shift = (c, deg, lift) => { const { h, s, l } = toHsl(c); return fromHsl(h + deg, s, l + lift); };

  const body = hex(cfg.fill), glow = hex(cfg.glow), txt = hex(cfg.text), txtH = hex(cfg.hoverText);
  const edge = mix(body, { r: 0, g: 0, b: 0 }, 0.4);
  const glowGrad = `linear-gradient(120deg, ${rgb(shift(glow, -40, 0.02))} 0%, ${rgb(glow)} 50%, ${rgb(shift(glow, 40, 0.04))} 110%)`;
  const topGrad = `linear-gradient(135deg, ${rgb(mix(body, { r: 255, g: 255, b: 255 }, 0.08))} 0%, ${rgb(mix(body, edge, 0.12))} 75%)`;
  const k = cfg.intensity / 100;

  const labelHTML = root.querySelector('.kc-label').innerHTML;
  const el = (cls, style) => { const d = document.createElement('div'); if (cls) d.className = cls; Object.assign(d.style, style || {}); return d; };
  const scene = el('kc-scene', { transform: `translateY(${SHIFT_Y}px) rotateX(${cfg.tilt}deg) rotateZ(${cfg.rotate}deg)` });
  scene.setAttribute('aria-hidden', 'true');
  const refl = el('kc-face', { background: glowGrad, transform: 'translateZ(calc(-1 * var(--iso-float))) scaleZ(-1)',
    boxShadow: `0 0 calc(20px * var(--iso-refl-spread)) calc(4px * var(--iso-refl-spread)) ${rgba(glow, .85)}, 0 0 calc(56px * var(--iso-refl-spread)) calc(10px * var(--iso-refl-spread)) ${rgba(glow, .45)}`,
    filter: 'blur(var(--iso-refl-blur)) brightness(var(--iso-refl-bright))', opacity: 'var(--iso-refl-opacity)' });
  const stand = el('kc-stand');
  const under = el('kc-face', { background: glowGrad, transform: 'translateZ(var(--iso-float))',
    boxShadow: `0 0 calc(16px * var(--iso-glow-spread)) calc(2px * var(--iso-glow-spread)) ${rgba(glow, .8)}, 0 0 calc(44px * var(--iso-glow-spread)) calc(6px * var(--iso-glow-spread)) ${rgba(glow, .4)}`,
    filter: 'brightness(var(--iso-glow-bright)) saturate(calc(0.85 + 0.15 * var(--iso-glow-bright)))' });
  stand.appendChild(under);
  for (let i = 0; i < SIDE_LAYERS; i++) {
    stand.appendChild(el('kc-face', { background: rgb(edge), boxShadow: `0 0 0 1px ${rgb(edge)}`,
      transform: `translateZ(calc(var(--iso-float) + var(--iso-thick) * ${i} / ${SIDE_LAYERS}))` }));
  }
  const top = el('kc-face kc-row', { background: topGrad, border: '1px solid rgba(255,255,255,.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
    transform: 'translateZ(calc(var(--iso-float) + var(--iso-thick)))', color: 'var(--iso-text)',
    textShadow: `0 0 var(--iso-text-glow) ${rgb(glow)}, 0 0 calc(var(--iso-text-glow) * 2) ${rgb(glow)}` });
  top.innerHTML = labelHTML;
  stand.appendChild(top);
  scene.append(refl, stand);
  root.insertBefore(scene, root.querySelector('.kc-hit'));

  const radius = () => { const r = Math.min(root.offsetWidth, root.offsetHeight) / 2 * cfg.rounded / 100; root.style.setProperty('--iso-radius', r + 'px'); };
  radius(); new ResizeObserver(radius).observe(root);
  root.style.setProperty('--iso-thick', cfg.thickness + 'px');

  const lerp = (a, b, t) => a + (b - a) * t;
  let h = 0, p = 0, th = 0, tp = 0, vh = 0, raf = 0;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paint = () => {
    const set = (n, v) => root.style.setProperty(n, v);
    const bright = lerp(35 * k, 140 * k, h) / 100;
    set('--iso-float', lerp(lerp(cfg.float, cfg.hoverFloat, h), PRESS_FLOAT, p).toFixed(2) + 'px');
    set('--iso-stand', lerp(LEAN, 0, p).toFixed(2) + 'deg');
    set('--iso-glow-bright', bright.toFixed(3));
    set('--iso-glow-spread', lerp(1.1, 0.15, h).toFixed(3));
    set('--iso-refl-opacity', (lerp(Math.min(100, 60 * k), Math.min(100, 100 * k), h) / 100).toFixed(3));
    set('--iso-refl-blur', lerp(8, 1, h).toFixed(2) + 'px');
    set('--iso-refl-spread', lerp(0, 3, h).toFixed(3));
    set('--iso-refl-bright', (bright * 0.95).toFixed(3));
    set('--iso-text', rgb(mix(txt, txtH, Math.min(1, Math.max(0, h)))));
    set('--iso-text-glow', (TEXT_GLOW * Math.max(0, h)).toFixed(2) + 'px');
  };
  // 호버는 스프링(살짝 튕김), 누름은 빠르게
  const tick = () => {
    raf = 0;
    if (reduce) { h = th; p = tp; paint(); return; }
    const a = (th - h) * 0.12 - vh * 0.28; vh += a; h += vh;
    p += (tp - p) * 0.45;
    paint();
    if (Math.abs(th - h) > 1e-3 || Math.abs(vh) > 1e-3 || Math.abs(tp - p) > 1e-3) raf = requestAnimationFrame(tick);
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const hit = root.querySelector('.kc-hit');
  hit.addEventListener('pointerenter', () => { th = 1; go(); });
  hit.addEventListener('pointerleave', () => { th = 0; tp = 0; go(); });
  hit.addEventListener('pointerdown', () => { tp = 1; go(); });
  window.addEventListener('pointerup', () => { if (tp) { tp = 0; go(); } });
  hit.addEventListener('focus', () => { th = 1; go(); });
  hit.addEventListener('blur', () => { th = 0; go(); });
  paint();
});
})();
