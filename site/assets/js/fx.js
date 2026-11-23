/* 万能创作终端 0.7.0 官网视觉与交互增强层（纯原生 JS，零外部依赖，零品牌私有词）：
   1. 流畅模式（#perf-btn）与实时帧率监测自动降级（连续掉帧自动切 data-perf="lite"，保护核显与旧电脑）；
   2. 首屏全幅光带画布（#fx-ribbons）与工作室声波协作舞台（#fx-stage + 语音指令/多智能体/三态计划卡轮播）；
   3. 全场景真实作品墙（#wall-filters 场景筛选 + [data-reel] 实机混剪悬停/点击播放与离屏暂停）；
   4. 千面 10 套界面交互切换器（#face-tabs 鼠标点击与键盘左右方向键切换，兼容实机图与二次元痛窗示意图）；
   5. 新手下载引导（将 #keep-guide 图解克隆到首屏 #hero-keep，点击 .exe/.dmg 下载时温和展开保留指引）。 */
(function () {
  'use strict';

  var OC = window.OC;
  if (!OC) return;
  var $ = OC.$, $$ = OC.$$, toast = OC.toast, u = OC.u, t = OC.t, lines = OC.lines;
  var root = document.documentElement;
  var hasIO = 'IntersectionObserver' in window;
  var raf = window.requestAnimationFrame ? function (fn) { return window.requestAnimationFrame(fn); } : null;

  /* ---------- 1. 流畅模式与帧率自适应保护 ---------- */
  var perfBtn = $('#perf-btn');
  var perfListeners = [];
  function getPerf() {
    return root.getAttribute('data-perf') === 'lite' ? 'lite' : 'full';
  }
  function syncPerfBtn() {
    if (!perfBtn) return;
    var isLite = getPerf() === 'lite';
    perfBtn.setAttribute('aria-pressed', String(isLite));
    perfBtn.classList.toggle('on', isLite);
  }
  function setPerf(mode, save, reason) {
    var next = mode === 'lite' ? 'lite' : 'full';
    root.setAttribute('data-perf', next);
    if (reason) root.setAttribute('data-perf-why', reason);
    if (save) {
      try { localStorage.setItem('oc-perf', next); } catch (e) {}
    }
    syncPerfBtn();
    perfListeners.forEach(function (fn) { fn(next); });
  }
  if (perfBtn) {
    syncPerfBtn();
    perfBtn.addEventListener('click', function () {
      var next = getPerf() === 'lite' ? 'full' : 'lite';
      setPerf(next, true, 'user');
      toast(u(next === 'lite' ? 'perfOn' : 'perfOff'));
    });
  }

  /* ---------- 统一单 rAF 帧调度器：仅在 full 档 + 视口可见 + 标签页前台时运行 ---------- */
  var layers = [];
  var rafId = 0;
  var lastTime = 0;
  var slowFrames = 0;
  var autoDowngraded = false;

  function canAnimate() {
    return !!raf && getPerf() === 'full' && !OC.reduce && !document.hidden;
  }
  function frameLoop(now) {
    rafId = 0;
    if (!canAnimate()) return;
    var dt = lastTime ? now - lastTime : 16.7;
    lastTime = now;
    // 若非标签页切换恢复且帧间隔持续超过 38ms（低于 ~26fps），自动降级为流畅模式，除非用户显式强制选了 full
    if (dt > 38 && dt < 250 && root.getAttribute('data-perf-why') !== 'user' && !autoDowngraded) {
      slowFrames++;
      if (slowFrames >= 36) {
        autoDowngraded = true;
        setPerf('lite', false, 'fps');
        toast(u('perfAuto'));
        return;
      }
    } else if (dt <= 28 && slowFrames > 0) {
      slowFrames--;
    }
    var clampedDt = Math.min(60, Math.max(8, dt));
    var anyVisible = false;
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].visible) {
        layers[i].draw(now, clampedDt, false);
        anyVisible = true;
      }
    }
    if (anyVisible) rafId = raf(frameLoop);
  }
  function kickLoop() {
    if (!rafId && canAnimate()) {
      lastTime = 0;
      rafId = raf(frameLoop);
    }
  }
  function registerLayer(targetEl, layer) {
    layer.visible = !hasIO;
    layers.push(layer);
    if (hasIO && targetEl) {
      new IntersectionObserver(function (entries) {
        layer.visible = entries[entries.length - 1].isIntersecting;
        if (layer.visible) {
          if (canAnimate()) kickLoop();
          else if (layer.drawStatic) layer.drawStatic();
        }
      }, { threshold: 0.02 }).observe(targetEl);
    }
    return layer;
  }
  document.addEventListener('visibilitychange', kickLoop);
  perfListeners.push(function (mode) {
    if (mode === 'full') {
      layers.forEach(function (l) { if (l.resize) l.resize(); });
      kickLoop();
    } else {
      layers.forEach(function (l) { if (l.drawStatic) l.drawStatic(); });
    }
  });

  /* ---------- 2A. 首屏全幅光带画布（#fx-ribbons） ---------- */
  (function initHeroRibbons() {
    var hero = $('#top');
    var cvs = $('#fx-ribbons');
    if (!hero || !cvs || !cvs.getContext) return;
    var ctx = cvs.getContext('2d');
    if (!ctx) return;
    var W = 1, H = 1, dpr = 1;
    var ptr = { x: 0.65, y: 0.45, tx: 0.65, ty: 0.45 };
    var BANDS = [
      { y: 0.30, amp: 0.055, k1: 1.5, k2: 3.4, s1: 0.00038, s2: 0.00062, rgb: '56, 189, 248', lw: 1.6 },
      { y: 0.46, amp: 0.075, k1: 1.1, k2: 2.9, s1: 0.00031, s2: 0.00054, rgb: '99, 102, 241', lw: 2.0 },
      { y: 0.62, amp: 0.060, k1: 1.9, k2: 4.1, s1: 0.00044, s2: 0.00073, rgb: '45, 212, 191', lw: 1.5 }
    ];
    function resize() {
      var r = hero.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cvs.width = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function renderAt(timeMs) {
      ctx.clearRect(0, 0, W, H);
      ptr.x += (ptr.tx - ptr.x) * 0.06;
      ptr.y += (ptr.ty - ptr.y) * 0.06;
      var step = 18;
      for (var i = 0; i < BANDS.length; i++) {
        var b = BANDS[i];
        ctx.beginPath();
        for (var x = 0; x <= W + step; x += step) {
          var uX = x / Math.max(1, W);
          var env = Math.sin(Math.PI * Math.min(1, Math.max(0, uX)));
          var bump = Math.exp(-Math.pow((uX - ptr.x) * 3.0, 2));
          var w = Math.sin(uX * 6.283 * b.k1 + timeMs * b.s1 * 6.283) * 0.65
                + Math.sin(uX * 6.283 * b.k2 - timeMs * b.s2 * 6.283) * 0.35;
          var y = (b.y + (ptr.y - 0.5) * 0.05) * H + w * b.amp * H * (0.45 + 0.55 * env) * (1 + bump * 0.75);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        var grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, 'rgba(' + b.rgb + ', 0)');
        grad.addColorStop(0.35, 'rgba(' + b.rgb + ', 0.22)');
        grad.addColorStop(0.7, 'rgba(' + b.rgb + ', 0.32)');
        grad.addColorStop(1, 'rgba(' + b.rgb + ', 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = b.lw;
        ctx.stroke();
      }
    }
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect();
      ptr.tx = (e.clientX - r.left) / Math.max(1, r.width);
      ptr.ty = (e.clientY - r.top) / Math.max(1, r.height);
    }, { passive: true });
    window.addEventListener('resize', function () { resize(); if (!canAnimate()) renderAt(1200); });
    resize();
    renderAt(1200);
    registerLayer(hero, {
      resize: resize,
      draw: function (now) { renderAt(now); },
      drawStatic: function () { resize(); renderAt(1200); }
    });
  })();

  /* ---------- 2B. 工作室声波协作舞台（#fx-stage + 语音与三态计划卡轮播） ---------- */
  (function initStudioStage() {
    var screen = $('#stage-screen');
    var cvs = $('#fx-stage');
    var stateEl = $('#voice-state');
    var textEl = $('#voice-text');
    var chips = $$('#stage-agents .agent-chip');
    var planItems = $$('#stage-plan li');
    var ripples = [];

    if (screen && cvs && cvs.getContext) {
      var ctx = cvs.getContext('2d');
      var W = 1, H = 1, dpr = 1;
      var resize = function () {
        var r = screen.getBoundingClientRect();
        W = Math.max(1, Math.round(r.width));
        H = Math.max(1, Math.round(r.height));
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        cvs.width = Math.round(W * dpr);
        cvs.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      var paint = function (now, dt) {
        ctx.clearRect(0, 0, W, H);
        var cx = W * 0.5, cy = H * 0.44;
        var baseR = Math.min(W, H) * 0.16;
        for (var ring = 0; ring < 3; ring++) {
          var pulse = Math.sin(now * 0.0026 - ring * 0.9) * 6;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(6, baseR + ring * 16 + pulse), 0, 6.283);
          ctx.strokeStyle = 'rgba(99, 179, 237, ' + (0.28 - ring * 0.07).toFixed(2) + ')';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        for (var i = ripples.length - 1; i >= 0; i--) {
          var rp = ripples[i];
          rp.r += (dt || 16) * 0.24;
          rp.a -= (dt || 16) * 0.0012;
          if (rp.a <= 0) { ripples.splice(i, 1); continue; }
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.r, 0, 6.283);
          ctx.strokeStyle = 'rgba(56, 189, 248, ' + rp.a.toFixed(3) + ')';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      };
      screen.addEventListener('click', function (e) {
        var r = screen.getBoundingClientRect();
        ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 8, a: 0.55 });
        if (canAnimate()) kickLoop();
      });
      window.addEventListener('resize', resize);
      resize();
      paint(800, 16);
      registerLayer(screen, {
        resize: resize,
        draw: function (now, dt) { paint(now, dt); },
        drawStatic: function () { resize(); paint(800, 16); }
      });
    }

    // 语音指令与三态计划卡节奏演示（不请求麦克风权限）
    if (textEl && stateEl) {
      var idx = 0, phase = 0;
      var stepStage = function () {
        if (document.hidden || OC.reduce || getPerf() === 'lite') return;
        var arr = lines(textEl);
        if (!arr.length) return;
        phase = (phase + 1) % 3;
        if (phase === 0) {
          idx = (idx + 1) % arr.length;
          textEl.textContent = arr[idx];
          stateEl.textContent = u('voListen');
        } else if (phase === 1) {
          stateEl.textContent = u('voWork');
        } else {
          stateEl.textContent = u('voDone');
        }
        chips.forEach(function (c, ci) {
          c.classList.toggle('on', ci === (idx + phase) % Math.max(1, chips.length));
        });
        planItems.forEach(function (li, pi) {
          li.className = pi < phase ? 'done' : pi === phase ? 'now' : 'todo';
        });
      };
      setInterval(stepStage, 2600);
      OC.onLang(function () {
        var arr = lines(textEl);
        if (arr.length) textEl.textContent = arr[idx % arr.length];
      });
    }
  })();

  /* ---------- 3. 全场景真实作品墙筛选与实机混剪预览 ---------- */
  (function initWall() {
    var filterBar = $('#wall-filters');
    var cards = $$('#wall-grid .work');
    if (filterBar && cards.length) {
      var btns = $$('[data-filter]', filterBar);
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cat = btn.getAttribute('data-filter') || 'all';
          btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
          cards.forEach(function (card) {
            var show = cat === 'all' || card.getAttribute('data-cat') === cat;
            card.hidden = !show;
          });
        });
      });
    }

    var reelBox = $('[data-reel]');
    if (reelBox) {
      var vid = $('video', reelBox);
      var playBtn = $('.reel-play', reelBox);
      if (vid) {
        var sync = function () {
          reelBox.classList.toggle('playing', !vid.paused && !vid.ended);
        };
        var playReel = function () {
          var p = vid.play();
          if (p && p.catch) p.catch(function () {});
        };
        var toggleReel = function () {
          if (vid.paused || vid.ended) playReel();
          else vid.pause();
        };
        reelBox.addEventListener('pointerenter', function (e) {
          if (e.pointerType === 'mouse' && getPerf() === 'full' && !OC.reduce) playReel();
        });
        reelBox.addEventListener('pointerleave', function (e) {
          if (e.pointerType === 'mouse' && !vid.paused) vid.pause();
        });
        if (playBtn) playBtn.addEventListener('click', toggleReel);
        vid.addEventListener('click', toggleReel);
        vid.addEventListener('play', sync);
        vid.addEventListener('pause', sync);
        if (hasIO) {
          new IntersectionObserver(function (es) {
            if (!es[entriesLast(es)].isIntersecting && !vid.paused) vid.pause();
          }).observe(reelBox);
        }
      }
    }
    function entriesLast(es) { return Math.max(0, es.length - 1); }
  })();

  /* ---------- 4. 千面 10 套界面交互切换器 ---------- */
  (function initFaces() {
    var tabList = $('#face-tabs');
    var panel = $('#face-panel');
    if (!tabList || !panel) return;
    var tabs = $$('[role="tab"]', tabList);
    var img = $('#face-img');
    var arts = $$('[data-face-art]', panel);
    var note = $('#face-art-note');
    var badgeEl = $('#face-badge');
    var nameEl = $('#face-name');
    var tagEl = $('#face-tag');
    var howEl = $('#face-how');
    var activeTab = tabs[0];

    function renderFace(tab) {
      if (!tab) return;
      activeTab = tab;
      var faceId = tab.getAttribute('data-face') || 'studio';
      var shot = tab.getAttribute('data-shot') || '';
      tabs.forEach(function (x) {
        var on = x === tab;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tab.id);
      if (img) {
        if (shot) {
          img.src = shot;
          img.hidden = false;
        } else {
          img.hidden = true;
        }
      }
      arts.forEach(function (a) {
        a.hidden = a.getAttribute('data-face-art') !== faceId;
      });
      if (note) note.hidden = !!shot;
      var tier = tab.getAttribute('data-badge') || 'N';
      var bLabel = t(tab.getAttribute('data-badge-key'), tab.getAttribute('data-badge-label') || '');
      if (badgeEl) badgeEl.textContent = bLabel ? (tier + ' · ' + bLabel) : tier;
      if (nameEl) nameEl.textContent = tab.textContent.trim();
      if (tagEl) tagEl.textContent = t('face.' + faceId + '.tag', tab.getAttribute('data-tag') || '');
      if (howEl) howEl.textContent = t('face.' + faceId + '.how', tab.getAttribute('data-how') || '');
    }

    tabs.forEach(function (tab, idx) {
      tab.addEventListener('click', function () { renderFace(tab); });
      tab.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
              : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        var next = tabs[(idx + d + tabs.length) % tabs.length];
        renderFace(next);
        next.focus();
        e.preventDefault();
      });
    });
    OC.onLang(function () { renderFace(activeTab); });
    renderFace(activeTab);
  })();

  /* ---------- 5. 浏览器下载「… → 保留」四步图解联动 ---------- */
  (function initKeepGuide() {
    var fullGuide = $('#keep-guide');
    var heroKeep = $('#hero-keep');
    if (fullGuide && heroKeep) {
      var srcRow = $('.k-row-win', fullGuide);
      var slot = $('[data-keep-clone]', heroKeep);
      if (srcRow && slot) {
        slot.textContent = '';
        slot.appendChild(srcRow.cloneNode(true));
      }
    }
    document.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!link) return;
      var href = link.getAttribute('href') || '';
      var isExe = /\.exe(\?|#|$)/i.test(href);
      var isDmg = /\.dmg(\?|#|$)/i.test(href);
      if (!isExe && !isDmg) return;
      if (link.id === 'hero-dl-win' && heroKeep) heroKeep.open = true;
      else if (fullGuide) fullGuide.open = true;
      toast(u(isExe ? 'keepWin' : 'keepMac'));
    });
  })();

  if (canAnimate()) kickLoop();
})();
