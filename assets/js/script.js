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

  /* ---------- 라우팅: #/projects/failoversky 처럼 문서별 주소 ---------- */
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

  show(routeFromHash());
})();