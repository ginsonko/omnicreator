/* 万能创作终端 OmniCreator · site behaviour. Vanilla JS, no dependencies, no tracking. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function pending(v) { return v == null || v === '' || /^TODO/i.test(String(v)); }
  // config.json may be edited by third parties; only plain web links and relative paths are used.
  function safeUrl(u) {
    if (typeof u !== 'string' || !u.trim() || /^TODO/i.test(u)) return '';
    u = u.trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.indexOf('//') === 0) return '';
    return u;
  }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  /* toast + clipboard */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function copy(text, label) {
    var done = function () { toast(label || '已复制'); };
    var fallback = function () {
      var ta = el('textarea', { readonly: '', style: 'position:fixed;left:-9999px;top:0' });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择文字复制'); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  /* config */
  function loadConfig() {
    var fallback = window.__OC_CONFIG_FALLBACK__ || null;
    if (location.protocol === 'file:' || !window.fetch) return Promise.resolve(fallback);
    return fetch('config.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () { return fallback; });
  }

  function applyText(cfg) {
    $$('[data-cfg]').forEach(function (n) {
      var v = get(cfg, n.getAttribute('data-cfg'));
      if (!pending(v)) n.textContent = v;
    });
    $$('[data-cfg-href]').forEach(function (n) {
      var u = safeUrl(get(cfg, n.getAttribute('data-cfg-href')));
      if (u) n.setAttribute('href', u);
    });
    var date = get(cfg, 'release.date');
    if (!pending(date)) $('#release-date').textContent = ' · ' + date + ' 发布';
    if (cfg.product && cfg.product.name) document.title = cfg.product.name + ' ' + (cfg.product.english_name || '') + ' · ' + (cfg.product.tagline || '');
  }

  /* platform detection */
  function detectPlatform() {
    var ua = navigator.userAgent || '';
    var uad = navigator.userAgentData;
    var plat = (uad && uad.platform) || navigator.platform || '';
    if (/Android|iPhone|iPod/i.test(ua) || (uad && uad.mobile)) return Promise.resolve('mobile');
    if (/iPad/.test(ua) || (/Mac/i.test(plat) && navigator.maxTouchPoints > 1)) return Promise.resolve('mobile');
    if (/Win/i.test(plat) || /Windows/i.test(ua)) return Promise.resolve('win');
    if (/Mac/i.test(plat) || /Macintosh/i.test(ua)) {
      var guess = function () {
        try {
          var gl = document.createElement('canvas').getContext('webgl');
          var ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
          var r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
          if (/Intel|AMD|Radeon|NVIDIA/i.test(r)) return 'mac-intel';
        } catch (e) {}
        return 'mac-arm';
      };
      if (uad && uad.getHighEntropyValues) {
        return uad.getHighEntropyValues(['architecture']).then(function (v) {
          if (v.architecture === 'arm') return 'mac-arm';
          if (v.architecture === 'x86') return 'mac-intel';
          return guess();
        }, guess);
      }
      return Promise.resolve(guess());
    }
    if (/Linux|CrOS/i.test(plat + ua)) return Promise.resolve('other');
    return Promise.resolve('unknown');
  }
  var PLATFORM_ASSET = { win: 'win_setup', 'mac-arm': 'mac_arm64', 'mac-intel': 'mac_x64' };

  var ICONS = {
    windows: 'M3 5.5 10 4.5v7H3zM11 4.3 21 3v8.5H11zM3 12.5h7v7l-7-1zM11 12.5h10V21l-10-1.4z',
    mac: 'M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM14.1 5.8c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z'
  };
  function osIcon(os) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', ICONS[os] || ICONS.windows);
    svg.appendChild(p);
    return svg;
  }

  function renderDownloads(cfg, platform) {
    var grid = $('#dl-grid');
    var rel = cfg.release || {};
    var assets = rel.assets || {};
    var wanted = PLATFORM_ASSET[platform];
    var page = safeUrl(rel.release_page) || safeUrl(get(cfg, 'product.repo'));
    grid.textContent = '';
    var anyMirror = false;
    Object.keys(assets).forEach(function (id) {
      var a = assets[id];
      var url = safeUrl(a.url) || page;
      var mirror = safeUrl(a.mirror);
      if (mirror) anyMirror = true;
      var meta = 'v' + rel.version + (a.arch ? ' · ' + (a.arch === 'arm64' ? 'arm64' : 'x64') : '') + ' · ' + (pending(a.size) ? '大小发布后更新' : a.size);
      var shaCode = pending(a.sha256) ? el('code', { class: 'pending', text: '发布后更新' }) : el('code', { text: a.sha256 });
      var shaRow = el('div', { class: 'sha' }, [el('span', { text: 'SHA256' }), shaCode]);
      if (!pending(a.sha256)) {
        var b = el('button', { class: 'copy-mini', type: 'button', 'aria-label': '复制' + a.label + '的 SHA256', text: '复制' });
        b.addEventListener('click', function () { copy(a.sha256, 'SHA256 已复制'); });
        shaRow.appendChild(b);
      }
      var actions = el('div', { class: 'actions' }, [
        el('a', { class: 'btn ' + (id === wanted || (!wanted && /setup|arm64/.test(id)) ? 'btn-primary' : 'btn-ghost'), href: url, 'data-asset': id, rel: 'noopener' }, ['下载（GitHub）']),
        mirror ? el('a', { class: 'btn btn-ghost', href: mirror, rel: 'noopener', 'data-asset-mirror': id }, ['国内镜像']) : null
      ]);
      var card = el('article', { class: 'dl-card' + (id === wanted ? ' detected' : ''), id: 'dl-' + id }, [
        id === wanted ? el('span', { class: 'badge', text: '适合你的电脑' }) : null,
        el('div', { class: 'dl-head' }, [
          el('span', { class: 'dl-os' }, [osIcon(a.os)]),
          el('div', null, [el('h3', { text: a.label }), el('div', { class: 'dl-meta', text: meta })])
        ]),
        a.note ? el('p', { text: a.note }) : null,
        actions,
        shaRow
      ]);
      grid.appendChild(card);
    });
    var note = get(cfg, 'release.mirror_note');
    if (!pending(note)) $('#mirror-help').textContent = note;
    else if (anyMirror) $('#mirror-help').textContent = '点卡片上的「国内镜像」按钮下载，速度更快。文件内容与 GitHub 完全一致，可以用 SHA256 核对。';
  }

  function renderHero(cfg, platform) {
    var rel = cfg.release || {};
    var assets = rel.assets || {};
    var id = PLATFORM_ASSET[platform];
    var btn = $('#hero-dl');
    var label = $('#hero-dl-label');
    var meta = $('#hero-dl-meta');
    var detect = $('#hero-detect');
    if (id && assets[id]) {
      var a = assets[id];
      btn.setAttribute('href', safeUrl(a.url) || '#download');
      label.textContent = '下载' + a.label;
      meta.textContent = 'v' + rel.version + (pending(a.size) ? '' : ' · ' + a.size) + ' · 免费';
      if (platform === 'win') detect.textContent = '已识别为 Windows。想要免安装版或 Mac 版？';
      else detect.textContent = '已识别为 ' + (platform === 'mac-arm' ? 'Apple 芯片' : 'Intel') + ' 的 Mac。不确定芯片类型或想下载其他版本？';
    } else if (platform === 'mobile') {
      label.textContent = '在电脑上下载';
      meta.textContent = '支持 Windows 和 macOS';
      detect.textContent = '这是桌面软件，手机上无法安装。可以先收藏本页，再用电脑打开。';
    } else {
      label.textContent = '选择版本下载';
      meta.textContent = 'Windows · macOS（Apple 芯片 / Intel）';
    }
  }

  function renderVideos(cfg) {
    var list = cfg.videos || [];
    $$('[data-video]').forEach(function (card) {
      var v = list.filter(function (x) { return x.id === card.getAttribute('data-video'); })[0];
      if (!v) return;
      var h = $('h3', card), p = $('p', card), img = $('img', card), btn = $('.video-poster', card);
      if (v.title) h.textContent = v.title + (v.duration ? ' · ' + v.duration : '');
      if (v.desc) p.textContent = v.desc;
      var poster = safeUrl(v.poster);
      if (poster) img.setAttribute('src', poster);
      var url = safeUrl(v.url), embed = safeUrl(v.embed);
      btn.setAttribute('aria-label', (url || embed ? '播放：' : '即将上线：') + (v.title || ''));
      if (url || embed) card.classList.add('ready');
      btn.onclick = function () {
        if (!url && !embed) { toast('视频正在制作中，上线后会放在这里'); return; }
        if (!embed && !/\.(mp4|webm|m3u8)(\?|#|$)/i.test(url)) { window.open(url, '_blank', 'noopener'); return; }
        openVideo(v.title, embed, url);
      };
    });
  }

  function openVideo(title, embed, url) {
    var d = $('#video-dialog'), stage = $('#vd-stage');
    $('#vd-title').textContent = title || '教程视频';
    stage.textContent = '';
    if (embed) stage.appendChild(el('iframe', { src: embed, title: title || '视频', allow: 'autoplay; fullscreen; picture-in-picture', allowfullscreen: '', referrerpolicy: 'no-referrer-when-downgrade' }));
    else stage.appendChild(el('video', { src: url, controls: '', autoplay: '', playsinline: '', preload: 'metadata' }));
    var foot = $('#vd-foot');
    foot.textContent = '';
    if (url) foot.appendChild(el('a', { href: url, target: '_blank', rel: 'noopener', text: '在新窗口打开 ↗' }));
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function closeVideo() {
    var d = $('#video-dialog');
    $('#vd-stage').textContent = '';
    if (d.close) d.close(); else d.removeAttribute('open');
  }

  function renderPartner(cfg) {
    var p = cfg.partner || {};
    var qqLink = safeUrl(get(cfg, 'community.qq_link'));
    if (qqLink) { var q = $('#qq-link'); q.href = qqLink; q.hidden = false; }
    if (!p.enabled || pending(p.name)) return;
    var url = safeUrl(p.url);
    $('#partner-name').textContent = p.name;
    if (url) $('#partner-link').href = url; else $('#partner-link').removeAttribute('href');
    var logo = safeUrl(p.logo);
    if (logo) { var img = $('#partner-logo'); img.src = logo; img.alt = p.name; img.hidden = false; }
    if (!pending(p.contact)) {
      $('#partner-contact-top').textContent = '· 客服：' + p.contact;
      $('#partner-contact-top').hidden = false;
      $('#partner-contact').textContent = p.name + ' 的客服 / 交流方式：' + p.contact;
      $('#partner-contact').hidden = false;
    }
    $('#partner-bar').hidden = false;
    if (!pending(p.notice)) { $('#partner-notice').textContent = p.notice; $('#partner-notice').hidden = false; }
    $('#step2-text').textContent = '在 ' + p.name + ' 注册、充值，进入「令牌 / API Key」页面准备 Key。也可以使用其他兼容 OpenAI 的站点。';
    var reg = safeUrl(p.register_url) || url;
    var tokens = safeUrl(p.token_page_url);
    var cta = $('#partner-cta');
    if (p.one_click_import) {
      $('#partner-cta-text').textContent = p.name + ' 支持智能路由和一键导入，推荐用这种方式。';
      $('#path-b').classList.add('featured');
      cta.hidden = !reg;
      if (reg) { $('#partner-register').href = reg; $('#partner-register').textContent = '去 ' + p.name + ' 注册'; }
      if (tokens) { $('#partner-tokens').href = tokens; $('#partner-tokens').hidden = false; }
    } else {
      $('#path-a').classList.add('featured');
      var box = el('div', { class: 'partner-cta' }, [
        el('p', { text: '在 ' + p.name + ' 按这个方法创建 Key 并手动配置。' }),
        el('div', { class: 'actions' }, [
          reg ? el('a', { class: 'btn btn-primary', href: reg, target: '_blank', rel: 'noopener', text: '去 ' + p.name + ' 注册' }) : null,
          tokens ? el('a', { class: 'btn btn-ghost', href: tokens, target: '_blank', rel: 'noopener', text: '打开令牌页' }) : null
        ])
      ]);
      $('#path-a').insertBefore(box, $('#path-a .fine'));
    }
    var foot = $('#partner-foot');
    if (url) { foot.href = url; foot.textContent = p.name + ' ↗'; foot.hidden = false; }
    $('#partner-foot-note').textContent = ' 本页由 ' + p.name + ' 托管。';
  }

  /* static UI */
  function initUi() {
    var top = $('#topbar');
    var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var menu = $('#menu-btn'), nav = $('#nav');
    menu.addEventListener('click', function () {
      var open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
      nav.classList.toggle('open', open);
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); }); });

    $('#theme-btn').addEventListener('click', function () {
      var root = document.documentElement;
      var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('oc-theme', next); } catch (e) {}
    });

    $$('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copy(b.getAttribute('data-copy'), '已复制，粘贴到软件输入框就能用'); }); });
    $$('[data-copy-from]').forEach(function (b) { b.addEventListener('click', function () { copy($('#' + b.getAttribute('data-copy-from')).textContent, '已复制命令'); }); });

    var tabs = $$('.tabs [role="tab"]');
    var select = function (t) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length];
        select(n); n.focus(); e.preventDefault();
      });
    });

    $('#vd-close').addEventListener('click', closeVideo);
    $('#video-dialog').addEventListener('close', function () { $('#vd-stage').textContent = ''; });
    $('#video-dialog').addEventListener('click', function (e) { if (e.target === e.currentTarget) closeVideo(); });

    var typer = $('#typer');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typer && !reduce) {
      var lines = ['把这张图做成 5 秒视频', '给它写 3 条宣传文案', '再做一张竖版的', '继续上次的咖啡新品项目'];
      var li = 0, ci = lines[0].length, dir = -1, hold = 18;
      setInterval(function () {
        if (hold > 0) { hold--; return; }
        ci += dir;
        if (ci <= 0) { ci = 0; dir = 1; li = (li + 1) % lines.length; hold = 3; }
        else if (ci >= lines[li].length) { ci = lines[li].length; dir = -1; hold = 18; }
        typer.textContent = lines[li].slice(0, ci);
      }, 110);
    }
  }

  function start() {
    initUi();
    Promise.all([loadConfig(), detectPlatform()]).then(function (r) {
      var cfg = r[0], platform = r[1];
      document.documentElement.setAttribute('data-platform', platform);
      if (!cfg) return;
      applyText(cfg);
      renderDownloads(cfg, platform);
      renderHero(cfg, platform);
      renderVideos(cfg);
      renderPartner(cfg);
      $$('[data-copy-cfg]').forEach(function (b) {
        b.addEventListener('click', function () { copy(String(get(cfg, b.getAttribute('data-copy-cfg')) || ''), '群号已复制'); });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
