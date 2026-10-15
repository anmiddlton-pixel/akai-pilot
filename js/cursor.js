/* AK.PILOT — курсор-«узел сети» (только мышь; на тач-устройствах и при «уменьшить движение» не включается).
   Курсор — точка с кольцом; пока мышь движется, от неё тянутся 2–3 тонкие линии к ближайшим узлам фоновой сети
   алмаза (js/core3d.js отдаёт точки в window.__akNet). Курсор замер — линии гаснут.
   Цвет по правилу: янтарь — действия человека, бирюза — зоны ИИ и замеров, иначе нейтральный. Над ссылками кольцо больше. Над полями формы — системный курсор. */
(function () {
  var mq = window.matchMedia;
  if (!mq || !mq("(hover: hover) and (pointer: fine)").matches || mq("(prefers-reduced-motion: reduce)").matches) return;

  var root = document.documentElement;
  var el = document.createElement("div");
  el.className = "xcur";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<i class="xcur__ring"></i><i class="xcur__dot"></i>';
  document.body.appendChild(el);
  var cv = document.createElement("canvas");
  cv.className = "xcur-net";
  cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  var ctx = cv.getContext("2d");
  root.classList.add("has-xcur");

  function css(name, fb) { var v = getComputedStyle(root).getPropertyValue(name).trim(); return v || fb; }
  function hex(h) { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  var TEAL = hex(css("--accent", "#7fbab4")), AMBER = hex(css("--amber", "#e3b866"));

  var W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  var x = -100, y = -100, act = false, life = 0, lastMove = 0, raf = 0, links = [];
  var REACH = 260, N = 3;

  function nearest() {
    var net = window.__akNet, out = [];
    if (!net) return out;
    function scan(arr, weight) {
      if (!arr) return;
      for (var i = 0; i < arr.length; i++) {
        var p = arr[i]; if (!p) continue;
        var dx = p.x - x, dy = p.y - y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < REACH && d > 6) out.push({ x: p.x, y: p.y, d: d, w: weight });
      }
    }
    scan(net.proj, 1);
    scan(net.dust, Math.min(1, net.split * 1.2));
    out.sort(function (a, b) { return a.d - b.d; });
    return out.slice(0, N);
  }

  function frame(ts) {
    raf = 0;
    var idle = ts - lastMove;
    life += ((idle < 600 ? 1 : 0) - life) * 0.12;          // движение — линии проявляются; замер — гаснут
    ctx.clearRect(0, 0, W, H);
    if (life > 0.02) {
      links = nearest();
      var c = act ? AMBER : TEAL;
      ctx.lineCap = "round";
      links.forEach(function (l, k) {
        var a = life * l.w * (1 - l.d / REACH) * (k === 0 ? 0.6 : 0.4);
        ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")";
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(l.x, l.y); ctx.stroke();
        ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.min(0.35, a * 0.7).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(l.x, l.y, 1.3, 0, Math.PI * 2); ctx.fill();
      });
    }
    if (life > 0.02 || idle < 700) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  /* цвет по правилу площадки: янтарь — где действует человек, бирюза — где работает и измеряет ИИ,
     в остальных местах курсор нейтральный (светлый) */
  var HUMAN = ".btn--primary, .btn--ghost, form, .jfollow, .about__cta, .route__steps li.is-human, .vpath__cta, .header .btn";
  var AI = "#journal, .journal, .jside, .slist, .srow, .sgrid, .proof, .metric, .route__steps li.is-ai, .rule, .lmap, .cycle, .levels, .stack, .sys-hero";
  function mode(target) {
    if (!target || !target.closest) return;
    var native = target.closest("input, textarea, select, [contenteditable], .term__tip");
    var link = target.closest("a, button, [role=tab], label, .term");
    var human = target.closest(HUMAN), ai = !human && target.closest(AI);
    el.classList.toggle("is-native", !!native);
    el.classList.toggle("is-link", !!link && !native);
    el.classList.toggle("is-act", !!human);
    el.classList.toggle("is-ai", !!ai);
    act = !!human;
  }
  document.addEventListener("mousemove", function (e) {
    x = e.clientX; y = e.clientY; lastMove = performance.now();
    el.style.transform = "translate(" + x + "px," + y + "px)";
    el.classList.add("is-on");
    mode(e.target);
    kick();
  }, { passive: true });
  window.addEventListener("scroll", function () { if (performance.now() - lastMove < 1500) { lastMove = performance.now(); kick(); } }, { passive: true });
  document.addEventListener("mousedown", function () { el.classList.add("is-down"); });
  document.addEventListener("mouseup", function () { el.classList.remove("is-down"); });
  document.addEventListener("mouseleave", function () { el.classList.remove("is-on"); life = 0; ctx.clearRect(0, 0, W, H); });
  window.addEventListener("blur", function () { el.classList.remove("is-on"); });
})();
