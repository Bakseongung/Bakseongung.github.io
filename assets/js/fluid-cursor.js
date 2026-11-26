/* 마우스 궤적을 따라 색이 번지는 유체 커서 (WebGL2 Navier-Stokes). 클릭·호버는 그대로 통과 */
(() => {
  if (window.matchMedia && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches)) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'fluid-cursor';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) { canvas.remove(); return; }
  gl.getExtension('OES_texture_float_linear');

  const P = {
    palette: ['#A855F7', '#EC4899', '#3B82F6'],
    simRes: 128, dyeRes: 512,
    splatRadius: 0.3, splatForce: 5000, curl: 22,
    densityDissipation: 1.6, velocityDissipation: 0.9, pressureIters: 18
  };

  const VS = `#version 300 es
in vec2 aPos; out vec2 vUv, vL, vR, vT, vB; uniform vec2 texel;
void main(){ vUv = aPos*0.5+0.5; vL = vUv-vec2(texel.x,0.); vR = vUv+vec2(texel.x,0.); vT = vUv+vec2(0.,texel.y); vB = vUv-vec2(0.,texel.y); gl_Position = vec4(aPos,0.,1.); }`;
  const H = '#version 300 es\nprecision highp float; precision highp sampler2D; in vec2 vUv, vL, vR, vT, vB; out vec4 o;\n';
  const FS = {
    splat: H + `uniform sampler2D uT; uniform float ratio, radius; uniform vec3 color; uniform vec2 point;
      void main(){ vec2 p = vUv-point; p.x *= ratio; vec3 s = exp(-dot(p,p)/radius)*color; o = vec4(texture(uT,vUv).xyz+s,1.); }`,
    advect: H + `uniform sampler2D uV, uS; uniform vec2 texel; uniform float dt, diss;
      void main(){ vec2 c = vUv - dt*texture(uV,vUv).xy*texel; o = texture(uS,c)/(1.+diss*dt); }`,
    divergence: H + `uniform sampler2D uV;
      void main(){ float L=texture(uV,vL).x, R=texture(uV,vR).x, T=texture(uV,vT).y, B=texture(uV,vB).y; vec2 C=texture(uV,vUv).xy;
        if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x; if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y; o=vec4(0.5*(R-L+T-B),0.,0.,1.); }`,
    curl: H + `uniform sampler2D uV;
      void main(){ o = vec4(0.5*(texture(uV,vR).y-texture(uV,vL).y-texture(uV,vT).x+texture(uV,vB).x),0.,0.,1.); }`,
    vorticity: H + `uniform sampler2D uV, uC; uniform float curl, dt;
      void main(){ float L=texture(uC,vL).x, R=texture(uC,vR).x, T=texture(uC,vT).x, B=texture(uC,vB).x, C=texture(uC,vUv).x;
        vec2 f = 0.5*vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f)+1e-4; f *= curl*C; f.y *= -1.;
        o = vec4(clamp(texture(uV,vUv).xy+f*dt,-1000.,1000.),0.,1.); }`,
    pressure: H + `uniform sampler2D uP, uD;
      void main(){ o = vec4((texture(uP,vL).x+texture(uP,vR).x+texture(uP,vB).x+texture(uP,vT).x-texture(uD,vUv).x)*0.25,0.,0.,1.); }`,
    gradient: H + `uniform sampler2D uP, uV;
      void main(){ vec2 v = texture(uV,vUv).xy - vec2(texture(uP,vR).x-texture(uP,vL).x, texture(uP,vT).x-texture(uP,vB).x); o = vec4(v,0.,1.); }`,
    clear: H + `uniform sampler2D uT; uniform float v; void main(){ o = v*texture(uT,vUv); }`,
    display: H + `uniform sampler2D uT; uniform float dark;
      void main(){ vec3 d = texture(uT,vUv).rgb; float a = clamp(max(d.r,max(d.g,d.b)),0.,1.);
        vec3 c = d/max(a,1e-3);
        o = dark>0.5 ? vec4(c*a, a) : vec4(mix(vec3(1.), c, a*0.9), 1.); }`
  };

  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(x); return x; };
  const vso = sh(gl.VERTEX_SHADER, VS);
  const prog = {};
  try {
    for (const k in FS) {
      const p = gl.createProgram(); gl.attachShader(p, vso); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS[k]));
      gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
      const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
      prog[k] = { p, u };
    }
  } catch (e) { console.warn(e); canvas.remove(); return; }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  const fbo = (w, h, internal, format) => {
    gl.activeTexture(gl.TEXTURE0);
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { t, f, w, h, tx: [1 / w, 1 / h], bind(i) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); return i; } };
  };
  const dbl = (w, h, i, f) => { let a = fbo(w, h, i, f), b = fbo(w, h, i, f); return { get r() { return a; }, get w() { return b; }, swap() { [a, b] = [b, a]; } }; };
  const size = r => { const ar = innerWidth / innerHeight; return ar > 1 ? [Math.round(r * ar), r] : [r, Math.round(r / ar)]; };
  let vel, dye, div, curlF, pres;
  const init = () => {
    const [sw, shh] = size(P.simRes), [dw, dh] = size(P.dyeRes);
    vel = dbl(sw, shh, gl.RG16F, gl.RG); dye = dbl(dw, dh, gl.RGBA16F, gl.RGBA);
    div = fbo(sw, shh, gl.R16F, gl.RED); curlF = fbo(sw, shh, gl.R16F, gl.RED); pres = dbl(sw, shh, gl.R16F, gl.RED);
  };
  const blit = target => {
    if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); }
    else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };
  const use = (k, texel) => { const q = prog[k]; gl.useProgram(q.p); if (q.u.texel && texel) gl.uniform2fv(q.u.texel, texel); return q.u; };

  const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const pal = P.palette.map(hexRGB);
  let hueT = 0;
  const color = () => {
    hueT += 0.004;
    const x = (hueT % 1) * pal.length, i = Math.floor(x), f = x - i, a = pal[i % pal.length], b = pal[(i + 1) % pal.length];
    return a.map((v, k) => (v + (b[k] - v) * f) * 0.3);
  };

  const splat = (x, y, dx, dy, c) => {
    let u = use('splat', vel.r.tx);
    gl.uniform1i(u.uT, vel.r.bind(0)); gl.uniform1f(u.ratio, innerWidth / innerHeight);
    gl.uniform2f(u.point, x, y); gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, P.splatRadius / 100);
    blit(vel.w); vel.swap();
    gl.uniform1i(u.uT, dye.r.bind(0)); gl.uniform3fv(u.color, c);
    blit(dye.w); dye.swap();
  };

  const step = dt => {
    const tx = vel.r.tx;
    let u = use('curl', tx); gl.uniform1i(u.uV, vel.r.bind(0)); blit(curlF);
    u = use('vorticity', tx); gl.uniform1i(u.uV, vel.r.bind(0)); gl.uniform1i(u.uC, curlF.bind(1)); gl.uniform1f(u.curl, P.curl); gl.uniform1f(u.dt, dt); blit(vel.w); vel.swap();
    u = use('divergence', tx); gl.uniform1i(u.uV, vel.r.bind(0)); blit(div);
    u = use('clear', tx); gl.uniform1i(u.uT, pres.r.bind(0)); gl.uniform1f(u.v, 0.8); blit(pres.w); pres.swap();
    u = use('pressure', tx); gl.uniform1i(u.uD, div.bind(0));
    for (let i = 0; i < P.pressureIters; i++) { gl.uniform1i(u.uP, pres.r.bind(1)); blit(pres.w); pres.swap(); }
    u = use('gradient', tx); gl.uniform1i(u.uP, pres.r.bind(0)); gl.uniform1i(u.uV, vel.r.bind(1)); blit(vel.w); vel.swap();
    u = use('advect', tx); gl.uniform1i(u.uV, vel.r.bind(0)); gl.uniform1i(u.uS, vel.r.bind(0)); gl.uniform1f(u.dt, dt); gl.uniform1f(u.diss, P.velocityDissipation); blit(vel.w); vel.swap();
    u = use('advect', tx); gl.uniform1i(u.uV, vel.r.bind(0)); gl.uniform1i(u.uS, dye.r.bind(1)); gl.uniform1f(u.diss, P.densityDissipation); blit(dye.w); dye.swap();
  };

  const isDark = () => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    const m = bg.match(/[0-9a-f]{2}/gi);
    return m && m.length >= 3 ? (parseInt(m[0], 16) + parseInt(m[1], 16) + parseInt(m[2], 16)) / 3 < 110 : false;
  };
  let dark = isDark();
  const render = () => {
    canvas.classList.toggle('dark', dark);
    const u = use('display'); gl.uniform1i(u.uT, dye.r.bind(0)); gl.uniform1f(u.dark, dark ? 1 : 0);
    blit(null);
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(innerWidth * dpr * 0.6), h = Math.round(innerHeight * dpr * 0.6);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; init(); }
  };
  resize();

  let last = performance.now(), raf = 0, idleUntil = 0, prev = null;
  const loop = now => {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.033); last = now;
    step(dt); render();
    if (now < idleUntil) raf = requestAnimationFrame(loop);
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); init(); render(); }
  };
  const wake = () => { idleUntil = performance.now() + 3500; if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };

  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight;
    if (prev) {
      const dx = (x - prev[0]) * P.splatForce * (innerWidth / innerHeight), dy = (y - prev[1]) * P.splatForce;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) splat(x, y, dx, dy, color());
    }
    prev = [x, y];
    wake();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { prev = null; });
  window.addEventListener('resize', () => { resize(); wake(); });
  new MutationObserver(() => { dark = isDark(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { dark = isDark(); });
})();
