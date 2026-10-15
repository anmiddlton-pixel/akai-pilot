/* AK.PILOT — знак AKCore™ в подвале: собранный октаэдр с внутренней сетью, просто медленно вращается.
   Без сборки и распада; белый, матовый. Рисуется в <canvas> внутри .core-spot--foot. Классический скрипт: работает по file://. */
(function () {
  "use strict";
  var spots = document.querySelectorAll(".core-spot--foot, [data-mark3d]");
  Array.prototype.forEach.call(spots, mark);
  function mark(spot) {
  var cv = document.createElement("canvas");
  cv.className = "mark3d";
  spot.appendChild(cv);
  var ctx = cv.getContext && cv.getContext("2d");
  if (!ctx) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // цвет: белый в подвале; data-mark3d="teal" — фирменная бирюза
  var COL = spot.getAttribute("data-mark3d") === "teal" ? "127,186,180" : "235,235,235";

  var P = [
    [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
    [0.05, 0.45, 0.1], [0.3, 0.12, -0.2], [-0.35, 0, 0.15], [0, 0, 0], [0.45, -0.05, 0.2],
    [-0.15, -0.2, -0.3], [0.12, -0.18, 0.35], [-0.45, -0.08, -0.1], [0, -0.5, 0.05]
  ];
  var OUTER = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
  var INNER = [[6, 9], [6, 7], [7, 9], [7, 10], [9, 8], [8, 13], [8, 12], [9, 12], [12, 14], [11, 14], [11, 13], [10, 12], [9, 11]];
  var SPOKES = [[0, 6], [0, 8], [0, 7], [1, 14], [1, 12], [1, 11], [2, 10], [2, 7], [3, 8], [3, 13], [4, 12], [4, 10], [5, 11], [5, 7]];

  var W = 0, H = 0;
  function resize() {
    var r = spot.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  var proj = new Array(P.length), rotY = 0.6, tilt = 0.32;
  function project() {
    var R = Math.min(W, H) * 0.42, cx = W / 2, cy = H / 2;
    var sy = Math.sin(rotY), cyy = Math.cos(rotY), sx = Math.sin(tilt), cxx = Math.cos(tilt);
    for (var i = 0; i < P.length; i++) {
      var x = P[i][0], y = P[i][1], z = P[i][2];
      var x1 = x * cyy + z * sy, z1 = -x * sy + z * cyy;
      var y2 = y * cxx - z1 * sx, z2 = y * sx + z1 * cxx;
      var k = 3.2 / (3.2 - z2);
      proj[i] = { x: cx + x1 * R * k, y: cy - y2 * R * k, z: z2 };
    }
  }
  function a(z, lo, hi) { return lo + (hi - lo) * (z + 1) / 2; }
  function edge(e, w, lo, hi) {
    var p = proj[e[0]], q = proj[e[1]];
    ctx.strokeStyle = "rgba(" + COL + "," + a((p.z + q.z) / 2, lo, hi).toFixed(3) + ")";
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    project();
    ctx.lineCap = "round";
    SPOKES.forEach(function (e) { edge(e, 0.6, 0.08, 0.3); });
    INNER.forEach(function (e) { edge(e, 0.9, 0.15, 0.55); });
    OUTER.forEach(function (e) { edge(e, 1.6, 0.3, 0.95); });
    for (var i = 0; i < P.length; i++) {
      var p = proj[i];
      ctx.fillStyle = "rgba(" + COL + "," + a(p.z, 0.3, 0.95).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, i < 6 ? 2 : 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  var last = 0, visible = false;
  function loop(ts) {
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    rotY += dt * 0.25;
    draw();
    if (visible && !reduced) requestAnimationFrame(loop); else last = 0;
  }
  resize(); draw();
  window.addEventListener("resize", function () { resize(); draw(); });
  if (reduced) return;
  // крутится только когда подвал на экране
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      var was = visible; visible = en[0].isIntersecting;
      if (visible && !was) requestAnimationFrame(loop);
    }).observe(spot);
  } else { visible = true; requestAnimationFrame(loop); }
  }
})();
