(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DEFAULT = 'about';

  const pages = $$('.page');
  const links = $$('#tree a[data-route]');
  const pageOf = Object.fromEntries(pages.map(p => [p.dataset.route, p]));
  const index = {};
  pages.forEach(p => {
    index[p.dataset.route] = (p.dataset.title + ' ' + p.textContent).replace(/\s+/g, ' ').toLowerCase();
  });
  const parentLi = li => li.parentElement.closest('li');

  /* ---------- 트리 펼치기/접기 ---------- */
  function setOpen(li, open) {
    li.classList.toggle('open', open);
    const b = $(':scope > .node > .toggle', li);
    if (b) b.setAttribute('aria-expanded', String(open));
  }
  $$('#tree .toggle').forEach(b => {
    b.addEventListener('click', () => {
      const li = b.closest('li');
      setOpen(li, !li.classList.contains('open'));
    });
  });

  /* ---------- 라우팅: #/projects/ssukssuk 처럼 문서별 주소 ---------- */
  const routeFromHash = () => {
    const r = decodeURIComponent(location.hash.replace(/^#\/?/, '')).replace(/\/$/, '');
    return pageOf[r] ? r : DEFAULT;
  };

  function renderCrumb(route, activeLink) {
    const crumb = $('#crumb');
    crumb.textContent = '';
    const add = (label, href) => {
      const el = document.createElement(href ? 'a' : 'span');
      el.textContent = label;
      if (href) el.href = href;
      crumb.appendChild(el);
    };
    add('박성웅', route === 'about' ? null : '#/about');
    if (route === 'about' || !activeLink) return;
    const chain = [];
    for (let li = activeLink.closest('li'); li; li = parentLi(li)) {
      chain.unshift($(':scope > .node > a', li));
    }
    chain.forEach((a, i) => add(pageOf[a.dataset.route].dataset.title, i < chain.length - 1 ? a.getAttribute('href') : null));
  }

  function show(route) {
    pages.forEach(p => p.classList.toggle('active', p.dataset.route === route));
    let active = null;
    links.forEach(a => {
      const on = a.dataset.route === route;
      if (on) { a.setAttribute('aria-current', 'page'); active = a; }
      else a.removeAttribute('aria-current');
    });
    if (active) {
      for (let li = parentLi(active.closest('li')); li; li = parentLi(li)) setOpen(li, true);
    }
    renderCrumb(route, active);
    document.title = (route === 'about' ? '박성웅' : pageOf[route].dataset.title + ' | 박성웅') + ' · Cloud Infrastructure Engineer';
    window.scrollTo(0, 0);
    document.body.classList.remove('menu-open');
    const t = $('#menu-toggle');
    if (t) t.setAttribute('aria-expanded', 'false');
  }
  window.addEventListener('hashchange', () => show(routeFromHash()));

  /* ---------- 검색: 제목과 본문 전체에서 찾아 트리를 걸러냄 ---------- */
  const input = $('#q');
  const countEl = $('#count');
  let hits = [];

  function setLabel(a, q) {
    const label = $('.label', a);
    const title = pageOf[a.dataset.route].dataset.title;
    label.textContent = '';
    const i = q ? title.toLowerCase().indexOf(q) : -1;
    if (i < 0) { label.textContent = title; return; }
    label.append(title.slice(0, i));
    const m = document.createElement('mark');
    m.textContent = title.slice(i, i + q.length);
    label.append(m, title.slice(i + q.length));
  }

  function filter() {
    const q = input.value.trim().toLowerCase();
    const items = $$('#tree li');
    hits = [];
    if (!q) {
      items.forEach(li => { li.hidden = false; });
      links.forEach(a => setLabel(a, ''));
      countEl.textContent = '';
      return;
    }
    items.forEach(li => { li.hidden = true; });
    links.forEach(a => {
      const hit = index[a.dataset.route].includes(q);
      setLabel(a, hit ? q : '');
      if (!hit) return;
      hits.push(a);
      for (let li = a.closest('li'); li; li = parentLi(li)) {
        li.hidden = false;
        if (li.classList.contains('has-children') && li !== a.closest('li')) setOpen(li, true);
      }
    });
    countEl.textContent = hits.length ? hits.length + '개 문서' : '결과 없음';
  }
  if (input) {
    input.addEventListener('input', filter);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && hits.length) location.hash = hits[0].getAttribute('href');
      if (e.key === 'Escape') { input.value = ''; filter(); input.blur(); }
    });
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); input.focus(); }
    });
  }

  /* ---------- 모바일 메뉴 ---------- */
  const menuBtn = $('#menu-toggle');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---------- 연락처 복사 ---------- */
  $$('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const label = btn.textContent;
      try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = '복사됨'; }
      catch { btn.textContent = '복사 실패'; }
      setTimeout(() => { btn.textContent = label; }, 1500);
    });
  });

  /* ---------- 이미지 캐러셀 ---------- */
  $$('.carousel').forEach(car => {
    const slides = $$('.slide', car);
    const cnt = $('.car-count', car);
    const page = car.closest('.page');
    let cur = 0;
    const go = n => {
      cur = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('on', i === cur));
      cnt.textContent = (cur + 1) + ' / ' + slides.length;
    };
    $('.prev', car).addEventListener('click', () => go(cur - 1));
    $('.next', car).addEventListener('click', () => go(cur + 1));
    document.addEventListener('keydown', e => {
      if (!page || !page.classList.contains('active')) return;
      if (document.body.classList.contains('lb-open')) return;
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowLeft') go(cur - 1);
      if (e.key === 'ArrowRight') go(cur + 1);
    });
    car.addEventListener('car-go', e => go(e.detail));
    let x0 = null;
    car.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    car.addEventListener('touchend', e => {
      if (x0 === null) return;
      const d = e.changedTouches[0].clientX - x0;
      if (Math.abs(d) > 40) go(cur + (d < 0 ? 1 : -1));
      x0 = null;
    });
    go(0);
    slides.forEach(s => { const im = $('img', s); if (im) { const p = new Image(); p.src = im.src; } });
  });

  /* ---------- 이미지 확대 보기 ---------- */
  const lb = $('#lightbox');
  if (lb) {
    const stage = $('.lb-stage', lb), lbImg = $('img', stage), lbCap = $('.lb-cap', lb);
    let group = [], idx = 0;
    const render = () => {
      const im = group[idx];
      stage.classList.remove('zoom');
      lbImg.src = im.closest('a') ? im.closest('a').href : im.src;
      lbImg.alt = im.alt;
      const fc = im.closest('figure') && $('figcaption', im.closest('figure'));
      lbCap.textContent = (fc ? fc.textContent.replace('클릭하면 확대됩니다.', '').trim() : im.alt) + (group.length > 1 ? '  (' + (idx + 1) + ' / ' + group.length + ')' : '');
      $$('.lb-btn', lb).forEach(b => { b.style.visibility = group.length > 1 ? 'visible' : 'hidden'; });
    };
    const open = im => {
      const c = im.closest('.carousel');
      group = c ? $$('.slide img', c) : [im];
      idx = group.indexOf(im);
      render();
      lb.hidden = false;
      document.body.classList.add('lb-open');
    };
    const close = () => { lb.hidden = true; document.body.classList.remove('lb-open'); };
    const step = d => {
      idx = (idx + d + group.length) % group.length;
      render();
      const gc = group[0].closest('.carousel');
      if (gc) gc.dispatchEvent(new CustomEvent('car-go', { detail: idx }));
    };
    document.addEventListener('click', e => {
      const im = e.target.closest('.page figure img');
      if (!im) return;
      e.preventDefault();
      open(im);
    });
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-btn.prev', lb).addEventListener('click', () => step(-1));
    $('.lb-btn.next', lb).addEventListener('click', () => step(1));
    lb.addEventListener('click', e => { if (e.target === lb || e.target === stage) close(); });
    lbImg.addEventListener('click', e => {
      const r = lbImg.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      stage.classList.toggle('zoom');
      if (stage.classList.contains('zoom')) {
        stage.scrollLeft = lbImg.offsetWidth * fx - stage.clientWidth / 2;
        stage.scrollTop = lbImg.offsetHeight * fy - stage.clientHeight / 2;
      }
    });
    document.addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  /* ---------- 테마 설정 ---------- */
  const tBtn = $('#theme-btn'), tPanel = $('#theme-panel');
  if (tBtn && tPanel) {
    const root = document.documentElement;
    const save = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} };
    const sync = () => {
      const mode = root.dataset.theme || 'light';
      $$('[data-mode]', tPanel).forEach(b => b.setAttribute('aria-checked', b.dataset.mode === mode));
    };
    const toggle = open => { tPanel.hidden = !open; tBtn.setAttribute('aria-expanded', open); };
    tBtn.addEventListener('click', e => { e.stopPropagation(); toggle(tPanel.hidden); });
    tPanel.addEventListener('click', e => {
      e.stopPropagation();
      const m = e.target.closest('[data-mode]');
      if (m) {
        root.dataset.theme = m.dataset.mode;
        save('theme', m.dataset.mode === 'light' ? null : m.dataset.mode);
      }
      sync();
    });
    document.addEventListener('click', () => toggle(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !tPanel.hidden) { toggle(false); tBtn.focus(); } });
    sync();
  }

  /* ---------- 사이드바 접기 ---------- */
  const sideBtn = $('#side-toggle'), layout = $('#layout');
  if (sideBtn && layout) {
    const setSide = open => {
      layout.classList.toggle('side-closed', !open);
      sideBtn.setAttribute('aria-expanded', String(open));
      sideBtn.setAttribute('aria-label', open ? '사이드바 접기' : '사이드바 펼치기');
      try { open ? localStorage.removeItem('side') : localStorage.setItem('side', 'closed'); } catch (e) {}
    };
    try { if (localStorage.getItem('side') === 'closed') setSide(false); } catch (e) {}
    sideBtn.addEventListener('click', () => setSide(layout.classList.contains('side-closed')));
  }

  show(routeFromHash());
})();