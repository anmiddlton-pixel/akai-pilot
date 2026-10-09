/* AK.PILOT — меню, фильтр витрины, подсказки терминов, появление, форма заявки.
   Классический скрипт (не модуль): работает и по file://. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.remove("no-js");

  /* мобильное меню */
  var burger = document.querySelector(".burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var open = doc.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () { doc.classList.remove("nav-open"); burger.setAttribute("aria-expanded", "false"); });
    });
  }

  /* фильтр витрины: линия × роль («Я — …»); карточки Coach (data-roles="*") подходят любой роли */
  var filters = document.querySelectorAll(".filter[data-line]"), roleSel = document.querySelector(".role-select");
  var curLine = "all", curRole = "", roleCount = document.querySelector(".roles__count");
  function applyCatalog() {
    var n = 0, firstVisible = null, activeVisible = false;
    document.querySelectorAll(".card[data-line], .sx__item[data-line]").forEach(function (card) {
      var roles = card.getAttribute("data-roles") || "";
      var okLine = curLine === "all" || card.getAttribute("data-line") === curLine;
      var okRole = !curRole || roles === "*" || roles.split("|").indexOf(curRole) >= 0;
      card.hidden = !(okLine && okRole);
      if (!card.hidden) {
        n++;
        if (card.classList.contains("sx__item")) {
          if (!firstVisible) firstVisible = card;
          if (card.classList.contains("is-on")) activeVisible = true;
        }
      }
    });
    // витрина «список + панель»: если выбранная система скрылась — показать первую видимую; пусто — сообщение
    var empty = document.querySelector(".sx__empty");
    if (empty) {
      empty.hidden = n > 0;
      if (!n) document.querySelectorAll(".sxp").forEach(function (p) { p.hidden = true; });
      else if (!activeVisible && firstVisible) selectSx(firstVisible);
      else { var on = document.querySelector(".sx__item.is-on"); if (on) selectSx(on); }
    }
    if (roleCount) roleCount.textContent = curRole ? "найдено: " + n : "";
    if (roleReset) roleReset.hidden = !curRole && curLine === "all";
  }
  var roleReset = document.querySelector(".roles__reset");
  function setRole(r) {
    curRole = r;
    if (roleSel) { roleSel.value = r; roleSel.classList.toggle("is-on", !!r); }
  }
  function setLine(l) {
    curLine = l;
    filters.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-line") === l ? "true" : "false"); });
  }
  if (roleReset) roleReset.addEventListener("click", function () { setRole(""); setLine("all"); applyCatalog(); });
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLine(btn.getAttribute("data-line"));
      if (curLine === "all") setRole("");          // «Все системы» — сброс и линии, и роли
      applyCatalog();
    });
  });
  if (roleSel) roleSel.addEventListener("change", function () { setRole(roleSel.value); applyCatalog(); });

  /* витрина «список + панель»: наведение/клик/клавиатура по строке — меняется панель справа */
  function selectSx(item) {
    var k = item.getAttribute("data-k");
    document.querySelectorAll(".sx__item").forEach(function (it) {
      var on = it === item;
      it.classList.toggle("is-on", on);
      it.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".sxp").forEach(function (p) { p.hidden = p.getAttribute("data-k") !== k; });
  }
  var sxHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  document.querySelectorAll(".sx__item").forEach(function (it) {
    if (sxHover) it.addEventListener("mouseenter", function () { selectSx(it); });
    it.addEventListener("click", function () {
      selectSx(it);
      if (!sxHover) { var p = document.querySelector('.sxp[data-k="' + it.getAttribute("data-k") + '"]'); if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    it.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectSx(it); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var vis = Array.prototype.filter.call(document.querySelectorAll(".sx__item"), function (x) { return !x.hidden; });
        var i = vis.indexOf(it) + (e.key === "ArrowDown" ? 1 : -1);
        if (vis[i]) { vis[i].focus(); selectSx(vis[i]); }
      }
    });
  });
  var sxAll = document.querySelector(".sx__showall");
  if (sxAll) sxAll.addEventListener("click", function () { setRole(""); setLine("all"); applyCatalog(); });

  /* ссылки «к витрине с фильтром»: [data-goto=boost|wellness|coach] */
  document.querySelectorAll("[data-goto]").forEach(function (a) {
    a.addEventListener("click", function () {
      var btn = document.querySelector('.filter[data-line="' + a.getAttribute("data-goto") + '"]');
      if (btn) btn.click();
    });
  });

  /* список систем: при наведении строка раскрывается вниз и допечатывает «Цели»; курсор ушёл — сворачивается */
  var lastScroll = 0;
  window.addEventListener("scroll", function () { lastScroll = Date.now(); }, { passive: true });
  function scrolling() { return Date.now() - lastScroll < 450; }
  var srows = document.querySelectorAll("a.srow"), canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  srows.forEach(function (row) {
    var parts = Array.prototype.map.call(row.querySelectorAll("[data-type]"), function (el) { return { el: el, text: el.textContent }; });
    var timer = null;
    function clear() { clearTimeout(timer); parts.forEach(function (p) { p.el.textContent = ""; p.el.classList.remove("caret"); }); }
    function open() {
      if (row.classList.contains("is-open")) return;
      row.classList.add("is-open");
      if (reduced) { parts.forEach(function (p) { p.el.textContent = p.text; }); return; }
      clear();
      var k = 0, i = 0;
      (function step() {
        var p = parts[k]; if (!p) return;
        p.el.classList.add("caret");
        p.el.textContent = p.text.slice(0, ++i);
        if (i < p.text.length) timer = setTimeout(step, k ? 14 : 22);
        else { p.el.classList.remove("caret"); k++; i = 0; timer = setTimeout(step, 120); }
      })();
    }
    function close() { row.classList.remove("is-open"); clear(); }
    clear();
    row.addEventListener("srow:close", close);
    row.addEventListener("srow:open", open);
    if (canHover) {
      var delay;
      // во время прокрутки наведение не вмешивается: строки раскрывает прокрутка
      row.addEventListener("mouseenter", function () { if (!scrolling()) delay = setTimeout(function () { if (!scrolling()) open(); }, 140); });
      row.addEventListener("mousemove", function () { if (!scrolling() && !row.classList.contains("is-open")) { clearTimeout(delay); delay = setTimeout(open, 140); } });
      row.addEventListener("mouseleave", function () { clearTimeout(delay); close(); });
      row.addEventListener("focus", open);
    } else {
      row.addEventListener("click", function (e) { if (!row.classList.contains("is-open")) { e.preventDefault(); open(); } });
    }
  });

  /* появление групп списка: фон проявляется, строки выезжают по очереди, коды «перещёлкиваются» */
  var sgroups = document.querySelectorAll(".slist--type .slist__group");
  if (sgroups.length && "IntersectionObserver" in window && !reduced) {
    sgroups.forEach(function (g) {
      g.classList.add("is-pre");
      g.querySelectorAll("li").forEach(function (li, k) { li.style.setProperty("--d", (k * 70 + 150) + "ms"); });
    });
    var gio = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        gio.unobserve(x.target);
        var g = x.target;
        g.classList.add("is-in");
        g.querySelectorAll(".slist__code").forEach(function (c, k) {
          var t = c.textContent;
          setTimeout(function () { scramble(c, t); }, k * 70 + 200);
        });
      });
    }, { threshold: 0.25 });
    sgroups.forEach(function (g) { gio.observe(g); });
  }

  /* страница системы: шаги процесса загораются по мере прокрутки, линия растёт до последнего пройденного */
  var sroute = document.querySelector(".sroute");
  if (sroute) {
    var srs = sroute.querySelectorAll(".sr"), sfill = sroute.querySelector(".sroute__line i");
    function senseSteps() {
      var line = window.innerHeight * 0.62, last = -1;
      srs.forEach(function (li, k) { var on = reduced || li.getBoundingClientRect().top < line; li.classList.toggle("is-on", on); if (on) last = k; });
      var b = sroute.getBoundingClientRect(), p = 0;
      if (last >= 0) p = (srs[last].getBoundingClientRect().top + 24 - b.top) / b.height;
      sfill.style.setProperty("--p", Math.max(0, Math.min(1, p)));
    }
    window.addEventListener("scroll", senseSteps, { passive: true });
    window.addEventListener("resize", senseSteps);
    senseSteps();
  }

  /* «тиснение» знака AKCore™ на стеклянных плашках (секции с классом is-emboss) */
  document.querySelectorAll(".is-emboss .sysgain__card, .is-emboss .acc").forEach(function (el) {
    var m = document.createElement("span"); m.className = "emb"; m.setAttribute("aria-hidden", "true"); el.appendChild(m);
  });

  /* фон первого экрана: при прокрутке плывёт медленнее страницы (параллакс), чуть отдаляется и гаснет */
  var heroBg = document.querySelector(".hero-bg");
  if (heroBg && !reduced) {
    var hbTick = false;
    function heroScroll() {
      hbTick = false;
      var y = window.scrollY, h = heroBg.offsetHeight || window.innerHeight, t = Math.max(0, Math.min(1, y / h));
      heroBg.style.setProperty("--hb-y", (y * 0.35).toFixed(1) + "px");
      heroBg.style.setProperty("--hb-s", (1.06 - t * 0.06).toFixed(4));
      heroBg.style.setProperty("--hb-o", (1 - t * 0.85).toFixed(3));
    }
    window.addEventListener("scroll", function () { if (!hbTick) { hbTick = true; requestAnimationFrame(heroScroll); } }, { passive: true });
    heroScroll();
  }

  /* маршрут пилота: линия прорисовывается при прокрутке, шаги загораются по очереди */
  var route = document.querySelector(".route");
  if (route) {
    var rSteps = route.querySelectorAll(".route__steps li"), rFill = route.querySelector(".route__line i");
    function senseRoute() {
      var b = route.getBoundingClientRect(), vh = window.innerHeight;
      var p;
      if (window.matchMedia("(max-width: 900px)").matches) {
        // на телефоне маршрут вертикальный: линия идёт за точкой, которая дошла до 70% высоты экрана
        var t0 = rSteps[0].getBoundingClientRect().top, t1 = rSteps[rSteps.length - 1].getBoundingClientRect().top;
        p = (vh * 0.55 - t0) / Math.max(1, t1 - t0);
        // линия — ровно от первой точки до последней
        var d0 = rSteps[0].querySelector(".route__dot").getBoundingClientRect(), d1 = rSteps[rSteps.length - 1].querySelector(".route__dot").getBoundingClientRect();
        var ln = route.querySelector(".route__line");
        ln.style.top = (d0.top + d0.height / 2 - b.top) + "px"; ln.style.height = (d1.top - d0.top) + "px"; ln.style.bottom = "auto";
      } else { p = (vh * 0.75 - b.top) / (vh * 0.3); route.querySelector(".route__line").style.cssText = ""; }
      p = reduced ? 1 : Math.max(0, Math.min(1, p));
      var n = rSteps.length;
      rFill.style.setProperty("--p", p);
      route.classList.toggle("is-done", p >= 0.999);                 // маршрут пройден — знак AKCore™ в конце проявляется
      rSteps.forEach(function (li, k) { li.classList.toggle("is-on", p >= (n > 1 ? k / (n - 1) : 0) - 0.001); });
    }
    window.addEventListener("scroll", senseRoute, { passive: true });
    window.addEventListener("resize", senseRoute);
    senseRoute();
  }

  /* подсказки терминов: на тач-устройствах — по тапу */
  document.querySelectorAll(".term").forEach(function (t) {
    t.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      var was = t.classList.contains("is-open");
      document.querySelectorAll(".term.is-open").forEach(function (x) { x.classList.remove("is-open"); });
      if (!was) t.classList.add("is-open");
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".term")) document.querySelectorAll(".term.is-open").forEach(function (x) { x.classList.remove("is-open"); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".term.is-open").forEach(function (x) { x.classList.remove("is-open"); });
      doc.classList.remove("nav-open");
    }
  });

  /* появление при прокрутке */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }
  /* запасной путь: высокие блоки и быстрые прыжки прокрутки IntersectionObserver иногда пропускает */
  var pending = true;
  function sweep() {
    pending = false;
    var h = window.innerHeight;
    document.querySelectorAll(".reveal:not(.is-in)").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < h && r.bottom > 0) el.classList.add("is-in");
    });
  }
  window.addEventListener("scroll", function () {
    if (!pending) { pending = true; setTimeout(sweep, 60); }
  }, { passive: true });
  window.addEventListener("load", sweep);

  /* ---------- «журнальные» эффекты: печать, табло, счётчики ----------
     Только для коротких данных: коды, результаты, классы шагов, цифры фактов.
     Текст всё время лежит в HTML; без JS и при reduced-motion эффекты не запускаются. */
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var POOL = "0123456789АБВГДЕЖИКЛМНОПРСТ→·%";

  // запомнить текст, зафиксировать размер (чтобы вёрстка не прыгала) и очистить
  function freeze(el) {
    var text = el.textContent;
    if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
    el.style.minWidth = el.offsetWidth + "px";
    el.style.minHeight = el.offsetHeight + "px";
    el.textContent = "";
    el.setAttribute("aria-label", text);
    return text;
  }

  function release(el) { el.style.minWidth = ""; el.style.minHeight = ""; el.removeAttribute("aria-label"); }

  function typeText(el, text, done, slow) {
    var i = 0, base = slow ? 70 : 26, jitter = slow ? 50 : 30;
    el.classList.add("caret");
    (function step() {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(step, base + Math.random() * jitter);
      else { el.classList.remove("caret"); release(el); done && done(); }
    })();
  }

  function scramble(el, text, done, slow) {
    var frame = 0, total = slow ? 40 : 26, tick = slow ? 60 : 45;
    el.classList.add("is-scramble");
    (function step() {
      frame++;
      var locked = Math.floor(text.length * Math.max(0, frame - 8) / (total - 8));
      var out = "";
      for (var k = 0; k < text.length; k++) {
        out += k < locked || text[k] === " " ? text[k] : POOL[Math.floor(Math.random() * POOL.length)];
      }
      el.textContent = out;
      if (frame < total) setTimeout(step, tick);
      else {
        el.textContent = text;
        release(el);
        setTimeout(function () { el.classList.remove("is-scramble"); }, 600);
        done && done();
      }
    })();
  }

  // счётчик: каждое число в текстовых узлах элемента растёт от нуля
  function countUp(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = walker.nextNode())) if (/\d/.test(n.nodeValue)) nodes.push({ node: n, text: n.nodeValue });
    var t0 = null, dur = 1100;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), k = 1 - Math.pow(1 - p, 3);
      nodes.forEach(function (x) {
        x.node.nodeValue = x.text.replace(/\d+/g, function (d) { return String(Math.round(+d * k)); });
      });
      if (p < 1) requestAnimationFrame(frame);
      else nodes.forEach(function (x) { x.node.nodeValue = x.text; });
    }
    requestAnimationFrame(frame);
  }

  function runFx(el, text) {
    var kind = el.getAttribute("data-fx");
    if (kind === "count") countUp(el);
    else if (kind === "flip") scramble(el, text);
    else typeText(el, text);
  }

  // очередь «запустить, когда видно»: IntersectionObserver + проверка при прокрутке
  var watch = [];
  function whenVisible(el, fn) {
    watch.push({ el: el, fn: fn });
    if (fxIO) fxIO.observe(el);
  }
  function fire(el) {
    for (var i = 0; i < watch.length; i++) {
      if (watch[i].el === el) { var w = watch.splice(i, 1)[0]; if (fxIO) fxIO.unobserve(el); w.fn(); return; }
    }
  }
  var fxIO = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) fire(en.target); });
  }, { rootMargin: "0px 0px -10% 0px" }) : null;
  function fxSweep() {
    var h = window.innerHeight;
    watch.slice().forEach(function (w) {
      var r = w.el.getBoundingClientRect();
      if (r.height && r.top < h * 0.92 && r.bottom > 0) fire(w.el);
    });
  }
  window.addEventListener("scroll", function () { setTimeout(fxSweep, 60); }, { passive: true });
  window.addEventListener("load", fxSweep);

  if (!reduced) {
    var journal = document.querySelector(".journal");
    if (journal) typeJournal(journal);

    // одиночные элементы данных
    document.querySelectorAll("[data-fx]").forEach(function (el) {
      if (el.closest(".journal, [data-fx-rows]")) return;
      var text = el.getAttribute("data-fx") === "count" ? null : freeze(el);
      var delay = +(el.getAttribute("data-fx-delay") || 0);
      whenVisible(el, function () { setTimeout(function () { runFx(el, text); }, delay); });
    });

    // таблица шагов: строки по очереди, у каждой «впечатывается» класс действия
    document.querySelectorAll("[data-fx-rows]").forEach(function (tbl) {
      var rows = Array.prototype.slice.call(tbl.querySelectorAll("tbody tr"));
      var cells = rows.map(function (r) {
        var el = r.querySelector("[data-fx]");
        return el ? { el: el, text: freeze(el) } : null;
      });
      tbl.classList.add("is-typing");
      whenVisible(tbl, function () {
        rows.forEach(function (r, i) {
          setTimeout(function () {
            r.classList.add("is-on");
            if (cells[i]) setTimeout(function () { runFx(cells[i].el, cells[i].text); }, 120);
          }, i * 90);
        });
      });
    });
  }

  /* заголовок первого экрана: печатаем «Обещания», стираем, печатаем «Не обещания —»,
     «замеры.» проявляется табло. Полный текст — в HTML и aria-label заголовка. */
  var headline = document.querySelector("[data-headline]");
  if (headline && !reduced) playHeadline(headline);

  function playHeadline(h) {
    var l1 = h.querySelector(".hero__thin"), key = h.querySelector(".hero__key");
    var line1 = l1.textContent, word = key.textContent, first = "Обещания";
    h.style.minHeight = h.offsetHeight + "px";              // высота не прыгает, пока текст собирается
    l1.setAttribute("aria-hidden", "true"); key.setAttribute("aria-hidden", "true");
    l1.textContent = ""; key.textContent = "";
    l1.classList.add("caret");
    var t = 350;
    function at(fn) { setTimeout(fn, t); }
    function type(el, s, speed) {
      for (var i = 1; i <= s.length; i++) (function (n) { t += speed + Math.random() * 40; at(function () { el.textContent = s.slice(0, n); }); })(i);
    }
    function erase(el, s, speed) {
      for (var i = s.length - 1; i >= 0; i--) (function (n) { t += speed; at(function () { el.textContent = s.slice(0, n); }); })(i);
    }
    type(l1, first, 85);
    t += 700;                                               // пауза — «подумали»
    erase(l1, first, 45);
    t += 250;
    type(l1, line1, 55);
    t += 120; at(function () { l1.classList.remove("caret"); key.classList.add("caret"); });
    t += 200; at(function () {
      scramble(key, word, function () {
        h.style.minHeight = "";
        l1.removeAttribute("aria-hidden"); key.removeAttribute("aria-hidden");
      });
    });
  }

  /* журнал испытаний на главной: строки по очереди, результат печатается,
     у измеренных значений — перебор символов как на табло */
  function typeJournal(j) {
    var rows = Array.prototype.slice.call(j.querySelectorAll(".journal__row"));
    var count = j.querySelector(".journal__count");
    j.classList.add("is-typing");
    j.setAttribute("aria-busy", "true");
    var results = rows.map(function (r) {
      var el = r.querySelector(".journal__res");
      el.classList.add("is-fixed");
      return { el: el, text: freeze(el), measured: el.classList.contains("is-measured") };
    });
    // каждая строка проявляется, когда сама въезжает в экран; если въехало несколько — по очереди.
    // Очередь длинная (быстрая прокрутка) или прыжок по ссылке — темп ускоряется, чтобы журнал не «висел».
    var queue = [], busy = false, shown = 0, done = [], rush = false;
    function reveal(k, fast) {
      if (done[k]) return;
      done[k] = true;
      var row = rows[k], item = results[k];
      row.classList.add("is-on");
      var code = row.querySelector(".journal__code").textContent.trim();
      var node = document.querySelector('.jnode[data-code="' + code + '"]');
      if (node) node.classList.add("is-on");
      setTimeout(function () { (item.measured ? scramble : typeText)(item.el, item.text, null, !fast); }, fast ? 80 : 260);
      if (++shown === rows.length) {
        j.removeAttribute("aria-busy");
        if (count) count.classList.add("caret");   // журнал «ждёт» следующую запись
      }
    }
    function pump() {
      if (busy || !queue.length) return;
      var fast = rush || queue.length > 2;
      busy = true;
      reveal(queue.shift(), fast);
      setTimeout(function () { busy = false; pump(); }, fast ? 90 : 380);
    }
    rows.forEach(function (row, k) {
      whenVisible(row, function () { queue.push(k); pump(); });
    });
    // прыжок по ссылке на журнал — проявить все строки быстрой волной
    function rushAll() {
      rush = true;
      rows.forEach(function (r, k) { if (!done[k] && queue.indexOf(k) < 0) queue.push(k); });
      queue.sort(function (a, b) { return a - b; });
      pump();
    }
    document.querySelectorAll('a[href="#journal"], a[href$="index.html#journal"]').forEach(function (a) {
      a.addEventListener("click", rushAll);
    });
    if (location.hash === "#journal") rushAll();
  }

  /* картинка рядом с журналом: пока листаем журнал, высокий кадр медленно едет в рамке сверху вниз */
  var jgrid = document.querySelector(".jgrid"), jimg = document.querySelector(".jside__pan");
  if (jgrid && jimg && !reduced) {
    var panPending = false;
    function pan() {
      panPending = false;
      var r = jgrid.getBoundingClientRect(), frame = jimg.parentElement.getBoundingClientRect();
      var range = Math.max(1, r.height - frame.height);
      var p = Math.max(0, Math.min(1, (frame.top - r.top) / range));     // 0 — верх журнала, 1 — низ
      var slack = jimg.offsetHeight - frame.height;                      // насколько кадр выше рамки
      jimg.style.transform = "translateY(" + (-p * slack).toFixed(1) + "px)";
    }
    function queuePan() { if (!panPending) { panPending = true; requestAnimationFrame(pan); } }
    window.addEventListener("scroll", queuePan, { passive: true });
    window.addEventListener("resize", queuePan);
    window.addEventListener("load", pan);
    pan();
  }

  /* фоновые картинки блоков лежат под живым алмазом (вне секции), поэтому позицию задаём по секции */
  var secBgs = document.querySelectorAll(".sec-bg[data-for]");
  function placeSecBg() {
    secBgs.forEach(function (bg) {
      var sec = document.getElementById(bg.getAttribute("data-for"));
      if (!sec) return;
      var top = sec.getBoundingClientRect().top + window.scrollY - bg.offsetParent.getBoundingClientRect().top - window.scrollY;
      bg.style.top = top + "px"; bg.style.height = sec.offsetHeight + "px";
    });
  }
  if (secBgs.length) {
    placeSecBg(); window.addEventListener("resize", placeSecBg); window.addEventListener("load", placeSecBg);
    // высота блоков меняется (журнал допечатывается, строки раскрываются) — фоны подстраиваются
    if ("ResizeObserver" in window) new ResizeObserver(function () { placeSecBg(); }).observe(document.querySelector("main") || document.body);
  }

  /* точки журнала на луче боковой картинки */
  var jn = document.querySelector(".jnodes");
  function placeNodes() {
    if (!jn) return;
    var pan = jn.parentElement, img = pan.querySelector("img");
    if (!img.naturalWidth) return;
    var w = pan.offsetWidth, h = pan.offsetHeight, s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var dw = img.naturalWidth * s, dh = img.naturalHeight * s, ox = (w - dw) / 2, oy = (h - dh) / 2;
    var ax = +jn.dataset.x, y0 = +jn.dataset.y0, y1 = +jn.dataset.y1, nodes = jn.children, n = nodes.length;
    for (var i = 0; i < n; i++) {
      var fy = y0 + (y1 - y0) * (n > 1 ? i / (n - 1) : 0);
      nodes[i].style.left = (ox + ax * dw) + "px";
      nodes[i].style.top = (oy + fy * dh) + "px";
    }
  }
  if (jn) {
    var jimg2 = jn.parentElement.querySelector("img");
    jimg2.complete ? placeNodes() : jimg2.addEventListener("load", placeNodes);
    window.addEventListener("resize", placeNodes);
    // наведение на строку журнала — подсветка её точки
    document.querySelectorAll(".section--journal .journal__row").forEach(function (row) {
      var code = row.querySelector(".journal__code").textContent.trim();
      var node = jn.querySelector('[data-code="' + code + '"]');
      if (!node) return;
      row.addEventListener("mouseenter", function () { node.classList.add("is-hover"); });
      row.addEventListener("mouseleave", function () { node.classList.remove("is-hover"); });
    });
    if (reduced) jn.querySelectorAll(".jnode").forEach(function (x) { x.classList.add("is-on"); });
  }

  /* «Пять правил»: активное правило — у центра экрана; слева номер перещёлкивается табло */
  var rules = document.querySelectorAll(".rule");
  if (rules.length) {
    var rNum = document.querySelector(".rules__num"), rTitle = document.querySelector(".rules__title");
    var rDots = document.querySelectorAll(".rules__dots i"), rActive = -1;
    function setRule(i) {
      if (i === rActive) return;
      rActive = i;
      rules.forEach(function (r, k) { r.classList.toggle("is-active", k === i); });
      rDots.forEach(function (d, k) { d.classList.toggle("is-on", k <= i); });
      if (rTitle) rTitle.textContent = rules[i].querySelector("h3").textContent;
      // алмаз начинает собираться на 02, собран к 03–04 (data-rule … data-rule-end), на 05 рассыпается
      document.querySelectorAll(".core-spot[data-rule]").forEach(function (sp) {
        var from = +sp.getAttribute("data-rule"), to = sp.hasAttribute("data-rule-end") ? +sp.getAttribute("data-rule-end") : 99;
        sp.setAttribute("data-on", i >= from && i <= to ? "1" : "0");
        sp.setAttribute("data-stage", i);                                 // своё состояние алмаза на каждом правиле (core3d.js)
      });
      if (rNum) { var t = "0" + (i + 1); reduced ? (rNum.textContent = t) : scramble(rNum, t); }
    }
    function senseRules() {
      // активное — последнее правило, чей лист поднялся выше середины экрана (листы ложатся стопкой)
      var line = window.innerHeight * 0.55, best = 0;
      rules.forEach(function (r, k) { if (r.getBoundingClientRect().top < line) best = k; });
      rules.forEach(function (r, k) { r.classList.toggle("is-past", k < best); });
      setRule(best);
    }
    window.addEventListener("scroll", function () { requestAnimationFrame(senseRules); }, { passive: true });
    senseRules();
  }

  /* «Что нужно от заказчика»: запускаем, когда список уже хорошо виден (а не при первом появлении края) */
  var needList = document.querySelector(".need-list");
  if (needList) {
    var startNeeds = function () { needList.querySelectorAll(".need-item").forEach(function (li) { li.classList.add("is-in"); }); };
    if (reduced || !("IntersectionObserver" in window)) startNeeds();
    else {
      var nio = new IntersectionObserver(function (en) {
        if (en[0].intersectionRatio >= 0.6 || en[0].boundingClientRect.top < window.innerHeight * 0.45) { nio.disconnect(); startNeeds(); }
      }, { threshold: [0, 0.3, 0.6, 1] });
      nio.observe(needList);
    }
  }

  /* «Отправить ещё одну» — вернуть форму */
  var again = document.querySelector(".form-done__again");
  if (again) again.addEventListener("click", function () {
    var f = document.getElementById("pilot-form"), dn = document.querySelector(".form-done");
    if (f && dn) { dn.hidden = true; f.hidden = false; f.querySelector(".form__status").textContent = ""; f.querySelector("input").focus(); }
  });

  /* форма заявки на пилот */
  var form = document.getElementById("pilot-form");
  if (form) {
    var params = new URLSearchParams(location.search);
    var sys = params.get("sys");
    // ?sys=C1 — отметить чип нужной системы
    if (sys) Array.prototype.forEach.call(form.querySelectorAll("[name=system]"), function (o) {
      if (o.value.indexOf(sys + " ") === 0) o.checked = true;
    });
    var status = form.querySelector(".form__status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var email = window.AKPILOT_FORM_EMAIL;
      var data = new FormData(form);
      if (data.get("_honey")) return;
      var btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      status.className = "form__status";
      status.textContent = "Отправляем…";
      var payload = {};
      data.forEach(function (v, k) { payload[k] = v; });
      payload._subject = "AK.PILOT — заявка на пилот" + (payload.system ? ": " + payload.system : "");
      payload._template = "table";
      fetch("https://formsubmit.co/ajax/" + encodeURIComponent(email), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().then(function (j) { if (!r.ok || String(j.success) !== "true") throw new Error(j.message || r.status); }); })
        .then(function () {
          form.reset();
          status.className = "form__status is-ok";
          status.textContent = "Заявка отправлена. Мы свяжемся с вами.";
          // спокойное подтверждение на стекле вместо формы
          var done = document.querySelector(".form-done");
          if (done) { form.hidden = true; done.hidden = false; done.classList.remove("is-in"); void done.offsetWidth; done.classList.add("is-in"); }
        })
        .catch(function () {
          status.className = "form__status is-err";
          status.innerHTML = "Не удалось отправить. Напишите нам на <a href=\"mailto:" + email + "\">" + email + "</a>.";
        })
        .then(function () { btn.disabled = false; });
    });
  }
})();

/* «Как устроено»: цикл (кольцо), лестница уровней, слои стека */
(function () {
  "use strict";
  var wrap = document.querySelector(".cycle-wrap");
  if (wrap) {
    var steps = wrap.querySelectorAll(".cstep"), nodes = wrap.querySelectorAll(".ring__node");
    var arc = wrap.querySelector(".ring__arc"), n = wrap.querySelector(".ring__n"), t = wrap.querySelector(".ring__t");
    var cur = -1, hoverLock = 0;
    var set = function (i) {
      if (i === cur) return;
      cur = i;
      Array.prototype.forEach.call(steps, function (s, k) { s.classList.toggle("is-on", k === i); s.classList.toggle("is-past", k < i); });
      Array.prototype.forEach.call(nodes, function (s, k) { s.classList.toggle("is-on", k === i); s.classList.toggle("is-done", k < i); });
      // дуга доходит до активного узла; на последнем этапе замыкается в круг — цикл
      arc.style.setProperty("--p", i === steps.length - 1 ? 1 : i / steps.length);
      n.textContent = (i < 9 ? "0" : "") + (i + 1);
      t.classList.add("is-swap");
      setTimeout(function () { t.textContent = steps[i].querySelector("h3").textContent; t.classList.remove("is-swap"); }, 200);
    };
    set(0);
    var onScroll = function () {
      if (Date.now() < hoverLock) return;
      var r = wrap.getBoundingClientRect(), vh = window.innerHeight;
      // этапы сменяются, пока блок проходит от низа экрана до верхней трети
      var p = (vh * 0.85 - r.top) / (vh * 0.85 - vh * 0.15 + r.height * 0.3);
      set(Math.max(0, Math.min(steps.length - 1, Math.floor(p * steps.length))));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    Array.prototype.forEach.call(steps, function (s, k) {
      s.addEventListener("mouseenter", function () { hoverLock = Date.now() + 1500; set(k); });
    });
    Array.prototype.forEach.call(nodes, function (s, k) {
      s.addEventListener("mouseenter", function () { hoverLock = Date.now() + 1500; set(k); });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".lstair"), function (stair) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { stair.classList.add("is-in"); io.disconnect(); } });
      }, { threshold: 0.3 });
      io.observe(stair);
    } else stair.classList.add("is-in");
  });

  var layers = document.querySelectorAll(".slayer:not(.sysl)");
  var open = function (el) {
    Array.prototype.forEach.call(layers, function (l) { l.classList.toggle("is-open", l === el); });
  };
  Array.prototype.forEach.call(layers, function (l) {
    l.addEventListener("mouseenter", function () { if (window.matchMedia("(hover: hover)").matches) open(l); });
    l.addEventListener("click", function () { open(l); });
    l.addEventListener("focus", function () { open(l); });
  });
})();

/* превью главной (index-v2): правила-слои двигают алмаз; полосы систем раскрываются при наведении и сворачиваются */
(function () {
  "use strict";
  var rl = document.querySelectorAll(".rlayer");
  if (rl.length) {
    var num = document.querySelector(".rules__num"), title = document.querySelector(".rules__title");
    var dots = document.querySelectorAll(".rules__dots i"), spots = document.querySelectorAll(".core-spot[data-rule]");
    var setRule = function (i) {
      if (num) num.textContent = "0" + (i + 1);
      if (title) title.textContent = rl[i].querySelector(".slayer__hd b").textContent;
      Array.prototype.forEach.call(dots, function (d, k) { d.classList.toggle("is-on", k <= i); });
      Array.prototype.forEach.call(spots, function (sp) { sp.setAttribute("data-on", "1"); sp.setAttribute("data-stage", i); });
    };
    Array.prototype.forEach.call(rl, function (l, k) {
      var go = function () { setRule(k); };
      l.addEventListener("mouseenter", go); l.addEventListener("click", go); l.addEventListener("focus", go);
    });
    setRule(0);
  }
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  Array.prototype.forEach.call(document.querySelectorAll(".sysl:not(.is-wip)"), function (row) {
    if (canHover) {
      row.addEventListener("mouseenter", function () { row.classList.add("is-open"); });
      row.addEventListener("mouseleave", function () { row.classList.remove("is-open"); });
      row.addEventListener("focus", function () { row.classList.add("is-open"); });
      row.addEventListener("blur", function () { row.classList.remove("is-open"); });
    } else {
      row.addEventListener("click", function (e) { if (!row.classList.contains("is-open")) { e.preventDefault(); row.classList.add("is-open"); } });
    }
  });
  /* карточки-стёкла систем: на касание — первое нажатие раскрывает цели */
  if (!canHover) Array.prototype.forEach.call(document.querySelectorAll("a.gcard"), function (c) {
    c.addEventListener("click", function (e) { if (!c.classList.contains("is-open")) { e.preventDefault(); c.classList.add("is-open"); } });
  });
  /* журнал v2: строка раскрывает цели вниз при наведении, курсор ушёл — свернулась */
  Array.prototype.forEach.call(document.querySelectorAll(".journal--v2 .journal__row"), function (row) {
    if (!canHover) return;
    row.addEventListener("mouseenter", function () { row.classList.add("is-open"); });
    row.addEventListener("mouseleave", function () { row.classList.remove("is-open"); });
  });
})();

/* превью Г: орбиты — узлы медленно плывут; наведение останавливает и показывает карточку системы */
(function () {
  "use strict";
  var orbit = document.querySelector(".orbit");
  if (!orbit) return;
  var info = document.querySelector(".oinfo");
  var nodes = Array.prototype.slice.call(orbit.querySelectorAll(".onode:not(.onode--core)"));
  var R = { boost: 36, wellness: 20 }, SPEED = { boost: 0.018, wellness: -0.03 };   // радиус в % и скорость (оборотов/с … доли)
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var t = 0, paused = false, last = 0;
  // движение через transform (без пересчёта раскладки) — плавно и на телефоне
  var size = orbit.offsetWidth;
  window.addEventListener("resize", function () { size = orbit.offsetWidth; });
  nodes.forEach(function (n) { n.style.left = "50%"; n.style.top = "50%"; n.style.willChange = "transform"; });
  function place() {
    nodes.forEach(function (n) {
      var ring = n.getAttribute("data-ring"), a = (+n.getAttribute("data-a") + t * SPEED[ring]) * Math.PI * 2 - Math.PI / 2;
      var x = R[ring] / 100 * size * Math.cos(a), y = R[ring] / 100 * size * Math.sin(a);
      n.style.transform = "translate3d(calc(-50% + " + x.toFixed(2) + "px), calc(-50% + " + y.toFixed(2) + "px), 0)";
    });
  }
  function frame(ts) {
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    // на телефоне орбиты стоят: движение мелких узлов рябит; карточка по-прежнему перелистывается
    if (!paused && !reduced) t += dt;
    place();
    requestAnimationFrame(frame);
  }
  place(); requestAnimationFrame(frame);
  function show(n) {
    orbit.querySelectorAll(".onode").forEach(function (x) { x.classList.toggle("is-on", x === n); });
    info.classList.add("is-swap");
    setTimeout(function () {
      info.querySelector(".oinfo__line").textContent = n.getAttribute("data-line");
      info.querySelector(".oinfo__code").textContent = n.textContent.replace("Coach", "").trim();
      info.querySelector(".oinfo__name").textContent = n.getAttribute("data-name");
      info.querySelector(".oinfo__tag").textContent = n.getAttribute("data-tag");
      info.querySelector(".oinfo__goal p").textContent = n.getAttribute("data-goal");
      var m = n.getAttribute("data-metric"), mb = info.querySelector(".oinfo__metric");
      mb.hidden = !m; mb.querySelector("p").textContent = m; mb.classList.toggle("is-pending", n.getAttribute("data-pending") === "1");
      info.querySelector(".oinfo__go").href = n.getAttribute("href");
      info.classList.remove("is-swap");
    }, 150);
  }
  // без мыши — карточка сама перелистывает системы по кругу (C1…E2, затем Coach); наведение — ручной режим
  var all = nodes.concat([orbit.querySelector(".onode--core")]), cur = 0, hover = false, seen = false, timer = null;
  function auto() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (!hover && seen && !reduced) { cur = (cur + 1) % all.length; show(all[cur]); }
      auto();
    }, 3600);
  }
  orbit.querySelectorAll(".onode").forEach(function (n) {
    n.addEventListener("mouseenter", function () { paused = true; hover = true; cur = all.indexOf(n); show(n); });
    n.addEventListener("focus", function () { paused = true; hover = true; cur = all.indexOf(n); show(n); });
  });
  orbit.addEventListener("mouseleave", function () { paused = false; hover = false; auto(); });
  info.addEventListener("mouseenter", function () { hover = true; });
  info.addEventListener("mouseleave", function () { hover = false; auto(); });
  // плашки-ссылки над карточкой: наведение — показать систему, нажатие — обычный переход по ссылке
  var chipsEls = document.querySelectorAll(".ochip");
  function byCode(c) { return all.filter(function (n) { return n.querySelector("span").textContent.trim() === c; })[0]; }
  Array.prototype.forEach.call(chipsEls, function (ch) {
    ch.addEventListener("mouseenter", function () { var n = byCode(ch.getAttribute("data-code")); if (n) { paused = true; hover = true; cur = all.indexOf(n); show(n); } });
    ch.addEventListener("mouseleave", function () { paused = false; hover = false; auto(); });
  });
  var _show = show;
  show = function (n) {
    _show(n);
    var c = n.querySelector("span").textContent.trim();
    Array.prototype.forEach.call(chipsEls, function (ch) { ch.classList.toggle("is-on", ch.getAttribute("data-code") === c); });
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { seen = en[0].isIntersecting; }, { threshold: 0.35 }).observe(orbit);
  } else seen = true;
  show(all[0]); auto();

  // касание (телефон): первое нажатие на узел или плашку — показать систему в карточке,
  // второе нажатие на ту же систему — переход на её страницу; через 6 с без касаний орбиты снова плывут
  var touch = !(window.matchMedia && window.matchMedia("(hover: hover)").matches) || ("ontouchstart" in window), resumeT = null, tapped = null;
  function codeOf(el) { return el.classList.contains("ochip") ? el.getAttribute("data-code") : el.querySelector("span").textContent.trim(); }
  function holdThenResume() {
    clearTimeout(resumeT);
    resumeT = setTimeout(function () { paused = false; hover = false; tapped = null; auto(); }, 6000);
  }
  if (touch) {
    Array.prototype.forEach.call(orbit.querySelectorAll(".onode"), function (n) { n.addEventListener("mouseenter", function () {}, true); });
    Array.prototype.forEach.call(document.querySelectorAll(".onode, .ochip"), function (el) {
      el.addEventListener("click", function (e) {
        // на телефоне браузер перед кликом шлёт «наведение» и карточка уже успевает смениться —
        // поэтому помним именно последнюю НАЖАТУЮ систему, а не ту, что показана
        var c = codeOf(el), n = byCode(c);
        if (tapped !== c) { e.preventDefault(); tapped = c; if (n) { cur = all.indexOf(n); show(n); } }
        paused = true; hover = true; holdThenResume();
      });
    });
  }
  // возврат «назад» из страницы системы: страница берётся из кэша — снимаем паузу, анимация снова идёт
  window.addEventListener("pageshow", function () { clearTimeout(resumeT); paused = false; hover = false; tapped = null; auto(); });
})();

/* «Словарь»: переход по ссылке #термин — открыть его слой */
(function () {
  "use strict";
  function openHash() {
    var id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
    var el = document.getElementById(id);
    if (!el || !el.classList.contains("slayer")) return;
    document.querySelectorAll(".slayer:not(.sysl)").forEach(function (l) { l.classList.toggle("is-open", l === el); });
  }
  window.addEventListener("hashchange", openHash);
  openHash();
  var first = document.querySelector(".slayer.gl");
  if (first && !document.querySelector(".slayer.gl.is-open")) first.classList.add("is-open");
})();

/* «Далее…»: длинный абзац на телефоне свёрнут до нескольких строк, кнопка раскрывает весь текст */
(function () {
  "use strict";
  document.querySelectorAll(".more-btn").forEach(function (b) {
    var p = b.previousElementSibling;
    if (!p) return;
    b.addEventListener("click", function () {
      var open = p.classList.toggle("is-open");
      b.textContent = open ? "Свернуть" : "Далее…";
    });
  });
})();

/* «Пять правил»: лист выезжает, затем по очереди проявляются номер, заголовок, текст и плашка-доказательство */
(function () {
  "use strict";
  var sheets = document.querySelectorAll(".rule__sheet");
  if (!sheets.length) return;
  if (!("IntersectionObserver" in window) || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    sheets.forEach(function (s) { s.classList.add("is-seen"); }); return;
  }
  sheets.forEach(function (s) { s.classList.add("is-pre"); });
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("is-seen"); io.unobserve(x.target); } });
  }, { threshold: 0.2, rootMargin: "0px 0px -10% 0px" });
  sheets.forEach(function (s) { io.observe(s); });
})();
