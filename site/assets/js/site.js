/* 站点核心脚本：四语切换（简 / 繁體 / EN / 日本語）、下载卡片渲染、视频弹窗与章节跳转、Agent 代装口令、合作方托管兼容。
   纯原生 JS，无外部依赖与追踪。视觉与性能层（流畅模式、Canvas 舞台、作品墙、千面、下载引导）在 fx.js，
   通过 window.OC 复用这里的工具函数；fx.js 加载失败时，本文件负责的内容与下载功能照常可用。 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  // data-source="release-js" 读取 window.OMNI_RELEASE；否则读取 config.json
  var SOURCE = root.getAttribute('data-source') || 'config-json';
  var I18N = window.SITE_I18N || {};

  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function pending(v) { return v == null || v === '' || /^TODO/i.test(String(v)); }
  // Release data may be edited by third parties (partner packages); only plain web links and relative paths are used.
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
  // 把 {name} 这样的占位符换成实际值
  function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }

  /* ---------- 语言：简体中文写在 HTML 里，其余三种语言的词典在 i18n.js ---------- */
  var LANGS = ['zh', 'zh-TW', 'en', 'ja'];
  var HTML_LANG = { zh: 'zh-CN', 'zh-TW': 'zh-TW', en: 'en', ja: 'ja' };
  var lang = 'zh';
  function normLang(s) {
    s = String(s || '').toLowerCase();
    if (/^zh[-_](tw|hk|mo|hant)/.test(s)) return 'zh-TW';
    if (s === 'zh' || /^zh[-_]/.test(s)) return 'zh';
    if (s.indexOf('en') === 0) return 'en';
    if (s.indexOf('ja') === 0) return 'ja';
    return '';
  }
  // 优先级：网址里的 ?lang= → 上次手动选的 → 浏览器语言 → 简体中文
  function pickLang() {
    var q = normLang((location.search.match(/[?&]lang=([\w-]+)/) || [])[1]);
    if (q) return q;
    try { var s = localStorage.getItem('site-lang'); if (LANGS.indexOf(s) !== -1) return s; } catch (e) {}
    return normLang(navigator.language) || 'zh';
  }
  // 运行时文案（下载卡片、提示条、弹窗）的简体中文原文；其余语言在 i18n.js 的 ui.* 里。
  var UIZH = {
    copied: '已复制',
    copyFail: '复制失败，请手动选择文字复制',
    copyPrompt: '已复制，粘贴到软件输入框就能用',
    copyAgent: '已复制，粘贴发给你的 Agent 就行',
    copyGroup: '群号已复制',
    copySha: 'SHA256 已复制',
    copyCmd: '已复制命令',
    copyLink: '下载页链接已复制，到电脑上打开就行',
    copy: '复制',
    mirror: '国内高速下载',
    github: '备用下载（GitHub）',
    githubOnly: '下载（GitHub）',
    forYou: '适合你的电脑',
    shaPending: '发布后更新',
    sizePending: '大小发布后更新',
    winSetup: 'Windows 安装版',
    winPortable: 'Windows 免安装版',
    macArm: 'Mac · Apple 芯片',
    macIntel: 'Mac · Intel 芯片',
    noteSetup: '推荐。有桌面快捷方式和开始菜单，以后在软件里点「立即更新」就能升级。',
    notePortable: '放在任意文件夹或 U 盘里，双击就能用；第一次启动要先解压，会慢一点。',
    noteArm: 'M1 / M2 / M3 / M4 及更新的 Mac，macOS 13 及以上。双击 dmg，把 OmniCreator 拖进「应用程序」。',
    noteIntel: 'Intel 处理器的 Mac，macOS 13 及以上。Apple 芯片的 Mac 请选左边那个，更快。',
    heroWin: 'Windows 下载',
    heroMac: 'Mac 下载',
    heroPc: '复制链接，到电脑上下载',
    free: '免费',
    detWin: '已识别为 Windows。要免安装版、Mac 版或校验值？',
    detArm: '已识别为 Apple 芯片的 Mac。是 Intel 芯片或想要别的版本？',
    detIntel: '已识别为 Intel 芯片的 Mac。不确定芯片或想要别的版本？',
    detMobile: '这是电脑软件，手机上装不了。先收藏本页，或复制链接到电脑上打开。',
    detOther: 'Windows 10 / 11（64 位）· macOS 13 及以上 · 全部版本和校验值',
    soon: '视频正在制作中，上线后会放在这里',
    chapters: '章节（点一下跳到那里）',
    chaptersSoon: '章节（视频上线后可点击跳转）',
    openNew: '在新窗口打开 ↗',
    play: '播放：',
    soonLabel: '即将上线：',
    playBtn: '播放',
    pauseBtn: '暂停',
    muteBtn: '静音',
    unmuteBtn: '取消静音',
    menuOpen: '打开菜单',
    menuClose: '关闭菜单',
    released: ' 发布',
    mirrorHelp: '「国内高速下载」走本站服务器，文件和 GitHub 上的完全一样，可以用 SHA256 核对。',
    // 流畅模式与下载引导（fx.js 使用）
    perfOn: '已开启流畅模式：关闭重动效，低配电脑更顺',
    perfOff: '已恢复完整动效',
    perfAuto: '检测到画面不够流畅，已自动切到流畅模式（点 ⚡ 可以切回）',
    keepWin: '开始下载了。浏览器若提示「通常不会下载」，点 … →「保留」就行，图解已展开',
    keepMac: '开始下载了。Mac 第一次打开要手动放行，步骤已展开',
    voListen: '正在听…',
    voWork: '听懂了，分派中',
    voDone: '已交付 ✓',
    // 合作方托管
    pPre: '本页由',
    pPost: '托管',
    pContactTop: '· 客服：{contact}',
    pContact: '{name} 的客服 / 交流方式：{contact}',
    pStep2: '在 {name} 注册、充值，进入「令牌 / API Key」页面准备 Key；或者直接在软件里登录官方账号。',
    pCta: '{name} 支持智能路由和一键导入，推荐用这种方式。',
    pManual: '在 {name} 按这个方法创建 Key 并手动配置。',
    pRegister: '去 {name} 注册',
    pTokens: '打开令牌页',
    pFoot: ' 本页由 {name} 托管。'
  };
  function dict() { return (lang !== 'zh' && I18N[lang]) || {}; }
  // u：运行时文案；t：页面词典里的任意 key，取不到就用 fallback（通常是 HTML 里的简体原文）
  function u(k) { var v = dict()['ui.' + k]; return v != null ? v : (UIZH[k] != null ? UIZH[k] : k); }
  function t(key, fallback) { var v = key ? dict()[key] : null; return v != null ? v : fallback; }
  // 轮播文案（首屏打字机、语音演示）：data-lines 是简体原文，其余语言取词典里的数组
  function lines(node) {
    var v = dict()[node.getAttribute('data-lines-key')];
    if (Array.isArray(v) && v.length) return v;
    try { return JSON.parse(node.getAttribute('data-lines') || '[]'); } catch (e) { return []; }
  }
  var langListeners = [];
  function applyLang(next, save) {
    lang = LANGS.indexOf(next) === -1 ? 'zh' : next;
    root.setAttribute('lang', HTML_LANG[lang]);
    root.setAttribute('data-lang', lang);
    var d = dict();
    // 第一次切换前把简体原文存进 data-zh，切回简体时原样还原
    $$('[data-i18n]').forEach(function (n) {
      var k = n.getAttribute('data-i18n');
      if (!n.hasAttribute('data-zh')) n.setAttribute('data-zh', n.innerHTML);
      var v = lang === 'zh' ? n.getAttribute('data-zh') : d[k];
      if (typeof v === 'string') n.innerHTML = v;
    });
    ['alt', 'aria-label', 'title', 'placeholder'].forEach(function (attr) {
      $$('[data-i18n-' + attr + ']').forEach(function (n) {
        var k = n.getAttribute('data-i18n-' + attr);
        var keep = 'data-zh-' + attr;
        if (!n.hasAttribute(keep)) n.setAttribute(keep, n.getAttribute(attr) || '');
        var v = lang === 'zh' ? n.getAttribute(keep) : d[k];
        if (typeof v === 'string') n.setAttribute(attr, v.replace(/<[^>]+>/g, ''));
      });
    });
    document.title = lang === 'zh' ? (root.getAttribute('data-zh-title') || document.title) : (d.__title || document.title);
    $$('[data-lang-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-btn') === lang)); });
    var sel = $('#lang-select');
    if (sel) sel.value = lang;
    if (save) { try { localStorage.setItem('site-lang', lang); } catch (e) {} }
    langListeners.forEach(function (f) { f(); });
  }

  /* ---------- toast + clipboard (only when the visitor clicks a copy button) ---------- */
  var toastTimer;
  function toast(msg) {
    var box = $('#toast');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove('show'); }, 2800);
  }
  function copy(text, label) {
    var done = function () { toast(label || u('copied')); };
    var fallback = function () {
      var ta = el('textarea', { readonly: '', style: 'position:fixed;left:-9999px;top:0' });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast(u('copyFail')); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  /* ---------- release data: release-js reads data/omni-release.js, config-json reads config.json ---------- */
  function loadRelease() {
    if (SOURCE === 'release-js') {
      var R = window.OMNI_RELEASE;
      if (!R) return Promise.resolve(null);
      var f = R.files || {};
      var map = function (x, os, arch) {
        return x ? { os: os, arch: arch, file: x.name, url: x.url, mirror: x.mirror, size: x.size, sha256: x.sha256, silent: x.silent_args } : null;
      };
      return Promise.resolve({
        raw: R,
        release: {
          version: R.version, date: R.date, channel: R.channel, release_page: R.release_page,
          assets: { win_setup: map(f.setup, 'windows', 'x64'), win_portable: map(f.portable, 'windows', 'x64'), mac_arm64: map(f.mac_arm64, 'mac', 'arm64'), mac_x64: map(f.mac_x64, 'mac', 'x64') }
        },
        videos: (R.videos || []).map(function (v) {
          return { id: v.id, url: v.src, poster: v.poster, url_portrait: v.src_portrait, poster_portrait: v.poster_portrait, chapters: v.chapters, chapters_src: v.chapters_src, duration: v.duration };
        }),
        plugin_repo: R.plugin_repo
      });
    }
    // file:// 下浏览器不让读 config.json，改用 config-fallback.js 里的同一份配置，所以双击 index.html 也不会报错
    var fb = window.__OC_CONFIG_FALLBACK__ || null;
    if (location.protocol === 'file:' || !window.fetch) return Promise.resolve(fb);
    return fetch('config.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () { return fb; });
  }

  /* ---------- platform ---------- */
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
  var ASSET_TEXT = {
    win_setup: ['winSetup', 'noteSetup'], win_portable: ['winPortable', 'notePortable'],
    mac_arm64: ['macArm', 'noteArm'], mac_x64: ['macIntel', 'noteIntel']
  };
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
  // 合作方配置模式下，简体中文访问时保留 config.json 中自定义的标签与说明。
  function assetLabel(id, a) { return (SOURCE !== 'release-js' && lang === 'zh' && !pending(a.label)) ? a.label : u(ASSET_TEXT[id][0]); }
  function assetNote(id, a) { return (SOURCE !== 'release-js' && lang === 'zh' && !pending(a.note)) ? a.note : u(ASSET_TEXT[id][1]); }
  function primaryUrl(a, page) { return safeUrl(a.mirror) || safeUrl(a.url) || page; }

  var CFG = null, PLATFORM = 'unknown';
  function renderDownloads() {
    var grid = $('#dl-grid');
    if (!grid || !CFG) return;
    var rel = CFG.release || {};
    var assets = rel.assets || {};
    var wanted = PLATFORM_ASSET[PLATFORM];
    var page = safeUrl(rel.release_page) || safeUrl(get(CFG, 'product.repo'));
    grid.textContent = '';
    var anyMirror = false;
    Object.keys(ASSET_TEXT).forEach(function (id) {
      var a = assets[id];
      if (!a) return;
      var gh = safeUrl(a.url) || page;
      var mirror = safeUrl(a.mirror);
      if (mirror) anyMirror = true;
      var meta = 'v' + rel.version + (a.arch ? ' · ' + (a.arch === 'arm64' ? 'arm64' : 'x64') : '') + ' · ' + (pending(a.size) ? u('sizePending') : a.size);
      var shaCode = pending(a.sha256) ? el('code', { class: 'pending', text: u('shaPending') }) : el('code', { text: a.sha256 });
      var shaRow = el('div', { class: 'sha' }, [el('span', { text: 'SHA256' }), shaCode]);
      if (!pending(a.sha256)) {
        var b = el('button', { class: 'copy-mini', type: 'button', 'aria-label': u('copy') + ' SHA256', text: u('copy') });
        b.addEventListener('click', function () { copy(a.sha256, u('copySha')); });
        shaRow.appendChild(b);
      }
      var hot = id === wanted || (!wanted && /setup|arm64/.test(id));
      var actions = el('div', { class: 'actions' }, mirror ? [
        el('a', { class: 'btn ' + (hot ? 'btn-primary' : 'btn-ghost'), href: mirror, 'data-asset-mirror': id, rel: 'noopener' }, [u('mirror')]),
        el('a', { class: 'btn btn-link', href: gh, 'data-asset': id, rel: 'noopener' }, [u('github')])
      ] : [
        el('a', { class: 'btn ' + (hot ? 'btn-primary' : 'btn-ghost'), href: gh, 'data-asset': id, rel: 'noopener' }, [u('githubOnly')])
      ]);
      var card = el('article', { class: 'dl-card' + (id === wanted ? ' detected' : ''), id: 'dl-' + id }, [
        id === wanted ? el('span', { class: 'badge', text: u('forYou') }) : null,
        el('div', { class: 'dl-head' }, [
          el('span', { class: 'dl-os' }, [osIcon(a.os)]),
          el('div', null, [el('h3', { text: assetLabel(id, a) }), el('div', { class: 'dl-meta', text: meta })])
        ]),
        el('p', { text: assetNote(id, a) }),
        actions,
        shaRow,
        a.file ? el('div', { class: 'dl-file', text: a.file }) : null
      ]);
      grid.appendChild(card);
    });
    var help = $('#mirror-help');
    if (help) {
      var note = get(CFG, 'release.mirror_note');
      if (!pending(note) && lang === 'zh') help.textContent = note;
      else if (anyMirror) help.textContent = u('mirrorHelp');
    }
    // 版本号一律以 config.json 为准：发版脚本只改 config，页面上所有 [data-ver] 跟着变
    $$('[data-ver]').forEach(function (n) { n.textContent = rel.version || n.textContent; });
    var date = rel.date;
    $$('.release-date').forEach(function (n) { n.textContent = pending(date) ? '' : ' · ' + date + u('released'); });
    var pageLinks = safeUrl(rel.release_page);
    if (pageLinks) $$('[data-release-page]').forEach(function (n) { n.href = pageLinks; });
  }

  function renderHero() {
    if (!CFG) return;
    var rel = CFG.release || {};
    var A = rel.assets || {};
    var page = safeUrl(rel.release_page) || '#download';
    var win = $('#hero-dl-win'), mac = $('#hero-dl-mac'), detect = $('#hero-detect');
    var macId = PLATFORM === 'mac-intel' ? 'mac_x64' : 'mac_arm64';
    var set = function (btn, a, label, primary) {
      if (!btn) return;
      if (a) btn.setAttribute('href', primaryUrl(a, page));
      $('.hl', btn).textContent = label;
      $('.hm', btn).textContent = 'v' + rel.version + (a && !pending(a.size) ? ' · ' + a.size : '') + ' · ' + u('free');
      btn.classList.toggle('btn-primary', primary);
      btn.classList.toggle('btn-ghost', !primary);
    };
    var isMac = PLATFORM === 'mac-arm' || PLATFORM === 'mac-intel';
    set(win, A.win_setup, u('heroWin'), !isMac);
    set(mac, A[macId], u('heroMac') + (PLATFORM === 'mac-intel' ? ' · Intel' : ' · Apple'), isMac);
    var pcBtn = $('#hero-dl-pc');
    if (pcBtn) { pcBtn.hidden = PLATFORM !== 'mobile'; pcBtn.textContent = u('heroPc'); }
    if (detect) {
      detect.textContent = PLATFORM === 'win' ? u('detWin') : PLATFORM === 'mac-arm' ? u('detArm') : PLATFORM === 'mac-intel' ? u('detIntel') : PLATFORM === 'mobile' ? u('detMobile') : u('detOther');
    }
    var label = $('#hero-dl-label');
    if (label) label.textContent = isMac ? $('.hl', mac).textContent : $('.hl', win).textContent;
  }

  /* ---------- videos ---------- */
  function toSeconds(s) {
    if (typeof s === 'number') return s >= 0 ? s : NaN;
    if (typeof s !== 'string' || !/^\d+(:\d{1,2}){1,2}$/.test(s.trim())) return NaN;
    return s.trim().split(':').reduce(function (a, x) { return a * 60 + Number(x); }, 0);
  }
  function fmt(sec) { sec = Math.floor(sec); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function chaptersOf(v) {
    return (Array.isArray(v.chapters) ? v.chapters : []).filter(function (c) { return c && c.title; }).map(function (c) {
      var sec = toSeconds(c.start);
      // 章节标题来自 config.json（简体）；词典里有 "ch.<原标题>" 时显示译文
      return { title: t('ch.' + c.title, String(c.title)), start: typeof c.start === 'number' ? fmt(c.start) : String(c.start == null ? '' : c.start).trim(), sec: sec };
    });
  }
  function chapterList(chs, onPick, cls) {
    var ol = el('ol', { class: cls });
    chs.forEach(function (c, i) {
      var timed = !isNaN(c.sec);
      var b = el('button', { type: 'button', 'data-sec': timed ? String(c.sec) : null, 'aria-label': (timed ? c.start + ' ' : '') + c.title }, [
        el('span', { class: 'ch-t', text: timed ? c.start : String(i + 1) }),
        el('span', { class: 'ch-n', text: c.title })
      ]);
      b.addEventListener('click', function () { onPick(c, b); });
      ol.appendChild(el('li', null, [b]));
    });
    return ol;
  }
  function portraitScreen() { return !!(window.matchMedia && matchMedia('(max-width: 760px) and (orientation: portrait)').matches); }
  function embedAt(embed, sec) {
    if (!sec) return embed;
    var x = embed.replace(/([?&])(t|start)=[^&#]*/g, '$1').replace(/[?&]+(#|$)/, '$1');
    return x + (x.indexOf('?') === -1 ? '?' : '&') + 't=' + Math.floor(sec) + '&start=' + Math.floor(sec);
  }
  function renderVideos() {
    var list = (CFG && CFG.videos) || [];
    $$('[data-video]').forEach(function (card) {
      var v = list.filter(function (x) { return x.id === card.getAttribute('data-video'); })[0];
      if (!v) return;
      var img = $('img', card), btn = $('.video-poster', card);
      var poster = safeUrl(v.poster);
      if (poster && img && !card.hasAttribute('data-keep-poster')) img.setAttribute('src', poster);
      // 合作方配置可覆盖简体中文标题与简介；其余语言由 i18n.js 接管。
      if (SOURCE !== 'release-js' && lang === 'zh' && !card.hasAttribute('data-keep-copy')) {
        var h = $('h3', card), p = $('p', card);
        if (v.title && h) h.textContent = v.title + (v.duration ? ' · ' + v.duration : '');
        if (v.desc && p) p.textContent = v.desc;
      }
      var url = safeUrl(v.url), embed = safeUrl(v.embed), urlPortrait = safeUrl(v.url_portrait);
      var ready = !!(url || embed);
      var external = ready && !embed && !/\.(mp4|webm|m3u8)(\?|#|$)/i.test(url);
      var title = ($('h3', card) || {}).textContent || '';
      btn.setAttribute('aria-label', (ready ? u('play') : u('soonLabel')) + title);
      card.classList.toggle('ready', ready);
      var play = function (sec) {
        if (!ready) { toast(u('soon')); return; }
        if (external) { window.open(url, '_blank', 'noopener'); return; }
        var portrait = !embed && !!urlPortrait && portraitScreen();
        openVideo(v, title, embed, portrait ? urlPortrait : url, sec || 0, portrait);
      };
      btn.onclick = function () { play(0); };
      $$('[data-play="' + v.id + '"]').forEach(function (b) { b.hidden = !ready; b.onclick = function () { play(0); }; });
      var old = $('.chapters', card);
      if (old) old.parentNode.removeChild(old);
      var mount = function () {
        var chs = chaptersOf(v);
        if (!chs.length) return;
        var box = el('div', { class: 'chapters' }, [el('p', { class: 'ch-head', text: ready ? u('chapters') : u('chaptersSoon') })]);
        box.appendChild(chapterList(chs, function (c) { play(isNaN(c.sec) ? 0 : c.sec); }, 'ch-list'));
        card.appendChild(box);
      };
      if (!v.chapters && v.chapters_src && window.fetch && location.protocol !== 'file:') {
        fetch(v.chapters_src).then(function (r) { return r.ok ? r.json() : []; }).then(function (j) {
          v.chapters = Array.isArray(j) ? j : []; mount();
        }, function () { v.chapters = []; });
      } else mount();
    });
    var grid = $('#video-grid');
    if (grid) {
      var cards = $$('[data-video]', grid);
      cards.filter(function (c) { return c.classList.contains('ready'); })
        .concat(cards.filter(function (c) { return !c.classList.contains('ready'); }))
        .forEach(function (c) { grid.appendChild(c); });
    }
  }
  function openVideo(v, title, embed, url, sec, portrait) {
    var d = $('#video-dialog'), stage = $('#vd-stage'), chBox = $('#vd-chapters');
    $('#vd-title').textContent = title;
    d.classList.toggle('portrait', !!portrait);
    stage.textContent = '';
    chBox.textContent = '';
    var media = null;
    var mount = function (at) {
      stage.textContent = '';
      if (embed) {
        stage.appendChild(el('iframe', { src: embedAt(embed, at), title: title, allow: 'autoplay; fullscreen; picture-in-picture', allowfullscreen: '', referrerpolicy: 'no-referrer-when-downgrade' }));
      } else {
        media = el('video', { src: url, controls: '', autoplay: '', playsinline: '', preload: 'metadata' });
        if (at) media.addEventListener('loadedmetadata', function () { media.currentTime = at; }, { once: true });
        stage.appendChild(media);
      }
    };
    mount(sec);
    var chs = chaptersOf(v).filter(function (c) { return !isNaN(c.sec); });
    if (chs.length) {
      var buttons;
      var mark = function (t) {
        var cur = -1;
        chs.forEach(function (c, i) { if (t + 0.25 >= c.sec) cur = i; });
        buttons.forEach(function (b, i) { b.classList.toggle('on', i === cur); if (i === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      };
      var list = chapterList(chs, function (c) {
        if (media) { media.currentTime = c.sec; var pr = media.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else mount(c.sec);
        mark(c.sec);
      }, 'ch-list vd-ch');
      buttons = $$('button', list);
      chBox.appendChild(list);
      if (media) media.addEventListener('timeupdate', function () { mark(media.currentTime); });
      mark(sec || 0);
    }
    var foot = $('#vd-foot');
    foot.textContent = '';
    if (url) foot.appendChild(el('a', { href: url, target: '_blank', rel: 'noopener', text: u('openNew') }));
    if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  }
  function closeVideo() {
    var d = $('#video-dialog');
    $('#vd-stage').textContent = '';
    $('#vd-chapters').textContent = '';
    if (d.close) d.close(); else d.removeAttribute('open');
  }

  /* ---------- Agent install prompts ---------- */
  // 口令模板的简体原文；其余语言在 i18n.js 的 ag.* 里（日文沿用英文模板）。品牌相关的措辞来自页面里的 window.SITE_BRAND。
  var BRAND = window.SITE_BRAND || { app: '万能创作终端', next: '打开软件后注册或登录账号，就可以开始创作了。', key: '不要向我索要任何 Key 或密码，也不要把它们写进文件或命令。' };
  var AGZH = {
    win: '请帮我在这台 Windows 电脑上安装并打开「{app}」（v{ver}，Windows 10/11 64 位）。\n\n' +
      '1. 下载安装包 {file}，保存到当前用户的「下载」文件夹：\n{src}\n   PowerShell 示例：\n   $ProgressPreference = \'SilentlyContinue\'\n   Invoke-WebRequest -Uri "<上面的地址>" -OutFile "{path}"\n\n' +
      '2. 校验完整性（必须通过才能继续）：\n   (Get-FileHash "{path}" -Algorithm SHA256).Hash\n   结果必须等于（不区分大小写）：\n   {sha}\n   不一致就删除这个文件，换另一个地址重新下载；都不一致就停下来告诉我，不要运行它。\n\n' +
      '3. 校验通过后静默安装（只装给当前用户，不需要管理员权限）：\n   Start-Process -FilePath "{path}" -ArgumentList \'{silent}\' -Wait\n   如果 Windows 弹出「已保护你的电脑」，请提醒我点「更多信息 → 仍要运行」。\n\n' +
      '4. 安装完成后，用桌面或开始菜单里的「{app}」快捷方式启动，确认窗口已经打开。\n\n' +
      '5. 最后告诉我下一步：{next}\n\n注意：{key}',
    src_mirror: '   - 首选国内镜像：{mirror}\n   - 备用 GitHub：{url}',
    src_one: '   - 下载地址：{url}',
    sha_missing: '（网页上还没有这一版的校验值：请打开 {page} ，用发布页附带的 SHA256SUMS 里 {file} 那一行；找不到就停下来告诉我，不要运行它）',
    page: '发布页',
    file: '对应文件',
    mac: '请帮我在这台 Mac 上安装并打开「{app}」（v{ver}，需要 macOS 13 及以上）。\n\n' +
      '1. 先运行 uname -m 判断芯片：arm64 是 Apple 芯片，x86_64 是 Intel。选对应的安装包：\n{arm}\n{x64}\n\n' +
      '2. 用 curl 下载到「下载」文件夹，例如：\n   curl -L --fail -o ~/Downloads/<文件名> "<上面的地址>"\n\n' +
      '3. 校验完整性（必须通过才能继续）：\n   shasum -a 256 ~/Downloads/<文件名>\n   结果必须等于上面对应的 SHA256。不一致就删除文件，换另一个地址重新下载；都不一致就停下来告诉我，不要打开它。\n\n' +
      '4. 校验通过后安装：\n   hdiutil attach -nobrowse ~/Downloads/<文件名>\n   把挂载出来的卷里的 OmniCreator.app 复制到 /Applications（已存在旧版就先退出软件再覆盖），然后 hdiutil detach 那个卷。\n\n' +
      '5. 打开软件：open -a /Applications/OmniCreator.app\n   这个应用还没有 Apple 签名。如果提示「无法验证开发者」，请提醒我到「系统设置 → 隐私与安全性」点「仍要打开」（macOS 13 / 14 也可以在「应用程序」里右键 OmniCreator →「打开」）。如果提示「已损坏」，请让我自己在「终端」运行：sudo xattr -dr com.apple.quarantine /Applications/OmniCreator.app\n\n' +
      '6. Mac 版不内置 Codex：软件打开后如果提示缺少 Codex，请提醒我在软件里点「一键安装 Codex」（不需要 Node.js）。\n\n' +
      '7. 最后告诉我下一步：{next}\n\n注意：你自己不要用 sudo 运行任何命令，需要管理员密码的那一步由我来做；{key}',
    mac_line_mirror: '   - {chip}：{file}\n     国内镜像：{mirror}\n     备用 GitHub：{url}\n     SHA256：{sha}',
    mac_line_one: '   - {chip}：{file}\n     下载地址：{url}\n     SHA256：{sha}',
    mac_pending: '这一版的 Mac 安装包信息还没有发布，请稍后再来复制。',
    chip_arm: 'Apple 芯片（arm64）',
    chip_x64: 'Intel（x86_64）'
  };
  function ag(k) { return t('ag.' + k, AGZH[k]); }
  function brandText(k) { return lang === 'zh' ? BRAND[k] : t('ag.brand_' + k, BRAND[k]); }
  function shaLine(f, page) {
    if (f && /^[0-9a-f]{64}$/i.test(f.sha256 || '')) return f.sha256;
    return fill(ag('sha_missing'), { page: page || ag('page'), file: (f && f.file) || ag('file') });
  }
  function agentWin() {
    var rel = CFG.release, f = rel.assets.win_setup;
    if (!f) return '';
    var src = safeUrl(f.mirror) ? fill(ag('src_mirror'), { mirror: f.mirror, url: f.url }) : fill(ag('src_one'), { url: f.url });
    return fill(ag('win'), {
      app: brandText('app'), ver: rel.version, file: f.file, src: src, path: '$env:USERPROFILE\\Downloads\\' + f.file,
      sha: shaLine(f, rel.release_page), silent: f.silent || '/S', next: brandText('next'), key: brandText('key')
    });
  }
  function agentMac() {
    var rel = CFG.release, fa = rel.assets.mac_arm64, fx = rel.assets.mac_x64;
    if (!fa || !fx) return ag('mac_pending');
    var line = function (f, chip) {
      return fill(ag(safeUrl(f.mirror) ? 'mac_line_mirror' : 'mac_line_one'), { chip: chip, file: f.file, mirror: f.mirror, url: f.url, sha: shaLine(f, rel.release_page) });
    };
    return fill(ag('mac'), {
      app: brandText('app'), ver: rel.version, arm: line(fa, ag('chip_arm')), x64: line(fx, ag('chip_x64')),
      next: brandText('next'), key: brandText('key')
    });
  }
  function agentPlugin() {
    var repo = (CFG.plugin_repo && safeUrl(CFG.plugin_repo)) || '';
    if (!repo) return '';
    return '请安装并启动「万能媒体工作流」：\n' + repo + '\n\n请先读取仓库 AGENTS.md，识别当前操作系统：Windows 运行根目录 install.ps1，macOS / Linux 运行 install.sh。注册 Skills 和 MCP，启动工作台并返回实际 frontend_url。先不配置 Key，带我看一遍示例。';
  }
  var agentCur = 'app';
  function showAgent(key, focus) {
    var box = $('#agent-text');
    if (!box || !CFG) return;
    agentCur = key;
    $$('.agent-tabs [role="tab"]').forEach(function (tab) {
      var on = tab.getAttribute('data-agent') === key;
      tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; if (on && focus) tab.focus();
    });
    box.textContent = key === 'mac' ? agentMac() : key === 'plugin' ? agentPlugin() : agentWin();
    $$('[data-agent-note]').forEach(function (n) { n.hidden = n.getAttribute('data-agent-note') !== key; });
  }
  function initAgent() {
    var tabs = $$('.agent-tabs [role="tab"]');
    if (!tabs.length) return;
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { showAgent(tab.getAttribute('data-agent')); });
      tab.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length];
        showAgent(n.getAttribute('data-agent'), true); e.preventDefault();
      });
    });
    var plug = $('[data-agent="plugin"]');
    if (plug && !agentPlugin()) plug.hidden = true;
    var cp = $('#agent-copy');
    if (cp) cp.addEventListener('click', function () { copy($('#agent-text').textContent, u('copyAgent')); });
    showAgent(/^mac/.test(PLATFORM) ? 'mac' : 'app');
  }

  /* ---------- 中性版：合作方托管（config.json 的 partner 字段）。可重复执行，切换语言后会重新渲染 ---------- */
  function renderPartner() {
    if (!CFG || !$('#partner-bar')) return;
    var p = CFG.partner || {};
    var qqLink = safeUrl(get(CFG, 'community.qq_link'));
    if (qqLink && $('#qq-link')) { var q = $('#qq-link'); q.href = qqLink; q.hidden = false; }
    if (!p.enabled || pending(p.name)) return;
    var url = safeUrl(p.url);
    var name = { name: p.name, contact: p.contact };
    $('#partner-name').textContent = p.name;
    if ($('#partner-pre')) $('#partner-pre').textContent = u('pPre');
    if ($('#partner-post')) $('#partner-post').textContent = u('pPost');
    if (url) $('#partner-link').href = url; else $('#partner-link').removeAttribute('href');
    var logo = safeUrl(p.logo);
    if (logo) { var img = $('#partner-logo'); img.src = logo; img.alt = p.name; img.hidden = false; }
    if (!pending(p.contact)) {
      $('#partner-contact-top').textContent = fill(u('pContactTop'), name);
      $('#partner-contact-top').hidden = false;
      $('#partner-contact').textContent = fill(u('pContact'), name);
      $('#partner-contact').hidden = false;
    }
    $('#partner-bar').hidden = false;
    if (!pending(p.notice)) { $('#partner-notice').textContent = p.notice; $('#partner-notice').hidden = false; }
    var s2 = $('#step2-text');
    if (s2) s2.textContent = fill(u('pStep2'), name);
    var reg = safeUrl(p.register_url) || url;
    var tokens = safeUrl(p.token_page_url);
    var cta = $('#partner-cta');
    var old = $('#partner-cta-a');
    if (old) old.parentNode.removeChild(old);
    if (p.one_click_import) {
      $('#partner-cta-text').textContent = fill(u('pCta'), name);
      $('#path-b').classList.add('featured');
      cta.hidden = !reg;
      if (reg) { $('#partner-register').href = reg; $('#partner-register').textContent = fill(u('pRegister'), name); }
      if (tokens) { $('#partner-tokens').href = tokens; $('#partner-tokens').textContent = u('pTokens'); $('#partner-tokens').hidden = false; }
    } else {
      $('#path-a').classList.add('featured');
      var box = el('div', { class: 'partner-cta', id: 'partner-cta-a' }, [
        el('p', { text: fill(u('pManual'), name) }),
        el('div', { class: 'actions' }, [
          reg ? el('a', { class: 'btn btn-primary', href: reg, target: '_blank', rel: 'noopener', text: fill(u('pRegister'), name) }) : null,
          tokens ? el('a', { class: 'btn btn-ghost', href: tokens, target: '_blank', rel: 'noopener', text: u('pTokens') }) : null
        ])
      ]);
      $('#path-a').insertBefore(box, $('#path-a .fine'));
    }
    var foot = $('#partner-foot');
    if (url) { foot.href = url; foot.textContent = p.name + ' ↗'; foot.hidden = false; }
    $('#partner-foot-note').textContent = fill(u('pFoot'), name);
  }

  /* ---------- static UI ---------- */
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function initUi() {
    var top = $('#topbar');
    var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var menu = $('#menu-btn'), nav = $('#nav');
    menu.addEventListener('click', function () {
      var open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? u('menuClose') : u('menuOpen'));
      nav.classList.toggle('open', open);
      top.classList.toggle('menu-open', open);
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); top.classList.remove('menu-open'); }); });
    langListeners.push(function () { menu.setAttribute('aria-label', menu.getAttribute('aria-expanded') === 'true' ? u('menuClose') : u('menuOpen')); });

    var theme = $('#theme-btn');
    if (theme) theme.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('oc-theme', next); } catch (e) {}
    });

    // 语言：宽屏分段按钮与窄屏下拉框共用同一个状态
    $$('[data-lang-btn]').forEach(function (b) { b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang-btn'), true); }); });
    var sel = $('#lang-select');
    if (sel) sel.addEventListener('change', function () { applyLang(sel.value, true); });

    // 复制一句话需求：简体用按钮上的 data-copy，其余语言取词典里 data-copy-key 对应的译文
    $$('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () { copy(t(b.getAttribute('data-copy-key'), b.getAttribute('data-copy')), u('copyPrompt')); });
    });
    $$('[data-copy-from]').forEach(function (b) { b.addEventListener('click', function () { copy($('#' + b.getAttribute('data-copy-from')).textContent, u('copyCmd')); }); });
    $$('[data-copy-text]').forEach(function (b) { b.addEventListener('click', function () { copy(b.getAttribute('data-copy-text'), u(b.getAttribute('data-copy-msg') || 'copied')); }); });
    var pc = $('#hero-dl-pc');
    if (pc) pc.addEventListener('click', function () { copy(location.href.split('#')[0] + '#download', u('copyLink')); });

    var tabs = $$('.tabs [role="tab"]');
    var select = function (tab) {
      tabs.forEach(function (x) {
        var on = x === tab;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length];
        select(n); n.focus(); e.preventDefault();
      });
    });

    $('#vd-close').addEventListener('click', closeVideo);
    $('#video-dialog').addEventListener('close', function () { $('#vd-stage').textContent = ''; $('#vd-chapters').textContent = ''; });
    $('#video-dialog').addEventListener('click', function (e) { if (e.target === e.currentTarget) closeVideo(); });

    // 直接播放本地短片的按钮（作品墙里的「超级导演 27 秒合集」）：不依赖 config/release 列表；data-clip-portrait 表示竖屏片
    $$('[data-clip]').forEach(function (b) {
      b.addEventListener('click', function () {
        var url = safeUrl(b.getAttribute('data-clip'));
        if (!url) return;
        var title = t(b.getAttribute('data-clip-title-key'), b.getAttribute('data-clip-title') || '');
        openVideo({}, title, '', url, 0, b.hasAttribute('data-clip-portrait'));
      });
    });

    // 超级导演 27s 内联播放器：不使用压画面的原生 controls，统一由视频画面下方的独立控制栏 (.vbar) 驱动，避免遮挡画面底部烧录字幕
    $$('[data-inline-video]').forEach(function (box) {
      var v = $('video', box), overlay = $('.inline-play', box);
      var playBtn = $('.vb-play', box), seek = $('.vb-seek', box), timeEl = $('.vb-time', box);
      var muteBtn = $('.vb-mute', box), fsBtn = $('.vb-fs', box);
      if (!v) return;
      var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>';
      var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
      var ICON_VOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12z"/></svg>';
      var ICON_MUTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm13.59 3 2.7 2.7-1.42 1.41L16.17 13.4l-2.7 2.71-1.41-1.42L14.76 12l-2.7-2.7 1.41-1.42 2.7 2.71 2.7-2.7 1.42 1.41z"/></svg>';
      var syncPlay = function () {
        var playing = !v.paused && !v.ended;
        box.classList.toggle('playing', playing || v.currentTime > 0);
        if (playBtn) {
          playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
          playBtn.setAttribute('aria-label', playing ? u('pauseBtn') : u('playBtn'));
        }
      };
      var syncTime = function () {
        var dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 27;
        if (timeEl) timeEl.textContent = fmt(v.currentTime || 0) + ' / ' + fmt(dur);
        if (seek && dur > 0) seek.value = String(Math.round((v.currentTime / dur) * 1000));
      };
      var toggle = function () {
        if (v.paused || v.ended) {
          box.classList.add('playing');
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else {
          v.pause();
        }
      };
      if (overlay) overlay.addEventListener('click', toggle);
      if (playBtn) playBtn.addEventListener('click', toggle);
      v.addEventListener('click', toggle);
      v.addEventListener('play', syncPlay);
      v.addEventListener('pause', syncPlay);
      v.addEventListener('ended', syncPlay);
      v.addEventListener('loadedmetadata', syncTime);
      v.addEventListener('timeupdate', syncTime);
      if (seek) seek.addEventListener('input', function () {
        var dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
        if (dur > 0) v.currentTime = (Number(seek.value) / 1000) * dur;
      });
      if (muteBtn) muteBtn.addEventListener('click', function () {
        v.muted = !v.muted;
        muteBtn.innerHTML = v.muted ? ICON_MUTE : ICON_VOL;
        muteBtn.setAttribute('aria-label', v.muted ? u('unmuteBtn') : u('muteBtn'));
      });
      if (fsBtn) fsBtn.addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
        else if (box.requestFullscreen) box.requestFullscreen().catch(function () {});
        else if (v.requestFullscreen) v.requestFullscreen().catch(function () {});
      });
    });

    if (reduce) root.classList.add('reduce');
    // 首屏打字机：系统开了「减少动态效果」就不跑；首屏滚出视口后暂停
    var typer = $('#typer');
    if (typer && !reduce) {
      var L = lines(typer), li = 0, ci = (L[0] || '').length, dir = -1, hold = 18, heroOn = true;
      langListeners.push(function () { L = lines(typer); li = 0; ci = (L[0] || '').length; dir = -1; hold = 18; typer.textContent = L[0] || ''; });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { heroOn = es[es.length - 1].isIntersecting; }).observe(typer);
      setInterval(function () {
        if (!L.length || !heroOn || document.hidden) return;
        if (hold > 0) { hold--; return; }
        ci += dir;
        if (ci <= 0) { ci = 0; dir = 1; li = (li + 1) % L.length; hold = 3; }
        else if (ci >= L[li].length) { ci = L[li].length; dir = -1; hold = 22; }
        typer.textContent = L[li].slice(0, ci);
      }, 95);
    } else if (typer) {
      langListeners.push(function () { typer.textContent = lines(typer)[0] || ''; });
    }

    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px' });
      $$('.rv').forEach(function (n) { io.observe(n); });
    } else $$('.rv').forEach(function (n) { n.classList.add('in'); });
  }

  function renderAll() {
    renderDownloads();
    renderHero();
    renderVideos();
    renderPartner();
    if (CFG) showAgent(agentCur);
  }

  // 给 fx.js 用的共享工具
  window.OC = {
    $: $, $$: $$, el: el, toast: toast, copy: copy, u: u, t: t, lines: lines, fill: fill, reduce: reduce,
    lang: function () { return lang; },
    onLang: function (f) { langListeners.push(f); }
  };

  function start() {
    root.setAttribute('data-zh-title', document.title);
    initUi();
    applyLang(pickLang(), false);
    langListeners.push(renderAll);
    Promise.all([loadRelease(), detectPlatform()]).then(function (r) {
      CFG = r[0]; PLATFORM = r[1];
      root.setAttribute('data-platform', PLATFORM);
      if (!CFG) return;
      renderAll();
      initAgent();
      $$('[data-copy-cfg]').forEach(function (b) {
        b.addEventListener('click', function () { copy(String(get(CFG, b.getAttribute('data-copy-cfg')) || ''), u('copyGroup')); });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
