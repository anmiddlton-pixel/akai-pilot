/* AK.PILOT — живой знак AKCore™ в первом экране: октаэдр («алмаз») с сетью узлов внутри.
   По связям бегут импульсы (агенты работают); изредка импульс замирает на узле и вспыхивает
   янтарным — шаг «С подтверждением». Canvas 2D, без библиотек. Классический скрипт: работает по file://. */
(function () {
  "use strict";
  var canvas = document.getElementById("hero-core");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // цвета берём из темы сайта (CSS-переменные), чтобы алмаз менялся вместе с палитрой
  function cssColor(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var m = /^#?([0-9a-f]{6})$/i.exec(v);
    return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : fb;
  }
  var TEAL = cssColor("--accent", [127, 186, 180]), AMBER = cssColor("--c-confirm", [227, 184, 102]);
  var CALM = document.documentElement.getAttribute("data-theme") === "warm";
  var GLOW = CALM ? 0.45 : 1;          // матовая тема — меньше свечения
  var NET = CALM ? 0.35 : 1;           // фоновая сеть между блоками — тише для глаз

  // 0–5 — вершины октаэдра (y вверх), 6+ — внутренняя сеть, как на знаке AKCore
  var P = [
    [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
    [0.05, 0.45, 0.1], [0.3, 0.12, -0.2], [-0.35, 0, 0.15], [0, 0, 0], [0.45, -0.05, 0.2],
    [-0.15, -0.2, -0.3], [0.12, -0.18, 0.35], [-0.45, -0.08, -0.1], [0, -0.5, 0.05]
  ];
  var OUTER = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
  var INNER = [[6, 9], [6, 7], [7, 9], [7, 10], [9, 8], [8, 13], [8, 12], [9, 12], [12, 14], [11, 14],
               [11, 13], [10, 12], [9, 11]];
  var SPOKES = [[0, 6], [0, 8], [0, 7], [1, 14], [1, 12], [1, 11], [2, 10], [2, 7], [3, 8], [3, 13],
                [4, 12], [4, 10], [5, 11], [5, 7]];
  var NET = INNER.concat(SPOKES);           // по этим связям ходят импульсы
  var adj = P.map(function () { return []; });
  NET.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });

  // распад при прокрутке: у каждой точки свой вектор разлёта (вершины — наружу, узлы — врассыпную)
  var SCATTER = P.map(function (p, i) {
    var x, y, z, len;
    if (i < 6) { x = p[0]; y = p[1]; z = p[2]; }
    else {
      x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1;
      x += p[0] * 2; y += p[1] * 2; z += p[2] * 2;
    }
    len = Math.sqrt(x * x + y * y + z * z) || 1;
    var k = (i < 6 ? 1.1 : 0.7) + Math.random() * 1.1;
    return [x / len * k, y / len * k, z / len * k];
  });
  var DUST = [];
  for (var di = 0; di < 80; di++) {
    var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, rr = 0.5 + Math.pow(Math.random(), 0.7) * 2.1;
    var q = Math.sqrt(1 - u * u);
    DUST.push([q * Math.cos(th) * rr, u * rr * 0.8, q * Math.sin(th) * rr, 0.7 + Math.random() * 1.1]);
  }

  var DEDGES = [], DADJ = DUST.map(function () { return []; });
  DUST.forEach(function (a, i) {
    var near = DUST.map(function (b, j) {
      var dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
      return { j: j, d: dx * dx + dy * dy + dz * dz };
    }).filter(function (x) { return x.j !== i; }).sort(function (x, y) { return x.d - y.d; }).slice(0, 2);
    near.forEach(function (n) {
      if (DADJ[i].indexOf(n.j) < 0) { DADJ[i].push(n.j); DADJ[n.j].push(i); DEDGES.push([i, n.j]); }
    });
  });
  var dproj = new Array(DUST.length);

  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0, mobile = false;
  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mobile = W < 900;
  }

  /* «Путешествие» по странице: на странице есть места сборки [data-core].
     Когда место у центра экрана — алмаз собран в нём и едет вместе с блоком;
     между местами — рассыпан в тусклое облако, которое плывёт к следующему месту. */
  var spots = Array.prototype.slice.call(document.querySelectorAll("[data-core]"));
  var split = 0, splitTarget = 0;               // 0 — собран, 1 — рассыпан
  /* «Пять правил»: у места под номером (data-core="pin") main.js ставит data-stage 0–4 — своё состояние на каждое правило:
     01 облако точек · 02 точки связываются в сеть · 03 сеть стягивается в каркас · 04 собран · 05 собран, грани по очереди янтарём */
  var STAGE_SPLIT = [0.62, 0.42, 0.18, 0, 0], STAGE_LINES = [0.08, 1, 1, 1, 1], STAGE_NODES = [3.2, 1.6, 1, 1, 1];
  var stage = -1, lineMul = 1, nodeMul = 1, stageT = 0;
  // цвет алмаза: обычно бирюза; у места с data-color="white" (подвал главной) плавно становится белым
  var WHITE = [235, 235, 235], COL = TEAL.slice(), colTarget = TEAL;
  // data-hide-idle (страницы систем): между местами сборки алмаз не виден — проявляется только у своего места (подвал)
  // data-dim="0.5" — рассыпанная сеть на заднем фоне прозрачнее (собранный алмаз — без изменений)
  var DIM = +canvas.getAttribute("data-dim") || 0;
  var HIDE_IDLE = canvas.hasAttribute("data-hide-idle"), presence = HIDE_IDLE ? 0 : 1, presenceTarget = 1;
  var tx = 0, ty = 0, tR = 0, placed = false;
  function sense() {
    var best = null, bestA = 0, bestEl = null;
    for (var i = 0; i < spots.length; i++) {
      var r = spots[i].getBoundingClientRect();
      if (!r.height) continue;
      // место под номером правила: работает только когда активно «своё» правило (data-rule) — его отмечает main.js
      if (spots[i].hasAttribute("data-rule") && spots[i].getAttribute("data-on") !== "1") continue;
      // расстояние от центра экрана до «внутренней зоны» места: пока центр в зоне — собран
      var slack = Math.max(0, (r.height - H * 0.6) / 2);
      var d = Math.max(0, Math.abs(r.top + r.height / 2 - H * 0.5) - slack);
      // «прилипшее» место (колонка «Пять правил»): собран, пока место целиком в окне
      if (spots[i].getAttribute("data-core") === "pin") {
        // держится собранным, пока место видно хотя бы наполовину; рассыпается по мере ухода из окна
        var vis = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 70)) / r.height;
        d = vis >= 0.5 ? 0 : (0.5 - vis) * 2 * H * 0.45;
      }
      // место в первом экране: вверху страницы алмаз всегда собран, рассыпается с началом прокрутки
      if (r.top + window.scrollY < H) d *= Math.min(1, window.scrollY / (H * 0.3));
      var a = 1 - Math.min(1, d / (H * 0.62));
      if (a > bestA) { bestA = a; best = r; bestEl = spots[i]; }
    }
    var t = Math.max(0, Math.min(1, (bestA - 0.55) / 0.35));   // собран при d < 6% экрана, рассыпан при d > 28%
    splitTarget = 1 - t * t * (3 - 2 * t);
    var st = bestEl && bestEl.hasAttribute("data-stage") ? +bestEl.getAttribute("data-stage") : -1;
    if (st !== stage) { stage = st; stageT = 0; }
    if (stage >= 0) splitTarget += (1 - splitTarget) * STAGE_SPLIT[stage];
    colTarget = bestEl && bestEl.getAttribute("data-color") === "white" && bestA > 0.5 ? WHITE : TEAL;
    presenceTarget = !HIDE_IDLE ? 1 : Math.max(0, Math.min(1, (bestA - 0.3) / 0.4));
    if (best) {
      tx = best.left + best.width / 2; ty = best.top + best.height / 2;
      tR = mobile ? Math.min(W * 0.34, 125)
         : bestEl && bestEl.getAttribute("data-core") === "lg" ? Math.min(W * 0.25, H * 0.42, 380)
         : Math.min(best.width * 0.45, best.height * 0.5, 300);
      // data-scale — уменьшить алмаз в конкретном месте (страницы систем)
      if (bestEl && bestEl.hasAttribute("data-scale")) tR *= +bestEl.getAttribute("data-scale") || 1;
      // data-mscale — отдельный масштаб на телефоне
      if (mobile && bestEl && bestEl.hasAttribute("data-mscale")) tR *= +bestEl.getAttribute("data-mscale") || 1;
      // в первом экране — чуть ниже центра места: верхняя вершина не упирается в шапку
      if (!mobile && bestEl && bestEl.getAttribute("data-core") === "lg") ty += tR * 0.14;
      // выравнивание по левому краю колонки — на одной линии с номером и текстом
      if (bestEl && bestEl.getAttribute("data-align") === "left") tx = best.left + tR * 1.02;
    } else { tx = W * 0.5; ty = H * 0.5; tR = Math.min(W, H) * 0.3; }
  }
  function follow(dt) {
    // собранный — точно в своём месте (едет с блоком); рассыпанный — плавно перетекает к следующему
    var k = !placed ? 1 : Math.min(1, (1 - split) * 1.2 + dt * 2.2);   // чем собраннее, тем крепче держится за место
    cx += (tx - cx) * k; cy += (ty - cy) * k;
    R += (tR * (1 + 0.5 * split) - R) * k;
    placed = true;
  }

  // поворот: медленное вращение вокруг вертикали + наклон; курсор добавляет немного
  var rotY = 0.6, tiltX = 0.32, mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener("pointermove", function (e) {
    tmx = (e.clientX / window.innerWidth - 0.5) * 2;
    tmy = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  var proj = new Array(P.length), rot = null;
  function projectPoint(x, y, z) {
    var x1 = x * rot.cy + z * rot.sy, z1 = -x * rot.sy + z * rot.cy;
    var y2 = y * rot.cx - z1 * rot.sx, z2 = y * rot.sx + z1 * rot.cx;
    var k = 3.2 / (3.2 - Math.max(-2.5, Math.min(2.2, z2)));
    return { x: cx + x1 * R * k, y: cy - y2 * R * k, z: Math.max(-1, Math.min(1, z2)), k: k };
  }
  function project() {
    var ay = rotY + mx * 0.35, ax = tiltX + my * 0.18;
    var e = split * split * (3 - 2 * split) * 1.0;   // плавный разгон разлёта (облако остаётся в окне)
    rot = { sy: Math.sin(ay), cy: Math.cos(ay), sx: Math.sin(ax), cx: Math.cos(ax) };
    var sy = Math.sin(ay), cyy = Math.cos(ay), sx = Math.sin(ax), cxx = Math.cos(ax);
    for (var i = 0; i < P.length; i++) {
      var x = P[i][0] + SCATTER[i][0] * e, y = P[i][1] + SCATTER[i][1] * e, z = P[i][2] + SCATTER[i][2] * e;
      var x1 = x * cyy + z * sy, z1 = -x * sy + z * cyy;          // вокруг Y
      var y2 = y * cxx - z1 * sx, z2 = y * sx + z1 * cxx;          // вокруг X
      var k = 3.2 / (3.2 - Math.max(-2.5, Math.min(2.2, z2)));     // перспектива
      z2 = Math.max(-1, Math.min(1, z2));
      proj[i] = { x: cx + x1 * R * k, y: cy - y2 * R * k, z: z2, k: k };
    }
  }

  function rgba(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + a + ")"; }
  function depthA(z, lo, hi) { return lo + (hi - lo) * (z + 1) / 2; }   // z∈[-1,1]: дальше — прозрачнее

  function line(a, b, w, alpha, col) {
    var p = proj[a], q = proj[b];
    alpha *= (1 - split * 0.7) * lineMul;       // при распаде связи тянутся и тускнеют; на «01» связей почти нет
    w *= 1 - split * 0.55;
    ctx.strokeStyle = rgba(col || COL, alpha);
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }

  // импульсы
  var pulses = [], MAX = 6, dpulses = [];
  function spawn() {
    var a = 6 + Math.floor(Math.random() * (P.length - 6));
    var b = adj[a][Math.floor(Math.random() * adj[a].length)];
    pulses.push({ a: a, b: b, t: 0, speed: 0.55 + Math.random() * 0.5, hold: 0 });
  }
  function walk(list, adjL, dt, keep, from0) {
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      if (p.hold > 0) { p.hold -= dt; continue; }
      p.t += dt * p.speed;
      if (p.t >= 1) {
        if (Math.random() < 0.12) { p.hold = 0.9; p.confirm = 0.9; }
        if (Math.random() < 0.15) { list.splice(i, 1); continue; }
        var from = p.a; p.a = p.b;
        var opts = adjL[p.a].filter(function (n) { return n !== from; });
        if (!opts.length) opts = adjL[p.a];
        p.b = opts[Math.floor(Math.random() * opts.length)];
        p.t = 0;
      }
    }
    while (list.length < keep) {
      var a0 = from0 + Math.floor(Math.random() * (adjL.length - from0));
      if (!adjL[a0].length) continue;
      list.push({ a: a0, b: adjL[a0][Math.floor(Math.random() * adjL[a0].length)], t: 0, speed: 0.35 + Math.random() * 0.35, hold: 0 });
    }
  }

  function step(dt) {
    walk(dpulses, DADJ, dt, mobile ? 2 : 4, 0);
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      if (p.hold > 0) { p.hold -= dt; continue; }
      p.t += dt * p.speed;
      if (p.t >= 1) {
        // узел достигнут: иногда «ждём подтверждения», иногда импульс гаснет, иначе идём дальше
        if (Math.random() < 0.12) { p.hold = 0.9; p.confirm = 0.9; }
        if (Math.random() < 0.18) { pulses.splice(i, 1); continue; }
        var from = p.a; p.a = p.b;
        var opts = adj[p.a].filter(function (n) { return n !== from; });
        p.b = (opts.length ? opts : adj[p.a])[Math.floor(Math.random() * (opts.length || adj[p.a].length))];
        p.t = 0;
      }
    }
    while (pulses.length < (mobile ? 3 : MAX)) spawn();
  }

  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    if (presence < 0.01) { window.__akNet = null; return; }
    ctx.globalAlpha = presence * (1 - split * DIM);
    project();

    // мягкое свечение за фигурой
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
    g.addColorStop(0, rgba(COL, (0.10 * GLOW * (1 - split)).toFixed(3)));
    g.addColorStop(1, rgba(COL, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);

    ctx.lineCap = "round";
    SPOKES.forEach(function (e) { line(e[0], e[1], 0.6, depthA((proj[e[0]].z + proj[e[1]].z) / 2, 0.05, 0.22)); });
    INNER.forEach(function (e) { line(e[0], e[1], 1.1, depthA((proj[e[0]].z + proj[e[1]].z) / 2, 0.12, 0.45)); });
    // внешняя «оболочка» алмаза видна и во время сборки: рёбра тянутся между летящими вершинами, как нити,
    // и стягиваются в контур (собирается из линий); совсем рассыпанный — рёбра остаются тонкими и бледными
    var shell = (0.3 + 0.7 * Math.pow(1 - split, 1.5)) * (1 - Math.max(0, split - 0.85) * 2);
    var gate = -1, gateA = 0;
    if (stage === 4) {
      var cyc = (stageT % 4.2) / 1.4;           // по 1,4 с на рубеж
      gate = Math.floor(cyc); gateA = Math.sin(Math.PI * (cyc - gate));
    }
    var small = Math.max(0, Math.min(1, (200 - R) / 120));     // 0 — крупный, 1 — маленький: рёбра ярче
    OUTER.forEach(function (e, k) {
      var grp = k < 4 ? 0 : k >= 8 ? 1 : 2;     // 0 — верхние рёбра, 1 — экватор, 2 — нижние
      var on = grp === gate ? gateA : 0;
      var a0 = depthA((proj[e[0]].z + proj[e[1]].z) / 2, 0.12 + small * 0.25, 0.7 + small * 0.2) * shell;
      if (on > 0.02) line(e[0], e[1], (mobile ? 1.6 : 2.4) * (1 + on * 0.25), Math.max(a0, 0.75 * on), AMBER);
      else line(e[0], e[1], mobile ? 1.6 : 2.4, a0);
    });

    // узлы
    for (var i = 0; i < P.length; i++) {
      var p = proj[i], outer = i < 6;
      // маленький алмаз (подвал) — узлы мельче, чтобы контур читался линиями, а не точками
      var r = (outer ? 4 : 3) * p.k * (mobile ? 0.8 : 1) * (1 + split * 0.2) * Math.max(0.4, Math.min(1, R / 220));
      ctx.fillStyle = rgba(COL, Math.min(1, depthA(p.z, 0.25, 0.95) * (1 - split * (CALM ? 0.88 : 0.72)) * nodeMul));
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }

    // рассыпанное ядро — сеть-созвездие: линии, узлы и импульсы, бегущие по линиям
    if (split > 0.02) {
      var sd = split * split * (3 - 2 * split);
      for (var d = 0; d < DUST.length; d++) dproj[d] = projectPoint(DUST[d][0], DUST[d][1], DUST[d][2]);
      ctx.lineWidth = 0.7;
      DEDGES.forEach(function (ed) {
        var a = dproj[ed[0]], b = dproj[ed[1]];
        ctx.strokeStyle = rgba(COL, depthA((a.z + b.z) / 2, 0.03, 0.16) * sd);   // линии связей — как были
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      for (d = 0; d < DUST.length; d++) {
        var dp = dproj[d];
        ctx.fillStyle = rgba(COL, depthA(dp.z, 0.08, 0.32) * sd * NET);
        ctx.beginPath(); ctx.arc(dp.x, dp.y, DUST[d][3] * dp.k, 0, Math.PI * 2); ctx.fill();
      }
      if (!CALM) drawPulses(dpulses, dproj, sd * 0.3);   // в спокойной теме импульсов в фоновой сети нет
    }

    drawPulses(pulses, proj, 1 - split * 0.85);
    // точки сети — для курсора-узла (js/cursor.js): к ним тянутся линии от курсора
    window.__akNet = { proj: proj, dust: split > 0.05 ? dproj : null, split: split };
  }

  function drawPulses(list, pts, alpha) {
    if (alpha <= 0.01) return;
    ctx.globalAlpha = alpha * 0.75 * presence * (1 - split * DIM);  // импульсы чуть прозрачнее, чтобы не перетягивали внимание
    list.forEach(function (pl) {
      var a = pts[pl.a], b = pts[pl.b];
      var t = pl.hold > 0 ? 1 : pl.t;
      var x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      var t0 = Math.max(0, t - 0.35);
      var x0 = a.x + (b.x - a.x) * t0, y0 = a.y + (b.y - a.y) * t0;
      var lg = ctx.createLinearGradient(x0, y0, x, y);
      lg.addColorStop(0, rgba(COL, 0)); lg.addColorStop(1, rgba(COL, 0.9));
      ctx.strokeStyle = lg; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();

      var col = pl.hold > 0 ? AMBER : TEAL;
      var gr = (pl.hold > 0 ? 22 : 10) * (GLOW < 1 ? 0.55 : 1);
      var glow = ctx.createRadialGradient(x, y, 0, x, y, gr);
      glow.addColorStop(0, rgba(col, 0.95)); glow.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill();
      if (pl.hold > 0) {                                   // кольцо «ждём подтверждения»
        var ring = 1 - pl.hold / 0.9;
        ctx.strokeStyle = rgba(AMBER, 0.8 * (1 - ring));
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 6 + ring * 18, 0, Math.PI * 2); ctx.stroke();
      }
    });
    ctx.globalAlpha = presence * (1 - split * DIM);
  }

  var last = 0, running = false, visible = true;
  function loop(ts) {
    if (!running) return;
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts;
    sense();                                    // места сборки — каждый кадр, не только по событию прокрутки
    split += (splitTarget - split) * Math.min(1, dt * 5);
    stageT += dt;
    presence += (presenceTarget - presence) * Math.min(1, dt * 3);
    for (var ci = 0; ci < 3; ci++) COL[ci] += (colTarget[ci] - COL[ci]) * Math.min(1, dt * 2);
    var lT = stage >= 0 ? STAGE_LINES[stage] : 1, nT = stage >= 0 ? STAGE_NODES[stage] : 1;
    lineMul += (lT - lineMul) * Math.min(1, dt * 2.5); nodeMul += (nT - nodeMul) * Math.min(1, dt * 2.5);
    follow(dt);
    rotY += dt * (0.16 - split * 0.13);         // рассыпанная сеть почти не вращается
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    step(dt);
    draw(ts);
    requestAnimationFrame(loop);
  }
  function start() { if (!running && visible && !document.hidden) { running = true; last = 0; requestAnimationFrame(loop); } }
  function stop() { running = false; }

  resize();
  sense(); split = splitTarget; follow(0);
  window.addEventListener("resize", function () { resize(); sense(); placed = false; follow(0); if (!running) draw(0); });

  if (reduced) { draw(0); return; }                       // статичный кадр без анимации
  for (var i = 0; i < 4; i++) spawn();
  draw(0);
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  start();
})();
