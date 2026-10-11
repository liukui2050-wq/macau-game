/* 通用埋點 SDK —— 自動採集瀏覽／點擊／停留／互動，無外部依賴 */
(function () {
  var SCRIPT = document.currentScript;
  var SLUG = (SCRIPT && SCRIPT.getAttribute('data-slug')) ||
    (location.pathname.replace(/^\/+|\.html?$/g, '') || 'index');
  var TITLE = (SCRIPT && SCRIPT.getAttribute('data-title')) || document.title || SLUG;
  var HOME = !SCRIPT || SCRIPT.getAttribute('data-home') !== '0';

  var ENDPOINT = '/api/deity-track';
  var FLUSH_MS = 5000, MAX_BUF = 20, MAX_DWELL = 3600000;

  if (location.search.indexOf('track=0') >= 0) { window.__track = function () {}; return; }

  /* ---------- session ---------- */
  var SID = '';
  try {
    SID = sessionStorage.getItem('__sid');
    if (!SID) { SID = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)); sessionStorage.setItem('__sid', SID); }
  } catch (e) { SID = Math.random().toString(36).slice(2); }

  function base() {
    return {
      v: 1,
      ts: Date.now(),
      sid: SID,
      slug: SLUG,
      title: TITLE,
      path: location.pathname,
      ref: document.referrer || '',
      lang: navigator.language || '',
      ua: navigator.userAgent || '',
      sw: screen.width, sh: screen.height, dpr: window.devicePixelRatio || 1,
      utm: (function () {
        var q = new URLSearchParams(location.search), o = {};
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
          if (q.get(k)) o[k] = q.get(k);
        });
        return o;
      })()
    };
  }

  var buf = [];
  function push(evt, props) {
    var r = base(); r.evt = evt; r.props = props || {};
    buf.push(r);
    if (buf.length >= MAX_BUF) flush();
  }
  var sending = false;
  function flush(beacon) {
    if (!buf.length) return;
    var payload = buf.slice(); buf = [];
    var body = JSON.stringify({ events: payload });
    if (beacon && navigator.sendBeacon) {
      try { navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' })); return; } catch (e) {}
    }
    if (sending) { buf = payload.concat(buf); return; }
    sending = true;
    try {
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true })
        .catch(function () {}).then(function () { sending = false; });
    } catch (e) { sending = false; buf = payload.concat(buf); }
  }
  window.__track = function (evt, props) { try { push(evt, props); } catch (e) {} };
  window.__flush = flush;

  setInterval(function () { flush(false); }, FLUSH_MS);

  /* ---------- 1. page_view ---------- */
  var IFRAME = false;
  try { IFRAME = (window.self !== window.top); } catch (e) { IFRAME = true; }
  push('page_view', { is_iframe: IFRAME });

  /* ---------- 2. 停留時長 ---------- */
  var t0 = Date.now(), visible = 0, visStart = (document.visibilityState === 'visible') ? Date.now() : 0;
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { visStart = Date.now(); }
    else if (visStart) { visible += Date.now() - visStart; visStart = 0; }
  });
  function leave() {
    if (visStart) { visible += Date.now() - visStart; visStart = 0; }
    push('page_leave', { dwell_ms: Math.min(Date.now() - t0, MAX_DWELL), visible_ms: Math.min(visible, MAX_DWELL) });
    flush(true);
  }
  window.addEventListener('pagehide', leave);
  window.addEventListener('beforeunload', leave);

  /* ---------- 3. 點擊（自動標註常見控件） ---------- */
  var TAG_SEL = ['button', '.h-btn', '.action-btn', '.mini-btn', '.m-btn', '.legend-item', '.deity-card',
    '.tp-item', '.tp-region-h', '#litbtn', '#soundToggle', '#legend-toggle', '#temple-btn',
    '.leaflet-marker-icon', '.leaflet-interactive', '.leaflet-control-layers', '.leaflet-control-zoom a', 'a[href]'];
  function labelOf(el) {
    if (!el || el.nodeType !== 1) return '';
    return el.getAttribute('data-track') ||
      el.getAttribute('data-slug') ||
      el.getAttribute('data-region') || el.getAttribute('data-area') ||
      el.getAttribute('data-kind') || el.getAttribute('data-fly') ||
      (el.id ? '#' + el.id : '') ||
      ((el.textContent || '').trim().slice(0, 24)) || el.className || el.tagName;
  }
  document.addEventListener('click', function (e) {
    var el = e.target, tag = '';
    for (var i = 0; i < TAG_SEL.length && !tag; i++) {
      var n = el && el.closest ? el.closest(TAG_SEL[i]) : null;
      if (n && n !== document.body) { el = n; tag = TAG_SEL[i]; }
    }
    if (!tag) return;
    push('click', { sel: tag, label: labelOf(el), x: e.clientX, y: e.clientY });
  }, true);

  /* ---------- 4. 地圖互動（包裝既有全域函式，失敗即靜默） ---------- */
  var HOOKS = {
    lightAll: 'light_all', clearAll: 'clear_all', toggleLotus: 'toggle_lotus', toggleLit: 'toggle_lotus',
    showRoute: 'show_route', toggleLegend: 'toggle_legend', toggleList: 'toggle_list',
    playTimeline: 'play_timeline', openKao: 'open_kaolu', openPopup: 'open_popup',
    toggleUnknown: 'toggle_unknown', toggleSecondary: 'toggle_secondary', toggleSound: 'toggle_sound',
    fitAll: 'fit_all', flyTo: 'fly_to', jumpGroup: 'jump_group', toggleTempleList: 'temple_list',
    /* 89 / 90 與主頁新增 */
    openMapById: 'open_map', closeAllMap: 'close_map',
    toggleDeity: 'toggle_deity', vsTick: 'vscroll_tick',
    lightAll: 'light_all', clearAll: 'clear_all'
  };
  function hookNamed() {
    Object.keys(HOOKS).forEach(function (fn) {
      if (typeof window[fn] !== 'function') return;
      if (window[fn] && window[fn].__tracked) return;
      var orig = window[fn];
      window[fn] = function () {
        try { push(HOOKS[fn], { n: arguments.length ? argStr(arguments[0]) : '' }); } catch (e) {}
        return orig.apply(this, arguments);
      };
      window[fn].__tracked = 1;
    });
  }

  /* openXxxMap / closeXxxMap 系列（88 主神頁動態函式名） */
  function hookDyn() {
    try {
      Object.keys(window).forEach(function (k) {
        if (!/^open[A-Za-z]*Map$/.test(k) && !/^close[A-Za-z]*Map$/.test(k)) return;
        if (typeof window[k] !== 'function') return;
        if (window[k].__tracked) return;
        var orig = window[k];
        var evt = /^open/.test(k) ? 'open_map' : 'close_map';
        window[k] = function () {
          try { push(evt, { fn: k }); } catch (e) {}
          return orig.apply(this, arguments);
        };
        window[k].__tracked = 1;
      });
    } catch (e) {}
  }

  /* 參數摘要：DOM 元素取 data-id／文字，物件取 id／name，避免 "[object Object]" */
  function argStr(a) {
    if (a === null || a === undefined) return '';
    if (typeof a !== 'object') return String(a).slice(0, 40);
    if (a.nodeType === 1) {
      return (a.getAttribute && (a.getAttribute('data-id') || a.getAttribute('data-slug'))) ||
             ((a.textContent || '').trim().slice(0, 24)) || a.tagName;
    }
    return String(a.id || a.name || a.slug || (a.map ? a.name : '') || '').slice(0, 40);
  }

  function hookAll() { hookNamed(); hookDyn(); }
  hookAll();
  /* openMapById 等定義在 body 末尾，於 DOM 就緒後再補掛一次 */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookAll);
  window.addEventListener('load', hookAll);
  setTimeout(hookAll, 1200);

  /* ---------- 5. 返回首頁懸浮鈕 ---------- */
  var TOP = true;
  try { TOP = (window.self === window.top); } catch (e) { TOP = false; }
  if (HOME && TOP && location.pathname !== '/' && location.pathname !== '/index.html') {
    function addHome() {
      if (document.getElementById('__home')) return;
      var b = document.createElement('a');
      b.id = '__home'; b.href = '/'; b.textContent = '← 首頁';
      b.setAttribute('data-track', 'home');
      b.style.cssText = 'position:fixed;left:8px;top:calc(8px + env(safe-area-inset-top));z-index:10002;' +
        'font:600 12px/1 inherit;padding:7px 11px;border-radius:999px;text-decoration:none;' +
        'background:rgba(248,245,240,.92);color:#0e7a5f;border:1px solid rgba(14,122,95,.45);' +
        'box-shadow:0 2px 10px rgba(31,56,49,.2);backdrop-filter:blur(8px);font-family:"Noto Sans TC",sans-serif';
      document.body.appendChild(b);
    }
    if (document.body) addHome(); else document.addEventListener('DOMContentLoaded', addHome);
  }
})();
